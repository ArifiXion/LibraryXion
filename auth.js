/* LibraXion - Auth dengan database lokal (localStorage browser) */
const Auth = (() => {
  const USERS = 'pd_users', SESSION = 'pd_session';
  const read = () => { try { return JSON.parse(localStorage.getItem(USERS)) || []; } catch (e) { return []; } };
  const write = (u) => localStorage.setItem(USERS, JSON.stringify(u));
  async function hash(text) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) { // fallback bila crypto.subtle tidak tersedia
      let h = 5381; for (const c of text) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return 'f' + h;
    }
  }
  const salt = () => Math.random().toString(36).slice(2, 12);
  const current = () => { const e = localStorage.getItem(SESSION); return read().find(u => u.email === e) || null; };
  async function register(nama, email, password) {
    email = email.trim().toLowerCase(); nama = nama.trim();
    if (nama.length < 3) return { ok: false, msg: 'Nama minimal 3 karakter.' };
    if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, msg: 'Format email tidak valid.' };
    if (password.length < 6) return { ok: false, msg: 'Password minimal 6 karakter.' };
    const users = read();
    if (users.some(u => u.email === email)) return { ok: false, msg: 'Email sudah terdaftar. Silakan login.' };
    const s = salt();
    users.push({ nama, email, salt: s, hash: await hash(s + password), dibuat: new Date().toISOString() });
    write(users); localStorage.setItem(SESSION, email);
    return { ok: true };
  }
  async function login(email, password) {
    email = email.trim().toLowerCase();
    const u = read().find(x => x.email === email);
    if (!u || u.hash !== await hash(u.salt + password)) return { ok: false, msg: 'Email atau password salah.' };
    localStorage.setItem(SESSION, email);
    return { ok: true };
  }
  async function changePassword(oldP, newP) {
    const e = localStorage.getItem(SESSION), users = read(), u = users.find(x => x.email === e);
    if (!u || u.hash !== await hash(u.salt + oldP)) return { ok: false, msg: 'Password lama salah.' };
    if (newP.length < 6) return { ok: false, msg: 'Password baru minimal 6 karakter.' };
    u.salt = salt(); u.hash = await hash(u.salt + newP); write(users); return { ok: true };
  }
  function rename(nama) {
    nama = nama.trim(); if (nama.length < 3) return { ok: false, msg: 'Nama minimal 3 karakter.' };
    const users = read(), u = users.find(x => x.email === localStorage.getItem(SESSION)); if (!u) return { ok: false, msg: 'Masuk dulu.' };
    u.nama = nama; write(users); return { ok: true };
  }
  const logout = () => localStorage.removeItem(SESSION);
  // Dipakai di halaman novel: wajib login, kalau belum diarahkan ke login
  function requireLogin(root) {
    if (!current()) { const p = location.pathname.split('/'); location.replace(root + 'login.html?next=' + encodeURIComponent(root ? p.slice(-2).join('/') : p[p.length - 1])); }
  }
  function nextUrl() { const n = new URLSearchParams(location.search).get('next'); return n && /^[\w.\-\/]+$/.test(n) && !n.includes('..') ? n : 'index.html'; }
  // Tampilkan status user di navbar
  function renderNav(root) {
    const nav = document.querySelector('.nav-links'); if (!nav) return;
    const u = current(), el = document.createElement('span');
    el.className = 'auth-nav';
    const n = u && typeof Loans !== 'undefined' ? Loans.badge() : 0;
    el.innerHTML = u ? '<a href="' + root + 'pinjaman.html">Pinjaman' + (n ? '<span class="nav-badge">' + n + '</span>' : '') + '</a><span class="auth-user">👤 ' + u.nama.replace(/[<>&"]/g, '') + '</span><a href="#" id="logoutBtn">Keluar</a>'
                     : '<a href="' + root + 'login.html">Masuk</a><a href="' + root + 'register.html" class="auth-cta">Daftar</a>';
    document.querySelectorAll('[data-guest]').forEach(x => x.hidden = !!u);
    document.querySelectorAll('[data-user]').forEach(x => x.hidden = !u);
    nav.appendChild(el);
    const b = el.querySelector('#logoutBtn');
    if (b) b.onclick = (e) => { e.preventDefault(); logout(); location.href = root + 'index.html'; };
  }
  return { changePassword, rename, register, login, logout, current, requireLogin, nextUrl, renderNav };
})();
