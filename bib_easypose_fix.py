import cv2
import mediapipe as mp
import numpy as np
import math
import time

# --- Fungsi untuk memainkan bunyi beep ---
from playsound import playsound

def play_warning_beep():
    playsound('/Users/mac/Documents/YoFi/180821__empty-bell__beep.wav')

# --- Definisi Threshold Sudut untuk Easy Pose (Sukhasana) - PEMULA ---
SUKHASANA_KHK_MIN = 160.0  # Knee(L)-MidHip-Knee(R) (untuk kaki bersila)
SUKHASANA_KHK_MAX = 190.0  # Mungkin perlu penyesuaian lebih lanjut tergantung definisi
SUKHASANA_SPINE_MIN = 176.0 # Spine (Nose-MidShoulder-MidHip) - Punggung tegak
SUKHASANA_SPINE_MAX = 180.0

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

print("Mencoba membuka kamera untuk Deteksi Easy Pose...")
cap = cv2.VideoCapture(1)

if not cap.isOpened():
    print("ERROR KRITIS: Tidak bisa membuka kamera. Program akan berhenti.")
    exit()
else:
    print("Kamera berhasil dibuka. Memulai deteksi Easy Pose...")

# Variabel untuk status pose dan beep
current_pose_name = "Not Easy Pose"
last_beep_time = 0
BEEP_COOLDOWN_DURATION = 2.0

# Variabel untuk tampilan feedback
FONT_SCALE_FEEDBACK = 1.0
FEEDBACK_COLOR = (0, 0, 255) # Merah
CORRECT_COLOR = (0, 255, 0) # Hijau
INFO_COLOR = (255, 255, 255) # Putih
COUNTER_COLOR = (255, 255, 0) # Cyan untuk counter

# Variabel untuk Penghitung Pose
pose_completed_count = 0
was_pose_correct_previously = False

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
    is_pose_correct_this_frame = False

    try:
        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark
            
            # Ekstraksi landmark yang dibutuhkan
            lm_l_shoulder = [landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value].y]
            lm_r_shoulder = [landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value].y]
            lm_l_hip = [landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].x, landmarks[mp_pose.PoseLandmark.LEFT_HIP.value].y]
            lm_r_hip = [landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_HIP.value].y]
            lm_l_knee = [landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_KNEE.value].y]
            lm_r_knee = [landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_KNEE.value].y]
            lm_nose = [landmarks[mp_pose.PoseLandmark.NOSE.value].x, landmarks[mp_pose.PoseLandmark.NOSE.value].y]
            # (Opsional) Landmark lain bisa diekstrak jika ingin menampilkan sudut lain
            # lm_l_ankle = [landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value].y]
            # lm_r_ankle = [landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].x, landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value].y]


            # Kalkulasi sudut Spine (Nose-MidShoulder-MidHip)
            mid_shoulder = [(lm_l_shoulder[0] + lm_r_shoulder[0]) / 2, (lm_l_shoulder[1] + lm_r_shoulder[1]) / 2]
            mid_hip = [(lm_l_hip[0] + lm_r_hip[0]) / 2, (lm_l_hip[1] + lm_r_hip[1]) / 2]
            angle_spine_alignment = calculate_angle(lm_nose, mid_shoulder, mid_hip) 
            displayed_angles['Spine(NMH)'] = angle_spine_alignment

            # Kalkulasi sudut KHK (Knee-MidHip-Knee)
            # Pastikan mid_hip sudah dihitung
            angle_knee_hip_knee = calculate_angle(lm_l_knee, mid_hip, lm_r_knee)
            displayed_angles['Knee-Hip-Knee'] = angle_knee_hip_knee
            
            # (Opsional) Tampilkan sudut lutut individual jika diinginkan
            # lm_l_ankle_val = landmarks[mp_pose.PoseLandmark.LEFT_ANKLE.value]
            # lm_r_ankle_val = landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE.value]
            # angle_l_knee_hka = calculate_angle(lm_l_hip, lm_l_knee, [lm_l_ankle_val.x, lm_l_ankle_val.y])
            # angle_r_knee_hka = calculate_angle(lm_r_hip, lm_r_knee, [lm_r_ankle_val.x, lm_r_ankle_val.y])
            # displayed_angles['L_Knee(HKA)'] = angle_l_knee_hka
            # displayed_angles['R_Knee(HKA)'] = angle_r_knee_hka


            # Cek kondisi untuk Easy Pose
            sukhasana_cond_khk = (SUKHASANA_KHK_MIN <= angle_knee_hip_knee <= SUKHASANA_KHK_MAX)
            sukhasana_cond_spine = (SUKHASANA_SPINE_MIN <= angle_spine_alignment <= SUKHASANA_SPINE_MAX)
                                
            if sukhasana_cond_khk and sukhasana_cond_spine:
                current_pose_name = "Easy Pose (Sukhasana)"
                is_pose_correct_this_frame = True
            else:
                current_pose_name = "Incorrect Easy Pose"
                is_pose_correct_this_frame = False
                if not sukhasana_cond_khk:
                    feedback_messages.append("ATUR POSISI KAKI BERSILA") 
                if not sukhasana_cond_spine:
                    feedback_messages.append("TEGAKKAN PUNGGUNG ANDA") 
        
        else: 
            current_pose_name = "No landmarks detected"
            is_pose_correct_this_frame = False
            
    except IndexError: # Menangani jika landmark tidak lengkap (misal kaki tidak terlihat)
        current_pose_name = "Landmark tidak lengkap"
        is_pose_correct_this_frame = False
        feedback_messages.append("PASTIKAN SELURUH BADAN TERLIHAT")
    except Exception as e:
        current_pose_name = "Error processing landmarks"
        # print(f"Error processing landmarks: {e}")
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
    if results.pose_landmarks and not is_pose_correct_this_frame and current_pose_name != "Landmark tidak lengkap":
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

    # TAMPILAN TEKS FEEDBACK & STATUS
    cv2.rectangle(image_bgr, (0,0), (int(image_width * 0.95), 70), (0,0,0), -1)

    if not is_pose_correct_this_frame and results.pose_landmarks and feedback_messages:
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
        
        cv2.putText(image_bgr, f"POSE: {current_pose_name}", (10,25), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, FEEDBACK_COLOR, 2, cv2.LINE_AA)
    elif current_pose_name == "Landmark tidak lengkap" and feedback_messages: # Khusus untuk landmark tidak lengkap
        y_start_feedback = int(image_height * 0.4)
        (text_width, text_height), _ = cv2.getTextSize(feedback_messages[0], cv2.FONT_HERSHEY_SIMPLEX, FONT_SCALE_FEEDBACK, 2)
        text_x = int((image_width - text_width) / 2)
        text_y = y_start_feedback
        cv2.rectangle(image_bgr, (text_x - 10, text_y - text_height - 5), 
                        (text_x + text_width + 10, text_y + 10), 
                        (50, 50, 50), -1) 
        cv2.putText(image_bgr, feedback_messages[0], (text_x, text_y), 
                    cv2.FONT_HERSHEY_SIMPLEX, FONT_SCALE_FEEDBACK, INFO_COLOR, 2, cv2.LINE_AA)
        cv2.putText(image_bgr, f"STATUS: {current_pose_name}", (10,25), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, INFO_COLOR, 2, cv2.LINE_AA)
    else: # Pose benar atau tidak ada landmark sama sekali
        text_color_status = INFO_COLOR
        if current_pose_name == "Easy Pose (Sukhasana)": # DIUBAH
            text_color_status = CORRECT_COLOR
        elif current_pose_name == "Incorrect Easy Pose": # DIUBAH
            text_color_status = FEEDBACK_COLOR
        
        cv2.putText(image_bgr, f"POSE: {current_pose_name}", (10,25), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, text_color_status, 2, cv2.LINE_AA)

    cv2.putText(image_bgr, f"POSE SELESAI: {pose_completed_count}", (10, 55),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, COUNTER_COLOR, 2, cv2.LINE_AA)

    # Tampilkan Sudut-Sudut
    y_offset_angles = 80 
    if (not is_pose_correct_this_frame or current_pose_name == "Landmark tidak lengkap") and results.pose_landmarks and feedback_messages:
        y_offset_angles = int(image_height * 0.4) + 50 # Sesuaikan agar tidak tumpang tindih
        if y_offset_angles > image_height - 60 : y_offset_angles = image_height - 60

    for key, value in displayed_angles.items():
        cv2.putText(image_bgr, f"{key}: {value:.1f}", (10, y_offset_angles), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 1, cv2.LINE_AA)
        y_offset_angles += 18
        if y_offset_angles > image_height - 20:
            break
    
    cv2.imshow("Easy Pose Detection", image_bgr) # DIUBAH Judul Jendela

    if cv2.waitKey(5) & 0xFF == ord('q'):
        break

print("Melepaskan kamera dan menutup jendela...")
cap.release()
cv2.destroyAllWindows()
if 'pose' in locals() and pose is not None:
    pose.close() 
print(f"Program Selesai. Anda menyelesaikan Easy Pose sebanyak {pose_completed_count} kali.") # DIUBAH