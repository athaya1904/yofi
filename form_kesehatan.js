document.addEventListener('DOMContentLoaded', function () {
    const healthForm = document.getElementById('healthForm');

    // Ambil semua elemen form yang relevan
    const q1_fisik_beda_radios = document.querySelectorAll('input[name="q1_fisik_beda"]');
    
    const q2_cedera_radios = document.querySelectorAll('input[name="q2_cedera"]');
    const q2_cedera_detail_section = document.getElementById('q2_cedera_detail_section');
    const q2_bagian_cedera_select = document.getElementById('q2_bagian_cedera');
    const q2_bagian_cedera_lainnya_input = document.getElementById('q2_bagian_cedera_lainnya');

    const q3_operasi_radios = document.querySelectorAll('input[name="q3_operasi"]');
    const q3_operasi_detail_section = document.getElementById('q3_operasi_detail_section');
    const q3_izin_dokter_radios = document.querySelectorAll('input[name="q3_izin_dokter"]');
    const q3_operasi_bagian_section = document.getElementById('q3_operasi_bagian_section');
    const q3_bagian_operasi_select = document.getElementById('q3_bagian_operasi');
    const q3_bagian_operasi_lainnya_input = document.getElementById('q3_bagian_operasi_lainnya');

    const q4_postur_radios = document.querySelectorAll('input[name="q4_postur"]');
    const q5_hamil_radios = document.querySelectorAll('input[name="q5_hamil"]');

    // Custom Modal Elements
    const modalOverlay = document.getElementById('customModalOverlay');
    const modalMessageEl = document.getElementById('modalMessage');
    const modalTopCloseBtn = document.getElementById('modalTopCloseBtn');
    const modalMainCloseBtn = document.getElementById('modalMainCloseBtn');

    // --- Fungsi Helper ---
    function toggleElement(element, show) {
        if (element) {
            element.style.display = show ? 'block' : 'none';
        }
    }

    function showCustomModal(message) {
        if (modalOverlay && modalMessageEl) {
            modalMessageEl.innerHTML = message; // Menggunakan innerHTML agar <br> dan <ul> bisa dirender
            modalOverlay.classList.add('show');
        }
    }

    function hideCustomModal() {
        if (modalOverlay) {
            modalOverlay.classList.remove('show');
        }
    }

    if (modalTopCloseBtn) modalTopCloseBtn.addEventListener('click', hideCustomModal);
    if (modalMainCloseBtn) modalMainCloseBtn.addEventListener('click', hideCustomModal);
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(event) {
            if (event.target === modalOverlay) {
                hideCustomModal();
            }
        });
    }

    // --- Inisialisasi Form (Membersihkan dan Menyembunyikan Conditional) ---
    function initializeForm() {
        if (healthForm) {
            healthForm.reset(); // Reset semua field ke default HTML (kosong jika 'checked' dihapus)
        }
        
        // Secara eksplisit menyembunyikan semua bagian kondisional
        toggleElement(q2_cedera_detail_section, false);
        toggleElement(q2_bagian_cedera_lainnya_input, false);
        toggleElement(q3_operasi_detail_section, false);
        toggleElement(q3_operasi_bagian_section, false);
        toggleElement(q3_bagian_operasi_lainnya_input, false);
    }
    initializeForm(); // Panggil saat halaman dimuat

    // --- Event Listeners untuk Logika Kondisional ---
    // Pertanyaan 2 (Cedera)
    q2_cedera_radios.forEach(radio => {
        radio.addEventListener('change', function () {
            const showDetail = this.value === 'ya';
            toggleElement(q2_cedera_detail_section, showDetail);
            if (!showDetail) { // Jika "Tidak", reset bagian detail cedera
                if(q2_bagian_cedera_select) q2_bagian_cedera_select.value = '';
                if(q2_bagian_cedera_lainnya_input) toggleElement(q2_bagian_cedera_lainnya_input, false);
            }
        });
    });
    if(q2_bagian_cedera_select) {
        q2_bagian_cedera_select.addEventListener('change', function () {
            toggleElement(q2_bagian_cedera_lainnya_input, this.value === 'lainnya');
            if (this.value !== 'lainnya' && q2_bagian_cedera_lainnya_input) {
                q2_bagian_cedera_lainnya_input.value = ''; // Kosongkan jika bukan "Lainnya"
            }
        });
    }


    // Pertanyaan 3 (Operasi)
    q3_operasi_radios.forEach(radio => {
        radio.addEventListener('change', function () {
            const showDetail = this.value === 'ya';
            toggleElement(q3_operasi_detail_section, showDetail);
            if (!showDetail) { // Jika "Tidak", reset bagian detail operasi
                q3_izin_dokter_radios.forEach(r => r.checked = false);
                toggleElement(q3_operasi_bagian_section, false);
                if(q3_bagian_operasi_select) q3_bagian_operasi_select.value = '';
                if(q3_bagian_operasi_lainnya_input) toggleElement(q3_bagian_operasi_lainnya_input, false);
            }
        });
    });
    q3_izin_dokter_radios.forEach(radio => {
        radio.addEventListener('change', function () {
            if (this.value === 'tidak') {
                showCustomModal("Mohon konsultasikan terlebih dahulu dengan dokter atau ahli terapi fisik Anda sebelum mengikuti sesi yoga kami.");
                toggleElement(q3_operasi_bagian_section, false); 
                if(q3_bagian_operasi_select) q3_bagian_operasi_select.value = ''; // Reset juga select bagian operasi
                if(q3_bagian_operasi_lainnya_input) toggleElement(q3_bagian_operasi_lainnya_input, false); // Reset input lainnya
            } else if (this.value === 'ya') {
                toggleElement(q3_operasi_bagian_section, true); 
            }
        });
    });
    if(q3_bagian_operasi_select) {
        q3_bagian_operasi_select.addEventListener('change', function () {
            toggleElement(q3_bagian_operasi_lainnya_input, this.value === 'lainnya');
            if (this.value !== 'lainnya' && q3_bagian_operasi_lainnya_input) {
                q3_bagian_operasi_lainnya_input.value = ''; // Kosongkan jika bukan "Lainnya"
            }
        });
    }

    // Pertanyaan 4 (Kondisi Postur)
    q4_postur_radios.forEach(radio => {
        radio.addEventListener('change', function () {
            if (this.value === 'ya') {
                showCustomModal("Mohon konsultasikan terlebih dahulu dengan dokter atau ahli terapi fisik Anda sebelum mengikuti sesi yoga kami. Anda juga dapat menjadwalkan konsultasi langsung dengan instruktur kami.");
            }
        });
    });

    // Pertanyaan 5 (Hamil/Pasca Melahirkan)
    q5_hamil_radios.forEach(radio => {
        radio.addEventListener('change', function () {
            if (this.value === 'ya') {
                showCustomModal("Mohon konsultasikan terlebih dahulu dengan dokter atau ahli terapi fisik Anda sebelum mengikuti sesi yoga kami. Anda juga dapat menjadwalkan konsultasi langsung dengan instruktur kami.");
            }
        });
    });

    // --- Fungsi Validasi Form ---
    function isRadioSelected(radioName) {
        return !!document.querySelector(`input[name="${radioName}"]:checked`);
    }

    function validateHealthForm() {
        let isValid = true;
        let firstInvalidElement = null;
        const errorMessages = [];

        // Helper untuk menandai error
        function markError(element, questionNumber, specificMessage) {
            isValid = false;
            // Hapus kelas error sebelumnya jika ada
            document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
            const formGroup = element ? element.closest('.form-group') : null;
            if (formGroup) formGroup.querySelectorAll('legend, label, input, select, textarea').forEach(el => el.classList.add('input-error'));


            if (!firstInvalidElement && element) {
                firstInvalidElement = element.closest('.form-group') || element;
            }
            const fullMessage = `Pertanyaan ${questionNumber}: ${specificMessage}`;
            if (!errorMessages.includes(fullMessage)) {
                errorMessages.push(fullMessage);
            }
        }
        
        // Hapus semua penanda error sebelumnya
        document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
        document.querySelectorAll('.form-group.error').forEach(el => el.classList.remove('error'));


        // Q1
        if (!isRadioSelected('q1_fisik_beda')) markError(q1_fisik_beda_radios[0], "1", "Belum dijawab.");
        
        // Q2
        if (!isRadioSelected('q2_cedera')) markError(q2_cedera_radios[0], "2", "Belum dijawab.");
        else if (document.querySelector('input[name="q2_cedera"]:checked').value === 'ya') {
            if (!q2_bagian_cedera_select.value) markError(q2_bagian_cedera_select, "2", "Detail cedera belum dipilih.");
            else if (q2_bagian_cedera_select.value === 'lainnya' && !q2_bagian_cedera_lainnya_input.value.trim()) {
                markError(q2_bagian_cedera_lainnya_input, "2", "Detail cedera 'Lainnya' belum diisi.");
            }
        }

        // Q3
        if (!isRadioSelected('q3_operasi')) markError(q3_operasi_radios[0], "3", "Belum dijawab.");
        else if (document.querySelector('input[name="q3_operasi"]:checked').value === 'ya') {
            if (!isRadioSelected('q3_izin_dokter')) markError(q3_izin_dokter_radios[0], "3", "Pertanyaan izin dokter belum dijawab.");
            else if (document.querySelector('input[name="q3_izin_dokter"]:checked').value === 'ya') {
                if (!q3_bagian_operasi_select.value) markError(q3_bagian_operasi_select, "3", "Detail operasi belum dipilih.");
                else if (q3_bagian_operasi_select.value === 'lainnya' && !q3_bagian_operasi_lainnya_input.value.trim()) {
                    markError(q3_bagian_operasi_lainnya_input, "3", "Detail operasi 'Lainnya' belum diisi.");
                }
            }
        }
        
        // Q4
        if (!isRadioSelected('q4_postur')) markError(q4_postur_radios[0], "4", "Belum dijawab.");
        // Q5
        if (!isRadioSelected('q5_hamil')) markError(q5_hamil_radios[0], "5", "Belum dijawab.");

        if (!isValid) {
            let finalMessage = "Mohon lengkapi informasi berikut:<br><ul>";
            errorMessages.forEach(msg => { finalMessage += `<li>${msg}</li>`; });
            finalMessage += "</ul>";
            showCustomModal(finalMessage);
            if (firstInvalidElement) {
                firstInvalidElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Tambahkan kelas 'error' ke form-group dari elemen error pertama
                const errorGroup = firstInvalidElement.closest('.form-group');
                if (errorGroup) errorGroup.classList.add('error');

            }
        } else {
            document.querySelectorAll('.form-group.error').forEach(el => el.classList.remove('error'));
            document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
        }
        return isValid;
    }

    // --- Handle Form Submission ---
    if (healthForm) {
        healthForm.addEventListener('submit', function (event) {
            event.preventDefault(); 
            
            if (validateHealthForm()) {
                const formData = new FormData(healthForm);
                console.log("Form Data Valid, Mengirim ke backend...");
                fetch('/api/submit-health-form', {
                    method: 'POST',
                    body: formData,
                })
                .then(response => {
                    if (!response.ok) {
                        return response.json().then(errorData => {
                            throw new Error(errorData.detail || "Gagal mengirim form kesehatan." + response.status);
                        }).catch(() => {
                            throw new Error("Gagal mengirim form kesehatan. Silakan coba lagi.");
                        });
                    }
                    return response.json();
                })
                .then (data => {
                    console.log("Form berhasil dikirim:", data);
                    showCustomModal("Form kesehatan Anda telah berhasil dikirim! Terima kasih atas partisipasinya.");
                    initializeForm(); 
                })
                .catch(error => {
                    console.error("Error saat mengirim form:", error);
                    showCustomModal(`Terjadi kesalahan saat mengirim form: ${error.message}`);
                });
            }
        });
    }

    console.log("Form Kesehatan JS loaded with validation and clear on load.");
});