"""Extract the numbers behind the portfolio figures into small, public-safe JSON files.

The raw experiment outputs live outside this repository. This script reads them (paths are passed on the
command line, nothing is hard-coded) and writes only the values that are plotted, under plain-English names,
to scripts/figures/data/. No run IDs, hostnames, file paths or other people's names are copied.

Usage (any subset of the flags):
    python extract_data.py \
        --hat-results  <hat endpoint results .json> \
        --hat-views    <hat source-views .json> \
        --hat-journals <directory of hat training journals> \
        --warp-mix     <controlled-summary .json> \
        --openloop     <openloop-summary .json> \
        --style        <episode-features .json> \
        --dexjoco-svg  <original dexjoco success-rate bar chart .svg>

make_figures.py then draws everything from data/ alone.
"""
import argparse
import collections
import glob
import json
import math
import os
import re
import statistics
from pathlib import Path

DATA = Path(__file__).resolve().parent / "data"

_HAND_TOKENS = [("wuji_1", "Wuji-1"), ("wuji1", "Wuji-1"), ("wuji_2", "Wuji-2"), ("wuji2", "Wuji-2"),
                ("shadow", "Shadow"), ("inspire", "Inspire"), ("allegro", "Allegro"), ("leap", "LEAP"),
                ("sharpa", "Sharpa")]


def hand_name(raw):
    """Plain display name for a robot-hand identifier (dataset keys and short names both work)."""
    low = raw.lower()
    for token, name in _HAND_TOKENS:
        if token in low:
            return name
    raise KeyError(raw)


def dump(name, obj):
    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / name).write_text(json.dumps(obj, indent=1, ensure_ascii=False) + "\n")
    print("wrote", DATA / name)


def wilson(k, n, z=1.959963984540054):
    p = k / n
    den = 1 + z * z / n
    c = (p + z * z / (2 * n)) / den
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den
    return [100 * max(0.0, c - h), 100 * min(1.0, c + h)]


# --------------------------------------------------------------------------------------------- A: HAT
def hat(results, views, journals):
    pts = json.load(open(results))["points"]
    views_d = json.load(open(views))
    # training views are keyed "k<k>-<hash>"; a k=1 view trains on exactly one hand
    view_hand = {key.split("-")[1]: hand_name(next(iter(v["source_subset"]["per_hand"])))
                 for key, v in views_d.items() if key.startswith("k1-")}
    k1, k6 = [], {}
    for p in pts:
        if p.get("episodes") != 100:
            continue
        tgt = hand_name(p["target_hand"])
        val = float(p["success_rate_pct"])
        if p["k"] == 1:
            src = hand_name(p["source_hands"][0]) if "source_hands" in p else view_hand[p["key"].split("-")[1]]
            assert src != tgt
            k1.append({"source": src, "target": tgt, "seed_index": p["training_seed"] - 1700, "success_pct": round(val, 1)})
        elif p["k"] == 6:
            k6[tgt] = {"success_pct": round(val, 1), "seed_index": p["training_seed"] - 1700}
    targets = sorted(k6, key=lambda t: -k6[t]["success_pct"])
    rows = []
    for t in targets:
        vals = [r["success_pct"] for r in k1 if r["target"] == t]
        by_src = collections.defaultdict(list)
        for r in k1:
            if r["target"] == t:
                by_src[r["source"]].append(r["success_pct"])
        best = max(by_src, key=lambda h: statistics.mean(by_src[h]))
        rows.append({"target": t, "six_hand_pct": k6[t]["success_pct"], "single_hand_pct": vals,
                     "single_hand_mean": round(statistics.mean(vals), 2), "n_single": len(vals),
                     "best_single_source": best, "best_single_source_mean": round(statistics.mean(by_src[best]), 2),
                     "best_single_source_n": len(by_src[best])})
    diffs = [r["six_hand_pct"] - r["single_hand_mean"] for r in rows]

    # demonstration budget: unique source frames per training view, and the per-run training recipe
    budget = collections.defaultdict(set)
    for key, v in views_d.items():
        budget[key.split("-")[0]].add(v["source_subset"]["unique_source_frames"])
    recipe = collections.Counter()
    for f in sorted(glob.glob(os.path.join(journals, "training-k[16]-*.json"))):
        r = json.load(open(f)).get("request", {})
        k = re.match(r"training-(k\d)-", os.path.basename(f)).group(1)
        frames = [o.split("=")[1] for o in r.get("native_overrides", []) if "unique_source_frames" in o]
        hp = r.get("hyperparameters", {})
        recipe[(k, frames[0] if frames else None, hp.get("max_steps"), hp.get("batch_size"))] += 1
    dump("hat_zero_shot.json", {
        "description": "Zero-shot success on a held-out robot hand (simulated cube pick, 100 episodes per evaluation). "
                       "Single-hand models: trained on one other hand. Six-hand models: trained on all six other hands.",
        "interim": True,
        "rows": rows,
        "n_single_hand_evaluations": sum(r["n_single"] for r in rows),
        "n_six_hand_evaluations": len(rows),
        "episodes_per_evaluation": 100,
        "single_hand_training_seeds": sorted({r["seed_index"] for r in k1}),
        "six_hand_training_seeds": sorted({v["seed_index"] for v in k6.values()}),
        "paired_difference_pts": {"per_target": [round(d, 1) for d in diffs], "mean": round(statistics.mean(diffs), 1),
                                  "positive": sum(d > 0 for d in diffs), "n": len(diffs)},
        "budget_check": {
            "unique_source_frames_by_k": {k: sorted(v) for k, v in sorted(budget.items())},
            "training_recipes_k1_k6": [{"k": k, "unique_source_frames": fr, "updates": st, "batch": b, "runs": n}
                                       for (k, fr, st, b), n in sorted(recipe.items())],
        },
    })


# --------------------------------------------------------------------------------------------- B: WARP mix
def warp_mix(path):
    d = json.load(open(path))
    arms = [("mink", 0), ("mixW25", 25), ("mixW50", 50), ("mixW75", 75), ("warp", 100)]
    pts = []
    for key, share in arms:
        s = d[key]["scene"]["warp"]
        lo, hi = wilson(s["success"], s["n"])
        assert abs(lo - s["ci"][0]) < 1e-6 and abs(hi - s["ci"][1]) < 1e-6
        pts.append({"warp_share_pct": share, "successes": s["success"], "rollouts": s["n"],
                    "per_seed": [list(x) for x in s["per_seed"]], "success_pct": s["rate"],
                    "wilson95_pct": [round(lo, 2), round(hi, 2)]})
    dump("warp_mix.json", {
        "description": "Closed-loop success in the WARP-retargeted scene vs share of WARP-retargeted demos among the "
                       "40 training demos (rest retargeted with an IK baseline); same source demonstrations. "
                       "DexMimicGen coffee task, RB-Y1, simulation. 2 training seeds x 50 rollouts per point.",
        "points": pts,
    })


# --------------------------------------------------------------------------------------------- C: learnability
def openloop(path):
    d = json.load(open(path))["datasets"]
    task = {"can_sort_random": "Can sorting", "pouring": "Pouring", "coffee": "Coffee"}
    meth = {"mink_eef": "IK baseline", "sew": "WARP"}
    out = []
    for key, v in d.items():
        t, m = key.split("__")
        e1 = v["deciles"]["e1"]
        mean = sum(e1) / len(e1)
        out.append({"task": task[t], "retargeting": meth[m], "frames": v["frames"], "validation_episodes": len(v["episodes"]),
                    "decile_error_rad": [round(x, 6) for x in e1],
                    "decile_error_rel": [round(x / mean, 4) for x in e1],
                    "spearman_first_action": round(v["association"]["e1"]["spearman_localAV"], 4),
                    "spearman_first_action_partial": round(v["association"]["e1"]["partial_localAV_given_dist_hold"], 4),
                    "spearman_full_chunk": round(v["association"]["e32"]["spearman_localAV"], 4),
                    "spearman_full_chunk_partial": round(v["association"]["e32"]["partial_localAV_given_dist_hold"], 4),
                    "spearman_first_action_vs_distance": round(v["association"]["e1"]["spearman_dist"], 4)})
    dump("learnability.json", {
        "description": "Held-out validation frames ranked into deciles by how much the 10 nearest training frames "
                       "disagree about the next action (variance of their actions). y = the policy's first-action "
                       "error, arms + torso, relative to that dataset's average. 3 DexMimicGen tasks x 2 retargetings.",
        "datasets": out,
    })


# --------------------------------------------------------------------------------------------- D: demonstrator style
def style(path):
    rec = [r for r in json.load(open(path)) if r["phase"] == "handling"]
    others = sorted({r["collector"] for r in rec} - {"youngwoong"})
    assert len(others) == 1, "expected exactly one other demonstrator"
    out = {}
    for lab, keep in (("A", lambda c: c == "youngwoong"), ("B", lambda c: c != "youngwoong")):   # A = the author
        rs = [r for r in rec if keep(r["collector"])]
        out[lab] = {"n": len(rs),
                    "contact_duration_s": [round(r["duration_s"], 2) for r in rs],
                    "arm_speed_rad_s": [round(r["active_speed"], 4) for r in rs]}
    dump("demonstrator_style.json", {
        "description": "Per-demonstration statistics of the contact phase (first confirmed hand-basket contact to "
                       "just before release, uncertain boundary frames excluded) for two demonstrators doing the same "
                       "RB-Y1 basket task. Arm speed = mean RMS speed of the 14 arm joints.",
        "demonstrators": out,
    })


# --------------------------------------------------------------------------------------------- E: DexJoCo
def dexjoco(svg):
    s = open(svg).read()
    base, top = 618.0, 64.0
    scale = (base - top) / 100.0
    series = {"#4E79A7": "pi05_published", "#59A14F": "gr00t_n16"}
    labels = [(float(x), t) for x, t in re.findall(r'<text x="([\d.]+)" y="642"[^>]*>([^<]*)</text>', s)]
    errs = [(float(a), float(b), float(d)) for a, b, c, d in
            re.findall(r'<line class="err" x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/>', s) if a == c]
    rows = collections.OrderedDict((t.replace(" (B)", ""), {"bimanual": t.endswith("(B)")}) for _, t in labels)
    for x, y, w, h, f in re.findall(r'<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" fill="(#\w+)"', s):
        x, y, w, h = map(float, (x, y, w, h))
        if f not in series or y == 15:            # y == 15: legend swatch
            continue
        cx = x + w / 2
        lab = min(labels, key=lambda l: abs(l[0] - cx))[1].replace(" (B)", "")
        e = [((base - d) / scale, (base - b) / scale) for a, b, d in errs if abs(a - cx) < 0.6]
        mean = h / scale
        sd = (e[0][1] - e[0][0]) / 2 if e else None
        rows[lab][series[f]] = {"mean_pct": round(mean, 2), "sd_pct": None if sd is None else round(sd, 2)}
    means = {k: round(statistics.mean(r[k]["mean_pct"] for r in rows.values()), 2) for k in series.values()}
    dump("dexjoco.json", {
        "description": "DexJoCo per-task success (%). GR00T N1.6 fine-tuned single-task by the author (3 eval runs x 50 "
                       "episodes, mean +/- SD across runs) vs pi0.5 as published by the benchmark.",
        "tasks": [{"task": k, **v} for k, v in rows.items()],
        "mean_over_tasks_pct": means,
        "n_tasks": len(rows),
    })


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--hat-results"); ap.add_argument("--hat-views"); ap.add_argument("--hat-journals")
    ap.add_argument("--warp-mix"); ap.add_argument("--openloop"); ap.add_argument("--style"); ap.add_argument("--dexjoco-svg")
    a = ap.parse_args()
    if a.hat_results:
        hat(a.hat_results, a.hat_views, a.hat_journals)
    if a.warp_mix:
        warp_mix(a.warp_mix)
    if a.openloop:
        openloop(a.openloop)
    if a.style:
        style(a.style)
    if a.dexjoco_svg:
        dexjoco(a.dexjoco_svg)
