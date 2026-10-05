"""Build the portfolio video clips and images under public/media/.

Every clip is composed frame by frame in Python (crop, stack, label) and piped to
ffmpeg as raw RGB, then encoded as H.264 (libx264, yuv420p, CRF 25, preset slow,
+faststart, no audio). A poster JPG of the first output frame is written next to
each clip.

Usage (from the repo root, in any venv with numpy, opencv-python, pillow, imageio-ffmpeg):
    python scripts/media/build_clips.py all
    python scripts/media/build_clips.py water hanoi hammer determinism aria montage

Source paths point at local evaluation outputs on the author's machine; they are
not part of this repository.
"""
from __future__ import annotations

import os
import subprocess
import sys

import cv2
import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFont

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
VID_OUT = os.path.join(REPO, "public", "media", "videos")
IMG_OUT = os.path.join(REPO, "public", "media", "images")
# Root of the local evaluation outputs (override with MEDIA_SRC_ROOT).
WS = os.environ["MEDIA_SRC_ROOT"]  # root of the local evaluation outputs
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

FONT_PATH = "/System/Library/Fonts/HelveticaNeue.ttc"
FONT_MEDIUM = 10  # face index of "Helvetica Neue Medium" in the collection

BG = (11, 13, 16)  # --bg
FG = (231, 236, 242)  # --fg
TEAL = (69, 208, 189)  # --action
WARN = (229, 103, 127)  # --warn
MUTED = (152, 164, 178)  # --fg-muted


# --------------------------------------------------------------------------- labels

def make_label(text: str, size: int = 17, dot: tuple | None = None, fg=FG, alpha: float = 0.74) -> np.ndarray:
    """Return an RGBA label: text on a rounded, semi-transparent dark box."""
    font = ImageFont.truetype(FONT_PATH, size, index=FONT_MEDIUM)
    asc, desc = font.getmetrics()
    tw = int(np.ceil(font.getlength(text)))
    pad_x, pad_y = round(size * 0.55), round(size * 0.32)
    dot_d = round(size * 0.5) if dot else 0
    dot_gap = round(size * 0.4) if dot else 0
    w = pad_x * 2 + dot_d + dot_gap + tw
    h = pad_y * 2 + asc + desc
    scale = 3  # supersample the box corners
    box = Image.new("RGBA", (w * scale, h * scale), (0, 0, 0, 0))
    ImageDraw.Draw(box).rounded_rectangle(
        (0, 0, w * scale - 1, h * scale - 1), radius=round(size * 0.35) * scale, fill=BG + (int(255 * alpha),)
    )
    if dot:
        cy = h * scale / 2
        x0 = pad_x * scale
        ImageDraw.Draw(box).ellipse((x0, cy - dot_d * scale / 2, x0 + dot_d * scale, cy + dot_d * scale / 2), fill=dot + (255,))
    box = box.resize((w, h), Image.LANCZOS)
    ImageDraw.Draw(box).text((pad_x + dot_d + dot_gap, pad_y), text, font=font, fill=fg + (255,))
    return np.asarray(box)


def paste(frame: np.ndarray, label: np.ndarray, x: int, y: int, anchor: str = "tl") -> None:
    """Alpha-blend an RGBA label into an RGB frame in place. anchor: tl/tr/bl/br."""
    h, w = label.shape[:2]
    if "r" in anchor:
        x = x - w
    if "b" in anchor:
        y = y - h
    region = frame[y:y + h, x:x + w].astype(np.float32)
    a = label[..., 3:4].astype(np.float32) / 255.0
    frame[y:y + h, x:x + w] = (label[..., :3] * a + region * (1 - a)).astype(np.uint8)


# --------------------------------------------------------------------------- io

def read_frames(path: str, start: int = 0, count: int | None = None):
    cap = cv2.VideoCapture(path)
    if start:
        cap.set(cv2.CAP_PROP_POS_FRAMES, start)
    n = 0
    while count is None or n < count:
        ok, f = cap.read()
        if not ok:
            break
        yield cv2.cvtColor(f, cv2.COLOR_BGR2RGB)
        n += 1
    cap.release()


def load_all(path: str, start: int = 0, count: int | None = None) -> list[np.ndarray]:
    return list(read_frames(path, start, count))


def pad_to(frames: list[np.ndarray], n: int) -> list[np.ndarray]:
    """Freeze the last frame so the list has exactly n frames (or trim to n)."""
    return frames[:n] + [frames[-1]] * max(0, n - len(frames))


class Encoder:
    def __init__(self, out_path: str, w: int, h: int, fps: float, crf: int = 25):
        assert w % 2 == 0 and h % 2 == 0, (w, h)
        self.out_path, self.w, self.h = out_path, w, h
        self.first = None
        cmd = [
            FFMPEG, "-y", "-loglevel", "error",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-r", str(fps), "-i", "-",
            "-an", "-c:v", "libx264", "-preset", "slow", "-crf", str(crf),
            "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart",
            "-map_metadata", "-1", out_path,
        ]
        self.proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    def write(self, frame: np.ndarray) -> None:
        assert frame.shape == (self.h, self.w, 3), frame.shape
        if self.first is None:
            self.first = frame.copy()
        self.proc.stdin.write(np.ascontiguousarray(frame, dtype=np.uint8).tobytes())

    def close(self, poster_frame: np.ndarray | None = None) -> None:
        self.proc.stdin.close()
        if self.proc.wait() != 0:
            raise RuntimeError(f"ffmpeg failed for {self.out_path}")
        poster = poster_frame if poster_frame is not None else self.first
        jpg = os.path.splitext(self.out_path)[0] + ".jpg"
        Image.fromarray(poster).save(jpg, quality=84, optimize=True, progressive=True)
        print("wrote", self.out_path, os.path.getsize(self.out_path) // 1024, "KB;", jpg)


def hstack(panels: list[np.ndarray], gap: int = 8) -> np.ndarray:
    h = panels[0].shape[0]
    sep = np.full((h, gap, 3), BG, np.uint8)
    out = []
    for i, p in enumerate(panels):
        if i:
            out.append(sep)
        out.append(p)
    return np.hstack(out)


def vstack(rows: list[np.ndarray], gap: int = 8) -> np.ndarray:
    w = rows[0].shape[1]
    sep = np.full((gap, w, 3), BG, np.uint8)
    out = []
    for i, r in enumerate(rows):
        if i:
            out.append(sep)
        out.append(r)
    return np.vstack(out)


# --------------------------------------------------------------------------- clips

# Single-arm DexJoCo front camera (640x640): keep the tabletop, drop the floor.
SCENE_CROP = (60, 0, 620, 420)  # x0, y0, x1, y1


def crop(f: np.ndarray, box) -> np.ndarray:
    x0, y0, x1, y1 = box
    return f[y0:y1, x0:x1]


def outcome_side_by_side(left, right, out_name, left_title, right_title,
                         right_done_frame, right_tag, left_tag, n_frames, fps=30, box=SCENE_CROP):
    """Two equally long panels; outcome tags appear once the right episode ends."""
    lt, rt = make_label(left_title), make_label(right_title)
    ltag = make_label(left_tag[0], size=15, dot=left_tag[1])
    rtag = make_label(right_tag[0], size=15, dot=right_tag[1])
    pw = box[2] - box[0]
    gap = 8
    w, h = pw * 2 + gap, box[3] - box[1]
    enc = Encoder(os.path.join(VID_OUT, out_name), w, h, fps)
    for i in range(n_frames):
        a, b = crop(left[i], box).copy(), crop(right[i], box).copy()
        paste(a, lt, 12, 12)
        paste(b, rt, 12, 12)
        if i >= right_done_frame:
            paste(a, ltag, 12, h - 12, "bl")
            paste(b, rtag, 12, h - 12, "bl")
        enc.write(hstack([a, b], gap))
    enc.close()


def clip_water():
    fail = os.path.join(WS, "gam_wp_gtdepth10k_eval_videos/water_plant/rand_obj/run_1/dexjoco_out/episode_02_failure/front.mp4")
    succ = os.path.join(WS, "gam_water_plant_videos/step70k/seed0/episode_02_success/front.mp4")
    n = 360  # 12 s at 30 fps
    left = load_all(fail, count=n)
    right_all = load_all(succ)
    done = len(right_all)  # 261 frames = 8.7 s; the episode ends on success
    right = pad_to(right_all, n)
    outcome_side_by_side(
        left, right, "gam-water-plant-before-after.mp4", "Initial recipe", "Tuned recipe",
        right_done_frame=done - 1,
        right_tag=(f"success · {done / 30:.1f} s", TEAL),
        left_tag=("failure · timed out at 33 s", WARN),
        n_frames=n,
    )


def clip_hammer():
    src = os.path.join(WS, "hammer_nail_comparison/episode_02.mp4")
    n = 330  # 11 s
    frames = load_all(src, count=n)
    left = [f[:, :640] for f in frames]
    right = [f[:, 640:] for f in frames]
    # GR00T side (right) stops changing after frame 223 -> episode ended (success) at 224 frames.
    done = 224
    outcome_side_by_side(
        left, right, "hammer-nail-comparison.mp4", "π0.5", "GR00T N1.6 (fine-tuned)",
        right_done_frame=done - 1,
        right_tag=(f"success · {done / 30:.1f} s", TEAL),
        left_tag=("failure · timed out at 33 s", WARN),
        n_frames=n,
        box=(30, 56, 590, 416),  # also drops the burned-in source titles at the top
    )


def clip_determinism():
    src = os.path.join(WS, "offsamples_evidence/comparisons/offsamples8_ep00_front_A-failure_B-success.mp4")
    n = 360
    frames = load_all(src, count=n)
    left = [f[:, :640] for f in frames]  # pass A (failure)
    right = [f[:, 640:1280] for f in frames]  # pass B (success); third panel (diff) dropped
    done = 293  # pass B episode length in frames (9.8 s); frozen afterwards in the source
    outcome_side_by_side(
        left, right, "eval-determinism.mp4", "same seed, pass A", "same seed, pass B",
        right_done_frame=done - 1,
        right_tag=(f"success · {done / 30:.1f} s", TEAL),
        left_tag=("failure · timed out at 33 s", WARN),
        n_frames=n,
    )


def clip_hanoi():
    """Rows: front view, left-wrist view. Columns: camera | predicted future depth | actual next depth."""
    src = os.path.join(WS, "gam5080_eval/full_episode/bimanual_hanoi_seed0_depth.mp4")
    header, tile = 20, 224
    strip = 17  # per-tile burned-in name strip at the top of each tile
    scale = 1.5
    calls = 120  # one frame per policy call; 0..119
    fps = 10
    tw, th = int(tile * scale), int((tile - strip) * scale)
    th -= th % 2
    gap = 6
    col_titles = ["camera", "predicted depth (future)", "actual depth"]
    row_titles = ["front view", "left wrist view"]
    col_labels = [make_label(t, size=16) for t in col_titles]
    row_labels = [make_label(t, size=14, fg=MUTED) for t in row_titles]
    src_rows = [0, 2, 3]  # 0: RGB, 1: current depth (dropped), 2: predicted future depth, 3: actual next depth
    views = [0, 1]  # 0: front, 1: left wrist, 2: right wrist
    w = tw * 3 + gap * 2
    h = th * len(views) + gap * (len(views) - 1)
    enc = Encoder(os.path.join(VID_OUT, "dexjoco-hanoi-depth.mp4"), w, h, fps)
    for f in read_frames(src, 0, calls):
        rows = []
        for vi, v in enumerate(views):
            tiles = []
            for ci, r in enumerate(src_rows):
                y0 = header + r * tile + strip
                t = f[y0:header + (r + 1) * tile, v * tile:(v + 1) * tile]
                t = cv2.resize(t, (tw, th), interpolation=cv2.INTER_CUBIC)
                if vi == 0:
                    paste(t, col_labels[ci], 10, 10)
                if ci == 0:
                    paste(t, row_labels[vi], 10, th - 10, "bl")
                tiles.append(t)
            rows.append(hstack(tiles, gap))
        enc.write(vstack(rows, gap))
    enc.close()


def clip_montage():
    """2x2 teaser of successful DexJoCo episodes (public benchmark only)."""
    # All tiles are 560x380 crops at native resolution (no rescaling, aspect preserved).
    water_box = (60, 10, 620, 390)
    hammer_box = (30, 56, 590, 436)  # below the burned-in source titles
    tiles_src = [
        # (label, source, which half of a side-by-side source, crop box)
        ("GAM (tuned) · Water Plant", os.path.join(WS, "gam_water_plant_videos/step70k/seed0/episode_19_success/front.mp4"), None, water_box),
        ("GR00T N1.6 · Hammer Nail", os.path.join(WS, "hammer_nail_comparison/episode_36.mp4"), "right", hammer_box),
        ("GR00T N1.6 · Water Plant", os.path.join(WS, "dexjoco_n16_water_plant/episode_01_success/front.mp4"), None, water_box),
        ("π0.5 · Hammer Nail", os.path.join(WS, "hammer_nail_comparison/episode_03.mp4"), "left", hammer_box),
    ]
    n = 240  # 8 s; every episode above ends (succeeds) within 7.2 s and then holds its last frame
    tw, th = 560, 380
    gap = 6
    clips = []
    for title, path, side, box in tiles_src:
        fr = load_all(path, count=n)
        if side == "left":
            fr = [f[:, :640] for f in fr]
        elif side == "right":
            fr = [f[:, 640:] for f in fr]
        fr = [crop(f, box) for f in fr]
        assert fr[0].shape[:2] == (th, tw), fr[0].shape
        clips.append((make_label(title, size=16), pad_to(fr, n)))
    out_w, out_h = (tw * 2 + gap) // 2 * 2, (th * 2 + gap) // 2 * 2
    enc = Encoder(os.path.join(VID_OUT, "dexjoco-montage.mp4"), out_w, out_h, 30)
    for i in range(n):
        ts = []
        for lab, fr in clips:
            t = fr[i].copy()
            paste(t, lab, 10, 10)
            ts.append(t)
        frame = vstack([hstack(ts[:2], gap), hstack(ts[2:], gap)], gap)
        enc.write(frame[:out_h, :out_w])
    enc.close()


def image_aria():
    """Rebuild the 8-frame Aria demo contact sheet without the analysis captions."""
    src = os.environ["ARIA_SHEET_SRC"]  # the source contact sheet (not in this repo)
    im = Image.open(src).convert("RGB")
    row_y = [32, 284]  # tile rows (224 px); white caption strips between them are dropped
    times = ["0 s", "2.2 s", "5.5 s", "8.8 s", "12.1 s", "15.4 s", "18.7 s", "22.0 s"]
    scale = 1.5
    t = int(224 * scale)
    gap = 6
    W = t * 4 + gap * 3
    H = t * 2 + gap
    sheet = np.full((H, W, 3), BG, np.uint8)
    k = 0
    for r, y in enumerate(row_y):
        for c in range(4):
            tile = im.crop((c * 224, y, (c + 1) * 224, y + 224)).resize((t, t), Image.LANCZOS)
            arr = np.array(tile)
            paste(arr, make_label(times[k], size=15), 10, t - 10, "bl")
            sheet[r * (t + gap):r * (t + gap) + t, c * (t + gap):c * (t + gap) + t] = arr
            k += 1
    out = os.path.join(IMG_OUT, "aria-demo-contact-sheet.jpg")
    Image.fromarray(sheet).save(out, quality=82, optimize=True, progressive=True)
    print("wrote", out, os.path.getsize(out) // 1024, "KB", sheet.shape)


JOBS = {
    "water": clip_water,
    "hanoi": clip_hanoi,
    "hammer": clip_hammer,
    "determinism": clip_determinism,
    "montage": clip_montage,
    "aria": image_aria,
}

if __name__ == "__main__":
    os.makedirs(VID_OUT, exist_ok=True)
    os.makedirs(IMG_OUT, exist_ok=True)
    names = sys.argv[1:] or ["all"]
    if names == ["all"]:
        names = list(JOBS)
    for name in names:
        JOBS[name]()
