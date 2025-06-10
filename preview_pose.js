// preview_pose.js (Lengkap dan Sesuai dengan HTML Terbaru)

document.addEventListener('DOMContentLoaded', function() {
    console.log("preview_pose.js: DOMContentLoaded");

    // Ambil elemen DOM sesuai ID di HTML preview_pose.html terbaru
    const sessionPageTitleEl = document.getElementById('sessionPageTitle');
    const poseNamePreviewEl = document.getElementById('poseNamePreview');
    const countdownPreviewTimerEl = document.getElementById('countdownPreviewTimer'); // ID baru untuk timer
    const poseVideoElement = document.getElementById('poseVideoElement');
    const poseInstructionPreviewEl = document.getElementById('poseInstructionPreview');
    const endSessionBtnPreviewEl = document.getElementById('endSessionPreviewBtn'); // Tombol akhiri sesi di halaman ini

    // Ambil data sesi dari localStorage
    const scheduleId = localStorage.getItem('currentYogaScheduleId');
    const scheduleTitle = localStorage.getItem('currentYogaScheduleTitle');
    let poseIndex = parseInt(localStorage.getItem('currentYogaPoseIndex') || '0', 10);
    const posesJson = localStorage.getItem('currentYogaPoses');

    // Update judul halaman sesi jika ada
    if (sessionPageTitleEl && scheduleTitle) {
        sessionPageTitleEl.textContent = `Preview Pose - Sesi: ${scheduleTitle}`;
    } else if (sessionPageTitleEl) {
        sessionPageTitleEl.textContent = "Preview Pose"; // Judul default
    }

    // Validasi data sesi
    if (!scheduleId || !posesJson) {
        console.error("Data sesi (scheduleId atau posesJson) tidak ditemukan di localStorage.");
        alert("Data sesi tidak lengkap. Harap mulai lagi dari Beranda.");
        window.location.href = 'main_dashboard.html';
        return;
    }

    let poses = [];
    try {
        poses = JSON.parse(posesJson);
    } catch (e) {
        console.error("Gagal mem-parse data pose dari localStorage:", e);
        alert("Data pose rusak. Harap mulai lagi dari Beranda.");
        window.location.href = 'main_dashboard.html';
        return;
    }

    if (!Array.isArray(poses) || poses.length === 0) {
        console.error("Array pose kosong atau tidak valid.");
        alert("Tidak ada pose dalam jadwal ini. Kembali ke Beranda.");
        window.location.href = 'main_dashboard.html';
        return;
    }

    // Cek apakah semua pose sudah selesai
    if (poseIndex >= poses.length) {
        console.log("Semua pose telah selesai. Mengarahkan ke halaman sesi selesai.");
        localStorage.setItem('currentYogaPoseIndex', '0'); // Reset untuk sesi berikutnya
        window.location.href = 'sesi_selesai.html'; 
        return;
    }

    const currentPose = poses[poseIndex];

    if (!currentPose || !currentPose.name || typeof currentPose.duration === 'undefined') {
        console.error("Data pose saat ini tidak valid atau tidak lengkap:", currentPose);
        alert("Data untuk pose saat ini tidak ditemukan. Kembali ke Beranda.");
        window.location.href = 'main_dashboard.html';
        return;
    }

    // Tampilkan Nama Pose
    if (poseNamePreviewEl) {
        poseNamePreviewEl.textContent = currentPose.name.charAt(0).toUpperCase() + currentPose.name.slice(1);
    } else {
        console.warn("Elemen #poseNamePreview tidak ditemukan.");
    }

    // Atur Sumber Video
    if (poseVideoElement) {
        const videoName = currentPose.name.toLowerCase().replace(/\s+/g, '_').replace(/[’']+/g, '') + '.mp4';
        const videoSourcePath = 'videos/poses/' + videoName; 
        
        let sourceElement = poseVideoElement.querySelector('source');
        if (!sourceElement) {
            sourceElement = document.createElement('source');
            poseVideoElement.appendChild(sourceElement);
        }
        
        sourceElement.setAttribute('src', videoSourcePath);
        sourceElement.setAttribute('type', 'video/mp4');
        
        poseVideoElement.load(); 
        poseVideoElement.play().catch(error => {
            console.warn("Autoplay video mungkin dicegah oleh browser:", error);
        });

        poseVideoElement.onerror = function(e) {
            console.warn("Video pose tidak ditemukan atau gagal dimuat:", videoSourcePath, e);
            const videoContainer = document.getElementById('poseVideoContainerPreview');
            if(videoContainer) {
                // Hapus video yang error, tampilkan pesan
                poseVideoElement.style.display = 'none';
                let errorMsgP = videoContainer.querySelector('.video-error-message');
                if (!errorMsgP) {
                    errorMsgP = document.createElement('p');
                    errorMsgP.classList.add('video-error-message'); // Tambahkan kelas jika ingin styling
                    errorMsgP.style.color = 'red';
                    errorMsgP.style.textAlign = 'center';
                    errorMsgP.style.padding = '20px';
                    videoContainer.appendChild(errorMsgP);
                }
                errorMsgP.textContent = `Video untuk pose "${currentPose.name}" tidak dapat dimuat. Menggunakan placeholder jika ada.`;
                // Anda bisa juga set src video ke placeholder.mp4 jika ada
                // sourceElement.setAttribute('src', 'videos/poses/placeholder_pose.mp4');
                // poseVideoElement.load();
                // poseVideoElement.play().catch(err => console.warn("Autoplay placeholder video gagal:", err));
            }
        };
    } else {
        console.warn("Elemen video #poseVideoElement tidak ditemukan.");
    }

    // Tampilkan Instruksi (jika ada elemennya)
    if (poseInstructionPreviewEl) {
        poseInstructionPreviewEl.textContent = `Perhatikan video untuk pose ${currentPose.name}. Anda akan melakukan pose ini selama ${currentPose.duration} detik.`;
    }

    // Logika Countdown
    let countdown = 15; 
    if (countdownPreviewTimerEl) {
        countdownPreviewTimerEl.textContent = countdown;
    } else {
        console.warn("Elemen #countdownPreviewTimer tidak ditemukan.");
    }

    const timerInterval = setInterval(function() {
        countdown--;
        if (countdownPreviewTimerEl) {
            countdownPreviewTimerEl.textContent = countdown;
        }
        if (countdown <= 0) {
            clearInterval(timerInterval);
            console.log("Waktu preview habis, lanjut ke webcam.html");
            window.location.href = 'webcam.html';
        }
    }, 1000);

    // Tombol Akhiri Sesi di halaman Preview
    if (endSessionBtnPreviewEl) {
        endSessionBtnPreviewEl.addEventListener('click', () => {
            clearInterval(timerInterval); // Hentikan timer countdown preview
            if (confirm("Apakah Anda yakin ingin mengakhiri sesi yoga ini?")) {
                // Bersihkan localStorage terkait sesi
                localStorage.removeItem('currentYogaScheduleId');
                localStorage.removeItem('currentYogaScheduleTitle');
                localStorage.removeItem('currentYogaPoses');
                localStorage.removeItem('currentYogaPoseIndex');
                console.log("Sesi diakhiri dari halaman preview, localStorage dibersihkan.");
                window.location.href = 'main_dashboard.html'; // Kembali ke Beranda Dashboard
            } else {
                // Jika dibatalkan, pengguna harus refresh atau tindakan lain,
                // karena timer sudah berhenti dan tidak akan auto-navigate.
                // Atau, bisa juga restart timer jika diinginkan.
                // Untuk kesederhanaan, kita biarkan timer berhenti.
                console.log("Pengguna membatalkan pengakhiran sesi dari preview.");
                 // Jika ingin melanjutkan countdown, Anda bisa panggil lagi start countdown atau
                 // tidak meng-clear interval di atas dan hanya meng-clear jika confirm = true.
                 // Tapi lebih aman menghentikan timer saat dialog muncul.
            }
        });
    }

    console.log(`preview_pose.js: Preview untuk pose: ${currentPose.name} (Indeks: ${poseIndex})`);
});