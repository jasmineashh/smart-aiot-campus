# Face recognition accuracy (ArcFace, buffalo_l)

- Dataset: Pins Face Recognition, 84 enrolled people + 21 strangers
- Gallery: 3 photos per enrolled person; probes: up to 5 other photos each
- Genuine attempts: 420, stranger attempts: 105, photos without a detectable face: 0
- Rank-1 identification accuracy (no threshold): 99.8%

| Threshold | Correct accept | Wrong person | False reject | False accept (strangers) |
|---|---|---|---|---|
| 0.30 | 99.8% | 0.0% | 0.2% | 1.9% |
| 0.35 | 99.5% | 0.0% | 0.5% | 0.0% |
| 0.40 | 99.0% | 0.0% | 1.0% | 0.0% |
| 0.45 | 96.0% | 0.0% | 4.0% | 0.0% |
| 0.50 | 90.2% | 0.0% | 9.8% | 0.0% |
| 0.55 | 81.2% | 0.0% | 18.8% | 0.0% |
| 0.60 | 66.0% | 0.0% | 34.0% | 0.0% |

Recommended threshold: **0.35** (highest correct accept with false accept and wrong person both at most 1%).
