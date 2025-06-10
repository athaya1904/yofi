// Bagian 1: Inisialisasi Firebase (jika ini adalah tempat sentral)
// Pastikan kode ini ada di bagian paling atas script.js jika skrip lain akan bergantung pada Firebase yang sudah diinisialisasi.

// --- KONFIGURASI FIREBASE (Ganti dengan kredensial Anda) ---
const firebaseConfig = {
    apiKey: "AIzaSyCcci3zuQtwwuqwqwxZm5abEGjKnqV2ahA", // GANTI DENGAN API KEY ANDA
    authDomain: "yofi-191421.firebaseapp.com",
    projectId: "yofi-191421",
    storageBucket: "yofi-191421.appspot.com", // Pastikan ini benar (biasanya .appspot.com)
    messagingSenderId: "764688667603",
    appId: "1:764688667603:web:1d273a7c677183a5cd1526",
    // measurementId: "G-89J69CS0HG" // Opsional untuk Firestore saja
};

// Inisialisasi Firebase hanya sekali secara global (menggunakan sintaks v8 karena HTML Anda menggunakan SDK v8)
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase Initialized Globally in script.js");
} else if (typeof firebase !== 'undefined' && firebase.apps.length) {
    firebase.app(); // Jika sudah diinisialisasi, dapatkan instance default
    console.log("Firebase was already initialized (global context).");
} else {
    console.error("Firebase SDK not loaded. Firebase initialization failed in script.js.");
}


// Bagian 2: Logika Global UI seperti Dropdown Profil
// Sebaiknya semua manipulasi DOM dijalankan setelah DOM siap.
document.addEventListener('DOMContentLoaded', function () {
    
    // Profile Dropdown Toggle
    const profileDropdownBtn = document.getElementById('profileDropdownBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    if (profileDropdownBtn && profileDropdown) {
        profileDropdownBtn.addEventListener('click', function (event) {
            event.stopPropagation(); // Mencegah event click menyebar ke window
            profileDropdown.classList.toggle('show');
        });

        // Menutup dropdown jika diklik di luar area dropdown
        window.addEventListener('click', function (event) {
            // Pastikan dropdown ada dan sedang ditampilkan sebelum mencoba menutup
            if (profileDropdown.classList.contains('show')) {
                // Jika klik BUKAN pada tombol DAN BUKAN di dalam menu dropdown
                if (!profileDropdownBtn.contains(event.target) && !profileDropdown.contains(event.target)) {
                    profileDropdown.classList.remove('show');
                }
            }
        });

        // Opsional: Menutup dropdown jika tombol Escape ditekan
        window.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && profileDropdown.classList.contains('show')) {
                profileDropdown.classList.remove('show');
            }
        });
    }

    // Logika umum lainnya bisa ditambahkan di sini
    // misalnya, toggle sidebar untuk versi mobile, notifikasi global, dll.
    console.log("Global script.js (termasuk profile dropdown & Firebase init) dimuat dan DOM siap.");
});