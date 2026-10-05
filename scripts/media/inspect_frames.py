"""Extract N evenly spaced frames from a video and tile them into one contact sheet for review.

Usage: python inspect_frames.py <video> <out.jpg> [n_frames=8] [cols=4] [max_tile_w=480]
"""
import sys
import cv2
import numpy as np


def main():
    src, out = sys.argv[1], sys.argv[2]
    n = int(sys.argv[3]) if len(sys.argv) > 3 else 8
    cols = int(sys.argv[4]) if len(sys.argv) > 4 else 4
    max_w = int(sys.argv[5]) if len(sys.argv) > 5 else 480
    cap = cv2.VideoCapture(src)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    idxs = np.linspace(0, max(total - 1, 0), n).astype(int)
    tiles = []
    for i in idxs:
        cap.set(cv2.CAP_PROP_POS_FRAMES, int(i))
        ok, fr = cap.read()
        if not ok:
            continue
        h, w = fr.shape[:2]
        s = min(1.0, max_w / w)
        fr = cv2.resize(fr, (int(w * s), int(h * s)))
        cv2.putText(fr, f"t={i / fps:.1f}s", (6, fr.shape[0] - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
        tiles.append(fr)
    if not tiles:
        print("no frames"); return
    th, tw = tiles[0].shape[:2]
    rows = (len(tiles) + cols - 1) // cols
    sheet = np.zeros((rows * th, cols * tw, 3), np.uint8)
    for k, t in enumerate(tiles):
        r, c = divmod(k, cols)
        t = cv2.resize(t, (tw, th))
        sheet[r * th:(r + 1) * th, c * tw:(c + 1) * tw] = t
    cv2.imwrite(out, sheet, [cv2.IMWRITE_JPEG_QUALITY, 85])
    print(out, total, fps, sheet.shape)


if __name__ == "__main__":
    main()
