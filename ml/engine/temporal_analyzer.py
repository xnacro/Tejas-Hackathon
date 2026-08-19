import time
from collections import deque

class TemporalDrowsinessAnalyzer:
    """
    Analyzes temporal behavioral patterns across a rolling time window:
    - Distinguishes natural rapid blinks (100-300ms) from microsleeps / prolonged closures.
    - Configurable eye closure duration threshold (default: 4.5 seconds).
    - Detects sustained and repeated yawning (>0.6 MAR sustained for >1.5s).
    - Detects head nodding/dropping pattern.
    - Calculates normalized Drowsiness Score (0-100) and multi-level warning state.
    """
    def __init__(self, window_seconds=10.0, ear_threshold=0.23, mar_threshold=0.60, closure_threshold_sec=4.5):
        self.window_seconds = window_seconds
        self.ear_threshold = ear_threshold
        self.mar_threshold = mar_threshold
        self.closure_threshold_sec = closure_threshold_sec

        # Sliding window history of (timestamp, ear, mar, is_eye_closed, is_yawning, head_pose_down)
        self.history = deque()
        
        # Eye closure tracking
        self.eye_closed_start_time = None
        self.total_blinks = 0
        self.last_blink_time = 0

        # Yawn tracking
        self.yawn_start_time = None
        self.recent_yawns = deque()

    def set_thresholds(self, ear_threshold=None, mar_threshold=None, window_seconds=None, closure_threshold_sec=None):
        if ear_threshold is not None:
            self.ear_threshold = float(ear_threshold)
        if mar_threshold is not None:
            self.mar_threshold = float(mar_threshold)
        if window_seconds is not None:
            self.window_seconds = float(window_seconds)
        if closure_threshold_sec is not None:
            self.closure_threshold_sec = float(closure_threshold_sec)

    def update(self, left_ear, right_ear, mar, head_pose):
        now = time.time()
        avg_ear = (left_ear + right_ear) / 2.0

        # 1. Evaluate instantaneous states
        is_eye_closed = avg_ear < self.ear_threshold
        is_yawning = mar > self.mar_threshold
        is_head_down = head_pose.get("pitch", 0) > 18.0 or head_pose.get("status") == "Down / Nodding"

        # Track eye closure duration
        if is_eye_closed:
            if self.eye_closed_start_time is None:
                self.eye_closed_start_time = now
            closure_duration = now - self.eye_closed_start_time
        else:
            if self.eye_closed_start_time is not None:
                closed_time = now - self.eye_closed_start_time
                if 0.08 <= closed_time <= 0.50:
                    self.total_blinks += 1
                    self.last_blink_time = now
            closure_duration = 0.0
            self.eye_closed_start_time = None

        # Track yawning duration & count
        if is_yawning:
            if self.yawn_start_time is None:
                self.yawn_start_time = now
            yawn_duration = now - self.yawn_start_time
            # If yawn lasts more than 1.4 seconds, record as confirmed yawn
            if yawn_duration > 1.4 and (not self.recent_yawns or now - self.recent_yawns[-1] > 3.5):
                self.recent_yawns.append(now)
        else:
            self.yawn_start_time = None

        # Add to rolling history
        self.history.append((now, avg_ear, mar, is_eye_closed, is_yawning, is_head_down))

        # Purge data older than sliding window
        while self.history and (now - self.history[0][0]) > self.window_seconds:
            self.history.popleft()

        # Purge yawns older than 60 seconds
        while self.recent_yawns and (now - self.recent_yawns[0]) > 60.0:
            self.recent_yawns.popleft()

        # 2. Compute Window Metrics
        total_samples = len(self.history)
        if total_samples > 0:
            closed_samples = sum(1 for item in self.history if item[3])
            perclos = (closed_samples / total_samples) * 100.0  # Percentage of Eye Closure
            head_down_samples = sum(1 for item in self.history if item[5])
            head_down_pct = (head_down_samples / total_samples) * 100.0
        else:
            perclos = 0.0
            head_down_pct = 0.0

        yawns_in_window = len(self.recent_yawns)

        # 3. Calculate Normalized Drowsiness Score (0 - 100)
        score = 0.0

        # Baseline PERCLOS factor (up to 35 pts)
        score += min(35.0, perclos * 1.2)

        # Closure progress towards configured closure_threshold_sec (e.g. 4.5s)
        if closure_duration > 1.0:
            progress = (closure_duration - 1.0) / max(1.0, self.closure_threshold_sec - 1.0)
            score += min(65.0, progress * 65.0)

        # Yawning factor
        if yawns_in_window >= 1:
            score += min(25.0, yawns_in_window * 12.0)

        # Head pose factor
        if is_head_down:
            score += 15.0
        score += min(15.0, head_down_pct * 0.3)

        # Ensure bounds 0 - 100
        score = float(max(0.0, min(100.0, score)))

        # 4. Multi-level State Assignment
        if closure_duration >= self.closure_threshold_sec or score >= 80.0:
            state = "CRITICAL"
            state_label = "CRITICAL DROWSINESS"
            status_message = f"CRITICAL DROWSINESS! Eyes closed for {closure_duration:.1f}s! Stop driving immediately."
            alert_level = 3
        elif closure_duration >= (self.closure_threshold_sec * 0.65) or score >= 55.0:
            state = "DROWSY"
            state_label = "DROWSY"
            status_message = f"Drowsiness detected (Eyes closed {closure_duration:.1f}s). Please take a break."
            alert_level = 2
        elif closure_duration >= 1.5 or score >= 28.0 or is_yawning or is_head_down:
            state = "CAUTION"
            state_label = "CAUTION"
            status_message = "Yawning detected. Stay alert." if is_yawning else "Signs of fatigue detected. Please stay focused."
            alert_level = 1
        else:
            state = "ALERT"
            state_label = "Alert"
            status_message = "You are Alert. Keep driving safely!"
            alert_level = 0

        return {
            "drowsinessScore": round(score, 1),
            "state": state,
            "stateLabel": state_label,
            "statusMessage": status_message,
            "alertLevel": alert_level,
            "indicators": {
                "eyes": "Closed" if is_eye_closed else "Open",
                "yawning": "Yes" if is_yawning else "No",
                "headPose": head_pose.get("status", "Normal")
            },
            "metrics": {
                "avgEar": round(avg_ear, 3),
                "leftEar": round(left_ear, 3),
                "rightEar": round(right_ear, 3),
                "mar": round(mar, 3),
                "perclos": round(perclos, 1),
                "closureDurationSec": round(closure_duration, 2),
                "closureThresholdSec": self.closure_threshold_sec,
                "yawnsRecent": yawns_in_window,
                "totalBlinks": self.total_blinks,
                "headPitch": head_pose.get("pitch", 0),
                "headYaw": head_pose.get("yaw", 0)
            },
            "timestamp": now
        }
