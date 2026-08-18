import time
from collections import deque

class TemporalDrowsinessAnalyzer:
    """
    Analyzes temporal behavioral patterns across a rolling time window:
    - Distinguishes natural rapid blinks (100-300ms) from microsleeps / prolonged closures (>1.2s).
    - Detects sustained and repeated yawning (>0.6 MAR sustained for >1.5s).
    - Detects head nodding/dropping pattern.
    - Calculates normalized Drowsiness Score (0-100) and multi-level warning state.
    """
    def __init__(self, window_seconds=10.0, ear_threshold=0.22, mar_threshold=0.65):
        self.window_seconds = window_seconds
        self.ear_threshold = ear_threshold
        self.mar_threshold = mar_threshold

        # Sliding window history of (timestamp, ear, mar, is_eye_closed, is_yawning, head_pose_down)
        self.history = deque()
        
        # Eye closure tracking
        self.eye_closed_start_time = None
        self.max_continuous_closure = 0.0

        # Yawn tracking
        self.yawn_start_time = None
        self.yawn_count = 0
        self.recent_yawns = deque()

        # Alert level debounce
        self.last_alert_level = "ALERT"
        self.alert_start_time = None

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
            closure_duration = 0.0
            self.eye_closed_start_time = None

        # Track yawning duration & count
        if is_yawning:
            if self.yawn_start_time is None:
                self.yawn_start_time = now
            yawn_duration = now - self.yawn_start_time
            # If yawn lasts more than 1.5 seconds, record as confirmed yawn
            if yawn_duration > 1.5 and (not self.recent_yawns or now - self.recent_yawns[-1] > 4.0):
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
        # Score components:
        # - Eye closure / PERCLOS contributes up to 45 pts
        # - Continuous eye closure (> 1.2s) adds immediate 35-50 pts
        # - Yawning frequency contributes up to 25 pts
        # - Head nodding/dropping contributes up to 25 pts
        score = 0.0

        # PERCLOS factor
        score += min(45.0, perclos * 1.5)

        # Instant prolonged closure (microsleep danger)
        if closure_duration > 1.2:
            score += min(45.0, (closure_duration - 1.2) * 35.0)

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
        if score >= 80.0 or closure_duration >= 2.0:
            state = "CRITICAL"
            state_label = "CRITICAL DROWSINESS"
            status_message = "CRITICAL DROWSINESS! Please stop driving safely immediately."
            alert_level = 3
        elif score >= 60.0:
            state = "DROWSY"
            state_label = "DROWSY"
            status_message = "Drowsiness detected. Please consider taking a break."
            alert_level = 2
        elif score >= 30.0:
            state = "CAUTION"
            state_label = "CAUTION"
            status_message = "You appear tired. Please stay alert."
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
                "mar": round(mar, 3),
                "perclos": round(perclos, 1),
                "closureDurationSec": round(closure_duration, 2),
                "yawnsRecent": yawns_in_window,
                "headPitch": head_pose.get("pitch", 0),
                "headYaw": head_pose.get("yaw", 0)
            },
            "timestamp": now
        }
