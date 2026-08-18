from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import time
import json

from engine.drowsiness_detector import (
    calculate_ear,
    calculate_mar,
    estimate_head_pose,
    LEFT_EYE,
    RIGHT_EYE,
    MOUTH
)
from engine.temporal_analyzer import TemporalDrowsinessAnalyzer

app = FastAPI(
    title="Surakha AI Computer Vision & Drowsiness Engine",
    description="Real-time Computer Vision processing for EAR, MAR, Head Pose, and Drowsiness Scoring",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global analyzer instance
analyzer = TemporalDrowsinessAnalyzer(window_seconds=10.0, ear_threshold=0.22, mar_threshold=0.65)

class LandmarkPayload(BaseModel):
    landmarks: List[List[float]] # [[x, y, z], ...] normalized coordinates
    imageWidth: Optional[int] = 640
    imageHeight: Optional[int] = 480

class ConfigPayload(BaseModel):
    earThreshold: Optional[float] = None
    marThreshold: Optional[float] = None
    windowSeconds: Optional[float] = None

@app.get("/ai/health")
def health():
    return {
        "status": "online",
        "service": "Surakha AI CV Engine (MediaPipe + Temporal Drowsiness)",
        "timestamp": time.time()
    }

@app.get("/ai/status")
def status():
    return {
        "engine": "OpenCV + MediaPipe Face Mesh",
        "earThreshold": analyzer.ear_threshold,
        "marThreshold": analyzer.mar_threshold,
        "windowSeconds": analyzer.window_seconds
    }

@app.post("/ai/config")
def update_config(config: ConfigPayload):
    if config.earThreshold is not None:
        analyzer.ear_threshold = config.earThreshold
    if config.marThreshold is not None:
        analyzer.mar_threshold = config.marThreshold
    if config.windowSeconds is not None:
        analyzer.window_seconds = config.windowSeconds
    return {
        "success": True,
        "config": {
            "earThreshold": analyzer.ear_threshold,
            "marThreshold": analyzer.mar_threshold,
            "windowSeconds": analyzer.window_seconds
        }
    }

@app.post("/ai/analyze-frame")
def analyze_frame(payload: LandmarkPayload):
    landmarks = payload.landmarks
    w = payload.imageWidth
    h = payload.imageHeight

    if not landmarks or len(landmarks) < 468:
        return {
            "faceDetected": False,
            "message": "Face not detected. Please align with camera."
        }

    left_ear = calculate_ear(landmarks, LEFT_EYE, w, h)
    right_ear = calculate_ear(landmarks, RIGHT_EYE, w, h)
    mar = calculate_mar(landmarks, MOUTH, w, h)
    head_pose = estimate_head_pose(landmarks, w, h)

    result = analyzer.update(left_ear, right_ear, mar, head_pose)
    result["faceDetected"] = True
    return result

@app.websocket("/ws/drowsiness")
async def websocket_drowsiness(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data_text = await websocket.receive_text()
            try:
                data = json.loads(data_text)
                landmarks = data.get("landmarks")
                w = data.get("imageWidth", 640)
                h = data.get("imageHeight", 480)

                if landmarks and len(landmarks) >= 468:
                    left_ear = calculate_ear(landmarks, LEFT_EYE, w, h)
                    right_ear = calculate_ear(landmarks, RIGHT_EYE, w, h)
                    mar = calculate_mar(landmarks, MOUTH, w, h)
                    head_pose = estimate_head_pose(landmarks, w, h)

                    result = analyzer.update(left_ear, right_ear, mar, head_pose)
                    result["faceDetected"] = True
                else:
                    result = {
                        "faceDetected": False,
                        "drowsinessScore": 0.0,
                        "state": "ALERT",
                        "indicators": {
                            "eyes": "Unknown",
                            "yawning": "Unknown",
                            "headPose": "Unknown"
                        },
                        "statusMessage": "Face not detected. Please position yourself in front of the camera."
                    }

                await websocket.send_text(json.dumps(result))
            except Exception as e:
                await websocket.send_text(json.dumps({"error": str(e)}))
    except WebSocketDisconnect:
        pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
