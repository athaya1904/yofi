document.addEventListener('DOMContentLoaded', function() {

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();
    const eventsCollection = db.collection('jadwalEvents');

    const scheduleModal = document.getElementById('scheduleModal');
    const modalTitleEl = document.getElementById('modalTitle');
    const closeScheduleModalBtn = document.getElementById('closeScheduleModalBtn');
    const scheduleForm = document.getElementById('scheduleForm');
    const eventIdInput = document.getElementById('eventId');
    const eventTitleInput = document.getElementById('eventTitle');
    const eventStartInput = document.getElementById('eventStart');
    const eventColorInput = document.getElementById('eventColor');
    const saveEventBtn = document.getElementById('saveEventBtn');
    const deleteEventBtn = document.getElementById('deleteEventBtn');
    
    const btnJadwalBaru = document.getElementById('btnJadwalBaru');
    const calendarEl = document.getElementById('interactiveCalendarContainer');
    
    const nextScheduleInputElement = document.getElementById('nextScheduleInput');
    const btnStartNow = document.querySelector('.card.jadwal-yoga-card .btn-start-now');
    let nextYogaScheduleDataGlobal = null; 

    const btnPilihPoseModal = document.getElementById('btnPilihPoseModal'); 
    const selectedPosesContainerModal = document.getElementById('selectedPosesContainerModal');
    const formJumlahPoseModalEl = document.getElementById('formJumlahPoseModal');
    const formDurasiTotalModalEl = document.getElementById('formDurasiTotalModal');

    const poseSelectionModalEl = document.getElementById('poseSelectionModal');
    const closePoseSelectionModalBtnEl = document.getElementById('closePoseSelectionModalBtn');
    const poseCheckboxesContainerEl = document.getElementById('poseCheckboxesContainer');
    const applyPoseSelectionBtnEl = document.getElementById('applyPoseSelectionBtn');
    const cancelPoseSelectionBtnEl = document.getElementById('cancelPoseSelectionBtn');

    const PREDEFINED_POSES = [
        "Catcow Pose",
        "Crocodile Pose",
        "Downwarddog Pose",
        "Halfway Pose",
        "Kneetochest Pose",
        "Childs Pose",
        "Seated Pose",
        "Staff Pose",
        "Mountain Pose",
        "Easy Pose"
    ];

    let currentActiveSelectedPoses = []; 
    let tempSelectedPosesInCheckboxModal = new Set();

    function capitalizeFirstLetter(string) { 
        if (!string) return '';
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function parsePoseList(poseListString) { 
        const poses = []; let totalDurationSeconds = 0; let poseCount = 0;
        if (poseListString && poseListString.trim() !== "") {
            poseListString.split(',').forEach(item => {
                const match = item.trim().match(/^(.*?)\s*\((\d+)(s|m|h)\)$/i);
                if (match) {
                    let duration = parseInt(match[2], 10);
                    const unit = match[3].toLowerCase();
                    if (unit === 'm') duration *= 60; if (unit === 'h') duration *= 3600;
                    poses.push({ name: match[1].trim(), duration: duration || 0 }); 
                    totalDurationSeconds += (duration || 0); poseCount++;
                } else { 
                    const trimmedItem = item.trim(); 
                    if (trimmedItem) { poses.push({ name: trimmedItem, duration: 0 }); poseCount++; }
                }
            });
        } return { poses, totalDurationSeconds, poseCount };
    }

    function formatPoseArrayToString(posesArray) { 
        if (!posesArray || posesArray.length === 0) return "";
        return posesArray.map(p => `${p.name.trim()} (${parseInt(p.duration, 10) || 0}s)`).join(', ');
    }

    function formatDurationForDisplay(totalSeconds) { 
        if (isNaN(totalSeconds) || totalSeconds === 0) return "0 menit";
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        let ds = "";
        if (hours > 0) ds += `${hours} jam `;
        if (minutes > 0) ds += `${minutes} menit `;
        if (seconds > 0 && hours === 0 && minutes === 0) ds += `${seconds} detik`;
        return ds.trim() || "0 menit";
    }
    
    function formatDateTimeForInput(dateInput) { 
        const date = dateInput ? new Date(dateInput) : new Date();
        if (isNaN(date.getTime())) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); 
            return now.toISOString().slice(0,16);
        }
        const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        return localDate.toISOString().slice(0, 16); 
    }

    function displayNextSchedule() {
        if (!nextScheduleInputElement) { return; }

        firebase.auth().onAuthStateChanged(function(user) {
            if (!user) {
                nextScheduleInputElement.value = '';
                nextScheduleInputElement.placeholder = "Silakan login untuk melihat jadwal";
                if (btnStartNow) btnStartNow.disabled = true;
                return;
            }

            const now = new Date();
            const year = now.getFullYear();
            const month = (now.getMonth() + 1).toString().padStart(2, '0');
            const day = now.getDate().toString().padStart(2, '0');
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const nowLocalISOString = `${year}-${month}-${day}T${hours}:${minutes}`;

            eventsCollection
                .where("userId", "==", user.uid)
                .where("start", ">=", nowLocalISOString)
                .orderBy("start", "asc")
                .limit(1)
                .onSnapshot(function(querySnapshot) {
                    if (!querySnapshot.empty) {
                        const nextEventDoc = querySnapshot.docs[0];
                        nextYogaScheduleDataGlobal = { id: nextEventDoc.id, ...nextEventDoc.data() };

                        const eventData = nextYogaScheduleDataGlobal;
                        const startDate = new Date(eventData.start);
                        const dateString = startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                        let timeString = startDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
                        timeString = timeString.replace(/\./g, ':');
                        const displayText = `${eventData.title} - ${dateString}, ${timeString}`;
                        nextScheduleInputElement.value = displayText;
                        if (btnStartNow) btnStartNow.disabled = false;
                    } else {
                        nextYogaScheduleDataGlobal = null;
                        nextScheduleInputElement.value = '';
                        nextScheduleInputElement.placeholder = "Belum ada jadwal berikutnya";
                        if (btnStartNow) btnStartNow.disabled = true;
                    }
                }, function(error) {
                    nextYogaScheduleDataGlobal = null;
                    nextScheduleInputElement.value = '';
                    nextScheduleInputElement.placeholder = "Gagal memuat jadwal";
                    if (btnStartNow) btnStartNow.disabled = true;
                });
        });
    }

    if (btnStartNow) {
        btnStartNow.disabled = true; 
        btnStartNow.addEventListener('click', function() {
            if (nextYogaScheduleDataGlobal && nextYogaScheduleDataGlobal.id && nextYogaScheduleDataGlobal.poseListString) {
                const parsedPosesResult = parsePoseList(nextYogaScheduleDataGlobal.poseListString);
                if(!parsedPosesResult.poses || parsedPosesResult.poses.length === 0){
                    alert("Tidak ada pose yang terdaftar untuk jadwal ini.");
                    return;
                }

                localStorage.setItem('currentYogaScheduleId', nextYogaScheduleDataGlobal.id);
                localStorage.setItem('currentYogaScheduleTitle', nextYogaScheduleDataGlobal.title);
                localStorage.setItem('currentYogaPoses', JSON.stringify(parsedPosesResult.poses));
                localStorage.setItem('currentYogaPoseIndex', '0'); 
                
                window.location.href = 'persiapan_sesi.html';
            } else {
                alert("Tidak ada jadwal yoga berikutnya yang bisa dimulai atau jadwal tidak memiliki daftar pose.");
            }
        });
    }

    function populatePoseCheckboxes() { 
        if (!poseCheckboxesContainerEl) return;
        poseCheckboxesContainerEl.innerHTML = '';
        PREDEFINED_POSES.forEach(poseName => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox'; checkbox.value = poseName; checkbox.name = 'poseSelectionGroup'; 
            if (tempSelectedPosesInCheckboxModal.has(poseName)) checkbox.checked = true;
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(" " + capitalizeFirstLetter(poseName)));
            poseCheckboxesContainerEl.appendChild(label);
        });
    }
    function openPoseSelectionModal() { 
        tempSelectedPosesInCheckboxModal.clear();
        currentActiveSelectedPoses.forEach(p => tempSelectedPosesInCheckboxModal.add(p.name));
        populatePoseCheckboxes();
        if (poseSelectionModalEl) poseSelectionModalEl.classList.add('show');
    }
function closePoseSelectionModal() { 
    if (poseSelectionModalEl) poseSelectionModalEl.classList.remove('show');
}

function renderSelectedPosesWithDurationInputs() {
    if (!selectedPosesContainerModal) return;
    selectedPosesContainerModal.innerHTML = '';
    currentActiveSelectedPoses.forEach((pose) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'selected-pose-item';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'pose-name';
        nameSpan.textContent = capitalizeFirstLetter(pose.name);

        const durationDiv = document.createElement('div');
        durationDiv.className = 'pose-duration-input';

        const durationSelect = document.createElement('select');
        durationSelect.dataset.poseName = pose.name;
        const durationOptions = [
            { text: "5 menit", value: 300 },
            { text: "10 menit", value: 600 },
            { text: "15 menit", value: 900 },
            { text: "20 menit", value: 1200 },
            { text: "25 menit", value: 1500 },
            { text: "30 menit", value: 1800 }
        ];

        durationOptions.forEach(opt => {
            const optionEl = document.createElement('option');
            optionEl.value = opt.value;
            optionEl.textContent = opt.text;
            durationSelect.appendChild(optionEl);
        });

        const validDurations = durationOptions.map(opt => opt.value);
        const currentPoseDurationInt = parseInt(pose.duration, 10);

        if (pose.duration && validDurations.includes(currentPoseDurationInt)) {
            durationSelect.value = pose.duration;
        } else {
            pose.duration = 300;
            durationSelect.value = 300;
        }

        durationSelect.addEventListener('change', function() {
            const pName = this.dataset.poseName;
            let newDuration = parseInt(this.value, 10);

            const poseToUpdate = currentActiveSelectedPoses.find(p => p.name === pName);
            if (poseToUpdate) {
                poseToUpdate.duration = newDuration;
            }
            updatePoseSummary();
        });

        durationDiv.appendChild(durationSelect);

        itemDiv.appendChild(nameSpan);
        itemDiv.appendChild(durationDiv);
        selectedPosesContainerModal.appendChild(itemDiv);
    });
    updatePoseSummary();
}
    function updatePoseSummary() { 
        const poseCount = currentActiveSelectedPoses.length;
        let totalDurationSeconds = 0;
        currentActiveSelectedPoses.forEach(p => { totalDurationSeconds += (parseInt(p.duration, 10) || 0); });
        if (formJumlahPoseModalEl) formJumlahPoseModalEl.textContent = poseCount;
        if (formDurasiTotalModalEl) formDurasiTotalModalEl.textContent = formatDurationForDisplay(totalDurationSeconds);
    }
    if (btnPilihPoseModal) btnPilihPoseModal.addEventListener('click', openPoseSelectionModal);
    if (closePoseSelectionModalBtnEl) closePoseSelectionModalBtnEl.addEventListener('click', closePoseSelectionModal);
    if (cancelPoseSelectionBtnEl) cancelPoseSelectionBtnEl.addEventListener('click', closePoseSelectionModal);
    if (poseSelectionModalEl) poseSelectionModalEl.addEventListener('click', function(event) { if (event.target === poseSelectionModalEl) closePoseSelectionModal(); });
    if (applyPoseSelectionBtnEl) {
        applyPoseSelectionBtnEl.addEventListener('click', function() {
            const newSelectedPosesMap = new Map();
            currentActiveSelectedPoses.forEach(p => newSelectedPosesMap.set(p.name, p.duration));
            currentActiveSelectedPoses = []; 
            const checkboxes = poseCheckboxesContainerEl.querySelectorAll('input[type="checkbox"]:checked');
            checkboxes.forEach(cb => {
                const poseName = cb.value;
                currentActiveSelectedPoses.push({ name: poseName, duration: newSelectedPosesMap.get(poseName) || 300 });
            });
            renderSelectedPosesWithDurationInputs();
            closePoseSelectionModal();
        });
    }

    function openMainScheduleModal(title = "Tambah Jadwal Baru") { 
        if (!scheduleModal) return;
        modalTitleEl.textContent = title;
        scheduleForm.reset(); 
        eventIdInput.value = ''; 
        eventColorInput.value = '#3788D8'; 
        deleteEventBtn.style.display = 'none'; 
        currentActiveSelectedPoses = []; 
        renderSelectedPosesWithDurationInputs(); 
        scheduleModal.style.display = 'flex';
        setTimeout(() => scheduleModal.classList.add('show'), 10); 
    }
    function closeMainScheduleModal() { 
        if (!scheduleModal) return;
        scheduleModal.classList.remove('show');
        setTimeout(() => { if (!scheduleModal.classList.contains('show')) scheduleModal.style.display = 'none'; }, 300); 
    }
    function openModalForNewEventFromCalendar(startStr, endStrProvided, allDay) { 
        openMainScheduleModal("Tambah Jadwal Baru");
        eventStartInput.value = formatDateTimeForInput(startStr);
    }
    function openModalForEditEventFromCalendar(eventFc) { 
        openMainScheduleModal("Edit Jadwal: " + eventFc.title);
        eventIdInput.value = eventFc.id;
        eventTitleInput.value = eventFc.title;
        eventStartInput.value = formatDateTimeForInput(eventFc.start);
        eventColorInput.value = eventFc.backgroundColor || eventFc.borderColor || '#3788D8';
        const { poses } = parsePoseList(eventFc.extendedProps.poseListString || "");
        currentActiveSelectedPoses = poses.map(p => ({ name: p.name, duration: p.duration }));
        renderSelectedPosesWithDurationInputs();
        deleteEventBtn.style.display = 'inline-block';
    }

    if(btnJadwalBaru) { 
        btnJadwalBaru.addEventListener('click', () => {
            const now = new Date();
            openModalForNewEventFromCalendar(now.toISOString(), null, false); 
        });
    }
    if(closeScheduleModalBtn) closeScheduleModalBtn.addEventListener('click', closeMainScheduleModal);
    if(scheduleModal) { 
        scheduleModal.addEventListener('click', function(event) {
            if (event.target === scheduleModal) closeMainScheduleModal(); 
        });
    }
    window.addEventListener('keydown', function (event) { 
        if (event.key === 'Escape') {
            if (poseSelectionModalEl && poseSelectionModalEl.classList.contains('show')) closePoseSelectionModal();
            else if (scheduleModal && scheduleModal.style.display === 'flex') closeMainScheduleModal();
        }
    });

    if(scheduleForm) {
        scheduleForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const user = firebase.auth().currentUser;
            if (!user) {
                return;
            }
            const userId = user.uid;

            const id = eventIdInput.value;
            const title = eventTitleInput.value.trim();
            const startString = eventStartInput.value;
            const color = eventColorInput.value;

            if (!title) { alert("Judul Jadwal (Nama Sesi) harus diisi!"); return; }
            if (!startString) { alert("Waktu Mulai harus diisi!"); return; }
            if (!currentActiveSelectedPoses || currentActiveSelectedPoses.length === 0) { alert("Anda harus memilih minimal satu pose!"); return; }

            let totalDurationFromPoses = 0;
            for (const pose of currentActiveSelectedPoses) {
                const duration = parseInt(pose.duration, 10);
                if (isNaN(duration) || duration <= 0) {
                    alert(`Durasi untuk pose "${capitalizeFirstLetter(pose.name)}" harus diisi angka dan lebih dari 0 detik.`);
                    return;
                }
                totalDurationFromPoses += duration;
            }

            const poseListString = formatPoseArrayToString(currentActiveSelectedPoses);
            const startDateObj = new Date(startString);
            if (isNaN(startDateObj.getTime())) { alert("Format Waktu Mulai tidak valid!"); return; }
            const finalDurationSeconds = totalDurationFromPoses > 0 ? totalDurationFromPoses : 3600; 
            const endDateObj = new Date(startDateObj.getTime() + finalDurationSeconds * 1000);
            const endString = formatDateTimeForInput(endDateObj); 
            if (!endString || new Date(endString) < startDateObj) {
                 alert("Terjadi kesalahan dalam perhitungan Waktu Selesai. Pastikan durasi pose valid.");
                 return;
            }

            const allDayEvent = false; 
            const eventData = { title, start: startString, end: endString, color, allDay: allDayEvent, poseListString, userId }; 

            saveEventBtn.disabled = true; saveEventBtn.textContent = "Menyimpan...";
            try {
                if (id) { 
                    await eventsCollection.doc(id).update(eventData);
                } else { 
                    await eventsCollection.add(eventData);
                }
                closeMainScheduleModal();
            } catch (error) {
                alert("Gagal menyimpan jadwal: " + error.message + "\nCek console untuk detail.");
            } finally {
                saveEventBtn.disabled = false; saveEventBtn.textContent = "Simpan";
            }
        });
    }

    if(deleteEventBtn) {
        deleteEventBtn.addEventListener('click', async function() { 
            const id = eventIdInput.value;
            if (id && confirm("Apakah Anda yakin ingin menghapus jadwal ini?")) {
                deleteEventBtn.disabled = true; deleteEventBtn.textContent = "Menghapus...";
                try { await eventsCollection.doc(id).delete(); closeMainScheduleModal(); } 
                catch (error) { alert("Gagal menghapus jadwal: " + error.message); } 
                finally { deleteEventBtn.disabled = false; deleteEventBtn.textContent = "Hapus"; }
            }
        });
    }
    
    async function updateEventTimingInFirebase(eventFc) { 
        const eventDataToUpdate = { start: eventFc.startStr, end: eventFc.endStr || null, allDay: eventFc.allDay };
        try { await eventsCollection.doc(eventFc.id).update(eventDataToUpdate); } 
        catch (error) { alert("Gagal mengupdate jadwal setelah diubah posisinya."); eventFc.revert(); }
    }
    
    if (nextScheduleInputElement) { 
        displayNextSchedule(); 
    }
    if (calendarEl) {
        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth', locale: 'id',
            headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' },
            editable: true, selectable: true, navLinks: true, dayMaxEvents: true, weekends: true,
            events: function(fetchInfo, successCallback, failureCallback) {
                firebase.auth().onAuthStateChanged(function(user) {
                    if (!user) {
                        successCallback([]);
                        return;
                    }
                    const userId = user.uid;
                    if (window.eventsUnsubscribeGlobal) window.eventsUnsubscribeGlobal();
                    window.eventsUnsubscribeGlobal = eventsCollection.where("userId", "==", userId)
    .onSnapshot(snapshot => {
        const now = new Date();
        const events = snapshot.docs.map(doc => {
            const data = doc.data();
            let bgColor = data.color || '#3788D8';
            if (data.end && new Date(data.end) < now) {
                bgColor = '#b6fcb6';
            }
            return {
                id: doc.id,
                title: data.title,
                start: data.start,
                end: data.end || null,
                extendedProps: { poseListString: data.poseListString || '' },
                color: bgColor,
                backgroundColor: bgColor,
                borderColor: bgColor,
                allDay: data.allDay || false
            };
        });
        successCallback(events);
    }, error => { failureCallback(error); });
                });
            },
            select: function(sInfo) { openModalForNewEventFromCalendar(sInfo.startStr, sInfo.endStr, sInfo.allDay); },
            eventClick: function(cInfo) { openModalForEditEventFromCalendar(cInfo.event); },
            eventDrop: function(dInfo) { updateEventTimingInFirebase(dInfo.event); },
            eventResize: function(rInfo) { updateEventTimingInFirebase(rInfo.event); }
        });
        calendar.render();
    }

const btnLogout = document.getElementById('btnLogout');
if (btnLogout) {
    btnLogout.addEventListener('click', function(e) {
        e.preventDefault();
        if (firebase && firebase.auth) {
            firebase.auth().signOut().then(function() {
                window.location.href = "/static/landingpage.html";
            }).catch(function(error) {
                alert("Gagal logout: " + error.message);
            });
        }
    });
}

const profileDropdownLogout = document.getElementById('profileDropdownLogout');
if (profileDropdownLogout) {
    profileDropdownLogout.addEventListener('click', function(e) {
        e.preventDefault();
        if (firebase && firebase.auth) {
            firebase.auth().signOut().then(function() {
                window.location.href = "/static/landingpage.html";
            }).catch(function(error) {
                alert("Gagal logout: " + error.message);
            });
        }
    });
}

    function renderLatestHistory() {
        const historyCard = document.querySelector('.history-card .history-placeholder');
        if (!historyCard) return;

        firebase.auth().onAuthStateChanged(function(user) {
            if (!user) {
                historyCard.innerHTML = `<p>Silakan login untuk melihat riwayat sesi.</p>`;
                return;
            }
            const userId = user.uid;
            const now = new Date().toISOString();
            eventsCollection
                .where("userId", "==", userId)
                .where("end", "<", now)
                .orderBy("end", "desc")
                .limit(3)
                .get()
                .then(snapshot => {
                    if (snapshot.empty) {
                        historyCard.innerHTML = `<p>Belum ada riwayat sesi.</p>`;
                        return;
                    }
                    let html = '<ul class="riwayat-terbaru-list">';
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        const endDate = new Date(data.end);
                        const tanggal = endDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                        const jam = endDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
                        html += `<li>
                            <strong>${data.title || '-'}</strong>
                            <br><span style="font-size:0.95em;color:#666;">${tanggal}, ${jam}</span>
                        </li>`;
                    });
                    html += '</ul>';
                    historyCard.innerHTML = html;
                })
                .catch(() => {
                    historyCard.innerHTML = `<p style="color:red;">Gagal memuat riwayat.</p>`;
                });
        });
    }
    renderLatestHistory();
});
