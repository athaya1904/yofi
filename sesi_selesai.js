document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    let durasi = params.get('durasi');
    if (!durasi) durasi = 0;
    durasi = Math.round(Number(durasi));
    document.getElementById('durasiYoga').textContent = durasi;
});