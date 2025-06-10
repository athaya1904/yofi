// persiapan_sesi.js (Direvisi untuk mengarahkan ke preview_pose.html)

document.addEventListener('DOMContentLoaded', function() {
    const currentScheduleTitle = localStorage.getItem('currentYogaScheduleTitle');
    const sessionTitleEl = document.getElementById('sessionTitlePreparation'); // ID dari HTML persiapan_sesi.html

    if (currentScheduleTitle && sessionTitleEl) {
        sessionTitleEl.textContent = `Persiapan Sesi: ${currentScheduleTitle}`;
    } else if (sessionTitleEl) {
        sessionTitleEl.textContent = "Persiapan Sesi Yoga"; 
    }

    const btnSayaSiap = document.getElementById('btnSayaSiap');
    if (btnSayaSiap) {
        btnSayaSiap.addEventListener('click', function() {
            const scheduleId = localStorage.getItem('currentYogaScheduleId');
            const posesJson = localStorage.getItem('currentYogaPoses');

            if (scheduleId && posesJson) {
                // Mengarahkan ke halaman preview pose
                console.log("Data sesi valid, melanjutkan ke preview_pose.html");
                window.location.href = 'preview_pose.html'; // <<< DIUBAH KE preview_pose.html
            } else {
                console.error("Data sesi (currentYogaScheduleId atau currentYogaPoses) tidak ditemukan di localStorage.");
                alert("Data sesi tidak ditemukan atau tidak lengkap. Harap mulai sesi lagi dari halaman Beranda.");
                window.location.href = 'main_dashboard.html'; 
            }
        });
    } else {
         console.error("Tombol 'Saya Siap' dengan ID 'btnSayaSiap' tidak ditemukan pada halaman persiapan_sesi.html.");
    }

    console.log("persiapan_sesi.js loaded (mengarahkan ke preview_pose.html).");
});