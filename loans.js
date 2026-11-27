/* LibraXion - Peminjaman & booking novel (database lokal: localStorage) */
const Loans = (() => {
  const KL = 'pd_loans', KR = 'pd_reservations', KP = 'pd_profiles';
  const MAX = 3, MAX_RES = 3, COPIES = 2, FINE = 500, LOST_FINE = 100000, LIBRARIAN_PIN = 'LBX2026', EXTEND_DAYS = 7, MAXD = 30, AHEAD = 14, CLAIM_HOURS = 48, DAY = 86400000;
  const PURPOSES = ['Tugas sekolah', 'Bacaan hiburan', 'Referensi lomba atau karya', 'Lainnya'];
  const rd = (k) => { try { return JSON.parse(localStorage.getItem(k)) || (k === KP ? {} : []); } catch (e) { return k === KP ? {} : []; } };
  const wr = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const me = () => { const u = Auth.current(); return u ? u.email : null; };
  const sod = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const dueFrom = (days, from) => { const d = from ? new Date(from) : new Date(); d.setDate(d.getDate() + days); d.setHours(23, 59, 59, 0); return d; };
  const daysLeft = (l) => Math.round((sod(l.due) - sod(new Date())) / DAY);
  const lateDays = (l, at) => Math.max(0, Math.round((sod(at || new Date()) - sod(l.due)) / DAY));
  const fmt = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const fmtDT = (d) => fmt(d) + ', ' + new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '.');
  const fmtDay = (d) => new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const mkDate = (f) => { const y = +f.y, m = +f.m, d = +f.d, x = new Date(y, m - 1, d); return y >= 2000 && x.getFullYear() === y && x.getMonth() === m - 1 && x.getDate() === d ? x : null; };
  const rupiah = (n) => 'Rp' + Number(n).toLocaleString('id-ID');
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const lostOpen = (all, h) => all.filter(l => l.href === h && l.status === 'hilang' && !l.paid).length;
  // Sinkronkan antrean: kedaluwarsakan yang tidak diambil, lalu beri eksemplar kosong ke antrean terdepan
  function sweep() {
    const res = rd(KR), allL = rd(KL), loans = allL.filter(l => l.status === 'aktif'); let changed = false, now = Date.now();
    res.forEach(r => { if (r.status === 'siap' && new Date(r.expiresAt) < now) { r.status = 'kedaluwarsa'; changed = true; } });
    [...new Set(res.map(r => r.href))].forEach(h => {
      let free = COPIES - lostOpen(allL, h) - loans.filter(l => l.href === h).length - res.filter(r => r.href === h && r.status === 'siap').length;
      const q = res.filter(r => r.href === h && r.status === 'menunggu').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      while (free > 0 && q.length) { const r = q.shift(); r.status = 'siap'; r.readyAt = new Date().toISOString(); r.expiresAt = new Date(now + CLAIM_HOURS * 3600000).toISOString(); free--; changed = true; }
    });
    if (changed) wr(KR, res);
  }
  const mine = (arr) => arr.filter(x => x.email === me());
  const active = () => { sweep(); return mine(rd(KL)).filter(l => l.status === 'aktif'); };
  const history = () => { sweep(); return mine(rd(KL)).filter(l => l.status === 'kembali').sort((a, b) => b.returnedAt.localeCompare(a.returnedAt)); };
  const find = (href) => active().find(l => l.href === href) || null;
  const reservations = () => { sweep(); return mine(rd(KR)).filter(r => r.status === 'menunggu' || r.status === 'siap').sort((a, b) => a.createdAt.localeCompare(b.createdAt)); };
  const myReservation = (href) => reservations().find(r => r.href === href) || null;
  const position = (r) => rd(KR).filter(x => x.href === r.href && x.status === 'menunggu').sort((a, b) => a.createdAt.localeCompare(b.createdAt)).findIndex(x => x.id === r.id) + 1;
  function availability(href) {
    sweep();
    const allL = rd(KL), lost = lostOpen(allL, href), borrowed = allL.filter(l => l.href === href && l.status === 'aktif').length, R = rd(KR).filter(r => r.href === href);
    const held = R.filter(r => r.status === 'siap').length, queue = R.filter(r => r.status === 'menunggu').length;
    return { total: COPIES - lost, lost, borrowed, held, queue, free: Math.max(0, COPIES - lost - borrowed - held) };
  }
  const hasOverdue = () => active().some(l => daysLeft(l) < 0);
  const unpaid = () => { sweep(); return mine(rd(KL)).filter(l => l.status === 'hilang' && !l.paid); };
  const lostAll = () => { sweep(); return mine(rd(KL)).filter(l => l.status === 'hilang').sort((a, b) => b.lostAt.localeCompare(a.lostAt)); };
  const unpaidTotal = () => unpaid().reduce((s, l) => s + l.fine, 0);
  const fineNow = (l) => lateDays(l) * FINE;
  const badge = () => me() ? active().length + reservations().filter(r => r.status === 'siap').length : 0;
  const profile = () => rd(KP)[me()] || {};

  function borrow(book, days, form) {
    if (!me()) return { ok: false, msg: 'Masuk dulu untuk meminjam buku.' };
    days = Number(days);
    if (!Number.isInteger(days) || days < 1 || days > MAXD) return { ok: false, msg: 'Lama pinjam harus berupa angka bulat 1 sampai ' + MAXD + ' hari.' };
    const today = sod(new Date()), sd = form.start ? mkDate(form.start) : today, lim = new Date(today); lim.setDate(lim.getDate() + AHEAD);
    if (!sd) return { ok: false, msg: 'Tanggal mulai pinjam tidak valid. Periksa tanggal, bulan, dan tahun.' };
    if (sd < today) return { ok: false, msg: 'Tanggal mulai pinjam tidak boleh sebelum hari ini.' };
    if (sd > lim) return { ok: false, msg: 'Tanggal mulai pinjam paling lambat ' + AHEAD + ' hari dari sekarang (' + fmt(lim) + ').' };
    const kelas = (form.kelas || '').trim(), nis = (form.nis || '').trim();
    if (kelas.length < 2) return { ok: false, msg: 'Isi kelas, misalnya XI RPL 1.' };
    if (!/^\d{4,12}$/.test(nis)) return { ok: false, msg: 'NIS harus berupa angka 4 sampai 12 digit.' };
    if (!PURPOSES.includes(form.purpose)) return { ok: false, msg: 'Pilih keperluan peminjaman.' };
    if (unpaid().length) return { ok: false, msg: 'Ada denda buku hilang ' + rupiah(unpaidTotal()) + ' yang belum lunas. Selesaikan dulu di halaman Pinjaman saya.' };
    if (hasOverdue()) return { ok: false, msg: 'Ada pinjaman yang terlambat. Kembalikan dulu sebelum meminjam lagi.' };
    if (find(book.href)) return { ok: false, msg: 'Buku ini sedang kamu pinjam.' };
    if (active().length >= MAX) return { ok: false, msg: 'Batas pinjaman ' + MAX + ' buku tercapai. Kembalikan satu buku dulu.' };
    const mineRes = myReservation(book.href), av = availability(book.href);
    if (!(mineRes && mineRes.status === 'siap') && av.free <= 0) return { ok: false, msg: 'Stok sedang habis. Pesan antrean untuk mendapat giliran.' };
    const loans = rd(KL), loan = { id: uid(), code: 'LBX-' + Math.random().toString(36).slice(2, 7).toUpperCase(), email: me(), nama: Auth.current().nama, href: book.href, title: book.title, author: book.author, genre: book.genre, cover: book.cover, kelas, nis, purpose: form.purpose, start: (sd.getTime() === today.getTime() ? new Date() : new Date(sd.getTime() + 8 * 3600000)).toISOString(), due: dueFrom(days, sd).toISOString(), days, extended: false, status: 'aktif' };
    loans.push(loan); wr(KL, loans);
    if (mineRes && mineRes.status === 'siap') { const res = rd(KR); res.find(r => r.id === mineRes.id).status = 'diambil'; wr(KR, res); }
    const p = rd(KP); p[me()] = { kelas, nis }; wr(KP, p);
    return { ok: true, loan };
  }
  function reserve(book) {
    if (!me()) return { ok: false, msg: 'Masuk dulu untuk memesan.' };
    if (find(book.href)) return { ok: false, msg: 'Buku ini sedang kamu pinjam.' };
    if (unpaid().length) return { ok: false, msg: 'Ada denda buku hilang yang belum lunas. Selesaikan dulu sebelum memesan.' };
    if (myReservation(book.href)) return { ok: false, msg: 'Kamu sudah ada di antrean buku ini.' };
    if (reservations().length >= MAX_RES) return { ok: false, msg: 'Batas antrean ' + MAX_RES + ' buku tercapai.' };
    if (availability(book.href).free > 0) return { ok: false, msg: 'Buku ini masih tersedia, langsung pinjam saja.' };
    const res = rd(KR), r = { id: uid(), email: me(), href: book.href, title: book.title, author: book.author, genre: book.genre, cover: book.cover, status: 'menunggu', createdAt: new Date().toISOString() };
    res.push(r); wr(KR, res);
    return { ok: true, reservation: r, position: position(r) };
  }
  function cancelReservation(id) {
    const res = rd(KR), r = res.find(x => x.id === id && x.email === me()); if (!r) return false;
    r.status = 'batal'; wr(KR, res); sweep(); return true;
  }
  function giveBack(id) {
    const all = rd(KL), l = all.find(x => x.id === id && x.email === me() && x.status === 'aktif'); if (!l) return null;
    const now = new Date(); l.status = 'kembali'; l.returnedAt = now.toISOString(); l.fine = lateDays(l, now) * FINE; l.lateDays = lateDays(l, now);
    wr(KL, all); sweep(); return l;
  }
  // Lapor kehilangan: denda tetap + denda terlambat sampai hari pelaporan; eksemplar dianggap hilang sampai denda lunas
  function reportLost(id) {
    const all = rd(KL), l = all.find(x => x.id === id && x.email === me() && x.status === 'aktif'); if (!l) return null;
    const now = new Date(); l.status = 'hilang'; l.lostAt = now.toISOString(); l.lateDays = lateDays(l, now); l.lateFine = l.lateDays * FINE; l.fine = LOST_FINE + l.lateFine; l.paid = false;
    wr(KL, all); sweep(); return l;
  }
  // Pelunasan hanya sah bila dikonfirmasi pustakawan (kode pustakawan)
  function payLost(id, pin) {
    if (String(pin).trim() !== LIBRARIAN_PIN) return { ok: false, msg: 'Kode pustakawan salah.' };
    const all = rd(KL), l = all.find(x => x.id === id && x.email === me() && x.status === 'hilang' && !x.paid);
    if (!l) return { ok: false, msg: 'Data denda tidak ditemukan.' };
    l.paid = true; l.paidAt = new Date().toISOString(); wr(KL, all); sweep(); return { ok: true, loan: l };
  }
  function extend(id) {
    const all = rd(KL), l = all.find(x => x.id === id && x.email === me() && x.status === 'aktif');
    if (!l) return { ok: false, msg: 'Pinjaman tidak ditemukan.' };
    if (l.extended) return { ok: false, msg: 'Perpanjangan hanya bisa satu kali.' };
    if (daysLeft(l) < 0) return { ok: false, msg: 'Pinjaman sudah lewat batas, kembalikan dulu.' };
    const a = availability(l.href); if (a.queue > 0 || a.held > 0) return { ok: false, msg: 'Ada pembaca lain yang mengantre, jadi tidak bisa diperpanjang.' };
    const d = new Date(l.due); d.setDate(d.getDate() + EXTEND_DAYS); l.due = d.toISOString(); l.extended = true; wr(KL, all);
    return { ok: true };
  }
  return { MAXD, AHEAD, mkDate, fmtDay, LOST_FINE, unpaid, unpaidTotal, lostAll, reportLost, payLost, MAX, MAX_RES, COPIES, FINE, EXTEND_DAYS, CLAIM_HOURS, PURPOSES, active, history, find, reservations, myReservation, position, availability, hasOverdue, fineNow, lateDays, badge, profile, borrow, reserve, cancelReservation, giveBack, extend, daysLeft, dueFrom, fmt, fmtDT, rupiah };
})();
