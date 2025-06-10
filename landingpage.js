// landingpage.js

document.addEventListener('DOMContentLoaded', function () {
    // --- KONFIGURASI FIREBASE (Ganti dengan kredensial Anda jika belum ada di script.js global) ---
    // Jika Anda sudah melakukan inisialisasi Firebase di script.js yang dimuat sebelumnya,
    // Anda mungkin tidak perlu mengulang firebaseConfig dan initializeApp di sini,
    // cukup dapatkan instance-nya. Namun, untuk modularitas, kita bisa letakkan di sini juga.
    // Pastikan hanya ada SATU initializeApp() yang berjalan untuk seluruh aplikasi Anda.

    const firebaseConfig = {
        apiKey: "AIzaSyCcci3zuQtwwuqwqwxZm5abEGjKnqV2ahA", // GANTI DENGAN API KEY ANDA
        authDomain: "yofi-191421.firebaseapp.com",
        projectId: "yofi-191421",
        storageBucket: "yofi-191421.appspot.com",
        messagingSenderId: "764688667603",
        appId: "1:764688667603:web:1d273a7c677183a5cd1526",
    };

    // Inisialisasi Firebase hanya sekali
    if (typeof firebase === 'undefined') {
        console.error("Firebase SDK not loaded. Firebase initialization failed in landingpage.js.");
        return; // Hentikan eksekusi jika Firebase SDK tidak ada
    }
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase Initialized in landingpage.js");
    }

    const auth = firebase.auth();
    const db = firebase.firestore();

    // Elemen DOM untuk Navbar Auth
    const navAuthLinks = document.getElementById('navAuthLinks');
    const navUserLinks = document.getElementById('navUserLinks');
    const userGreetingEl = document.getElementById('userGreeting');
    const btnLogout = document.getElementById('btnLogout');
    const navBeranda = document.getElementById('navBeranda');

    // Elemen DOM untuk Modal
    const loginModal = document.getElementById('loginModal');
    const daftarModal = document.getElementById('daftarModal');
    const btnTampilLogin = document.getElementById('btnTampilLogin');
    const btnTampilDaftar = document.getElementById('btnTampilDaftar');
    const closeLoginModalBtn = document.getElementById('closeLoginModal');
    const closeDaftarModalBtn = document.getElementById('closeDaftarModal');
    const switchToDaftarLink = document.getElementById('switchToDaftar');
    const switchToLoginLink = document.getElementById('switchToLogin');
    const ctaCobaSekarang = document.getElementById('ctaCobaSekarang');

    // Form Elements
    const loginForm = document.getElementById('loginForm');
    const daftarForm = document.getElementById('daftarForm');
    const loginErrorEl = document.getElementById('loginError');
    const daftarErrorEl = document.getElementById('daftarError');

    // --- Fungsi Modal ---
function openModal(modal) {
    if (modal) {
        modal.classList.add('show');
        console.log('Membuka modal:', modal.id);
    }
}

function closeModal(modal) {
    if (modal) {
        modal.classList.remove('show');
        console.log('Menutup modal:', modal.id);
    }
}

    // --- Event Listener Tombol & Link Modal ---
    if (btnTampilLogin) {
        btnTampilLogin.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal(daftarModal);
            openModal(loginModal);
        });
    } else { console.warn("Elemen #btnTampilLogin tidak ditemukan."); }

    if (btnTampilDaftar) {
        btnTampilDaftar.addEventListener('click', (e) => {
            e.preventDefault();
            closeModal(loginModal);
            openModal(daftarModal);
        });
    } else { console.warn("Elemen #btnTampilDaftar tidak ditemukan."); }

    if (ctaCobaSekarang) {
        ctaCobaSekarang.addEventListener('click', (e) => {
            e.preventDefault();
            if (auth.currentUser) {
                window.location.href = '/static/main_dashboard.html';
            } else {
                closeModal(loginModal);
                openModal(daftarModal);
            }
        });
    } else { console.warn("Elemen #ctaCobaSekarang tidak ditemukan."); }
    if (closeLoginModalBtn) closeLoginModalBtn.addEventListener('click', () => closeModal(loginModal));
    else { console.warn("Elemen #closeLoginModal tidak ditemukan."); }

    if (closeDaftarModalBtn) closeDaftarModalBtn.addEventListener('click', () => closeModal(daftarModal));
    else { console.warn("Elemen #closeDaftarModal tidak ditemukan."); }

    if (loginModal) loginModal.addEventListener('click', (e) => { if (e.target === loginModal) closeModal(loginModal); });
    if (daftarModal) daftarModal.addEventListener('click', (e) => { if (e.target === daftarModal) closeModal(daftarModal); });
    
    if (switchToDaftarLink) {
        switchToDaftarLink.addEventListener('click', (e) => {
            e.preventDefault(); closeModal(loginModal); openModal(daftarModal);
        });
    } else { console.warn("Elemen #switchToDaftar tidak ditemukan."); }

    if (switchToLoginLink) {
        switchToLoginLink.addEventListener('click', (e) => {
            e.preventDefault(); closeModal(daftarModal); openModal(loginModal);
        });
    } else { console.warn("Elemen #switchToLogin tidak ditemukan."); }


    // --- Handle Login ---
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = loginForm.loginEmail.value;
            const password = loginForm.loginPassword.value;
            if (loginErrorEl) loginErrorEl.textContent = '';

            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    console.log("Login berhasil:", userCredential.user.uid);
                    closeModal(loginModal);
                    // onAuthStateChanged akan menangani update UI dan redirect jika perlu
                })
                .catch((error) => {
                    console.error("Error login:", error.code, error.message);
                    if (loginErrorEl) loginErrorEl.textContent = getFirebaseAuthErrorMessage(error);
                });
        });
    } else { console.warn("Elemen #loginForm tidak ditemukan."); }

    // --- Handle Daftar ---
    if (daftarForm) {
        daftarForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const namaLengkap = daftarForm.daftarNama.value.trim();
            const email = daftarForm.daftarEmail.value.trim();
            const password = daftarForm.daftarPassword.value;
            if (daftarErrorEl) daftarErrorEl.textContent = '';

            if (!namaLengkap) {
                if (daftarErrorEl) daftarErrorEl.textContent = "Nama lengkap wajib diisi.";
                return;
            }
            if (password.length < 6) {
                if (daftarErrorEl) daftarErrorEl.textContent = "Password minimal 6 karakter.";
                return;
            }

            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    console.log("Daftar berhasil, user UID:", user.uid);

                    // Simpan info tambahan ke Firestore
                    return db.collection('users').doc(user.uid).set({
                        namaLengkap: namaLengkap,
                        email: email,
                        tanggalBergabung: firebase.firestore.FieldValue.serverTimestamp()
                    }).then(() => {
                        console.log("Info pengguna disimpan ke Firestore untuk UID:", user.uid);
                        // Update profil pengguna di Firebase Auth
                        return user.updateProfile({
                            displayName: namaLengkap
                        });
                    });
                })
                .then(() => {
                    console.log("Profil pengguna di Firebase Auth diupdate.");
                    closeModal(daftarModal);
                    // onAuthStateChanged akan menangani update UI dan redirect jika perlu
                })
                .catch((error) => {
                    console.error("Error daftar:", error.code, error.message);
                    if (daftarErrorEl) daftarErrorEl.textContent = getFirebaseAuthErrorMessage(error);
                });
        });
    } else { console.warn("Elemen #daftarForm tidak ditemukan."); }
    
    // --- Handle Logout ---
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            auth.signOut().then(() => {
                console.log("Logout berhasil");
                // onAuthStateChanged akan menangani update UI.
                // Jika Anda ingin redirect paksa ke landing page setelah logout dari halaman lain:
                if (!window.location.pathname.endsWith('landingpage.html') && !window.location.pathname.endsWith('/')) {
                    window.location.href = '/static/landingpage.html'; // atau '/' jika itu root Anda
                }
            }).catch((error) => {
                console.error("Error logout:", error);
            });
        });
    } else { console.warn("Elemen #btnLogout tidak ditemukan."); }

    // --- Pantau Status Autentikasi (Pusat Kontrol UI Auth) ---
    auth.onAuthStateChanged(user => {
        if (user) {
            // Pengguna login
            console.log("Status Auth: Login (UID: " + user.uid + ")");
            if (navAuthLinks) navAuthLinks.style.display = 'none';
            if (navUserLinks) navUserLinks.style.display = 'flex'; // Gunakan flex jika itu yang sesuai di CSS Anda

            // Ambil nama dari Firestore untuk sapaan yang lebih konsisten
            db.collection('users').doc(user.uid).get().then(doc => {
                if (userGreetingEl) {
                    if (doc.exists && doc.data().namaLengkap) {
                        userGreetingEl.textContent = `Halo, ${doc.data().namaLengkap.split(' ')[0]}!`;
                    } else if (user.displayName) { // Fallback ke displayName dari Auth
                        userGreetingEl.textContent = `Halo, ${user.displayName.split(' ')[0]}!`;
                    } else { // Fallback jika tidak ada nama sama sekali
                        userGreetingEl.textContent = `Halo!`;
                    }
                }
            }).catch(err => {
                 console.error("Error mengambil nama pengguna dari Firestore:", err);
                 if (userGreetingEl) userGreetingEl.textContent = `Halo!`; // Fallback
            });
            
            if (navBeranda) navBeranda.href = '/static/main_dashboard.html';

            // Jika pengguna sudah login dan berada di landing page, mungkin arahkan ke dashboard
            // (Tergantung preferensi Anda, bisa juga tidak otomatis redirect)
            // if (window.location.pathname.endsWith('landingpage.html') || window.location.pathname === '/') {
            //     window.location.href = '/static/main_dashboard.html';
            // }

        } else {
            // Pengguna logout
            console.log("Status Auth: Logout");
            if (navAuthLinks) navAuthLinks.style.display = 'flex'; // Gunakan flex jika itu yang sesuai
            if (navUserLinks) navUserLinks.style.display = 'none';
            if (userGreetingEl) userGreetingEl.textContent = '';
            
            // Set link "Beranda" kembali ke landing page atau # jika tidak ada halaman beranda khusus non-login
            // Jika landingpage.html adalah root, maka href bisa '#' atau path ke landingpage.html
            if (navBeranda) navBeranda.href = '/static/landingpage.html'; // atau '#'

            // Jika pengguna logout dan berada di halaman yang memerlukan login (misal dashboard),
            // arahkan kembali ke landing page.
            const protectedPages = ['main_dashboard.html', 'main_jadwal.html', 'main_riwayat.html', 'form_kesehatan.html']; // Tambahkan halaman lain
            if (protectedPages.some(page => window.location.pathname.includes(page))) {
                console.log("Pengguna logout dari halaman terproteksi, redirecting ke landing page.");
                window.location.href = '/static/landingpage.html'; // Sesuaikan path jika perlu
            }
        }
    });

    // --- Fungsi untuk pesan error Firebase Auth yang lebih user-friendly ---
    function getFirebaseAuthErrorMessage(error) {
        switch (error.code) {
            case 'auth/invalid-email': return 'Format email tidak valid.';
            case 'auth/user-disabled': return 'Akun pengguna ini telah dinonaktifkan.';
            case 'auth/user-not-found': return 'Email tidak terdaftar atau password salah.'; // Digabung
            case 'auth/wrong-password': return 'Email tidak terdaftar atau password salah.'; // Digabung
            case 'auth/email-already-in-use': return 'Alamat email ini sudah terdaftar.';
            case 'auth/weak-password': return 'Password terlalu lemah (minimal 6 karakter).';
            case 'auth/operation-not-allowed': return 'Login dengan email & password tidak diaktifkan.';
            case 'auth/missing-email': return 'Email wajib diisi.';
            // Tambahkan case lain jika perlu
            default: return 'Terjadi kesalahan. Silakan coba lagi nanti.';
        }
    }
    
    // Logika Profile Dropdown (jika dipindah dari script.js global atau jika script.js global tidak ada)
    // Jika Anda punya file script.js terpisah yang sudah menangani ini, Anda mungkin tidak perlu blok ini lagi.
    const profileDropdownBtn = document.getElementById('profileDropdownBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    if (profileDropdownBtn && profileDropdown) {
        profileDropdownBtn.addEventListener('click', function (event) {
            event.stopPropagation();
            profileDropdown.classList.toggle('show');
        });
        window.addEventListener('click', function (event) {
            if (profileDropdown.classList.contains('show')) {
                if (!profileDropdownBtn.contains(event.target) && !profileDropdown.contains(event.target)) {
                    profileDropdown.classList.remove('show');
                }
            }
        });
        window.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && profileDropdown.classList.contains('show')) {
                profileDropdown.classList.remove('show');
            }
        });
    } else {
        // Hanya tampilkan pesan ini jika elemen tersebut diharapkan ada di landing page
        // console.warn("Elemen dropdown profil tidak ditemukan di landing page.");
    }

    console.log("landingpage.js dimuat dan DOM siap.");
});