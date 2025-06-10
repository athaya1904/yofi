function signalPoseCompleteFromCV(isCorrect = true) {
  if (!isCorrect) {
    console.warn("Sinyal CV: Pose belum selesai atau terdeteksi salah.");
    const poseStatusEl = document.getElementById("poseStatusMessage");
    if (poseStatusEl) {
      poseStatusEl.textContent = "Pose belum sempurna, coba perbaiki posisi Anda!";
      poseStatusEl.classList.add("error-cv");
    }
    return;
  }

  console.log("Sinyal dari CV atau tombol manual: Pose dianggap selesai dengan benar!");

  let poseIndex = parseInt(localStorage.getItem("currentYogaPoseIndex") || "0", 10);
  const posesJson = localStorage.getItem("currentYogaPoses");

  if (!posesJson) {
    console.error("Data pose (posesJson) tidak ditemukan di localStorage pada signalPoseCompleteFromCV.");
    alert("Terjadi kesalahan, data sesi tidak ditemukan. Kembali ke Beranda.");
    window.location.href = "main_dashboard.html";
    return;
  }

  let poses = [];
  try {
    poses = JSON.parse(posesJson);
  } catch (e) {
    console.error("Gagal mem-parse data pose pada signalPoseCompleteFromCV:", e);
    alert("Terjadi kesalahan data pose. Kembali ke Beranda.");
    window.location.href = "main_dashboard.html";
    return;
  }

  poseIndex++;
  localStorage.setItem("currentYogaPoseIndex", poseIndex.toString());

  if (poseIndex < poses.length) {
    window.location.href = "preview_pose.html";
  } else {
    window.location.href = "sesi_selesai.html";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Timer elements
  const poseTimerEl = document.getElementById('poseTimer');
  const holdTimeEl = document.getElementById('holdTime');
  const targetTimeEl = document.getElementById('targetTime');
  let holdStartTime = null;
  let timerInterval = null;

  const videoFeed = document.getElementById('videoFeed');
  const connectionMessage = document.getElementById('connectionMessage');

  if (videoFeed) {
    videoFeed.src = "http://localhost:5000/video_feed";
    videoFeed.onerror = () => {
      if (connectionMessage) {
        connectionMessage.textContent = "Gagal terhubung ke kamera. Pastikan server Python (FastAPI) berjalan.";
        connectionMessage.style.color = "red";
      }
    };
    videoFeed.onload = () => {
      if (connectionMessage) {
        connectionMessage.style.display = "none";
      }
    };
  }

  console.log("Mencoba terhubung ke server Socket.IO (FastAPI) di port 8000...");
  const socket = io.connect("http://localhost:5000", {
    path: "/ws/socket.io/",
  });

  socket.on("connect", () => {
    console.log("Terhubung ke Server CV (FastAPI) via WebSocket. SID:", socket.id);
    sendCurrentPoseInfoToServer();
  });

  socket.on("connect_error", (error) => {
    console.error("Gagal terhubung ke Server CV (FastAPI) via WebSocket:", error);
    if (poseStatusMessageEl)
      poseStatusMessageEl.textContent = "Gagal terhubung ke server CV. Pastikan server Python (FastAPI) berjalan.";
    if (cvFeedPlaceholderEl && !cvFeedPlaceholderEl.querySelector("img")) {
      cvFeedPlaceholderEl.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Koneksi ke server CV gagal.<br>Pastikan server Python (FastAPI) Anda sudah berjalan.</p>';
    }
  });

  socket.on("disconnect", () => {
    console.log("Terputus dari Server CV (FastAPI).");
    if (poseStatusMessageEl)
      poseStatusMessageEl.textContent = "Koneksi ke server CV terputus.";
  });

  socket.on("connection_ack", (data) => {
    console.log("Server FastAPI acknowledgement:", data.message);
  });

  socket.on("pose_feedback", (data) => {
    console.log("Feedback dari server CV (FastAPI):", data);
    if (poseStatusMessageEl) {
        if (data.status === "BENAR") {
            poseStatusMessageEl.textContent = "Pose sudah benar! Pertahankan posisi ini.";
        } else if (data.status === "SALAH") {
            poseStatusMessageEl.textContent = "Pose belum sesuai, coba perbaiki posisi Anda!";
        } else {
            poseStatusMessageEl.textContent = data.message || data.status || "Menerima feedback...";
        }

        // Tampilkan flow dan timer per flow
        if (poseTimerEl && typeof data.flow !== 'undefined' && typeof data.flow_total !== 'undefined') {
            poseTimerEl.innerHTML = `Flow: <span id='flowNow'>${data.flow}</span>/<span id='flowTotal'>${data.flow_total}</span> &nbsp; | &nbsp; Waktu: <span id='holdTime'>${data.flow_elapsed?.toFixed(1) ?? '0.0'}</span>s / <span id='targetTime'>${data.flow_duration?.toFixed(1) ?? '5.0'}</span>s`;
        }

        if (data.status === "BENAR") {
            poseTimerEl.classList.add('correct');
            poseTimerEl.classList.remove('incorrect');
        } else {
            poseTimerEl.classList.remove('correct');
            poseTimerEl.classList.add('incorrect');
        }

        if (data.status === "SALAH" || data.status === "ERROR" || data.status === "PERHATIAN") {
            poseStatusMessageEl.classList.add("error-cv");
        } else {
            poseStatusMessageEl.classList.remove("error-cv");
        }
    }

    // Play beep if instructed by backend
    if (data.playBeep) {
        playBeepSound();
    }
  });

  function startHoldTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
      if (holdStartTime) {
        const holdDuration = (Date.now() - holdStartTime) / 1000;
        holdTimeEl.textContent = holdDuration.toFixed(1);
      }
    }, 100);
  }

  socket.on("pose_complete_signal", (data) => {
    console.log("Sinyal POSE SELESAI dari server CV (FastAPI):", data);
    const currentPoseData = getCurrentPoseData();
    const serverPoseKey = data.pose
      ? data.pose.toLowerCase().replace(" ", "_").replace("'", "").replace("'", "")
      : null;
    const clientPoseKey = currentPoseData
      ? currentPoseData.name.toLowerCase().replace(" ", "_").replace("'", "").replace("'", "")
      : null;

    if (data.status === "selesai" && serverPoseKey === clientPoseKey) {
      signalPoseCompleteFromCV(true);
    } else {
      console.warn(
        "Menerima sinyal pose selesai, tapi untuk pose yang berbeda atau status tidak valid:",
        data,
        "Pose saat ini di frontend:",
        currentPoseData ? currentPoseData.name : "tidak ada"
      );
    }
  });

  socket.on("session_stopped_ack", (data) => {
    console.log("Server (FastAPI) mengkonfirmasi sesi dihentikan:", data.message);
  });

  const currentPoseNameDisplayEl = document.getElementById("currentPoseNameDisplay");
  const endSessionBtnEl = document.getElementById("endSessionBtn");
  const cvFeedPlaceholderEl = document.getElementById("cvFeedPlaceholder");
  const poseStatusMessageEl = document.getElementById("poseStatusMessage");
  const manualNextPoseButtonEl = document.getElementById("manualNextPoseButton");

  if (!manualNextPoseButtonEl) {
    console.error("Elemen #manualNextPoseButton TIDAK DITEMUKAN.");
    return;
  }
  if (!cvFeedPlaceholderEl) {
    console.error("Elemen #cvFeedPlaceholder TIDAK DITEMUKAN.");
    return;
  }
  if (!endSessionBtnEl) {
    console.error("Tombol 'Akhiri Sesi' dengan ID 'endSessionBtn' tidak ditemukan.");
  }

  const scheduleId = localStorage.getItem("currentYogaScheduleId");
  const scheduleTitle = localStorage.getItem("currentYogaScheduleTitle");
  let poseIndex = parseInt(localStorage.getItem("currentYogaPoseIndex") || "0", 10);
  const posesJson = localStorage.getItem("currentYogaPoses");

  if (!scheduleId || !posesJson) {
    alert("Data sesi atau pose tidak ditemukan. Kembali ke Beranda.");
    window.location.href = "main_dashboard.html";
    return;
  }

  let poses = [];
  try {
    poses = JSON.parse(posesJson);
  } catch (e) {
    alert("Data pose rusak. Kembali ke Beranda.");
    window.location.href = "main_dashboard.html";
    return;
  }

  if (!Array.isArray(poses) || poses.length === 0 || poseIndex >= poses.length) {
    console.log("Indeks pose sudah di akhir atau array pose kosong/tidak valid, mengarahkan ke sesi selesai.");
    window.location.href = "sesi_selesai.html";
    return;
  }

  const currentPose = poses[poseIndex];
  if (!currentPose || !currentPose.name || typeof currentPose.duration === "undefined") {
    alert("Data untuk pose saat ini tidak valid. Kembali ke Beranda.");
    window.location.href = "main_dashboard.html";
    return;
  }

  function getCurrentPoseData() {
    const currentPI = parseInt(localStorage.getItem("currentYogaPoseIndex") || "0", 10);
    const currentPJ = localStorage.getItem("currentYogaPoses");
    if (currentPJ) {
      try {
        const pArray = JSON.parse(currentPJ);
        if (currentPI < pArray.length) return pArray[currentPI];
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  if (currentPoseNameDisplayEl)
    currentPoseNameDisplayEl.textContent = capitalizeFirstLetter(currentPose.name);
  if (targetTimeEl)
    targetTimeEl.textContent = currentPose.duration.toFixed(1);
  if (poseStatusMessageEl)
    poseStatusMessageEl.textContent = `Lakukan pose ${capitalizeFirstLetter(currentPose.name)}...`;

  function sendCurrentPoseInfoToServer() {
    console.log("DEBUG: currentPose sebelum emit:", currentPose);

    if (socket.connected && currentPose) {
      console.log(`Mengirim 'start_pose_from_web' ke server (FastAPI): Pose=${currentPose.name}, Durasi=${currentPose.duration}`);
      socket.emit("start_pose_from_web", {
        poseName: currentPose.name,
        duration: currentPose.duration,
      });
    } else {
      console.warn("Socket tidak terhubung atau currentPose tidak ada, tidak bisa mengirim info pose.");
      if (poseStatusMessageEl)
        poseStatusMessageEl.textContent = "Gagal terhubung ke server CV. Coba refresh.";
    }
  }

  let timeLeft = currentPose.duration;
  let countdownInterval;

  function startCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    timeLeft = currentPose.duration;

    if (manualNextPoseButtonEl) {
      manualNextPoseButtonEl.disabled = true;
      manualNextPoseButtonEl.style.backgroundColor = "#a0a0a0";
    }
    console.log(`Timer dimulai: ${timeLeft}s untuk ${currentPose.name}.`);
    countdownInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        if (manualNextPoseButtonEl) {
          manualNextPoseButtonEl.disabled = false;
          manualNextPoseButtonEl.style.backgroundColor = "";
        }
        console.log("Countdown selesai! Tombol Selanjutnya aktif (menunggu sinyal CV atau klik manual).");
      }
    }, 1000);
  }
  startCountdown();

  if (manualNextPoseButtonEl) {
    manualNextPoseButtonEl.addEventListener("click", () => {
      if (!manualNextPoseButtonEl.disabled) {
        console.log('Tombol "Selanjutnya" (manual) diklik!');
        signalPoseCompleteFromCV(true);
      }
    });
  }

  if (endSessionBtnEl) {
    endSessionBtnEl.addEventListener("click", () => {
      console.log('webcam.js: Tombol "Akhiri Sesi" diklik.');
      if (typeof countdownInterval !== "undefined" && countdownInterval) {
        clearInterval(countdownInterval);
        console.log("webcam.js: Timer countdown dihentikan.");
      } else {
        console.warn("webcam.js: countdownInterval tidak terdefinisi atau sudah di-clear saat klik Akhiri Sesi.");
      }
      
      // Clear pose timer
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      
      const userConfirmed = confirm("Apakah Anda yakin ingin mengakhiri sesi yoga ini?");
      console.log("webcam.js: Hasil konfirmasi pengguna:", userConfirmed);
      if (userConfirmed) {
        console.log("webcam.js: Pengguna mengonfirmasi untuk mengakhiri sesi.");
        if (typeof socket !== "undefined" && socket && socket.connected) {
          console.log('webcam.js: Mengirim event "stop_session_from_web" ke server.');
          socket.emit("stop_session_from_web");
        } else {
          console.warn("webcam.js: Socket tidak terhubung, tidak mengirim sinyal stop ke server.");
        }
        localStorage.removeItem("currentYogaScheduleId");
        localStorage.removeItem("currentYogaScheduleTitle");
        localStorage.removeItem("currentYogaPoses");
        localStorage.removeItem("currentYogaPoseIndex");
        console.log("webcam.js: Data sesi dari localStorage telah dibersihkan.");
        console.log("webcam.js: Mengarahkan ke main_dashboard.html...");
        window.location.href = "main_dashboard.html";
      } else {
        console.log("webcam.js: Pengguna membatalkan pengakhiran sesi.");
      }
    });
  }

  if (cvFeedPlaceholderEl) {
    const videoStreamImg = document.createElement('img');
    videoStreamImg.id = "cvFeed";
    videoStreamImg.src = "http://localhost:5000/video_feed";
    videoStreamImg.alt = "Live Pose Detection Stream";
    videoStreamImg.style.width = "100%";
    videoStreamImg.style.height = "100%";
    videoStreamImg.style.objectFit = "contain";

    videoStreamImg.onerror = (error) => {
      console.error("Error loading video stream:", error);
      cvFeedPlaceholderEl.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">' +
        'Gagal memuat video stream.<br>Pastikan server Python Anda sudah berjalan di port 5000.</p>';
    };

    cvFeedPlaceholderEl.innerHTML = "";
    cvFeedPlaceholderEl.appendChild(videoStreamImg);
  }

  console.log("webcam.js (untuk FastAPI): Semua inisialisasi selesai.");
});

function capitalizeFirstLetter(string) {
  if (!string) return "";
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Tambahkan fungsi ini di bawah (atau di bagian bawah file)
function playBeepSound() {
    // Pastikan file beep.wav ada di folder yang bisa diakses browser, misal /static/
    const beep = new Audio('/static/180821__empty-bell__beep.wav');
    beep.play().catch(e => console.warn('Gagal memutar beep:', e));
}