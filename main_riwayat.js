document.addEventListener('DOMContentLoaded', function() {
    const firebaseConfig = {
        apiKey: "AIzaSyCcci3zuQtwwuqwqwxZm5abEGjKnqV2ahA",
        authDomain: "yofi-191421.firebaseapp.com",
        projectId: "yofi-191421",
    };

    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase Initialized in main_riwayat.js");
    } else if (typeof firebase === 'undefined') {
        console.error("Firebase SDK not loaded in main_riwayat.js.");
        return;
    }

    const db = firebase.firestore();
    const eventsCollection = db.collection('jadwalEvents');
    const riwayatTableBody = document.getElementById('riwayatTableBody');

    function formatTanggal(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    function formatDurationForDisplay(totalSeconds) {
        if (isNaN(totalSeconds) || totalSeconds === null || totalSeconds < 0) return "-";
        if (totalSeconds === 0) return "0 menit";

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        let ds = "";
        if (hours > 0) ds += `${hours} jam `;
        if (minutes > 0) ds += `${minutes} menit `;
        if (hours === 0 && minutes === 0 && seconds > 0) {
             ds += `${seconds} detik`;
        }
        return ds.trim() || "0 menit";
    }

    function parsePoseListCount(poseListString) {
        if (!poseListString || typeof poseListString !== 'string' || poseListString.trim() === "") return 0;
        const poses = poseListString.split(',').filter(p => p.trim() !== "");
        return poses.length;
    }

    firebase.auth().onAuthStateChanged(function(user) {
        if (!riwayatTableBody) {
            console.error("Elemen riwayatTableBody tidak ditemukan!");
            return;
        }

        if (!user) {
            riwayatTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Silakan login untuk melihat riwayat.</td></tr>`;
            return;
        }

        eventsCollection
            .where("userId", "==", user.uid)
            .orderBy("end", "desc")
            .get()
            .then(snapshot => {
                const now = new Date();
                const finishedEvents = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(ev => ev.end && new Date(ev.end) < now);

                if (finishedEvents.length === 0) {
                    riwayatTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Belum ada riwayat sesi yang selesai.</td></tr>`;
                    return;
                }

                let html = '';
                finishedEvents.forEach(ev => {
                    let totalDurationSeconds = 0;
                    if (ev.start && ev.end) {
                        const startTime = new Date(ev.start).getTime();
                        const endTime = new Date(ev.end).getTime();
                        if (!isNaN(startTime) && !isNaN(endTime) && endTime > startTime) {
                            totalDurationSeconds = (endTime - startTime) / 1000;
                        }
                    }
                    
                    const poseInfo = parsePoseListCount(ev.poseListString);

                    html += `<tr>
                        <td>${formatTanggal(ev.end)}</td>
                        <td>${ev.title || 'Tanpa Judul'}</td>
                        <td>${formatDurationForDisplay(totalDurationSeconds)}</td>
                        <td>${poseInfo}</td>
                    </tr>`;
                });
                riwayatTableBody.innerHTML = html;
            })
            .catch(error => {
                console.error("Error mengambil riwayat sesi: ", error);
                riwayatTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Gagal memuat riwayat sesi.</td></tr>`;
            });
    });

    console.log("main_riwayat.js loaded.");
});
