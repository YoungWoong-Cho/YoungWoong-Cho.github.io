"""For side-by-side comparison videos, find the last frame in which each half still changes.

A half that stops changing well before the video ends is a finished (frozen) episode.
Usage: python side_activity.py <video> [<video> ...]
"""
import sys
import cv2
import numpy as np


def last_change(path, halves=2, thr=1.0):
    cap = cv2.VideoCapture(path)
    prev = None
    last = [0] * halves
    n = 0
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        g = cv2.cvtColor(cv2.resize(fr, (fr.shape[1] // 4, fr.shape[0] // 4)), cv2.COLOR_BGR2GRAY).astype(np.float32)
        if prev is not None:
            w = g.shape[1] // halves
            for h in range(halves):
                d = np.abs(g[:, h * w:(h + 1) * w] - prev[:, h * w:(h + 1) * w]).mean()
                if d > thr:
                    last[h] = n
        prev = g
        n += 1
    return n, last


if __name__ == "__main__":
    for p in sys.argv[1:]:
        n, last = last_change(p)
        print(p.split("/")[-1], n, last)
