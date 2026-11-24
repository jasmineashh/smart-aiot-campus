"""
Seed a DEMO database with simulated campus people, real face embeddings,
room cameras, a bus camera and a few days of attendance.

Run it ONLY against a local or test database, never the team's shared one.

Usage (inside biometrics/face-service, with .venv active):
    export DEVICE_KEY="your-device-key"
    python seed_demo.py --faces dataset/pins --cars "dataset/ealpr/EALPR- Plates dataset"

Faces come from the Pins dataset, cars from the EALPR dataset (Egyptian plates).
Each student / staff member gets one car; the link is saved in people_mapping.csv.
"""
import argparse
import csv
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import cv2
import requests

API = os.environ.get("CAMPUS_API", "http://localhost:5200").rstrip("/")
KEY = os.environ.get("DEVICE_KEY")
CAIRO = timezone(timedelta(hours=2))
IMAGE_TYPES = {".jpg", ".jpeg", ".png"}
SEED = 42

FIRST_NAMES = ["Ahmed", "Mohamed", "Omar", "Youssef", "Karim", "Mostafa", "Hassan", "Ali", "Mahmoud", "Tarek",
               "Nada", "Mariam", "Salma", "Farida", "Hana", "Laila", "Yasmin", "Nour", "Malak", "Jana",
               "Seif", "Ziad", "Adham", "Habiba", "Rana", "Aya", "Menna", "Hagar", "Khaled", "Amr"]
LAST_NAMES = ["Hassan", "Mahmoud", "Ibrahim", "Abdelrahman", "Salem", "Fathy", "Nabil", "Shaker", "Kamal", "Sabry",
              "El-Sayed", "Mansour", "Farouk", "Zaki", "Ragab", "Hegazy", "Eid", "Lotfy", "Gaber", "Ashraf"]

# Cameras: (name, location). Locations "G-FRR" are rooms in building G (F = floor, RR = room).
CAMERAS = [
    ("Main Gate Cam", "G-Entrance"),
    ("Lab G-041 Cam", "G-041"),
    ("Hall G-012 Cam", "G-012"),
    ("Room G-120 Cam", "G-120"),
    ("Room G-145 Cam", "G-145"),
    ("Room G-210 Cam", "G-210"),
    ("Room G-233 Cam", "G-233"),
    ("Room G-312 Cam", "G-312"),
    ("Room G-345 Cam", "G-345"),
    ("Room G-401 Cam", "G-401"),
    ("Room G-450 Cam", "G-450"),
    ("Bus 1 Door Cam", "BUS-1"),
    ("Bus 2 Door Cam", "BUS-2"),
    ("Staff Bus Door Cam", "BUS-STAFF"),
]
ROOM_CAMERAS = [c for c in CAMERAS if c[1].startswith("G-") and c[1] != "G-Entrance"]
STAFF_ONLY_ROOM = "G-041"  # lab: staff only 08:00-18:00, so students there get "Denied" alerts

session = requests.Session()


def call(method, path, device=False, **kwargs):
    headers = kwargs.pop("headers", {})
    if device:
        headers["X-Device-Key"] = KEY
    r = session.request(method, f"{API}{path}", headers=headers, timeout=60, **kwargs)
    if r.status_code >= 400:
        raise RuntimeError(f"{method} {path} -> {r.status_code}: {r.text[:300]}")
    return r.json() if r.content else None


def find_people_folders(root: Path):
    folders = []
    for d in sorted(p for p in root.rglob("*") if p.is_dir()):
        images = sorted(f for f in d.iterdir() if f.suffix.lower() in IMAGE_TYPES)
        if len(images) >= 2:
            folders.append((d, images))
    return folders


def make_face_app():
    from insightface.app import FaceAnalysis
    app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=-1, det_size=(320, 320))
    return app


def embed(app, path: Path):
    img = cv2.imread(str(path))
    if img is None:
        return None
    # Dataset photos are tight face crops; add a border so the detector can find the face.
    pad = int(max(img.shape[:2]) * 0.5)
    img = cv2.copyMakeBorder(img, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=(0, 0, 0))
    faces = app.get(img)
    if not faces:
        return None
    face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    return [round(float(x), 6) for x in face.normed_embedding]


def build_people(folders, count, rng):
    rng.shuffle(folders)
    if count > 0:
        folders = folders[:count]
    people = []
    counters = {"S": 0, "P": 0, "W": 0, "V": 0}
    for folder, images in folders:
        roll = rng.random()
        if roll < 0.70:
            kind, ptype, dept = "S", "Student", rng.choice(["Computer Engineering", "Electrical Engineering", "Mechanical Engineering"])
        elif roll < 0.85:
            kind, ptype, dept = "P", "Staff", "Computer Engineering"
        elif roll < 0.93:
            kind, ptype, dept = "W", "Staff", rng.choice(["Security", "Facilities", "Administration"])
        else:
            kind, ptype, dept = "V", "Visitor", None
        counters[kind] += 1
        name = f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"
        if kind == "P":
            name = "Dr. " + name
        people.append({
            "role": {"S": "Student", "P": "Professor", "W": "Worker", "V": "Visitor"}[kind],
            "universityId": f"TEST-{kind}{counters[kind]:03d}",
            "fullName": name,
            "type": ptype,
            "department": dept,
            "folder": folder,
            "images": images,
        })
    return people


def ensure_people(people):
    existing = {p.get("universityId"): p for p in call("GET", "/api/persons")}
    today = datetime.now(CAIRO).replace(hour=0, minute=0, second=0, microsecond=0)
    for p in people:
        if p["universityId"] in existing:
            p["id"] = existing[p["universityId"]]["id"]
            p["faceCount"] = existing[p["universityId"]].get("faceCount", 0)
            continue
        body = {"fullName": p["fullName"], "type": p["type"], "universityId": p["universityId"],
                "department": p["department"]}
        if p["type"] == "Visitor":
            # visitors are allowed 08:00-17:00 on every simulated day
            body["visitStart"] = (today - timedelta(days=7) + timedelta(hours=8)).astimezone(timezone.utc).isoformat()
            body["visitEnd"] = (today + timedelta(hours=17)).astimezone(timezone.utc).isoformat()
        created = call("POST", "/api/persons", json=body)
        p["id"], p["faceCount"] = created["id"], 0
    print(f"✓ {len(people)} people ready")


def enroll_faces(people, photos_per_person):
    app = make_face_app()
    enrolled = skipped = 0
    for i, p in enumerate(people, 1):
        if p["faceCount"] > 0:
            continue
        added = 0
        for img in p["images"]:
            if added >= photos_per_person:
                break
            vector = embed(app, img)
            if vector is None:
                skipped += 1
                continue
            call("POST", f"/api/persons/{p['id']}/faces", device=True,
                 json={"vector": vector, "modelName": "ArcFace"})
            added += 1
        enrolled += added
        print(f"  [{i}/{len(people)}] {p['fullName']}: {added} faces")
    print(f"✓ {enrolled} face embeddings enrolled ({skipped} photos without a detectable face skipped)")


def ensure_cameras():
    existing = {c["name"]: c for c in call("GET", "/api/cameras")}
    cams = {}
    for name, location in CAMERAS:
        cam = existing.get(name) or call("POST", "/api/cameras", json={"name": name, "location": location})
        cams[location] = cam["id"]
    lab_id = cams[STAFF_ONLY_ROOM]
    if not call("GET", f"/api/accessrules?cameraId={lab_id}"):
        call("POST", "/api/accessrules", json={"cameraId": lab_id, "allowedType": "Staff",
                                               "startTime": "08:00:00", "endTime": "18:00:00"})
    bus_rules = [("BUS-1", "Student"), ("BUS-2", "Student"), ("BUS-STAFF", "Staff")]
    for loc, allowed in bus_rules:
        if not call("GET", f"/api/accessrules?cameraId={cams[loc]}"):
            call("POST", "/api/accessrules", json={"cameraId": cams[loc], "allowedType": allowed,
                                                   "startTime": "06:00:00", "endTime": "20:00:00"})
    print(f"✓ {len(cams)} cameras ready (lab {STAFF_ONLY_ROOM} staff-only, staff bus staff-only)")
    return cams


def simulate_attendance(people, cams, days, rng):
    now = datetime.now(CAIRO)
    events = []
    bus_loc = {"Bus 1": "BUS-1", "Bus 2": "BUS-2", "Staff Bus": "BUS-STAFF"}
    bus_of = {p["id"]: bus_loc[p["transport"]] for p in people if p["transport"] in bus_loc}

    for d in range(days - 1, -1, -1):
        day = (now - timedelta(days=d)).replace(hour=0, minute=0, second=0, microsecond=0)
        for p in people:
            if rng.random() < 0.15:  # absent today
                continue
            t = day + timedelta(hours=8, minutes=rng.randint(0, 50))
            if p["id"] in bus_of and rng.random() < 0.9:
                bus = bus_of[p["id"]]
                if p["type"] == "Student" and rng.random() < 0.05:
                    bus = "BUS-STAFF"  # a student tries the staff bus -> Denied alert
                events.append((t - timedelta(minutes=rng.randint(30, 50)), cams[bus], p["id"], "Recognized"))
            if p["type"] == "Visitor":
                # visitors: gate + one hall; 10% stay after 17:00 -> "Expired visitor" alert
                late = rng.random() < 0.10
                t = day + timedelta(hours=17 if late else rng.choice([9, 10, 11, 13]), minutes=rng.randint(5, 50))
                events.append((t, cams["G-Entrance"], p["id"], "Recognized"))
                events.append((t + timedelta(minutes=rng.randint(10, 40)), cams["G-012"], p["id"], "Recognized"))
                continue
            t = day + timedelta(hours=rng.randint(8, 11), minutes=rng.randint(0, 50))
            events.append((t, cams["G-Entrance"], p["id"], "Recognized"))
            for _ in range(rng.randint(1, 3)):
                t += timedelta(minutes=rng.randint(30, 120))
                room = rng.choice(ROOM_CAMERAS)[1]
                events.append((t, cams[room], p["id"], "Recognized"))
        for _ in range(rng.randint(1, 3)):
            t = day + timedelta(hours=rng.randint(8, 16), minutes=rng.randint(0, 59))
            result = rng.choice(["Unknown", "Unknown", "Spoof"])
            events.append((t, rng.choice(list(cams.values())), None, result))

    events = sorted(e for e in events if e[0] <= now)
    for i, (t, cam_id, person_id, result) in enumerate(events, 1):
        body = {"cameraId": cam_id, "personId": person_id, "result": result,
                "confidence": round(rng.uniform(0.55, 0.95), 2) if result == "Recognized" else round(rng.uniform(0.2, 0.5), 2),
                "timestamp": t.astimezone(timezone.utc).isoformat()}
        call("POST", "/api/attendance/recognize", device=True, json=body)
        if i % 100 == 0:
            print(f"  {i}/{len(events)} attendance events sent")
    print(f"✓ {len(events)} attendance events simulated over {days} day(s)")


# How each role gets to campus: (car, bus, none) probabilities
TRANSPORT_ODDS = {
    "Student":   (0.35, 0.45, 0.20),
    "Professor": (0.60, 0.30, 0.10),
    "Worker":    (0.30, 0.60, 0.10),
    "Visitor":   (0.50, 0.00, 0.50),
}


def assign_transport(people, cars_dir, rng):
    """Give each person a car, a bus seat, or nothing. Every car handed out has exactly one owner."""
    cars = []
    if cars_dir:
        cars = sorted(f for f in Path(cars_dir).rglob("*") if f.is_file() and f.suffix.lower() in IMAGE_TYPES)
        rng.shuffle(cars)
        if not cars:
            print(f"! No car images found under {cars_dir}")

    for p in people:
        car_p, bus_p, _ = TRANSPORT_ODDS[p["role"]]
        roll = rng.random()
        if roll < car_p and cars:
            p["transport"], p["car"] = "Car", cars.pop()
        elif roll < car_p + bus_p:
            if p["role"] == "Student":
                p["transport"] = rng.choice(["Bus 1", "Bus 2"])
            else:
                p["transport"] = "Staff Bus"
        else:
            p["transport"] = "None"

    counts = {}
    for p in people:
        counts[p["transport"]] = counts.get(p["transport"], 0) + 1
    print("✓ Transport: " + ", ".join(f"{k}: {v}" for k, v in sorted(counts.items())))

    # Plates nobody owns: kept for the parking team to test "unknown car" alerts
    with open("unregistered_plates.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["PlateImage", "PlateNumber"])
        for c in cars:
            w.writerow([c, ""])
    print(f"✓ {len(cars)} remaining plates saved to unregistered_plates.csv (not owned by anyone)")


def write_mapping(people, path="people_mapping.csv"):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["UniversityId", "FullName", "Role", "Type", "Department", "FaceFolder",
                    "Transport", "CarImage", "PlateNumber"])
        for p in people:
            w.writerow([p["universityId"], p["fullName"], p["role"], p["type"], p["department"] or "",
                        p["folder"], p["transport"], p.get("car", ""), ""])
    print(f"✓ mapping written to {path} (people ↔ faces ↔ transport ↔ cars)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--faces", default="dataset/pins")
    ap.add_argument("--cars", default="", help="EALPR vehicles folder (optional)")
    ap.add_argument("--people", type=int, default=0, help="0 = everyone in the dataset")
    ap.add_argument("--photos", type=int, default=3, help="face photos to enroll per person")
    ap.add_argument("--days", type=int, default=3, help="days of simulated attendance (incl. today)")
    ap.add_argument("--skip-faces", action="store_true")
    ap.add_argument("--skip-attendance", action="store_true")
    args = ap.parse_args()

    if not KEY:
        sys.exit("Set the device key first:  export DEVICE_KEY=\"...\"")
    folders = find_people_folders(Path(args.faces))
    if not folders:
        sys.exit(f"No person folders with photos found under {args.faces}")
    print(f"Found {len(folders)} people in the dataset. API: {API}")

    rng = random.Random(SEED)
    people = build_people(folders, args.people, rng)
    assign_transport(people, args.cars, random.Random(SEED + 1))
    ensure_people(people)
    write_mapping(people)
    if not args.skip_faces:
        enroll_faces(people, args.photos)
    cams = ensure_cameras()
    if not args.skip_attendance:
        simulate_attendance(people, cams, args.days, rng)
    print("Done. Open the dashboard to see the data.")


if __name__ == "__main__":
    main()
