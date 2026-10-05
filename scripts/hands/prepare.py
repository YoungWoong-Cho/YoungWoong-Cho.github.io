#!/usr/bin/env python3
"""Build web-ready right-hand models for the interactive hands viewer.

Input: a directory of pinned upstream hand descriptions laid out as
    <src>/<key>/<revision>/right/{model.urdf, manifest.json, assets/...}
where model.urdf references meshes as ".../assets/<path inside the upstream repo>".

Output (default: public/hands):
    <key>/model.urdf   palm subtree only, re-rooted at a canonical palm frame
                       (+X wrist->fingers, +Y thumb side, +Z back of the hand),
                       visual geometry only, one <visual> per colour part
    <key>/meshes.glb   decimated geometry, one node per part ("meshes.glb#pN")
    <key>/LICENSE      upstream licence text, unmodified
    hands.json         per-hand palm/fingertip links, finger-slot mapping,
                       joint limits + mimic info, target scale/offset, bounds,
                       and the canonical human hand with grasp presets
    CREDITS.json       display name, source URL, revision, licence

Usage:
    python scripts/hands/prepare.py --src <dir> [--out public/hands] [--budget 52000]
    then scripts/hands/seed-ik.mjs (adds per-preset IK seeds to hands.json)

Requires: numpy, scipy, trimesh, fast-simplification, pycollada (for .dae).
"""
from __future__ import annotations

import argparse
import glob
import json
import math
import re
import shutil
import struct
import xml.etree.ElementTree as ET
from pathlib import Path

import numpy as np
import trimesh
import fast_simplification
from scipy.optimize import least_squares

SLOTS = ["thumb", "index", "middle", "ring", "little"]

# Palm frame + fingertip links follow the cross-embodiment interface: every hand
# exposes its wrist pose plus palm-frame fingertips in anatomical finger slots.
# `align` is the rotation (URDF rpy) from the canonical palm frame to the palm link.
HANDS = [
    dict(key="shadow", name="Shadow Hand", maker="Shadow Robot",
         palm="rh_palm", align=[math.pi / 2, 0, math.pi / 2],
         tips=["rh_thtip", "rh_fftip", "rh_mftip", "rh_rftip", "rh_lftip"],
         license_file="LICENSE", license="BSD-3-Clause"),
    dict(key="sharpa", name="Sharpa Wave", maker="Sharpa",
         palm="right_hand_C_MC", align=[0, math.pi / 2, 0],
         tips=["right_thumb_fingertip", "right_index_fingertip", "right_middle_fingertip",
               "right_ring_fingertip", "right_pinky_fingertip"],
         license_file="LICENSE.txt", license="Apache-2.0"),
    dict(key="wuji-1", name="Wuji Hand", maker="Wuji Technology",
         palm="right_palm_link", align=[0, math.pi / 2, 0],
         tips=["right_finger1_tip_link", "right_finger2_tip_link", "right_finger3_tip_link",
               "right_finger4_tip_link", "right_finger5_tip_link"],
         license_file="LICENSE", license="MIT"),
    dict(key="wuji-2", name="Wuji Hand 2 (beta)", maker="Wuji Technology",
         palm="r_wrist", align=[-math.pi / 2, 0, math.pi / 2],
         tips=["r_thumb_tip", "r_index_finger_tip", "r_middle_finger_tip", "r_ring_finger_tip",
               "r_pinky_tip"],
         license_file="LICENSE", license="MIT"),
    dict(key="inspire-rh56", name="Inspire RH56", maker="Inspire Robots (model: Renesas RDK)",
         palm="base", align=[0, math.pi / 2, 0],
         tips=["thumb_tip", "index_tip", "middle_tip", "ring_tip", "pinky_tip"],
         license_file="urdf/reference/LICENSE.txt",
         license="No license file upstream (provenance note only); model derived from Inspire Robots' public STEP via dex_urdf"),
    dict(key="allegro-v4", name="Allegro Hand V4", maker="Wonik Robotics / SimLab",
         palm="palm_link", align=[0, math.pi / 2, 0],
         tips=["link_15.0_tip", "link_3.0_tip", "link_7.0_tip", "link_11.0_tip", None],
         license_file="LICENSE", license="BSD-2-Clause"),
    dict(key="leap-v1", name="LEAP Hand", maker="CMU (LEAP Hand)",
         palm="palm_lower", align=[0, 0, 0],
         tips=["thumb_fingertip", "fingertip", "fingertip_2", "fingertip_3", None],
         # LEAP's fingertip links are the distal phalanges (frame at the DIP joint);
         # the viewer places target spheres at the distal end of that link's mesh.
         tip_site_from_mesh=True,
         license_file="LICENSE.txt", license="MIT"),
]


# --------------------------------------------------------------------------- math

def rpy_matrix(r, p, y):
    cr, sr, cp, sp, cy, sy = math.cos(r), math.sin(r), math.cos(p), math.sin(p), math.cos(y), math.sin(y)
    return np.array([
        [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr],
        [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr],
        [-sp, cp * sr, cp * cr],
    ])


def transform(xyz=(0, 0, 0), rpy=(0, 0, 0)):
    T = np.eye(4)
    T[:3, :3] = rpy_matrix(*rpy)
    T[:3, 3] = xyz
    return T


def axis_angle(axis, angle):
    a = np.asarray(axis, float)
    a = a / np.linalg.norm(a)
    K = np.array([[0, -a[2], a[1]], [a[2], 0, -a[0]], [-a[1], a[0], 0]])
    T = np.eye(4)
    T[:3, :3] = np.eye(3) + math.sin(angle) * K + (1 - math.cos(angle)) * K @ K
    return T


def floats(text, default):
    return [float(v) for v in text.split()] if text else list(default)


def rx(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def ry(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def rz(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


# ------------------------------------------------------------------ human hand
# Canonical adult right hand in the palm frame (metres): origin at the wrist
# centre, +X towards the fingers, +Y towards the thumb, +Z out of the back of the
# hand. Flexion is a positive rotation about the local +Y axis (tip moves to -Z).
# The TypeScript FK in lib/hands/human.ts mirrors these conventions exactly.
HUMAN = dict(
    fingers=[
        # mcp position, phalanx lengths (proximal, middle, distal incl. pad), rest spread (rad)
        dict(slot="index", mcp=[0.094, 0.026, 0.0], lengths=[0.042, 0.025, 0.021], spread=0.08),
        dict(slot="middle", mcp=[0.097, 0.004, 0.0], lengths=[0.046, 0.028, 0.022], spread=0.0),
        dict(slot="ring", mcp=[0.091, -0.016, -0.002], lengths=[0.042, 0.027, 0.021], spread=-0.08),
        dict(slot="little", mcp=[0.082, -0.033, -0.005], lengths=[0.034, 0.020, 0.019], spread=-0.18),
    ],
    thumb=dict(cmc=[0.034, 0.024, -0.018], lengths=[0.045, 0.031, 0.025]),
)


def human_finger_points(f, a):
    """a = [abduction, mcp, pip, dip] -> [mcp, pip, dip, tip] positions."""
    R = rz(f["spread"] + a[0])
    p = np.asarray(f["mcp"], float)
    pts = [p.copy()]
    for L, flex in zip(f["lengths"], a[1:]):
        R = R @ ry(flex)
        p = p + R @ np.array([L, 0, 0])
        pts.append(p.copy())
    return pts


def human_thumb_points(t, a):
    """a = [yaw, pitch, roll, mcp, ip] -> [cmc, mcp, ip, tip] positions.

    yaw swings the metacarpal from +X towards +Y in the palm plane, pitch tilts
    it palmar (-Z), roll pronates it about its own axis; MCP/IP flex about local -Z.
    """
    R = rz(a[0]) @ ry(a[1]) @ rx(a[2])
    p = np.asarray(t["cmc"], float)
    pts = [p.copy()]
    for i, L in enumerate(t["lengths"]):
        if i > 0:
            R = R @ rz(-a[2 + i])
        p = p + R @ np.array([L, 0, 0])
        pts.append(p.copy())
    return pts


def human_tips(pose):
    tips = {"thumb": human_thumb_points(HUMAN["thumb"], pose["thumb"])[-1]}
    for f, a in zip(HUMAN["fingers"], pose["fingers"]):
        tips[f["slot"]] = human_finger_points(f, a)[-1]
    return tips


OPEN_THUMB = [0.95, 0.12, 0.3, 0.08, 0.1]
OPEN_FINGERS = [[0.0, 0.1, 0.15, 0.08]] * 4
CURLED = [0.0, 1.35, 1.55, 0.85]
HALF = [0.0, 0.85, 1.15, 0.6]


def solve_thumb(fingers, target, prior):
    """Human thumb angles reaching `target`, regularised towards `prior` (multi-start)."""
    def residual(x):
        tip = human_thumb_points(HUMAN["thumb"], x)[-1]
        return np.concatenate([(tip - target) * 1000.0, (np.asarray(x) - prior) * 2.0])

    lo = np.array([-0.2, -0.4, -0.6, -0.3, -0.3])
    hi = np.array([1.6, 1.3, 1.9, 1.2, 1.4])
    rng = np.random.default_rng(0)
    starts = [np.clip(prior, lo, hi)] + [lo + (hi - lo) * rng.random(5) for _ in range(24)]
    r = min((least_squares(residual, x0, bounds=(lo, hi)) for x0 in starts), key=lambda r: r.cost)
    tip = human_thumb_points(HUMAN["thumb"], r.x)[-1]
    return [float(v) for v in r.x], float(np.linalg.norm(tip - target))


def build_presets():
    presets = []

    def add(pid, label, fingers, thumb=None, thumb_target=None, prior=None, contacts=()):
        err = 0.0
        if thumb is None:
            thumb, err = solve_thumb(fingers, thumb_target(fingers), np.asarray(prior, float))
        pose = dict(fingers=[[float(v) for v in a] for a in fingers], thumb=[float(v) for v in thumb])
        presets.append(dict(id=pid, label=label, pose=pose, contacts=[list(c) for c in contacts],
                            thumb_solve_error_m=round(err, 5)))

    def pts(fingers, slot):
        i = [f["slot"] for f in HUMAN["fingers"]].index(slot)
        return human_finger_points(HUMAN["fingers"][i], fingers[i])

    gap = 0.016  # pad-to-pad separation between fingertip centres at contact
    contact_dir = np.array([-0.1, 0.5, -0.86])
    contact_dir /= np.linalg.norm(contact_dir)
    opposed = [0.63, 0.45, 0.76, 0.62, 0.51]

    # Open / thumbs-up thumb tips are placed inside the thumb workspace shared by
    # the seven hands (found by sampling each thumb's joint space), so the rest
    # pose is reachable everywhere; contact presets are defined by their contacts.
    add("open", "Open", OPEN_FINGERS, thumb_target=lambda f: np.array([0.085, 0.105, -0.025]), prior=[1.15, 0.0, 0.3, 0.1, 0.1])
    pinch_f = [[0.05, 0.8, 1.3, 0.65], [0.0, 0.6, 1.0, 0.5], [0.0, 0.66, 1.08, 0.55], [0.0, 0.72, 1.12, 0.6]]
    add("pinch", "Pinch", pinch_f, thumb_target=lambda f: pts(f, "index")[-1] + gap * contact_dir, prior=opposed,
        contacts=[("thumb", "index")])
    tri_f = [[0.0, 0.8, 1.3, 0.65], [0.12, 0.85, 1.3, 0.65], [0.0, 0.95, 1.25, 0.6], [0.0, 1.0, 1.3, 0.62]]
    add("tripod", "Tripod", tri_f,
        thumb_target=lambda f: 0.5 * (pts(f, "index")[-1] + pts(f, "middle")[-1]) + gap * contact_dir,
        prior=opposed, contacts=[("thumb", "index"), ("thumb", "middle")])
    power_f = [[0.0, 0.95, 1.25, 0.7], [0.0, 1.0, 1.3, 0.72], [0.0, 1.05, 1.32, 0.72], [0.0, 1.1, 1.35, 0.72]]
    add("power", "Power grasp", power_f,
        thumb_target=lambda f: 0.5 * (pts(f, "index")[2] + pts(f, "middle")[2]) + np.array([0.0, 0.0, -0.016]),
        prior=[0.9, 0.85, 1.3, 0.45, 0.4])
    point_f = [[0.0, 0.03, 0.05, 0.03], CURLED, CURLED, CURLED]
    add("point", "Point", point_f,
        thumb_target=lambda f: 0.5 * (pts(f, "middle")[1] + pts(f, "middle")[2]) + np.array([0.0, 0.0, -0.014]),
        prior=[0.9, 0.8, 1.2, 0.4, 0.35])
    add("thumbs_up", "Thumbs-up", [CURLED, CURLED, CURLED, CURLED],
        thumb_target=lambda f: np.array([0.055, 0.120, -0.020]), prior=[1.3, 0.0, 0.1, 0.0, -0.1])
    return presets


# ------------------------------------------------------------------- URDF model

class Urdf:
    def __init__(self, path):
        self.root = ET.parse(path).getroot()
        self.materials = {}
        for m in self.root.findall("material"):
            c = m.find("color")
            if c is not None and m.get("name"):
                self.materials[m.get("name")] = c.get("rgba")
        self.links = {l.get("name"): l for l in self.root.findall("link")}
        self.joints = {}
        for j in self.root.findall("joint"):
            o = j.find("origin")
            a = j.find("axis")
            lim = j.find("limit")
            m = j.find("mimic")
            self.joints[j.get("name")] = dict(
                el=j, name=j.get("name"), type=j.get("type"),
                parent=j.find("parent").get("link"), child=j.find("child").get("link"),
                T=transform(floats(o.get("xyz") if o is not None else None, (0, 0, 0)),
                            floats(o.get("rpy") if o is not None else None, (0, 0, 0))),
                axis=floats(a.get("xyz") if a is not None else None, (1, 0, 0)),
                lower=float(lim.get("lower", 0)) if lim is not None and lim.get("lower") else 0.0,
                upper=float(lim.get("upper", 0)) if lim is not None and lim.get("upper") else 0.0,
                mimic=None if m is None else dict(joint=m.get("joint"),
                                                  multiplier=float(m.get("multiplier", 1)),
                                                  offset=float(m.get("offset", 0))),
            )
        self.parent_joint = {j["child"]: j for j in self.joints.values()}

    def subtree(self, palm):
        names, joints = {palm}, []
        pending = list(self.joints.values())
        changed = True
        while changed:
            changed = False
            for j in list(pending):
                if j["parent"] in names:
                    names.add(j["child"])
                    joints.append(j)
                    pending.remove(j)
                    changed = True
        return names, joints

    def actuated(self, j):
        return j["type"] in ("revolute", "continuous", "prismatic") and not j["mimic"]

    def joint_value(self, j, q):
        if j["mimic"]:
            return q.get(j["mimic"]["joint"], 0.0) * j["mimic"]["multiplier"] + j["mimic"]["offset"]
        return q.get(j["name"], 0.0)

    def fk(self, root, q, joints):
        by_parent = {}
        for j in joints:
            by_parent.setdefault(j["parent"], []).append(j)
        poses = {root: np.eye(4)}
        stack = [root]
        while stack:
            p = stack.pop()
            for j in by_parent.get(p, []):
                v = self.joint_value(j, q)
                if j["type"] in ("revolute", "continuous"):
                    M = axis_angle(j["axis"], v)
                elif j["type"] == "prismatic":
                    M = np.eye(4)
                    M[:3, 3] = np.asarray(j["axis"]) * v
                else:
                    M = np.eye(4)
                poses[j["child"]] = poses[p] @ j["T"] @ M
                stack.append(j["child"])
        return poses

    def chain(self, tip, palm):
        out, link = [], tip
        while link != palm:
            j = self.parent_joint[link]
            out.append(j)
            link = j["parent"]
        return list(reversed(out))


# -------------------------------------------------------------------- meshes

def srgb_from_linear(c):
    c = np.clip(np.asarray(c, float), 0, 1)
    return np.where(c <= 0.0031308, 12.92 * c, 1.055 * np.power(c, 1 / 2.4) - 0.055)


def embedded_color(geom, linear):
    vis = geom.visual
    mat = getattr(vis, "material", None)
    rgba = None
    if mat is not None:
        f = getattr(mat, "baseColorFactor", None)
        if f is None:
            f = getattr(mat, "main_color", None)
        if f is not None:
            rgba = np.asarray(f, float)[:4] / (255.0 if np.asarray(f).dtype.kind in "ui" else 1.0)
        elif linear:
            rgba = np.array([1.0, 1.0, 1.0, 1.0])  # glTF default base colour
    elif hasattr(vis, "face_colors") and getattr(vis, "kind", None) == "face":
        rgba = np.asarray(vis.face_colors[0], float) / 255.0
    if rgba is None:
        return None
    rgb = srgb_from_linear(rgba[:3]) if linear else rgba[:3]
    return [float(v) for v in rgb]


def load_parts(path):
    """Return [(vertices, faces, srgb or None)] in the mesh file's own frame."""
    ext = path.suffix.lower()
    if ext == ".stl":
        m = trimesh.load(path, force="mesh", process=True)
        return [(np.asarray(m.vertices), np.asarray(m.faces), None)]
    scene = trimesh.load(path, force="scene", process=False)
    parts = []
    for node in scene.graph.nodes_geometry:
        T, gname = scene.graph[node]
        g = scene.geometry[gname]
        if not isinstance(g, trimesh.Trimesh) or len(g.faces) == 0:
            continue
        v = trimesh.transform_points(np.asarray(g.vertices), T)
        parts.append((v, np.asarray(g.faces), embedded_color(g, linear=(ext in (".glb", ".gltf")))))
    return parts


def merge(parts):
    vs, fs, off = [], [], 0
    for v, f in parts:
        vs.append(v)
        fs.append(f + off)
        off += len(v)
    m = trimesh.Trimesh(np.concatenate(vs), np.concatenate(fs), process=True)
    return np.asarray(m.vertices), np.asarray(m.faces)


def decimate(v, f, target):
    if len(f) <= target:
        return v, f
    v2, f2 = fast_simplification.simplify(v.astype(np.float32), f.astype(np.int32),
                                          target_reduction=1.0 - target / len(f), agg=6)
    m = trimesh.Trimesh(v2, f2, process=True)
    m.remove_unreferenced_vertices()
    return np.asarray(m.vertices), np.asarray(m.faces)


def write_glb(path, parts):
    """parts: [(name, vertices float32 Nx3, faces Mx3)] -> minimal glTF 2.0 binary."""
    bin_chunks, views, accessors, meshes, nodes = [], [], [], [], []
    offset = 0

    def add_view(data, target):
        nonlocal offset
        pad = (-len(data)) % 4
        views.append(dict(buffer=0, byteOffset=offset, byteLength=len(data), target=target))
        bin_chunks.append(data + b"\0" * pad)
        offset += len(data) + pad
        return len(views) - 1

    for name, v, f in parts:
        v = np.ascontiguousarray(v, dtype="<f4")
        idx_type, idx_ct = ("<u2", 5123) if len(v) < 65536 else ("<u4", 5125)
        idx = np.ascontiguousarray(f.reshape(-1), dtype=idx_type)
        pv = add_view(v.tobytes(), 34962)
        iv = add_view(idx.tobytes(), 34963)
        accessors.append(dict(bufferView=pv, componentType=5126, count=len(v), type="VEC3",
                              min=[float(x) for x in v.min(0)], max=[float(x) for x in v.max(0)]))
        accessors.append(dict(bufferView=iv, componentType=idx_ct, count=len(idx), type="SCALAR"))
        meshes.append(dict(name=name, primitives=[dict(attributes=dict(POSITION=len(accessors) - 2),
                                                      indices=len(accessors) - 1, mode=4)]))
        nodes.append(dict(name=name, mesh=len(meshes) - 1))

    blob = b"".join(bin_chunks)
    gltf = dict(asset=dict(version="2.0", generator="prepare.py"), scene=0,
                scenes=[dict(nodes=list(range(len(nodes))))], nodes=nodes, meshes=meshes,
                accessors=accessors, bufferViews=views, buffers=[dict(byteLength=len(blob))])
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * ((-len(js)) % 4)
    total = 12 + 8 + len(js) + 8 + len(blob)
    with open(path, "wb") as fh:
        fh.write(struct.pack("<4sII", b"glTF", 2, total))
        fh.write(struct.pack("<I4s", len(js), b"JSON") + js)
        fh.write(struct.pack("<I4s", len(blob), b"BIN\0") + blob)


# ---------------------------------------------------------------- per hand

def fmt(values):
    return " ".join(f"{v:.6g}" for v in values)


def resolve_mesh(model_dir, filename):
    m = re.search(r"/assets/(.+)$", filename)
    rel = m.group(1) if m else re.sub(r"^package://[^/]+/", "", filename)
    return model_dir / "assets" / rel


def visual_color(urdf, visual):
    mat = visual.find("material")
    if mat is None:
        return None
    c = mat.find("color")
    rgba = c.get("rgba") if c is not None else urdf.materials.get(mat.get("name") or "")
    if not rgba:
        return None
    return [float(v) for v in rgba.split()][:3]


def prepare_hand(spec, src, out, budget):
    model_dir = Path(glob.glob(str(src / spec["key"] / "*" / "right"))[0])
    manifest = json.loads((model_dir / "manifest.json").read_text())
    urdf = Urdf(model_dir / "model.urdf")
    palm = spec["palm"]
    names, joints = urdf.subtree(palm)
    tips = spec["tips"]
    for t in tips:
        if t is not None and t not in names:
            raise SystemExit(f"{spec['key']}: tip {t} not under palm {palm}")

    dest = out / spec["key"]
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)

    # ---- collect visuals and unique mesh parts
    unique = {}  # (file, scale, color-key) -> part record
    visuals = {}  # link -> [(origin xyz, rpy, [part ids], [colors])]
    for lname in names:
        link = urdf.links[lname]
        for vis in link.findall("visual"):
            geo = vis.find("geometry")
            mesh = geo.find("mesh") if geo is not None else None
            if mesh is None:
                continue  # primitive visuals are not used by any of these hands
            o = vis.find("origin")
            xyz = floats(o.get("xyz") if o is not None else None, (0, 0, 0))
            rpy = floats(o.get("rpy") if o is not None else None, (0, 0, 0))
            scale = floats(mesh.get("scale"), (1, 1, 1))
            path = resolve_mesh(model_dir, mesh.get("filename"))
            declared = visual_color(urdf, vis)
            key = (str(path), tuple(scale), None if declared is None else tuple(declared))
            if key not in unique:
                raw = load_parts(path)
                groups = {}
                for v, f, col in raw:
                    c = declared or col or [0.7, 0.7, 0.7]
                    ck = tuple(round(x, 3) for x in c)
                    groups.setdefault(ck, []).append((v * np.asarray(scale), f))
                unique[key] = [dict(color=list(ck), parts=g) for ck, g in groups.items()]
            visuals.setdefault(lname, []).append((xyz, rpy, key))

    # ---- decimate within the per-hand triangle budget
    records = [r for recs in unique.values() for r in recs]
    for r in records:
        r["v"], r["f"] = merge(r["parts"]) if len(r["parts"]) > 1 else r["parts"][0]
        r["faces_in"] = len(r["f"])
    total_in = sum(r["faces_in"] for r in records)
    ratio = min(1.0, budget / max(1, total_in))
    for i, r in enumerate(records):
        target = max(min(r["faces_in"], 600), int(r["faces_in"] * ratio))
        r["v"], r["f"] = decimate(r["v"], r["f"], target)
        r["id"] = f"p{i}"
    write_glb(dest / "meshes.glb", [(r["id"], r["v"], r["f"]) for r in records])
    total_out = sum(len(r["f"]) for r in records)

    # ---- canonical palm-rooted URDF
    robot = ET.Element("robot", name=spec["key"])
    ET.SubElement(robot, "link", name="palm_frame")
    j = ET.SubElement(robot, "joint", name="palm_frame_to_palm", type="fixed")
    ET.SubElement(j, "parent", link="palm_frame")
    ET.SubElement(j, "child", link=palm)
    ET.SubElement(j, "origin", xyz="0 0 0", rpy=fmt(spec["align"]))
    for lname in [palm] + [jj["child"] for jj in joints]:
        link = ET.SubElement(robot, "link", name=lname)
        for xyz, rpy, key in visuals.get(lname, []):
            for r in unique[key]:
                vis = ET.SubElement(link, "visual")
                ET.SubElement(vis, "origin", xyz=fmt(xyz), rpy=fmt(rpy))
                g = ET.SubElement(vis, "geometry")
                ET.SubElement(g, "mesh", filename=f"meshes.glb#{r['id']}")
                m = ET.SubElement(vis, "material", name="")
                ET.SubElement(m, "color", rgba=fmt(r["color"] + [1.0]))
    for jj in joints:
        src_el = jj["el"]
        el = ET.SubElement(robot, "joint", name=jj["name"], type=jj["type"])
        ET.SubElement(el, "parent", link=jj["parent"])
        ET.SubElement(el, "child", link=jj["child"])
        o = src_el.find("origin")
        ET.SubElement(el, "origin", xyz=(o.get("xyz", "0 0 0") if o is not None else "0 0 0"),
                      rpy=(o.get("rpy", "0 0 0") if o is not None else "0 0 0"))
        if jj["type"] != "fixed":
            ET.SubElement(el, "axis", xyz=fmt(jj["axis"]))
            lim = src_el.find("limit")
            if lim is not None:
                ET.SubElement(el, "limit", **{k: lim.get(k) for k in ("lower", "upper", "effort", "velocity") if lim.get(k)})
            if jj["mimic"]:
                ET.SubElement(el, "mimic", joint=jj["mimic"]["joint"], multiplier=f"{jj['mimic']['multiplier']:.6g}",
                              offset=f"{jj['mimic']['offset']:.6g}")
    ET.indent(robot, space="  ")
    (dest / "model.urdf").write_bytes(
        b"<?xml version='1.0' encoding='utf-8'?>\n"
        + f"<!-- {spec['name']} (right). Derived from {manifest['source_url']} ; see LICENSE. "
          f"Palm subtree only, visual meshes decimated. Root frame: +X fingers, +Y thumb side, +Z back of hand. -->\n".encode()
        + ET.tostring(robot, encoding="utf-8"))

    lic_src = model_dir / "assets" / spec["license_file"]
    shutil.copyfile(lic_src, dest / "LICENSE")

    # ---- kinematics summary in the canonical palm frame
    A = transform((0, 0, 0), spec["align"])
    act = [jj for jj in joints if urdf.actuated(jj)]
    q0 = {jj["name"]: min(jj["upper"], max(jj["lower"], 0.0)) for jj in act}
    poses = {k: A @ v for k, v in urdf.fk(palm, q0, joints).items()}

    # Tip sites: offsets (in tip-link frame) of the point the viewer tracks.
    sites = {}
    for slot, t in zip(SLOTS, tips):
        if t is None:
            continue
        off = np.zeros(3)
        if spec.get("tip_site_from_mesh"):
            pts = []
            for xyz, rpy, key in visuals.get(t, []):
                Tv = transform(xyz, rpy)
                for r in unique[key]:
                    pts.append(trimesh.transform_points(r["v"], Tv))
            pts = np.concatenate(pts)
            d = pts.mean(0) / np.linalg.norm(pts.mean(0))
            proj = pts @ d
            cap = pts[proj >= proj.max() - 0.012]
            off = cap.mean(0)
        sites[slot] = off

    def tip_pos(slot, P):
        T = P[tips[SLOTS.index(slot)]]
        return (T @ np.append(sites[slot], 1.0))[:3]

    # Bounds of all visual geometry at the neutral pose, and of the "core" (palm +
    # non-thumb fingers): thumbs of some hands rest folded back at zero, so the
    # viewer centres each hand on its core.
    thumb_chain = urdf.chain(tips[0], palm)
    first_moving = next(i for i, jj in enumerate(thumb_chain) if jj["type"] != "fixed")
    thumb_links = {jj["child"] for jj in thumb_chain[first_moving:]}
    for jj in joints:  # joints are in breadth-first order: include side branches
        if jj["parent"] in thumb_links:
            thumb_links.add(jj["child"])
    lo, hi = np.full(3, np.inf), np.full(3, -np.inf)
    clo, chi = np.full(3, np.inf), np.full(3, -np.inf)
    for lname, vl in visuals.items():
        for xyz, rpy, key in vl:
            T = poses[lname] @ transform(xyz, rpy)
            for r in unique[key]:
                p = trimesh.transform_points(r["v"], T)
                lo, hi = np.minimum(lo, p.min(0)), np.maximum(hi, p.max(0))
                if lname not in thumb_links:
                    clo, chi = np.minimum(clo, p.min(0)), np.maximum(chi, p.max(0))

    # Target mapping: human targets h -> s * h + t. s matches the middle finger
    # length (MCP joint to fingertip); t aligns the finger bases (MCP joints) and
    # straight-finger tips of the non-thumb fingers in the least-squares sense.
    def mcp_of(slot):
        chain = [jj for jj in urdf.chain(tips[SLOTS.index(slot)], palm) if jj["type"] != "fixed"]
        return chain, [poses[jj["child"]][:3, 3] for jj in chain]

    _, mid_pts = mcp_of("middle")
    robot_mid = np.linalg.norm(tip_pos("middle", poses) - mid_pts[0])
    hf = HUMAN["fingers"][1]
    straight = [[0.0, 0.0, 0.0, 0.0]] * 4
    human_mid = np.linalg.norm(human_finger_points(hf, straight[1])[-1] - np.asarray(hf["mcp"]))
    s = robot_mid / human_mid
    straight_tips = human_tips(dict(fingers=straight, thumb=OPEN_THUMB))
    used = [sl for sl, t in zip(SLOTS[1:], tips[1:]) if t is not None]
    pairs = []
    for sl in used:
        _, pts = mcp_of(sl)
        tip = tip_pos(sl, poses)
        # the MCP is the most proximal joint within reach of a finger-length of the tip
        mcp = next(p for p in pts if np.linalg.norm(tip - p) <= 1.2 * robot_mid)
        hmcp = np.asarray(HUMAN["fingers"][SLOTS.index(sl) - 1]["mcp"])
        pairs += [(mcp, hmcp), (tip, straight_tips[sl])]
    t_off = np.mean([r - s * h for r, h in pairs], axis=0)
    open_tips = human_tips(dict(fingers=OPEN_FINGERS, thumb=OPEN_THUMB))

    slots = {}
    for slot, t in zip(SLOTS, tips):
        if t is None:
            slots[slot] = None
            continue
        ch = urdf.chain(t, palm)
        masters = []
        for jj in ch:
            if jj["type"] == "fixed":
                continue
            m = jj["mimic"]["joint"] if jj["mimic"] else jj["name"]
            if m not in masters:
                masters.append(m)
        slots[slot] = dict(link=t, site=[round(float(x), 6) for x in sites[slot]], joints=masters,
                           neutral_tip=[round(float(x), 5) for x in tip_pos(slot, poses)])

    info = dict(
        key=spec["key"], name=spec["name"], maker=spec["maker"],
        urdf=f"/hands/{spec['key']}/model.urdf", mesh=f"/hands/{spec['key']}/meshes.glb",
        root="palm_frame", palm=palm,
        dof=len(act), fingers=sum(1 for t in tips if t is not None),
        slots=slots,
        joints=[dict(name=jj["name"], lower=round(jj["lower"], 6), upper=round(jj["upper"], 6)) for jj in act],
        mimic=[dict(name=jj["name"], joint=jj["mimic"]["joint"], multiplier=jj["mimic"]["multiplier"],
                    offset=jj["mimic"]["offset"]) for jj in joints if jj["mimic"]],
        target_scale=round(float(s), 5), target_offset=[round(float(x), 6) for x in t_off],
        bounds=dict(min=[round(float(x), 5) for x in lo], max=[round(float(x), 5) for x in hi]),
        core_bounds=dict(min=[round(float(x), 5) for x in clo], max=[round(float(x), 5) for x in chi]),
        display=dict(scale=1.0),
        license=spec["license"], source_url=manifest["source_url"], revision=manifest["revision"],
    )
    size = sum(p.stat().st_size for p in dest.iterdir())
    src_size = sum(r["faces_in"] for r in records)
    print(f"{spec['key']:<13} dof={len(act):>2} mimic={len(info['mimic'])} faces {src_size:>7} -> {total_out:>6} "
          f"size {size / 1e6:.2f} MB  s={s:.3f}  tips={[t for t in tips if t]}")
    for slot in SLOTS:
        if slots[slot]:
            print(f"    {slot:<7} {slots[slot]['link']:<26} neutral={np.round(np.array(slots[slot]['neutral_tip']) * 1000, 1)} mm"
                  f" target(open)={np.round((s * open_tips[slot] + t_off) * 1000, 1)}")
    return info


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--src", required=True, type=Path)
    ap.add_argument("--out", type=Path, default=Path(__file__).resolve().parents[2] / "public" / "hands")
    ap.add_argument("--budget", type=int, default=52000, help="max triangles per hand")
    ap.add_argument("--presets-only", action="store_true",
                    help="only rewrite the human model + presets in an existing hands.json")
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)

    presets = build_presets()
    for p in presets:
        print(f"preset {p['id']:<10} thumb solve error {p['thumb_solve_error_m'] * 1000:.2f} mm")
    if args.presets_only:
        doc = json.loads((args.out / "hands.json").read_text())
        doc["human"]["fingers"], doc["human"]["thumb"] = HUMAN["fingers"], HUMAN["thumb"]
        doc["presets"] = presets
        for h in doc["hands"]:
            h.pop("ik_seeds", None)  # stale: rerun seed-ik
        (args.out / "hands.json").write_text(json.dumps(doc, indent=1))
        return
    hands = [prepare_hand(spec, args.src, args.out, args.budget) for spec in HANDS]

    human = dict(
        fingers=HUMAN["fingers"], thumb=HUMAN["thumb"],
        conventions="palm frame: +X wrist->fingers, +Y thumb side, +Z back of hand; metres; "
                    "finger a=[abd, mcp, pip, dip] (flexion about local +Y); "
                    "thumb a=[yaw (Rz), pitch (Ry), roll (Rx), mcp, ip] (flexion about local -Z)",
    )
    doc = dict(schema="hands-viewer/v1", slots=SLOTS, human=human, presets=presets, hands=hands)
    (args.out / "hands.json").write_text(json.dumps(doc, indent=1))
    credits = [dict(key=h["key"], name=h["name"], maker=h["maker"], source_url=h["source_url"],
                    revision=h["revision"], license=h["license"], license_file=f"/hands/{h['key']}/LICENSE",
                    modifications="Right hand only; trimmed to the palm subtree; collision/inertial/simulator "
                                  "tags removed; visual meshes merged per colour, decimated and converted to GLB.")
               for h in hands]
    (args.out / "CREDITS.json").write_text(json.dumps(credits, indent=1))
    total = sum(f.stat().st_size for f in args.out.rglob("*") if f.is_file())
    print(f"total public/hands size: {total / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
