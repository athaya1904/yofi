document.addEventListener('DOMContentLoaded', function() {
    const firebaseConfig = {
        apiKey: "AIzaSyCcci3zuQtwwuqwqwxZm5abEGjKnqV2ahA",
        authDomain: "yofi-191421.firebaseapp.com",
        projectId: "yofi-191421",
        storageBucket: "yofi-191421.appspot.com", 
        messagingSenderId: "764688667603",
        appId: "1:764688667603:web:1d273a7c677183a5cd1526",
    };

    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase Initialized in main_jadwal.js (accordion version)");
    } else if (typeof firebase === 'undefined') {
        console.error("Firebase SDK not loaded. Ensure firebase-app.js and firebase-firestore.js are included before this script.");
        return;
    }
    const db = firebase.firestore();
    const eventsCollection = db.collection('jadwalEvents');

    const scheduleTableBody = document.getElementById('scheduleTableBody');
    const addScheduleBtnPage = document.getElementById('addScheduleBtn'); 

    let currentlyOpenAccordionRow = null;

    function parsePoseList(poseListString) {
        const poses = []; let totalDurationSeconds = 0; let poseCount = 0;
        if (poseListString && poseListString.trim() !== "") {
            poseListString.split(',').forEach(item => {
                const match = item.trim().match(/^(.*?)\s*\((\d+)(s|m|h)\)$/i);
                if (match) {
                    let duration = parseInt(match[2], 10);
                    const unit = match[3].toLowerCase();
                    if (unit === 'm') duration *= 60; if (unit === 'h') duration *= 3600;
                    poses.push({ name: match[1].trim(), duration }); totalDurationSeconds += duration; poseCount++;
                } else { const trimmedItem = item.trim(); if (trimmedItem) { poses.push({ name: trimmedItem, duration: 0 }); poseCount++; } }
            });
        } return { poses, totalDurationSeconds, poseCount };
    }

    function formatDurationForDisplay(totalSeconds) {
        if (totalSeconds === 0) return "0 menit";
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        let ds = "";
        if (hours > 0) ds += `${hours} jam `;
        if (minutes > 0) ds += `${minutes} menit `;
        if (seconds > 0 && hours === 0 && minutes === 0) ds += `${seconds} detik`;
        return ds.trim() || "0 menit";
    }
    
    function formatDateForTable(isoString) {
        if (!isoString) return '-';
        const date = new Date(isoString);
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() + userTimezoneOffset);
        return localDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    function formatTimeForTable(isoString) {
        if (!isoString) return '-';
        const date = new Date(isoString);
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() + userTimezoneOffset);
        let timeString = localDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
        return timeString.replace(/\./g, ':');
    }

    function renderSchedules() {
        if (!scheduleTableBody) { console.error("Elemen #scheduleTableBody tidak ditemukan."); return; }

        firebase.auth().onAuthStateChanged(function(user) {
            if (!user) {
                scheduleTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Silakan login untuk melihat jadwal Anda.</td></tr>`;
                return;
            }
            const userId = user.uid;

            eventsCollection.where("userId", "==", userId).orderBy("start", "desc").onSnapshot(snapshot => {
                closeOpenAccordionRowSync();
                scheduleTableBody.innerHTML = '';
                if (snapshot.empty) {
                    scheduleTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Belum ada jadwal.</td></tr>`;
                    return;
                }
                snapshot.forEach(doc => {
                    const schedule = { id: doc.id, ...doc.data() };
                    const { poseCount, totalDurationSeconds } = parsePoseList(schedule.poseListString || "");
                    const row = scheduleTableBody.insertRow();
                    row.setAttribute('data-schedule-id', schedule.id); 
                    row.innerHTML = `
                        <td>${schedule.title || 'Tanpa Judul'}</td>
                        <td>${poseCount} pose</td>
                        <td>${formatDateForTable(schedule.start)}</td>
                        <td>${formatTimeForTable(schedule.start)}</td>
                        <td>${formatDurationForDisplay(totalDurationSeconds)}</td>
                        <td class="action-cell">
                            <button class="action-btn view-btn" data-id="${schedule.id}" title="Lihat Detail"><i class="fas fa-eye"></i></button>
                            <button class="action-btn edit-btn" data-id="${schedule.id}" title="Edit Jadwal"><i class="fas fa-pencil-alt"></i></button>
                            <button class="action-btn delete-btn" data-id="${schedule.id}" title="Hapus Jadwal"><i class="fas fa-trash-alt"></i></button>
                        </td>
                    `;
                });
            }, error => {
                console.error("Error mengambil daftar jadwal: ", error);
                scheduleTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Belum ada jadwal.</td></tr>`;
            });
        });
    }
    
    function closeOpenAccordionRowSync() {
        if (currentlyOpenAccordionRow && currentlyOpenAccordionRow.parentNode) {
            currentlyOpenAccordionRow.remove();
        }
        currentlyOpenAccordionRow = null;
        document.querySelectorAll('.action-btn.active-accordion').forEach(btn => {
            btn.classList.remove('active-accordion');
            if(btn.classList.contains('view-btn')) btn.querySelector('i').className = 'fas fa-eye';
            if(btn.classList.contains('edit-btn')) btn.querySelector('i').className = 'fas fa-pencil-alt';
        });
        if(addScheduleBtnPage) addScheduleBtnPage.classList.remove('active-accordion');
    }

    function closeOpenAccordionRow(callbackWhenDone) {
        if (currentlyOpenAccordionRow) {
            const rowToRemove = currentlyOpenAccordionRow;
            const wrapper = rowToRemove.querySelector('.accordion-content-wrapper');
            const parentId = rowToRemove.dataset.parentId;
            const buttonTypeClass = rowToRemove.classList.contains('schedule-detail-row') ? 'view-btn' : 'edit-btn';
            const originalButton = document.querySelector(`tr[data-schedule-id="${parentId}"] .action-btn.${buttonTypeClass}[data-id="${parentId}"], #addScheduleBtn.active-accordion`);

            if (wrapper) wrapper.style.maxHeight = '0px';
            
            if(originalButton) {
                originalButton.classList.remove('active-accordion');
                if(originalButton.classList.contains('view-btn')) originalButton.querySelector('i').className = 'fas fa-eye';
                else if(originalButton.classList.contains('edit-btn')) originalButton.querySelector('i').className = 'fas fa-pencil-alt';
            }
            
            let transitionEnded = false;
            function handleClose() {
                if (transitionEnded) return; transitionEnded = true;
                if (wrapper) wrapper.removeEventListener('transitionend', handleClose);
                if (rowToRemove.parentNode) rowToRemove.remove();
                if (callbackWhenDone) callbackWhenDone();
            }
            if (wrapper) {
                 wrapper.addEventListener('transitionend', handleClose);
                 setTimeout(() => { if(!transitionEnded) handleClose(); }, 400);
            } else if (rowToRemove.parentNode) {
                rowToRemove.remove();
                if (callbackWhenDone) callbackWhenDone();
            } else if (callbackWhenDone) {
                callbackWhenDone();
            }
            currentlyOpenAccordionRow = null;
            return true;
        }
        if (callbackWhenDone) callbackWhenDone();
        return false;
    }
    
    function openAccordion(triggerButton, parentId, type, data = {}) {
        closeOpenAccordionRow(() => {
            const parentRow = document.querySelector(`tr[data-schedule-id="${parentId}"]`);
            let referenceElementForInsert = parentRow;

            const accordionRow = document.createElement('tr');
            accordionRow.dataset.parentId = parentId;
            accordionRow.dataset.accordionType = type;
            
            const accordionCell = accordionRow.insertCell();
            accordionCell.colSpan = 6; 

            const contentWrapper = document.createElement('div');
            contentWrapper.classList.add('accordion-content-wrapper'); 

            if (type === 'view') {
                accordionRow.classList.add('schedule-detail-row');
                const { poses, totalDurationSeconds: poseDurationView, poseCount } = parsePoseList(data.poseListString || "");
                contentWrapper.innerHTML = `
                    <h4>Detail Jadwal: ${data.title || ''}</h4>
                    <p><strong>Jumlah Pose:</strong> ${poseCount} pose</p>
                    <p><strong>Detail Pose:</strong></p>
                    <ul>${(poses.length > 0 ? poses.map(p => `<li>${p.name} (${formatDurationForDisplay(p.duration)})</li>`).join('') : '<li>Tidak ada detail pose.</li>')}</ul>
                    <p><strong>Tanggal:</strong> ${formatDateForTable(data.start)}</p>
                    <p><strong>Waktu:</strong> ${formatTimeForTable(data.start)}</p>
                    <p><strong>Durasi (dari pose):</strong> ${formatDurationForDisplay(poseDurationView)}</p>
                    <p><strong>Deskripsi Umum:</strong> ${data.description || '-'}</p>
                `;
            } else if (type === 'edit' || type === 'add') {
                accordionRow.classList.add('schedule-edit-form-row');
                const isEdit = type === 'edit';
                const { poseCount, totalDurationSeconds: poseDurationEdit } = parsePoseList(data.poseListString || "");
                let startDateValue = ''; let startTimeValue = '';
                if (isEdit && data.start) {
                    const startDateObj = new Date(data.start);
                    startDateValue = startDateObj.toISOString().split('T')[0]; 
                    startTimeValue = formatTimeForTable(data.start).replace('.',':'); 
                } else if (type === 'add') {
                    const now = new Date();
                    startDateValue = now.toISOString().split('T')[0];
                    startTimeValue = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
                }

                contentWrapper.innerHTML = `
                    <h4>${isEdit ? 'Edit Jadwal' : 'Tambah Jadwal Baru'}</h4>
                    <form class="edit-schedule-form" data-id="${isEdit ? parentId : 'NEW_SCHEDULE_FORM'}">
                        <div class="form-field-group"><label for="formNamaSesi-${parentId}">Nama Sesi:</label><input type="text" id="formNamaSesi-${parentId}" value="${isEdit ? (data.title || '') : ''}" required></div>
                        <div class="form-field-group"><label for="formPoseList-${parentId}">Detail Pose:</label><textarea id="formPoseList-${parentId}" rows="4" placeholder="Pose 1 (30s), ...">${isEdit ? (data.poseListString || '') : ''}</textarea></div>
                        <p class="pose-count-info" style="padding-left: calc(110px + 10px + 8px); margin-bottom:1rem;">Jumlah Pose: <span class="form-pose-count-val">${poseCount}</span>. Durasi: <span class="form-total-duration-val">${formatDurationForDisplay(poseDurationEdit)}</span></p>
                        <div class="form-field-group"><label for="formTanggal-${parentId}">Tanggal:</label><input type="date" id="formTanggal-${parentId}" value="${startDateValue}" required></div>
                        <div class="form-field-group"><label for="formWaktu-${parentId}">Waktu:</label><input type="time" id="formWaktu-${parentId}" value="${startTimeValue}" required></div>
                        <div class="form-field-group"><label for="formDeskripsi-${parentId}">Deskripsi Umum:</label><textarea id="formDeskripsi-${parentId}" rows="2">${isEdit ? (data.description || '') : ''}</textarea></div>
                        <div class="form-field-group"><label for="formEventColor-${parentId}">Warna:</label><input type="color" id="formEventColor-${parentId}" value="${isEdit ? (data.color || '#3788D8') : '#3788D8'}" title="Pilih warna event"></div>
                        <div style="text-align:right; margin-top:1rem;">
                            <button type="button" class="btn-secondary-action close-accordion-btn" style="margin-right:10px;">Batal</button>
                            <button type="submit" class="btn-primary-action">${isEdit ? 'Simpan Perubahan' : 'Tambah Jadwal'}</button>
                        </div>
                    </form>
                `;
                const poseListTextarea = contentWrapper.querySelector(`#formPoseList-${parentId}`);
                const poseCountDisplay = contentWrapper.querySelector('.form-pose-count-val');
                const totalDurationDisplay = contentWrapper.querySelector('.form-total-duration-val');
                if(poseListTextarea) {
                     poseListTextarea.addEventListener('input', () => {
                        const {poseCount, totalDurationSeconds} = parsePoseList(poseListTextarea.value);
                        if(poseCountDisplay) poseCountDisplay.textContent = poseCount;
                        if(totalDurationDisplay) totalDurationDisplay.textContent = formatDurationForDisplay(totalDurationSeconds);
                    });
                    const {poseCount: initPose, totalDurationSeconds: initDur} = parsePoseList(poseListTextarea.value);
                    if(poseCountDisplay) poseCountDisplay.textContent = initPose;
                    if(totalDurationDisplay) totalDurationDisplay.textContent = formatDurationForDisplay(initDur);
                }
                
                const formInAccordion = contentWrapper.querySelector('.edit-schedule-form');
                if (formInAccordion) formInAccordion.addEventListener('submit', handleFormSubmit);
                
                const closeBtnInForm = contentWrapper.querySelector('.close-accordion-btn');
                if(closeBtnInForm) closeBtnInForm.addEventListener('click', closeOpenAccordionRow);
            }

            accordionCell.appendChild(contentWrapper);
            
            if (type === 'add') {
                const tableHeader = scheduleTableBody.closest('table').querySelector('thead');
                if (tableHeader) {
                    tableHeader.parentNode.insertBefore(accordionRow, tableHeader.nextSibling);
                } else {
                    scheduleTableBody.parentNode.insertBefore(accordionRow, scheduleTableBody);
                }
                referenceElementForInsert = null;
            } else if (parentRow) {
                 parentRow.parentNode.insertBefore(accordionRow, parentRow.nextSibling);
            }

            currentlyOpenAccordionRow = accordionRow;

            requestAnimationFrame(() => {
                requestAnimationFrame(() => { contentWrapper.style.maxHeight = contentWrapper.scrollHeight + 'px'; });
            });

            if (triggerButton) {
                triggerButton.classList.add('active-accordion');
                const icon = triggerButton.querySelector('i');
                if(icon) {
                    if(type === 'view') icon.className = 'fas fa-chevron-up';
                    else if(type === 'edit') icon.className = 'fas fa-times-circle';
                }
            }
        });
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const scheduleId = form.dataset.id;
        const parentIdForForm = form.closest('tr[data-parent-id]')?.dataset.parentId || 'NEW_SCHEDULE_FORM';

        const title = form.querySelector(`input[id^="formNamaSesi-"]`).value.trim();
        const poseListString = form.querySelector(`textarea[id^="formPoseList-"]`).value.trim();
        const tanggal = form.querySelector(`input[id^="formTanggal-"]`).value;
        const waktu = form.querySelector(`input[id^="formWaktu-"]`).value;
        const description = form.querySelector(`textarea[id^="formDeskripsi-"]`)?.value.trim() || '';
        const color = form.querySelector(`input[id^="formEventColor-"]`)?.value || '#3788D8';

        if (!title || !poseListString || !tanggal || !waktu) {
            alert("Nama Sesi, Detail Pose, Tanggal, dan Waktu harus diisi!");
            return;
        }
        const startDateTime = `${tanggal}T${waktu}:00`; 
        const { totalDurationSeconds: poseDuration } = parsePoseList(poseListString);
        const durationToUse = poseDuration > 0 ? poseDuration : 3600; 
        const startDateObj = new Date(startDateTime);
        const endDateObj = new Date(startDateObj.getTime() + durationToUse * 1000);
        const endDateTime = `${endDateObj.getFullYear()}-${(endDateObj.getMonth()+1).toString().padStart(2, '0')}-${endDateObj.getDate().toString().padStart(2, '0')}T${endDateObj.getHours().toString().padStart(2, '0')}:${endDateObj.getMinutes().toString().padStart(2, '0')}:00`;

        const eventData = { title, poseListString, start: startDateTime, end: endDateTime, description, color, allDay: false };
        
        const saveButton = form.querySelector('button[type="submit"]');
        saveButton.disabled = true;
        saveButton.textContent = "Menyimpan...";

        try {
            if (scheduleId && scheduleId !== 'NEW_SCHEDULE_FORM') { 
                await eventsCollection.doc(scheduleId).update(eventData);
                console.log("Jadwal diperbarui di Firestore:", scheduleId);
            } else { 
                await eventsCollection.add(eventData);
                console.log("Jadwal baru ditambahkan ke Firestore");
            }
            closeOpenAccordionRow(); 
        } catch (error) {
            console.error("Error menyimpan jadwal ke Firestore: ", error);
            alert("Gagal menyimpan jadwal: " + error.message);
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = (scheduleId && scheduleId !== 'NEW_SCHEDULE_FORM') ? 'Simpan Perubahan' : 'Tambah Jadwal';
        }
    }

    if (scheduleTableBody) {
        scheduleTableBody.addEventListener('click', async function(event) {
            const targetButton = event.target.closest('.action-btn');
            if (!targetButton) return;

            const id = targetButton.dataset.id;
            const currentRow = targetButton.closest('tr');

            if (targetButton.classList.contains('view-btn')) {
                if (currentlyOpenAccordionRow && currentlyOpenAccordionRow.dataset.parentId === id && currentlyOpenAccordionRow.dataset.accordionType === 'view') {
                    closeOpenAccordionRow();
                } else {
                    try {
                        const doc = await eventsCollection.doc(id).get();
                        if (doc.exists) openAccordion(targetButton, id, 'view', {id, ...doc.data()});
                        else console.error("Dokumen tidak ditemukan untuk dilihat:", id);
                    } catch (error) { console.error("Error mengambil dokumen untuk dilihat:", error); }
                }
            } else if (targetButton.classList.contains('edit-btn')) {
                 if (currentlyOpenAccordionRow && currentlyOpenAccordionRow.dataset.parentId === id && currentlyOpenAccordionRow.dataset.accordionType === 'edit') {
                    closeOpenAccordionRow();
                } else {
                    try {
                        const doc = await eventsCollection.doc(id).get();
                        if (doc.exists) openAccordion(targetButton, id, 'edit', {id, ...doc.data()});
                        else console.error("Dokumen tidak ditemukan untuk diedit:", id);
                    } catch (error) { console.error("Error mengambil dokumen untuk diedit:", error); }
                }
            } else if (targetButton.classList.contains('delete-btn')) {
                closeOpenAccordionRow(async () => {
                    if (confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) {
                        try {
                            await eventsCollection.doc(id).delete();
                            console.log("Jadwal dihapus dari Firestore:", id);
                        } catch (error) {
                            console.error("Error menghapus jadwal dari Firestore: ", error);
                            alert("Gagal menghapus jadwal: " + error.message);
                        }
                    }
                });
            }
        });
    }

    if (addScheduleBtnPage) {
        addScheduleBtnPage.addEventListener('click', function() {
            if (currentlyOpenAccordionRow && currentlyOpenAccordionRow.dataset.parentId === 'NEW_SCHEDULE_FORM') {
                 closeOpenAccordionRow();
                 addScheduleBtnPage.classList.remove('active-accordion');
            } else {
                openAccordion(addScheduleBtnPage, 'NEW_SCHEDULE_FORM', 'add', {});
            }
        });
    }

    renderSchedules(); 
    console.log("main_jadwal.js (accordion version) loaded and initialized for Firebase integration.");
});
