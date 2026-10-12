#!/usr/bin/env python3
"""
Finds regions of album covers that contain lettering (band logos, titles) so the quiz can avoid cropping them.

    python3 scripts/detect_text.py <covers-dir> <out.json>

Reads every <id>.jpg in the directory and writes {id: [[x, y, w, h], ...]} with rectangles normalised to 0..1.
Results already present in out.json are kept, so a re-run only processes new covers.

Two detectors are combined, because neither is good enough alone:
  1. OCR (tesseract) at three scales on the normal, inverted and contrast-stretched image. Reads titles and many logos.
  2. A structure detector: strong edges that join horizontally into wide, short, dense blobs. Finds stylised logos
     that OCR cannot read.
Both over-report a little (busy artwork can look like text). That is intended: a crop only has to avoid them.

Needs: python3, Pillow, numpy, scipy and the `tesseract` command (brew install tesseract).
"""
import json
import os
import subprocess
import sys
import tempfile
from concurrent.futures import ProcessPoolExecutor

import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

WORK = 800          # longest side used for OCR
MAX_RECTS = 14      # per cover, keeps albums.json small
OCR_SCALES = (1.0, 0.5, 0.3)  # big lettering is only readable once the image is small


def ocr_words(img):
    with tempfile.TemporaryDirectory() as d:
        path = os.path.join(d, 'a.png')
        img.save(path)
        out = subprocess.run(
            ['tesseract', path, 'stdout', '--psm', '11', '-l', 'eng', 'tsv'],
            capture_output=True, text=True, env={**os.environ, 'OMP_THREAD_LIMIT': '1'},
        ).stdout
    words = []
    for line in out.splitlines()[1:]:
        f = line.split('\t')
        if len(f) < 12 or f[0] != '5':
            continue
        conf, text = float(f[10]), f[11].strip()
        left, top, w, h = map(int, f[6:10])
        words.append((left, top, left + w, top + h, conf, text))
    return words


def plausible_word(word):
    """Drops the garbage OCR invents from textures: short, low confidence."""
    _, _, _, _, conf, text = word
    letters = sum(c.isalpha() for c in text)
    alnum = sum(c.isalnum() for c in text)
    if alnum < 2:
        return False
    return (letters >= 4 and conf >= 40) or (letters >= 3 and conf >= 55) or conf >= 75


def ocr_boxes(img):
    gray = ImageOps.grayscale(img)
    W, H = img.size
    found = []
    for scale in OCR_SCALES:
        small = gray.resize((max(60, int(W * scale)), max(60, int(H * scale))), Image.LANCZOS)
        for variant in (small, ImageOps.invert(small), ImageOps.autocontrast(small, cutoff=2)):
            for word in ocr_words(variant):
                if plausible_word(word):
                    k = 1 / scale
                    l, t, r, b = (v * k for v in word[:4])
                    h = b - t
                    # pad: letters are wider than OCR says, and a crop should clear the lettering with room
                    found.append([l - 0.45 * h, t - 0.3 * h, r + 0.45 * h, b + 0.3 * h])
    return found


def structure_boxes(img, work=400):
    w0, h0 = img.size
    s = work / max(w0, h0)
    g = np.asarray(ImageOps.grayscale(img.resize((int(w0 * s), int(h0 * s)), Image.LANCZOS)), dtype=np.float32)
    H, W = g.shape
    mag = np.hypot(ndimage.sobel(g, axis=1), ndimage.sobel(g, axis=0))
    edges = mag > max(60.0, mag.mean() + 1.2 * mag.std())
    joined = ndimage.binary_dilation(edges, structure=np.ones((3, 11)))  # join the letters of one line
    joined = ndimage.binary_closing(joined, structure=np.ones((5, 7)))
    labels, _ = ndimage.label(joined)
    boxes = []
    for sl in ndimage.find_objects(labels):
        ys, xs = sl
        h, w = ys.stop - ys.start, xs.stop - xs.start
        if h < 0.03 * H or h > 0.25 * H or w < 1.6 * h or w < 0.12 * W:
            continue
        if edges[sl].mean() < 0.10:
            continue
        pad = 0.15 * h
        boxes.append([(xs.start - pad) / s, (ys.start - pad) / s, (xs.stop + pad) / s, (ys.stop + pad) / s])
    return boxes


def merge(rects):
    rects = [r[:] for r in rects]
    changed = True
    while changed:
        changed = False
        out = []
        for r in rects:
            for o in out:
                if r[0] <= o[2] and r[2] >= o[0] and r[1] <= o[3] and r[3] >= o[1]:
                    o[0], o[1], o[2], o[3] = min(o[0], r[0]), min(o[1], r[1]), max(o[2], r[2]), max(o[3], r[3])
                    changed = True
                    break
            else:
                out.append(r)
        rects = out
    return rects


def detect(path):
    img = Image.open(path).convert('RGB')
    k = WORK / max(img.size)
    img = img.resize((max(1, int(img.width * k)), max(1, int(img.height * k))), Image.LANCZOS)
    W, H = img.size
    rects = merge(ocr_boxes(img) + structure_boxes(img))
    out = []
    for l, t, r, b in rects:
        l, t, r, b = max(0, l), max(0, t), min(W, r), min(H, b)
        if (r - l) * (b - t) > 0.45 * W * H or r <= l or b <= t:
            continue  # almost the whole cover: not a usable hint
        out.append([round(l / W, 3), round(t / H, 3), round((r - l) / W, 3), round((b - t) / H, 3)])
    out.sort(key=lambda q: -q[2] * q[3])
    return os.path.splitext(os.path.basename(path))[0], out[:MAX_RECTS]


def main():
    folder, out_path = sys.argv[1], sys.argv[2]
    done = json.load(open(out_path)) if os.path.exists(out_path) else {}
    todo = [os.path.join(folder, f) for f in sorted(os.listdir(folder)) if f.endswith('.jpg') and os.path.splitext(f)[0] not in done]
    print(f'{len(done)} covers already analysed, {len(todo)} to do', flush=True)
    with ProcessPoolExecutor(max(1, (os.cpu_count() or 4) - 1)) as pool:
        for i, (key, rects) in enumerate(pool.map(detect, todo, chunksize=2), start=1):
            done[key] = rects
            if i % 25 == 0:
                json.dump(done, open(out_path, 'w'))
                print(f'text detection {i}/{len(todo)}', flush=True)
    json.dump(done, open(out_path, 'w'))
    print(f'text detection done: {len(done)} covers', flush=True)


if __name__ == '__main__':
    main()
