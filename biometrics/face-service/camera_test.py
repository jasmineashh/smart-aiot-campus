import cv2
from insightface.app import FaceAnalysis

# Load the face models (already downloaded earlier)
app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
app.prepare(ctx_id=-1, det_size=(640, 640))

cap = cv2.VideoCapture(0)  # 0 = the Mac's built-in camera
if not cap.isOpened():
    raise SystemExit("Could not open the camera. Check camera permission for VS Code.")

printed = False
while True:
    ok, frame = cap.read()
    if not ok:
        break

    faces = app.get(frame)

    for face in faces:
        x1, y1, x2, y2 = face.bbox.astype(int)
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(frame, f"{face.det_score:.2f}", (x1, y1 - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

    if faces and not printed:
        print("Embedding length:", len(faces[0].normed_embedding))  # should be 512
        printed = True

    cv2.putText(frame, f"Faces: {len(faces)}   (press q to quit)", (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    cv2.imshow("Face detection test", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()