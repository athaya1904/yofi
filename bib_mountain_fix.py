import cv2
import mediapipe as mp
import numpy as np
import math
import time

# --- Fungsi untuk memainkan bunyi beep ---
from playsound import playsound

def play_warning_beep():
    playsound('/Users/mac/Documents/YoFi/180821__empty-bell__beep.wav')

# --- Definisi Threshold Sudut untuk Mountain Pose (Tadasana) ---
TADASANA_SHOULDER_HIP_ANKLE_MIN = 165.0
TADASANA_SHOULDER_HIP_ANKLE_MAX = 178.0
TADASANA_ESH_ARMS_DOWN_MIN = 15.0
TADASANA_ESH_ARMS_DOWN_MAX = 40.0
TADASANA_ESH_ARMS_UP_MIN = 160.0
TADASANA_ESH_ARMS_UP_MAX = 178.0
TADASANA_KNEE_MIN = 165.0
TADASANA_KNEE_MAX = 180.0

# Inisialisasi MediaPipe Pose
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(min_detection_confidence=0.5, min_tracking_confidence=0.5)
mp_drawing = mp.solutions.drawing_utils

def calculate_angle(a, b, c):
    a = np.array(a) # Titik pertama
    b = np.array(b) # Vertex sudut
    c = np.array(c) # Titik ketiga
    
    vec_ba = a - b
    vec_bc = c - b
    
    angle_rad = np.arctan2(vec_bc[1], vec_bc[0]) - np.arctan2(vec_ba[1], vec_ba[0])
    angle_deg = np.degrees(angle_rad)
    
    angle_deg = np.abs(angle_deg)
    if angle_deg > 180.0:
        angle_deg = 360.0 - angle_deg
    return angle_deg

print("Mencoba membuka kamera untuk Deteksi Mountain Pose...")
cap = cv2.VideoCapture(1)

if not cap.isOpened():
    print("ERROR KRITIS: Tidak bisa membuka kamera. Program akan berhenti.")
    exit()
else:
    print("Kamera berhasil dibuka. Memulai deteksi Mountain Pose...")

# Variabel untuk status pose dan beep
current_pose_name = "Not Mountain Pose"
last_beep_time = 0
BEEP_COOLDOWN_DURATION = 2.0

# Variabel untuk tampilan feedback
FONT_SCALE_FEEDBACK = 1.0
FEEDBACK_COLOR = (0, 0, 255) # Merah
CORRECT_COLOR = (0, 255, 0) # Hijau
INFO_COLOR = (255, 255, 255) # Putih
COUNTER_COLOR = (255, 255, 0) # Cyan untuk counter

# >>> Variabel untuk Penghitung Pose <<<
pose_completed_count = 0
was_pose_correct_previously = False # Untuk melacak status pose di frame sebelumnya

# >>> Variabel untuk Timer Pose Benar <<<
pose_correct_start_time = None  # Waktu saat pose benar mulai terdeteksi
POSE_HOLD_DURATION = 5.0        # Durasi pose benar harus dipertahankan (dalam detik)

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        print("Error: Tidak bisa membaca frame. Mengakhiri loop.")
        break

    image_height, image_width, _ = frame.shape
    image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    image_rgb.flags.writeable = False
    results = pose.process(image_rgb)
    image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
    image_bgr.flags.writeable = True
    
    displayed_angles = {}
    feedback_messages = []
    is_pose_correct_this_frame = False # Ganti nama variabel agar lebih jelas

    try:
        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            
            # Ekstraksi landmark
            lm_l_shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
            lm_r_shoulder = [landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y]
            lm_l_elbow = [landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ELBOW.value].y]
            lm_r_elbow = [landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW.value].y]
            lm_l_hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x, landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
            lm_r_hip = [landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].y]
            lm_l_knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
            lm_r_knee = [landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].y]
            lm_l_ankle = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]
            lm_r_ankle = [landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].y]

            # Kalkulasi sudut
            angle_l_shoulder_hip_ankle = calculate_angle(lm_l_shoulder, lm_l_hip, lm_l_ankle)
            angle_r_shoulder_hip_ankle = calculate_angle(lm_r_shoulder, lm_r_hip, lm_r_ankle)
            displayed_angles['L_SHA'] = angle_l_shoulder_hip_ankle
            displayed_angles['R_SHA'] = angle_r_shoulder_hip_ankle

            angle_l_elbow_shoulder_hip = calculate_angle(lm_l_elbow, lm_l_shoulder, lm_l_hip)
            angle_r_elbow_shoulder_hip = calculate_angle(lm_r_elbow, lm_r_shoulder, lm_r_hip)
            displayed_angles['L_ESH'] = angle_l_elbow_shoulder_hip
            displayed_angles['R_ESH'] = angle_r_elbow_shoulder_hip

            angle_l_knee = calculate_angle(lm_l_hip, lm_l_knee, lm_l_ankle)
            angle_r_knee = calculate_angle(lm_r_hip, lm_r_knee, lm_r_ankle)
            displayed_angles['L_Knee(HKA)'] = angle_l_knee
            displayed_angles['R_Knee(HKA)'] = angle_r_knee
            
            # Cek kondisi untuk Tadasana
            cond_l_sha_ok = TADASANA_SHOULDER_HIP_ANKLE_MIN <= angle_l_shoulder_hip_ankle <= TADASANA_SHOULDER_HIP_ANKLE_MAX
            cond_r_sha_ok = TADASANA_SHOULDER_HIP_ANKLE_MIN <= angle_r_shoulder_hip_ankle <= TADASANA_SHOULDER_HIP_ANKLE_MAX
            tadasana_cond_sha = cond_l_sha_ok and cond_r_sha_ok

            cond_l_esh_down_ok = TADASANA_ESH_ARMS_DOWN_MIN <= angle_l_elbow_shoulder_hip <= TADASANA_ESH_ARMS_DOWN_MAX
            cond_r_esh_down_ok = TADASANA_ESH_ARMS_DOWN_MIN <= angle_r_elbow_shoulder_hip <= TADASANA_ESH_ARMS_DOWN_MAX
            tadasana_cond_esh_arms_down = cond_l_esh_down_ok and cond_r_esh_down_ok

            cond_l_esh_up_ok = TADASANA_ESH_ARMS_UP_MIN <= angle_l_elbow_shoulder_hip <= TADASANA_ESH_ARMS_UP_MAX
            cond_r_esh_up_ok = TADASANA_ESH_ARMS_UP_MIN <= angle_r_elbow_shoulder_hip <= TADASANA_ESH_ARMS_UP_MAX
            tadasana_cond_esh_arms_up = cond_l_esh_up_ok and cond_r_esh_up_ok
            
            tadasana_cond_esh = tadasana_cond_esh_arms_down or tadasana_cond_esh_arms_up

            cond_l_knee_ok = TADASANA_KNEE_MIN <= angle_l_knee <= TADASANA_KNEE_MAX
            cond_r_knee_ok = TADASANA_KNEE_MIN <= angle_r_knee <= TADASANA_KNEE_MAX
            tadasana_cond_knee = cond_l_knee_ok and cond_r_knee_ok
            
            if tadasana_cond_sha and tadasana_cond_esh and tadasana_cond_knee:
                current_pose_name = "Mountain Pose (Tadasana)"
                is_pose_correct_this_frame = True
            else:
                current_pose_name = "Incorrect Mountain Pose"
                is_pose_correct_this_frame = False
                if not tadasana_cond_sha:
                    feedback_messages.append("LURUSKAN BADAN & KAKI")
                if not tadasana_cond_esh:
                    feedback_messages.append("PERBAIKI POSISI LENGAN")
                if not tadasana_cond_knee:
                    feedback_messages.append("LURUSKAN LUTUT")
        
        else: 
            current_pose_name = "No landmarks detected"
            is_pose_correct_this_frame = False
            
    except Exception as e:
        current_pose_name = "Error processing landmarks"
        # print(f"Error processing landmarks: {e}") # Uncomment untuk debug
        is_pose_correct_this_frame = False
        pass

    # >>> Logika untuk Timer dan Penghitung Pose <<<
    current_time_for_timer = time.time() # Dapatkan waktu saat ini untuk logika timer

    if is_pose_correct_this_frame:
        if pose_correct_start_time is None: # Jika pose baru saja menjadi benar
            pose_correct_start_time = current_time_for_timer
            # print("Timer dimulai untuk pose benar...") # Debugging opsional
        else:
            # Jika pose tetap benar, cek apakah durasi sudah tercapai
            if (current_time_for_timer - pose_correct_start_time) >= POSE_HOLD_DURATION:
                if not was_pose_correct_previously: # Hanya hitung sekali saat durasi tercapai dan sebelumnya belum dihitung
                    pose_completed_count += 1
                    print(f"Pose Sukhasana terhitung! Total: {pose_completed_count}") # Feedback
                    # Mungkin ingin memainkan suara berhasil di sini juga
                was_pose_correct_previously = True # Tandai sudah dihitung untuk durasi ini
    else: # Jika pose salah atau tidak terdeteksi
        if pose_correct_start_time is not None:
            print("Pose salah/berubah, timer direset.") # Debugging opsional
        pose_correct_start_time = None # Reset timer jika pose salah
        was_pose_correct_previously = False # Reset status hitung

    # Logika Beep
    if results.pose_landmarks and not is_pose_correct_this_frame: # Gunakan is_pose_correct_this_frame
        current_time = time.time()
        if (current_time - last_beep_time) > BEEP_COOLDOWN_DURATION:
            play_warning_beep()
            last_beep_time = current_time

    # Gambar landmarks
    if results.pose_landmarks:
        mp_drawing.draw_landmarks(
            image_bgr, results.pose_landmarks, mp_pose.POSE_CONNECTIONS,
            mp_drawing.DrawingSpec(color=(245,117,66), thickness=2, circle_radius=2),
            mp_drawing.DrawingSpec(color=(245,66,230), thickness=2, circle_radius=2)
        )

    # --- TAMPILAN TEKS FEEDBACK & STATUS ---
    # Background untuk teks status dan counter
    cv2.rectangle(image_bgr, (0,0), (int(image_width * 0.95), 70), (0,0,0), -1) # Background sedikit diperbesar

    if not is_pose_correct_this_frame and results.pose_landmarks and feedback_messages:
        # Tampilkan pesan feedback besar di tengah
        y_start_feedback = int(image_height * 0.3) 
        for i, msg in enumerate(feedback_messages):
            (text_width, text_height), _ = cv2.getTextSize(msg, cv2.FONT_HERSHEY_SIMPLEX, FONT_SCALE_FEEDBACK, 2)
            text_x = int((image_width - text_width) / 2)
            text_y = y_start_feedback + (i * (text_height + 15)) 

            cv2.rectangle(image_bgr, (text_x - 10, text_y - text_height - 5), 
                          (text_x + text_width + 10, text_y + 10), 
                          (50, 50, 50), -1) 
            cv2.putText(image_bgr, msg, (text_x, text_y), 
                        cv2.FONT_HERSHEY_SIMPLEX, FONT_SCALE_FEEDBACK, FEEDBACK_COLOR, 2, cv2.LINE_AA)
        
        # Status umum di pojok kiri atas
        cv2.putText(image_bgr, f"POSE: {current_pose_name}", (10,25), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, FEEDBACK_COLOR, 2, cv2.LINE_AA)

    else:
        # Status pose normal di pojok kiri atas
        text_color_status = INFO_COLOR
        if current_pose_name == "Mountain Pose (Tadasana)":
            text_color_status = CORRECT_COLOR
        elif current_pose_name == "Incorrect Mountain Pose": 
            text_color_status = FEEDBACK_COLOR
        
        cv2.putText(image_bgr, f"POSE: {current_pose_name}", (10,25), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, text_color_status, 2, cv2.LINE_AA)

    # >>> Tampilkan Penghitung Pose <<<
    cv2.putText(image_bgr, f"POSE SELESAI: {pose_completed_count}", (10, 55), # Posisi di bawah status pose
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, COUNTER_COLOR, 2, cv2.LINE_AA)


    # Tampilkan Sudut-Sudut
    y_offset_angles = 80 # Naikkan sedikit agar ada ruang untuk counter
    if not is_pose_correct_this_frame and results.pose_landmarks and feedback_messages:
        y_offset_angles = int(image_height * 0.3) + (len(feedback_messages) * 50) + 30
        if y_offset_angles > image_height - 60 : y_offset_angles = image_height - 60

    for key, value in displayed_angles.items():
        cv2.putText(image_bgr, f"{key}: {value:.1f}", (10, y_offset_angles), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 1, cv2.LINE_AA)
        y_offset_angles += 18
        if y_offset_angles > image_height - 20:
            break
    
    cv2.imshow('Mountain Pose Detection', image_bgr)

    if cv2.waitKey(5) & 0xFF == ord('q'):
        break

print("Melepaskan kamera dan menutup jendela...")
cap.release()
cv2.destroyAllWindows()
if 'pose' in locals() and pose is not None: # Pastikan objek pose ada sebelum ditutup
    pose.close() 
print(f"Program Selesai. Anda menyelesaikan Mountain Pose sebanyak {pose_completed_count} kali.")