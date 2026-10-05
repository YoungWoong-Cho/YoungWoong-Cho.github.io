"""Draw the portfolio figures (SVG + 2x PNG) from the small JSON files in data/.

    PORTFOLIO_FONT_DIR=<folder with static Inter .ttf files, optional> python make_figures.py [a b c d e]

Output: public/media/figures/<name>.svg and <name>.png
"""
import json
import sys
from pathlib import Path

import numpy as np
from matplotlib.lines import Line2D

import style as S
from style import plt

DATA = Path(__file__).resolve().parent / "data"


def load(name):
    return json.loads((DATA / name).read_text())


def ring(**kw):
    """2 px surface ring around overlapping markers."""
    return dict(edgecolors=S.BG, linewidths=1.5, **kw)


# ------------------------------------------------------------------------------------------------ A
def fig_hat():
    d = load("hat_zero_shot.json")
    rows = d["rows"]
    n = len(rows)
    fig = plt.figure(figsize=(S.WIDTH_IN, 5.6))
    ax = fig.add_axes([0.105, 0.235, 0.855, 0.555])
    rng = np.random.default_rng(7)
    for i, r in enumerate(rows):
        y = n - 1 - i
        vals = np.array(r["single_hand_pct"])
        jit = rng.uniform(-0.17, 0.17, len(vals))
        ax.scatter(vals, y + jit, s=18, color=S.ORANGE, alpha=0.45, linewidths=0, zorder=2)
        m, six = r["single_hand_mean"], r["six_hand_pct"]
        ax.plot([m, six], [y, y], color=S.MUTED, lw=1.6, alpha=0.55, zorder=3)
        ax.scatter([m], [y], s=70, marker="D", color=S.ORANGE, zorder=4, **ring())
        ax.scatter([six], [y], s=105, marker="o", color=S.TEAL, zorder=5, **ring())
        ax.text(six + 2.6, y, f"{six:.0f}%", va="center", ha="left", fontsize=9.5, color=S.FG, fontweight="medium", zorder=6)
        ax.text(m, y - 0.3, f"{m:.0f}%", va="top", ha="center", fontsize=8, color=S.MUTED, zorder=6)
    ax.set_yticks(range(n))
    ax.set_yticklabels([r["target"] for r in rows][::-1], fontsize=10, color=S.FG)
    ax.set_ylim(-0.6, n - 0.4)
    ax.set_xlim(-2, 104)
    ax.set_xticks(range(0, 101, 20))
    ax.set_xticklabels([f"{x}%" for x in range(0, 101, 20)])
    ax.set_xlabel("Zero-shot success on the unseen hand", labelpad=8)
    S.clean_axes(ax, grid_axis="x")
    fig.text(0.105 - 0.012, 0.795, "Unseen hand", ha="right", va="bottom", fontsize=8.5, color=S.MUTED)

    S.header(fig, "Six hand types in training beat one: higher zero-shot success on an unseen hand",
             "A cube-picking policy is evaluated on a robot hand it never saw in training.")
    handles = [Line2D([], [], ls="", marker="o", ms=9, mfc=S.TEAL, mec=S.BG, mew=1.2, label="Trained on 6 other hands"),
               Line2D([], [], ls="", marker="D", ms=7, mfc=S.ORANGE, mec=S.BG, mew=1.2, label="Trained on 1 other hand: average"),
               Line2D([], [], ls="", marker="o", ms=5, mfc=S.ORANGE, mec="none", alpha=0.45,
                      label="each single-hand model")]
    fig.legend(handles=handles, loc="upper left", bbox_to_anchor=(0.004, 0.875), ncol=3, handletextpad=0.4,
               columnspacing=1.6, labelcolor=S.FG)
    pd_ = d["paired_difference_pts"]
    S.footnote(fig,
               f"Interim results, simulation. {d['n_single_hand_evaluations'] + d['n_six_hand_evaluations']} evaluations "
               f"({d['n_single_hand_evaluations']} single-hand, {d['n_six_hand_evaluations']} six-hand), "
               f"{d['episodes_per_evaluation']} episodes each. Every model gets the same demonstration budget:\n"
               "1,800 unique demonstration frames and 8,000 training updates. Single-hand: several source hands, up to "
               "3 seeds; six-hand: 1 seed so far.\n"
               f"Six-hand training beats the single-hand average on {pd_['positive']}/{pd_['n']} hands "
               f"(+{pd_['mean']:.0f} points on average); the single best source hand does as well or better on "
               f"{sum(r['best_single_source_mean'] >= r['six_hand_pct'] - 1 for r in rows)} of {n}.")
    S.save(fig, "hat-zero-shot",
           "Six hand types in training beat one: higher zero-shot success on an unseen hand",
           "Dumbbell chart. For six held-out robot hands, zero-shot cube-picking success of policies trained on six "
           "other hands vs the average of policies trained on a single other hand: " +
           "; ".join(f"{r['target']} {r['six_hand_pct']:.0f}% vs {r['single_hand_mean']:.0f}%" for r in rows) + ".")


# ------------------------------------------------------------------------------------------------ B
def fig_warp():
    d = load("warp_mix.json")
    p = d["points"]
    x = np.array([q["warp_share_pct"] for q in p])
    y = np.array([q["success_pct"] for q in p])
    lo = np.array([q["wilson95_pct"][0] for q in p])
    hi = np.array([q["wilson95_pct"][1] for q in p])
    fig = plt.figure(figsize=(S.WIDTH_IN, 5.4))
    ax = fig.add_axes([0.085, 0.235, 0.86, 0.585])
    ax.vlines(x, lo, hi, color=S.TEAL, alpha=0.6, lw=1.4, zorder=2)
    ax.hlines(np.r_[lo, hi], np.r_[x, x] - 1.1, np.r_[x, x] + 1.1, color=S.TEAL, alpha=0.6, lw=1.4, zorder=2)
    ax.plot(x, y, color=S.TEAL, lw=2, zorder=3)
    ax.scatter(x, y, s=64, color=S.TEAL, zorder=4, **ring())
    for xi, yi in zip(x[1:], y[1:]):
        ax.text(xi - 1.6, yi + 1.4, f"{yi:.0f}%", ha="right", va="bottom", fontsize=9.5, color=S.FG,
                fontweight="medium", zorder=5)
    ax.annotate("0 of 100 at 0%: none of its training demos used the WARP robot-base placement", xy=(1.4, 0.5),
                xytext=(11, 3.6),
                fontsize=8, color=S.MUTED, ha="left", va="center", linespacing=1.4,
                arrowprops=dict(arrowstyle="-", color=S.DIM, lw=0.8, shrinkA=4, shrinkB=4))
    ax.set_xlim(-6, 106)
    ax.set_ylim(0, 52)
    ax.set_xticks(x)
    ax.set_xticklabels([f"{v}%" for v in x])
    ax.set_yticks(range(0, 51, 10))
    ax.set_yticklabels([f"{v}%" for v in range(0, 51, 10)])
    ax.set_xlabel("Share of WARP-retargeted demos among the 40 training demos (the rest use an IK baseline)", labelpad=8)
    ax.set_ylabel("Task success in the WARP scene", labelpad=8)
    S.clean_axes(ax, grid_axis="y")
    S.header(fig, "Same demonstrations, different retargeting: success rises with the share of WARP data",
             "Each training set holds the same 40 source demonstrations; only how they are retargeted to the robot changes.")
    S.footnote(fig,
               "Simulation: DexMimicGen coffee task on a Rainbow RB-Y1. Each point: 2 training seeds × 50 rollouts = 100; "
               "bars = Wilson 95% interval.\n"
               "The two retargetings place the robot base about 17 cm apart, so the 0% policy never trained in this "
               "scene layout.\n40 of the 50 evaluation start states come from training demos; on the 10 unseen ones "
               "the trend is unclear (20/25/35/25% at 25–100%, n = 20 each).")
    S.save(fig, "warp-mix-success",
           "Same demonstrations, different retargeting: success rises with the share of WARP-retargeted data",
           "Line chart with 95% intervals. Closed-loop success in the WARP scene for 0, 25, 50, 75 and 100% "
           "WARP-retargeted training demos: " + ", ".join(f"{v:.0f}%" for v in y) + " (100 rollouts each).")


# ------------------------------------------------------------------------------------------------ C
def fig_learnability():
    d = load("learnability.json")["datasets"]
    xs = np.arange(1, 11)
    rel = np.array([q["decile_error_rel"] for q in d])
    mean = rel.mean(0)
    fig = plt.figure(figsize=(S.WIDTH_IN, 5.5))
    ax = fig.add_axes([0.085, 0.275, 0.79, 0.555])
    ax.axhline(1.0, color=S.LINE_STRONG, lw=1, ls=(0, (3, 3)), zorder=1)
    for r in rel:
        ax.plot(xs, r, color=S.MUTED, lw=1, alpha=0.45, zorder=2)
    ax.plot(xs, mean, color=S.TEAL, lw=2.2, zorder=4)
    ax.scatter(xs, mean, s=36, color=S.TEAL, zorder=5, **ring())
    ax.text(10.25, mean[-1], f"average of\n6 datasets\n{mean[-1]:.2f}×", va="center", ha="left", fontsize=8.5,
            color=S.FG, linespacing=1.35)
    ax.text(10.25, rel[:, -1].min() - 0.02, "each thin line:\none task ×\nretargeting", va="top", ha="left",
            fontsize=8, color=S.MUTED, linespacing=1.35)
    ax.text(0.75, mean[0] - 0.035, f"{mean[0]:.2f}×", va="top", ha="left", fontsize=8.5, color=S.FG)
    ax.set_xlim(0.6, 10.2)
    ax.set_ylim(0.62, 1.66)
    ax.set_xticks(xs)
    ax.set_xticklabels(["1\nagree"] + [str(i) for i in range(2, 10)] + ["10\ndisagree"])
    ax.set_yticks([0.75, 1.0, 1.25, 1.5])
    ax.set_yticklabels(["0.75×", "1.0×", "1.25×", "1.5×"])
    ax.set_xlabel("Held-out frames, ranked by how much the nearest training demos disagree about the next action (decile)",
                  labelpad=8)
    ax.set_ylabel("Policy error vs. dataset average", labelpad=8)
    S.clean_axes(ax, grid_axis="y")
    rho = [q["spearman_first_action"] for q in d]
    prt = [q["spearman_first_action_partial"] for q in d]
    frames = [q["frames"] for q in d]
    S.header(fig, "Policy error is higher where training demonstrations disagree about the action",
             "Open-loop error of a trained policy on held-out demonstrations, grouped by how consistent the training "
             "data is nearby.")
    S.footnote(fig,
               f"Simulation: 3 DexMimicGen tasks (can sorting, pouring, coffee) × 2 retargetings; "
               f"{min(frames):,}–{max(frames):,} frames from 10 held-out demos per dataset.\n"
               "Disagreement = spread of the next action over the 10 nearest training frames (image + joint state). "
               "Error = first predicted action, arm + torso.\n"
               f"Spearman ρ = {min(rho):.2f}–{max(rho):.2f} per dataset; {min(prt):.2f}–{max(prt):.2f} after "
               "controlling for distance to the training data and how much the arm is moving. Correlational.")
    S.save(fig, "learnability-local-consistency",
           "Policy error is higher where training demonstrations disagree about the action",
           "Line chart. Held-out frames binned into deciles of local action disagreement in the training data; policy "
           "error relative to each dataset's average rises from " + f"{mean[0]:.2f}x to {mean[-1]:.2f}x" +
           " (average of 6 datasets).")


# ------------------------------------------------------------------------------------------------ D
def fig_style():
    d = load("demonstrator_style.json")["demonstrators"]
    a, b = d["A"], d["B"]
    fig = plt.figure(figsize=(S.WIDTH_IN, 5.3))
    axes = [fig.add_axes([0.085, 0.215, 0.38, 0.565]), fig.add_axes([0.585, 0.215, 0.38, 0.565])]
    panels = [("contact_duration_s", "Contact-phase duration (s)", "{:.1f} s", (0, 17.5), [0, 4, 8, 12, 16], "{:.0f}"),
              ("arm_speed_rad_s", "Arm joint speed during contact (rad/s)", "{:.2f}", (0, 0.85),
               [0, 0.2, 0.4, 0.6, 0.8], "{:.1f}")]
    rng = np.random.default_rng(3)
    for ax, (key, label, fmt, ylim, ticks, tfmt) in zip(axes, panels):
        for i, (grp, col) in enumerate(((a, S.TEAL), (b, S.ORANGE))):
            v = np.array(grp[key])
            ax.scatter(i + rng.uniform(-0.17, 0.17, len(v)), v, s=22, color=col, alpha=0.6, linewidths=0, zorder=3)
            m = v.mean()
            ax.plot([i - 0.27, i + 0.27], [m, m], color=S.FG, lw=2, zorder=4)
            ax.text(i + 0.31, m, fmt.format(m), va="center", ha="left", fontsize=9.5, color=S.FG, fontweight="medium")
        ax.set_xlim(-0.55, 1.75)
        ax.set_ylim(*ylim)
        ax.set_yticks(ticks)
        ax.set_yticklabels([tfmt.format(t) for t in ticks])
        ax.set_xticks([0, 1])
        ax.set_xticklabels([f"Demonstrator A (me)\n{a['n']} demos", f"Demonstrator B\n{b['n']} demos"], color=S.FG,
                           fontsize=9)
        ax.set_title(label, loc="left", fontsize=10, color=S.FG, pad=10)
        S.clean_axes(ax, grid_axis="y")
    ra = np.mean(a["contact_duration_s"]) / np.mean(b["contact_duration_s"])
    rs = np.mean(b["arm_speed_rad_s"]) / np.mean(a["arm_speed_rad_s"])
    S.header(fig, "Two demonstrators, one task, very different motion styles",
             f"Human basket demos (Aria glasses) retargeted to a Rainbow RB-Y1: A stays in contact {ra:.1f}× longer and moves the arms "
             f"{rs:.1f}× slower than B.")
    S.footnote(fig,
               "Each dot is one demonstration; white bar = mean. Contact phase = first confirmed hand–basket contact "
               "to just before release, read from video\n(ambiguous boundary frames excluded). Arm speed = mean RMS "
               "speed of the 14 arm joints. Same robot and task.")
    S.save(fig, "demonstrator-style", "Two demonstrators, one task, very different motion styles",
           f"Strip plots of per-demonstration contact-phase duration (A mean {np.mean(a['contact_duration_s']):.1f} s, "
           f"B {np.mean(b['contact_duration_s']):.1f} s) and arm joint speed (A {np.mean(a['arm_speed_rad_s']):.2f} rad/s, "
           f"B {np.mean(b['arm_speed_rad_s']):.2f} rad/s).")


# ------------------------------------------------------------------------------------------------ E
def fig_dexjoco():
    d = load("dexjoco.json")
    tasks = d["tasks"]
    groups = [("Single-hand tasks", [t for t in tasks if not t["bimanual"]]),
              ("Bimanual tasks", [t for t in tasks if t["bimanual"]])]
    # layout rows from the top: group header, tasks sorted by my result, gap, ..., mean row
    rows = []
    for gname, ts in groups:
        rows.append(("header", gname))
        rows += [("task", t) for t in sorted(ts, key=lambda t: -t["gr00t_n16"]["mean_pct"])]
    rows.append(("header", ""))
    rows.append(("mean", d["mean_over_tasks_pct"]))
    n = len(rows)
    fig = plt.figure(figsize=(S.WIDTH_IN, 7.6))
    ax = fig.add_axes([0.2, 0.165, 0.765, 0.67])
    h = 0.32
    for i, (kind, t) in enumerate(rows):
        y = n - 1 - i
        if kind == "header":
            if t:
                ax.text(-1.5, y - 0.1, t.upper(), ha="right", va="center", fontsize=8, color=S.MUTED,
                        fontweight="semibold", transform=ax.transData)
            continue
        if kind == "task":
            mine, pub = t["gr00t_n16"], t["pi05_published"]
            vals = [(mine["mean_pct"], mine["sd_pct"], S.TEAL, y + h / 2 + 0.02), (pub["mean_pct"], pub["sd_pct"], S.ORANGE, y - h / 2 - 0.02)]
            label = t["task"]
        else:
            vals = [(t["gr00t_n16"], None, S.TEAL, y + h / 2 + 0.02), (t["pi05_published"], None, S.ORANGE, y - h / 2 - 0.02)]
            label = f"Mean of {d['n_tasks']} tasks"
            ax.axhline(y + 0.75, color=S.LINE_STRONG, lw=0.8, xmin=-0.25, clip_on=False)
        for v, sd, col, yy in vals:
            ax.barh(yy, max(v, 0.25), height=h, color=col, zorder=3)
            if v == 0:
                ax.text(1.0, yy, "0%", va="center", ha="left", fontsize=8, color=S.MUTED)
            if sd:
                ax.plot([max(v - sd, 0), v + sd], [yy, yy], color=S.FG, lw=0.9, alpha=0.55, zorder=4)
            if kind == "mean":
                ax.text(v + 1.2, yy, f"{v:.1f}%", va="center", ha="left", fontsize=9.5, color=S.FG, fontweight="medium")
        ax.text(-1.5, y, label, ha="right", va="center", fontsize=9.5, color=S.FG,
                fontweight="semibold" if kind == "mean" else "normal")
    ax.set_ylim(-0.7, n - 0.4)
    ax.set_xlim(0, 100)
    ax.set_yticks([])
    ax.set_xticks(range(0, 101, 20))
    ax.set_xticklabels([f"{x}%" for x in range(0, 101, 20)])
    ax.set_xlabel("Task success", labelpad=8)
    S.clean_axes(ax, grid_axis="x")
    ahead = [t for t in tasks if t["gr00t_n16"]["mean_pct"] > t["pi05_published"]["mean_pct"]]
    diff = {t["task"]: t["gr00t_n16"]["mean_pct"] - t["pi05_published"]["mean_pct"] for t in tasks}
    best = max(diff, key=diff.get)
    worst = sorted(diff, key=diff.get)[:2]
    S.header(fig, "DexJoCo: my fine-tuned GR00T N1.6 vs. published π0.5 on 11 dexterous tasks",
             f"Ahead on {len(ahead)} of {len(tasks)} tasks (largest gap: {best} +{diff[best]:.0f} points); behind on "
             f"{len(tasks) - len(ahead)} (largest: {worst[0]} \u2212{-diff[worst[0]]:.0f}, {worst[1]} \u2212{-diff[worst[1]]:.0f}).",
             top=0.972)
    handles = [Line2D([], [], color=S.TEAL, lw=7, label="GR00T N1.6, fine-tuned by me"),
               Line2D([], [], color=S.ORANGE, lw=7, label="π0.5, as published by the benchmark")]
    fig.legend(handles=handles, loc="upper left", bbox_to_anchor=(0.004, 0.905), ncol=2, handlelength=1.2,
               handletextpad=0.6, columnspacing=1.8, labelcolor=S.FG)
    S.footnote(fig,
               "Simulation benchmark. GR00T N1.6: fine-tuned separately per task (256×256 images), 3 evaluation runs "
               "× 50 episodes; whiskers = ±1 SD across runs.\n"
               "π0.5: numbers reported by the benchmark authors (±1 SD). Different training recipes, so this is "
               "a reproduction reference, not a controlled head-to-head.")
    S.save(fig, "dexjoco-success", "DexJoCo per-task success: GR00T N1.6 fine-tuned vs published pi0.5",
           "Horizontal grouped bars for 11 DexJoCo tasks. Mean success: GR00T N1.6 "
           f"{d['mean_over_tasks_pct']['gr00t_n16']:.1f}%, pi0.5 {d['mean_over_tasks_pct']['pi05_published']:.1f}%.")


FIGS = {"a": fig_hat, "b": fig_warp, "c": fig_learnability, "d": fig_style, "e": fig_dexjoco}

if __name__ == "__main__":
    S.setup()
    for k in (sys.argv[1:] or FIGS):
        FIGS[k]()
