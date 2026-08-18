import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from engine.drowsiness_detector import calculate_ear, calculate_mar, estimate_head_pose, LEFT_EYE, RIGHT_EYE, MOUTH
from engine.temporal_analyzer import TemporalDrowsinessAnalyzer

def test_engine():
    # Construct dummy 468 landmarks
    landmarks = [[0.5, 0.5, 0.0] for _ in range(468)]
    
    # Simulate normal open eye
    landmarks[33] = [0.4, 0.45, 0.0]
    landmarks[133] = [0.48, 0.45, 0.0]
    landmarks[160] = [0.44, 0.43, 0.0]
    landmarks[158] = [0.46, 0.43, 0.0]
    landmarks[153] = [0.44, 0.47, 0.0]
    landmarks[144] = [0.46, 0.47, 0.0]

    ear = calculate_ear(landmarks, LEFT_EYE)
    print(f"Sample EAR calculated: {ear:.4f}")

    analyzer = TemporalDrowsinessAnalyzer()
    head_pose = {"pitch": 0.0, "yaw": 0.0, "roll": 0.0, "status": "Normal"}
    
    # Test Alert state
    res_alert = analyzer.update(0.30, 0.30, 0.35, head_pose)
    print(f"Alert State: Score={res_alert['drowsinessScore']} State={res_alert['state']}")

    # Test Drowsy state (closed eyes)
    for _ in range(15):
        res_drowsy = analyzer.update(0.12, 0.12, 0.85, {"pitch": 25.0, "status": "Down / Nodding"})
    print(f"Drowsy/Critical State: Score={res_drowsy['drowsinessScore']} State={res_drowsy['state']}")

    assert res_alert["state"] == "ALERT"
    assert res_drowsy["drowsinessScore"] > 30.0
    print("All ML engine unit tests PASSED successfully!")

if __name__ == "__main__":
    test_engine()
