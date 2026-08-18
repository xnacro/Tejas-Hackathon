import math

try:
    import numpy as np
except ImportError:
    np = None

def clamp(val, min_val, max_val):
    return max(min_val, min(max_val, val))


# Landmark Indices for MediaPipe Face Mesh
# Left Eye
LEFT_EYE = [33, 160, 158, 133, 153, 144]
# Right Eye
RIGHT_EYE = [362, 385, 387, 263, 373, 380]
# Mouth
MOUTH = [78, 81, 13, 311, 308, 402, 14, 178]
# Head Pose Key Points: Nose Tip, Chin, Left Eye Corner, Right Eye Corner, Left Mouth Corner, Right Mouth Corner
HEAD_POSE_POINTS = [1, 199, 33, 263, 61, 291]

def euclidean_dist(p1, p2):
    """Calculates Euclidean distance between two points."""
    return math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2)

def calculate_ear(landmarks, eye_indices, img_w=640, img_h=480):
    """
    Eye Aspect Ratio (EAR):
    EAR = (|p2 - p6| + |p3 - p5|) / (2 * |p1 - p4|)
    """
    pts = []
    for idx in eye_indices:
        lm = landmarks[idx]
        pts.append((lm[0] * img_w, lm[1] * img_h))

    # Vertical distances
    d_v1 = euclidean_dist(pts[1], pts[5])
    d_v2 = euclidean_dist(pts[2], pts[4])
    # Horizontal distance
    d_h = euclidean_dist(pts[0], pts[3])

    if d_h == 0:
        return 0.0
    return (d_v1 + d_v2) / (2.0 * d_h)

def calculate_mar(landmarks, mouth_indices, img_w=640, img_h=480):
    """
    Mouth Aspect Ratio (MAR):
    Calculates vertical opening of lips relative to mouth width.
    """
    pts = []
    for idx in mouth_indices:
        lm = landmarks[idx]
        pts.append((lm[0] * img_w, lm[1] * img_h))

    # Vertical distances across upper and lower lip
    d_v1 = euclidean_dist(pts[1], pts[7])
    d_v2 = euclidean_dist(pts[2], pts[6])
    d_v3 = euclidean_dist(pts[3], pts[5])
    # Horizontal distance across mouth corners
    d_h = euclidean_dist(pts[0], pts[4])

    if d_h == 0:
        return 0.0
    return (d_v1 + d_v2 + d_v3) / (2.0 * d_h)

def estimate_head_pose(landmarks, img_w=640, img_h=480):
    """
    Estimates Pitch, Yaw, Roll angles from 2D facial landmarks using basic geometric projections
    or solvePnP if 3D coordinates available.
    Returns: pitch (nodding up/down), yaw (turning left/right), roll (tilting).
    """
    try:
        nose = (landmarks[1][0] * img_w, landmarks[1][1] * img_h)
        chin = (landmarks[199][0] * img_w, landmarks[199][1] * img_h)
        left_eye = (landmarks[33][0] * img_w, landmarks[33][1] * img_h)
        right_eye = (landmarks[263][0] * img_w, landmarks[263][1] * img_h)

        # Yaw: difference in distance between nose and both eyes
        dist_left = euclidean_dist(nose, left_eye)
        dist_right = euclidean_dist(nose, right_eye)
        total_eye_dist = euclidean_dist(left_eye, right_eye)
        
        yaw_ratio = (dist_right - dist_left) / (total_eye_dist + 1e-6)
        yaw_deg = float(clamp(yaw_ratio * 90.0, -90.0, 90.0))

        # Pitch: nose relative to eye midpoint and chin
        eye_mid_y = (left_eye[1] + right_eye[1]) / 2.0
        face_height = chin[1] - eye_mid_y
        if face_height <= 0:
            face_height = 100.0
        
        nose_rel_y = (nose[1] - eye_mid_y) / face_height
        # Normal nose_rel_y is ~0.4. If > 0.55 -> head down/nodding; If < 0.25 -> head up
        pitch_deg = float((nose_rel_y - 0.40) * 80.0)

        # Roll: angle between eyes
        dx = right_eye[0] - left_eye[0]
        dy = right_eye[1] - left_eye[1]
        roll_deg = float(math.degrees(math.atan2(dy, dx)))

        # Status text
        if pitch_deg > 18.0:
            pose_status = "Down / Nodding"
        elif pitch_deg < -18.0:
            pose_status = "Up"
        elif abs(yaw_deg) > 22.0:
            pose_status = "Looking Away"
        else:
            pose_status = "Normal"

        return {
            "pitch": round(pitch_deg, 1),
            "yaw": round(yaw_deg, 1),
            "roll": round(roll_deg, 1),
            "status": pose_status
        }
    except Exception:
        return {"pitch": 0.0, "yaw": 0.0, "roll": 0.0, "status": "Normal"}
