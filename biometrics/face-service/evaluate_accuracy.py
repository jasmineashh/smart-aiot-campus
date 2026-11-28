"""
Offline accuracy evaluation of the face recognition model (ArcFace / buffalo_l).

Uses the Pins dataset only (no backend, no database):
  * 80% of the people are "enrolled": their first N photos form the gallery,
    the next photos are used as test probes (genuine attempts).
  * 20% of the people are NOT enrolled: their photos act as strangers
    (impostor attempts), like an unknown person in front of the camera.

For several thresholds it reports:
  Correct accept rate  - genuine probe matched to the right person
  Wrong person rate    - genuine probe matched to someone else (worst error)
  False reject rate    - genuine probe rejected as unknown
  False accept rate    - stranger accepted as an enrolled person

Results are printed and saved to accuracy_results.md (for the report).

Usage (inside biometrics/face-service, .venv active):
    python evaluate_accuracy.py --faces dataset/pins
"""
import argparse
import random
from pathlib import Path

import cv2
import numpy as np
from insightface.app import FaceAnalysis

IMAGE_TYPES = {".jpg", ".jpeg", ".png"}
THRESHOLDS = [0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60]


def person_folders(root: Path):
    out = []
    for d in sorted(p for p in root.rglob("*") if p.is_dir()):
        images = sorted(f for f in d.iterdir() if f.suffix.lower() in IMAGE_TYPES)
        if len(images) >= 4:
            out.append((d.name.replace("pins_", ""), images))
    return out


def embed(app, path):
    img = cv2.imread(str(path))
    if img is None:
        return None
    pad = int(max(img.shape[:2]) * 0.5)  # dataset photos are tight crops
    img = cv2.copyMakeBorder(img, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=(0, 0, 0))
    faces = app.get(img)
    if not faces:
        return None
    face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    return face.normed_embedding.astype(np.float32)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--faces", default="dataset/pins")
    ap.add_argument("--enroll", type=int, default=3, help="photos per person in the gallery (same as seed_demo)")
    ap.add_argument("--probes", type=int, default=5, help="test photos per person")
    ap.add_argument("--unknown-share", type=float, default=0.2)
    ap.add_argument("--out", default="accuracy_results.md")
    args = ap.parse_args()

    people = person_folders(Path(args.faces))
    rng = random.Random(42)
    rng.shuffle(people)
    n_unknown = max(1, int(len(people) * args.unknown_share))
    unknown, enrolled = people[:n_unknown], people[n_unknown:]
    print(f"{len(enrolled)} enrolled people, {len(unknown)} strangers")

    app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=-1, det_size=(320, 320))

    gallery, gallery_ids, genuine, impostor = [], [], [], []
    skipped = 0
    for pid, (name, images) in enumerate(enrolled):
        got = 0
        for img in images[:args.enroll]:
            e = embed(app, img)
            if e is None:
                skipped += 1
                continue
            gallery.append(e)
            gallery_ids.append(pid)
            got += 1
        for img in images[args.enroll:args.enroll + args.probes]:
            e = embed(app, img)
            if e is None:
                skipped += 1
                continue
            genuine.append((pid, e))
        print(f"  enrolled {pid + 1}/{len(enrolled)}: {name}")
    for name, images in unknown:
        for img in images[:args.probes]:
            e = embed(app, img)
            if e is None:
                skipped += 1
                continue
            impostor.append(e)

    G = np.vstack(gallery)
    gids = np.array(gallery_ids)

    def best(e):
        scores = G @ e
        i = int(np.argmax(scores))
        return int(gids[i]), float(scores[i])

    gen = [(true, *best(e)) for true, e in genuine]
    imp = [best(e)[1] for e in impostor]

    rows = []
    for t in THRESHOLDS:
        correct = sum(1 for true, pred, s in gen if s >= t and pred == true)
        wrong = sum(1 for true, pred, s in gen if s >= t and pred != true)
        rejected = sum(1 for _, _, s in gen if s < t)
        false_acc = sum(1 for s in imp if s >= t)
        rows.append((t, 100 * correct / len(gen), 100 * wrong / len(gen),
                     100 * rejected / len(gen), 100 * false_acc / len(imp)))

    rank1 = 100 * sum(1 for true, pred, _ in gen if pred == true) / len(gen)
    header = "| Threshold | Correct accept | Wrong person | False reject | False accept (strangers) |"
    lines = [header, "|---|---|---|---|---|"]
    lines += [f"| {t:.2f} | {c:.1f}% | {w:.1f}% | {r:.1f}% | {f:.1f}% |" for t, c, w, r, f in rows]

    safe = [r for r in rows if r[4] <= 1.0 and r[2] <= 1.0]
    recommended = max(safe, key=lambda r: r[1]) if safe else None

    report = [
        "# Face recognition accuracy (ArcFace, buffalo_l)",
        "",
        f"- Dataset: Pins Face Recognition, {len(enrolled)} enrolled people + {len(unknown)} strangers",
        f"- Gallery: {args.enroll} photos per enrolled person; probes: up to {args.probes} other photos each",
        f"- Genuine attempts: {len(gen)}, stranger attempts: {len(imp)}, photos without a detectable face: {skipped}",
        f"- Rank-1 identification accuracy (no threshold): {rank1:.1f}%",
        "",
        *lines,
        "",
        (f"Recommended threshold: **{recommended[0]:.2f}** (highest correct accept with "
         f"false accept and wrong person both at most 1%)." if recommended
         else "No threshold kept both false accept and wrong person at or below 1%."),
    ]
    text = "\n".join(report)
    print("\n" + text)
    Path(args.out).write_text(text + "\n", encoding="utf-8")
    print(f"\nSaved to {args.out}")


if __name__ == "__main__":
    main()
