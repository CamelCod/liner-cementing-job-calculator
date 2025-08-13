# Cementing Backend

FastAPI microservice that exposes cementing calculation endpoints used by the React frontend.

## Run (development)
```bash
uvicorn app.main:app --reload --port 8001
```

## Endpoint
POST /calculate
Payload example:
```json
{
  "casing": {"od": 9.625, "id": 8.799, "wt": 40, "length": 0, "md": 5100, "tvd": 5095, "grade": "P-110"},
  "liner": {"od": 7.0, "id": 6.184, "wt": 29.0, "length": 4180, "md": 9280, "tvd": 8460, "grade": "L-80"},
  "dp1": {"od": 4.5, "id": 3.67, "wt": 20.0, "length": 5480, "md": 5480, "tvd": 5200, "grade": "G-105"},
  "dp2": {"od": 5.0, "id": 4.276, "wt": 19.5, "length": 3800, "md": 9280, "tvd": 8460, "grade": "S-135"},
  "mud": {"ppg": 13.0},
  "holeOverlap": {"openHoleId": 8.5, "linerOverlap": 300, "shoeTrackLength": 200}
}
```
