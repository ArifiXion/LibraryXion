/* LibraXion - Popup peminjaman, bukti pinjam, dan notifikasi */
const LoanUI = (() => {
  const $ = (id) => document.getElementById(id);
  let built = false, book = null, mode = 'borrow', tt;
  const api = { onChange: null };
  function build() {
    if (built) return; built = true;
    document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-overlay" id="loanModal"><div class="modal-box loan-box" role="dialog" aria-modal="true" aria-labelledby="lTitle">
        <button class="modal-x" id="lClose" aria-label="Tutup">&times;</button>
        <div class="loan-head"><img id="lCover" alt=""><div><h3 id="lTitle"></h3><p id="lAuthor"></p><span class="avail" id="lAvail"></span></div></div>
        <div class="loan-form">
            <div class="field-grid">
                <div><label for="lKelas">Kelas</label><input id="lKelas" placeholder="Contoh: XI RPL 1" autocomplete="off"></div>
                <div><label for="lNis">NIS</label><input id="lNis" inputmode="numeric" placeholder="Nomor induk siswa" autocomplete="off"></div>
            </div>
            <label for="lPurpose">Keperluan</label>
            <select id="lPurpose"></select>
            <span class="lbl">Hari pertama peminjaman</span>
            <div class="date-row">
                <div><label for="lTgl">Tanggal</label><input id="lTgl" inputmode="numeric" maxlength="2" autocomplete="off"></div>
                <div><label for="lBln">Bulan</label><select id="lBln"></select></div>
                <div><label for="lThn">Tahun</label><input id="lThn" inputmode="numeric" maxlength="4" autocomplete="off"></div>
            </div>
            <p class="day-name" id="lHari"></p>
            <label for="lDays">Lama pinjam (hari)</label>
            <div class="days-row"><input id="lDays" type="number" min="1" max="30" step="1" inputmode="numeric" value="7"><span class="quick"></span></div>
        </div>
        <p class="loan-due" id="lDue"></p>
        <p class="loan-rules" id="lRules"></p>
        <div class="auth-msg" id="lMsg" hidden></div>
        <button class="borrow-button" id="lConfirm">Pinjam sekarang</button>
        <button class="modal-link plain" id="lCancel">Batal</button>
    </div></div>
    <div class="modal-overlay" id="receiptModal"><div class="modal-box loan-box receipt-sheet" role="dialog" aria-modal="true" aria-labelledby="rTitle">
        <button class="modal-x" id="rClose" aria-label="Tutup">&times;</button>
        <p class="r-brand">LibraXion</p><h3 id="rTitle">Bukti peminjaman</h3><p class="r-code" id="rCode"></p>
        <dl class="r-list" id="rList"></dl>
        <p class="r-note" id="rNote"></p>
        <div class="receipt-actions"><button class="borrow-button" id="rPrint">Cetak bukti</button></div>
    </div></div>
    <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>`);
    const sel = $('lPurpose'); Loans.PURPOSES.forEach(p => sel.add(new Option(p, p)));
    $('lRules').textContent = 'Denda keterlambatan ' + Loans.rupiah(Loans.FINE) + ' per hari. Pilih sendiri lama pinjam 1 sampai ' + Loans.MAXD + ' hari. Perpanjangan ' + Loans.EXTEND_DAYS + ' hari satu kali, selama tidak ada pembaca yang mengantre. Buku yang hilang didenda ' + Loans.rupiah(Loans.LOST_FINE) + '.';
    const MN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    MN.forEach((m, i) => $('lBln').add(new Option(m, i + 1)));
    [1, 2, 3, 4, 5, 7, 14].forEach(n => { const q = document.createElement('button'); q.type = 'button'; q.textContent = n; q.title = n + ' hari'; q.onclick = () => { $('lDays').value = n; showDue(); }; document.querySelector('.quick').appendChild(q); });
    ['lTgl', 'lBln', 'lThn', 'lDays'].forEach(id => $(id).addEventListener('input', showDue));
    ['lKelas', 'lNis', 'lTgl', 'lThn', 'lDays'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') confirmLoan(); }));
    $('lClose').onclick = $('lCancel').onclick = closeLoan; $('rClose').onclick = closeReceipt;
    $('loanModal').addEventListener('click', e => { if (e.target.id === 'loanModal') closeLoan(); });
    $('receiptModal').addEventListener('click', e => { if (e.target.id === 'receiptModal') closeReceipt(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeLoan(); closeReceipt(); } });
    ['lKelas', 'lNis', 'lPurpose'].forEach(id => $(id).addEventListener('input', () => { $('lMsg').hidden = true; }));
    $('lConfirm').onclick = confirmLoan;
    $('rPrint').onclick = () => { document.body.classList.add('print-receipt'); window.print(); document.body.classList.remove('print-receipt'); };
  }
  const days = () => $('lDays').value.trim() === '' ? NaN : Number($('lDays').value);
  const start = () => ({ d: $('lTgl').value, m: $('lBln').value, y: $('lThn').value });
  function showDue() {
    const sd = Loans.mkDate(start()), n = days(), ok = Number.isInteger(n) && n >= 1 && n <= Loans.MAXD;
    $('lHari').textContent = sd ? 'Hari ' + sd.toLocaleDateString('id-ID', { weekday: 'long' }) : 'Tanggal belum valid';
    $('lDue').textContent = sd && ok ? 'Hari pertama: ' + Loans.fmtDay(sd) + '. Batas kembali: ' + Loans.fmtDay(Loans.dueFrom(n, sd)) : 'Isi tanggal yang valid dan lama pinjam 1 sampai ' + Loans.MAXD + ' hari.';
  }
  const closeLoan = () => $('loanModal') && $('loanModal').classList.remove('open');
  const closeReceipt = () => $('receiptModal') && $('receiptModal').classList.remove('open');
  function open(b, m) {
    build(); book = b; mode = m || 'borrow';
    const p = Loans.profile(), av = Loans.availability(b.href);
    $('lTitle').textContent = b.title; $('lAuthor').textContent = b.author;
    $('lCover').src = b.cover; $('lCover').alt = 'Sampul ' + b.title;
    $('lKelas').value = p.kelas || ''; $('lNis').value = p.nis || '';
    const a = $('lAvail'); a.className = 'avail';
    if (mode === 'claim') a.textContent = 'Satu eksemplar sudah dipesan untukmu'; else { a.textContent = 'Tersedia ' + av.free + ' dari ' + av.total + ' eksemplar'; if (!av.free) a.classList.add('none'); }
    $('lConfirm').textContent = mode === 'claim' ? 'Ambil dan pinjam' : 'Pinjam sekarang';
    const now = new Date(); $('lTgl').value = now.getDate(); $('lBln').value = now.getMonth() + 1; $('lThn').value = now.getFullYear(); $('lDays').value = 7;
    $('lMsg').hidden = true; showDue(); $('loanModal').classList.add('open'); ($('lKelas').value ? $('lConfirm') : $('lKelas')).focus();
  }
  function confirmLoan() { if ($('lConfirm').classList.contains('is-done')) return;
    const r = Loans.borrow(book, days(), { start: start(), kelas: $('lKelas').value, nis: $('lNis').value, purpose: $('lPurpose').value });
    const cb = $('lConfirm');
    if (!r.ok) { $('lMsg').textContent = r.msg; $('lMsg').hidden = false; cb.classList.remove('is-err'); void cb.offsetWidth; cb.classList.add('is-err'); return; }
    const done = () => {
      cb.classList.remove('is-done'); cb.textContent = mode === 'claim' ? 'Ambil dan pinjam' : 'Pinjam sekarang';
      closeLoan(); if (api.onChange) api.onChange();
      toast('Berhasil dipinjam dengan kode ' + r.loan.code + '. Kembalikan paling lambat ' + Loans.fmt(r.loan.due) + '. <a href="' + (location.pathname.endsWith('pinjaman.html') ? '#' : 'pinjaman.html') + '">Lihat pinjaman</a>');
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); return; }
    cb.textContent = 'Berhasil dipinjam'; cb.classList.add('is-done'); setTimeout(done, 750);
  }
  function toast(html) { build(); const t = $('toast'); t.innerHTML = html; t.hidden = false; clearTimeout(tt); tt = setTimeout(() => t.hidden = true, 7000); }
  function receipt(l) {
    build(); $('rCode').textContent = 'Kode ' + l.code;
    const rows = [['Peminjam', l.nama], ['Kelas', l.kelas], ['NIS', l.nis], ['Judul', l.title], [l.genre === 'pelajaran' ? 'Jenis' : 'Penulis', l.author], ['Keperluan', l.purpose], ['Hari pertama pinjam', Loans.fmtDay(l.start)], ['Batas kembali', Loans.fmtDay(l.due) + (l.extended ? ' (diperpanjang)' : '')], ['Status', l.status === 'aktif' ? 'Sedang dipinjam' : l.status === 'hilang' ? 'Dilaporkan hilang ' + Loans.fmt(l.lostAt) + ', denda ' + Loans.rupiah(l.fine) + (l.paid ? ' (lunas)' : ' (belum lunas)') : 'Dikembalikan ' + Loans.fmt(l.returnedAt) + (l.fine ? ', denda ' + Loans.rupiah(l.fine) : '')]];
    const dl = $('rList'); dl.replaceChildren();
    rows.forEach(([k, v]) => { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = k; dd.textContent = v; dl.append(dt, dd); });
    $('rNote').textContent = 'Tunjukkan bukti ini kepada pustakawan bila diminta. Denda keterlambatan ' + Loans.rupiah(Loans.FINE) + ' per hari. Buku yang hilang didenda ' + Loans.rupiah(Loans.LOST_FINE) + '.';
    $('receiptModal').classList.add('open');
  }
  api.open = open; api.toast = toast; api.receipt = receipt; api.build = build;
  return api;
})();
