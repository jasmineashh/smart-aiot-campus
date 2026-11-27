"""
Enroll a real person from the webcam.

Creates the person (if needed) through the admin API, captures several face
photos from the camera, turns each into an ArcFace embedding and sends it
to the backend. Photos are never saved; only the 512 numbers are stored.

Usage (inside biometrics/face-service, .venv active, backend running):
    python enroll_me.py --id NADA-001 --name "Nada Megahed" --type Student --department "Computer Engineering"
Keys in the camera window:  SPACE = capture   q = cancel
"""
import argparse
import os
from getpass import getpass

import cv2
from insightface.app import FaceAnalysis

from api_client import CampusApiClient


def capture_embeddings(count, camera_index):
    app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=-1, det_size=(640, 640))

    cap = cv2.VideoCapture(camera_index)
    if not cap.isOpened():
        raise SystemExit("Could not open the camera.")

    embeddings = []
    tips = ["look straight", "turn slightly left", "turn slightly right", "tilt head a little", "smile / glasses on"]
    try:
        while len(embeddings) < count:
            ok, frame = cap.read()
            if not ok:
                break
            faces = app.get(frame)
            view = frame.copy()
            for f in faces:
                x1, y1, x2, y2 = f.bbox.astype(int)
                cv2.rectangle(view, (x1, y1), (x2, y2), (0, 255, 0) if len(faces) == 1 else (0, 0, 255), 2)
            tip = tips[len(embeddings) % len(tips)]
            cv2.putText(view, f"{len(embeddings)}/{count}  {tip}  -  SPACE capture, q cancel",
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
            cv2.imshow("Enrollment", view)

            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                raise SystemExit("Enrollment cancelled.")
            if key == ord(" "):
                if len(faces) != 1:
                    print("  Need exactly one face in the frame.")
                    continue
                if faces[0].det_score < 0.6:
                    print("  Face not clear enough, try better light.")
                    continue
                embeddings.append([round(float(x), 6) for x in faces[0].normed_embedding])
                print(f"  Captured {len(embeddings)}/{count}")
    finally:
        cap.release()
        cv2.destroyAllWindows()
    return embeddings


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--id", required=True, help="University ID, e.g. NADA-001")
    ap.add_argument("--name", required=True)
    ap.add_argument("--type", default="Student", choices=["Student", "Staff", "Visitor"])
    ap.add_argument("--department", default=None)
    ap.add_argument("--photos", type=int, default=5)
    ap.add_argument("--camera", type=int, default=0)
    args = ap.parse_args()

    client = CampusApiClient()
    if not client.device_key:
        client.device_key = getpass("Enter device API key: ")
    admin_id = os.getenv("CAMPUS_ADMIN_ID", "TEST-ADMIN-001")
    logged_in = False
    try:
        client.login_admin(admin_id, getpass(f"Password for {admin_id}: "))
        logged_in = True

        matches = [p for p in client.admin_get("/api/persons", params={"search": args.id}) or []
                   if p.get("universityId") == args.id]
        if matches:
            person = matches[0]
            print(f"Person exists: {person['fullName']} (id {person['id']}, {person.get('faceCount', 0)} faces)")
        else:
            person = client.admin_post("/api/persons", {
                "fullName": args.name, "type": args.type,
                "universityId": args.id, "department": args.department,
            })
            print(f"Created person: {person['fullName']} (id {person['id']})")

        print("\nCamera opening. Capture each photo with SPACE.")
        embeddings = capture_embeddings(args.photos, args.camera)

        for vector in embeddings:
            client.device_post(f"/api/persons/{person['id']}/faces",
                               {"vector": vector, "modelName": "ArcFace"})
        print(f"\n✓ {len(embeddings)} face embeddings enrolled for {person['fullName']}.")
    finally:
        try:
            if logged_in:
                client.logout()
        finally:
            client.close()


if __name__ == "__main__":
    main()
