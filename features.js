/* LibraXion - tema gelap, notifikasi, favorit, progres baca (localStorage, per akun) */
(() => {
  const ROOT = document.currentScript.getAttribute('src').replace('features.js', '');
  const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const set = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const me = () => { try { return typeof Auth !== 'undefined' ? Auth.current() : null; } catch (e) { return null; } };
  const norm = (h) => h.split('/').slice(-2).join('/');
  const root = (s) => (s || '').replace(/^(\.\.\/)+/, '');
  { const l = document.createElement('link'); l.rel = 'icon'; l.type = 'image/png'; l.href = ROOT + 'favicon.png'; document.head.appendChild(l); }
  // Animasi ganti tema: malam = bulan terbit + bintang + bintang jatuh; terang = matahari terbit. Hanya opacity/transform (ringan); tema ditukar saat layar tertutup penuh.
  let themeBusy = false;
  function themeFx(t, apply) {
    if (themeBusy) return; themeBusy = true; const dark = t === 'dark', rnd = (a, b) => a + Math.random() * (b - a);
    const mk = (css) => { const e = document.createElement('div'); e.style.cssText = css; return e; };
    const root = mk('position:fixed;inset:0;z-index:3000;pointer-events:none;opacity:0;overflow:hidden;background:' + (dark ? 'linear-gradient(180deg,#050f1f 0%,#0a211c 55%,#16463b 100%)' : 'linear-gradient(180deg,#bfe3ff 0%,#fff3d6 65%,#ffd98a 100%)'));
    const orb = mk('position:absolute;left:50%;bottom:-24vmin;width:24vmin;height:24vmin;margin-left:-12vmin;border-radius:50%;will-change:transform;' + (dark ? 'background:radial-gradient(circle at 35% 35%,#fffdf0,#ffeaa8 55%,#f1c96b);box-shadow:0 0 60px 20px rgba(255,236,170,.5),0 0 160px 60px rgba(120,200,180,.3)' : 'background:radial-gradient(circle,#fffbe0,#ffd36b 60%,#f0a52a);box-shadow:0 0 70px 30px rgba(255,214,120,.7),0 0 190px 90px rgba(255,190,110,.4)'));
    root.appendChild(orb); const run = [];
    if (dark) {
      for (let i = 0; i < 30; i++) { const s = rnd(2, 4.5), e = mk('position:absolute;left:' + rnd(0, 100) + '%;top:' + rnd(0, 70) + '%;width:' + s + 'px;height:' + s + 'px;border-radius:50%;background:#fff;box-shadow:0 0 ' + s * 3 + 'px #cfe8e0;opacity:0'); root.appendChild(e);
        run.push([e, [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1.3)', offset: .5 }, { opacity: .55, transform: 'scale(.8)' }], { duration: rnd(800, 1400), delay: rnd(100, 650), fill: 'forwards' }]); }
      const sh = mk('position:absolute;left:8%;top:12%;width:150px;height:2px;background:linear-gradient(90deg,transparent,#fff);opacity:0'); root.appendChild(sh);
      run.push([sh, [{ opacity: 0, transform: 'translate(0,0) rotate(25deg)' }, { opacity: 1, offset: .2 }, { opacity: 0, transform: 'translate(70vw,32vw) rotate(25deg)' }], { duration: 900, delay: 420, easing: 'ease-in' }]);
    } else {
      for (let i = 0; i < 14; i++) { const s = rnd(6, 14), e = mk('position:absolute;left:' + rnd(0, 100) + '%;top:' + rnd(20, 80) + '%;width:' + s + 'px;height:' + s + 'px;border-radius:50%;background:#fff6c9;box-shadow:0 0 ' + s * 2 + 'px #ffd36b;opacity:0'); root.appendChild(e);
        run.push([e, [{ opacity: 0, transform: 'translateY(20px) scale(.4)' }, { opacity: .9, offset: .5 }, { opacity: 0, transform: 'translateY(-40px) scale(1)' }], { duration: rnd(900, 1400), delay: rnd(0, 500) }]); }
    }
    document.body.appendChild(root); run.forEach(([e, k, o]) => e.animate(k, o));
    orb.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-' + (dark ? 54 : 60) + 'vmin)' }], { duration: 1250, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, easing: 'ease-in', fill: 'forwards' }).onfinish = () => { apply();
      setTimeout(() => root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 650, easing: 'ease-out', fill: 'forwards' }).onfinish = () => { root.remove(); themeBusy = false; }, 780); };
  }
  const setTheme = (t) => { document.documentElement.dataset.theme = t; };
  setTheme(localStorage.getItem('lbx_theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

  const Fav = {
    key: () => me() ? 'lbx_fav_' + me().email : null,
    list() { const k = this.key(); return k ? get(k, []) : []; },
    has(h) { return this.list().some(b => b.href === norm(h)); },
    toggle(b) { const k = this.key(); if (!k) return false; let l = this.list(); const h = norm(b.href);
      if (l.some(x => x.href === h)) l = l.filter(x => x.href !== h); else l.unshift({ href: h, title: b.title, author: b.author, cover: root(b.cover), genre: b.genre });
      set(k, l); return l.some(x => x.href === h); }
  };
  window.Fav = Fav;

  function notes() {
    if (typeof Loans === 'undefined' || !me()) return [];
    const n = [], R = Loans.reservations();
    Loans.active().forEach(l => { const d = Loans.daysLeft(l);
      if (d < 0) n.push(['late', '"' + l.title + '" terlambat ' + (-d) + ' hari. Denda berjalan ' + Loans.rupiah(Loans.fineNow(l)) + '.']);
      else if (d <= 1) n.push(['warn', '"' + l.title + '" ' + (d === 0 ? 'jatuh tempo hari ini.' : 'jatuh tempo besok.')]); });
    R.filter(r => r.status === 'siap').forEach(r => n.push(['ok', '"' + r.title + '" siap diambil sampai ' + Loans.fmtDT(r.expiresAt) + '.']));
    R.filter(r => r.status === 'menunggu').forEach(r => n.push(['info', 'Antrean "' + r.title + '": urutan ke-' + Loans.position(r) + '.']));
    Loans.unpaid().forEach(l => n.push(['late', 'Denda buku hilang "' + l.title + '" ' + Loans.rupiah(l.fine) + ' belum lunas.']));
    Fav.list().forEach(b => { if (!Loans.find(b.href) && Loans.availability(b.href).free > 0) n.push(['info', 'Favoritmu "' + b.title + '" tersedia untuk dipinjam.']); });
    return n;
  }

  // Foto profil tampil di navbar dan sidebar; diperbarui langsung saat foto dipasang (event lbx:photo)
  function paintAvatars(pop) {
    const u = me(); if (!u) return;
    const ph = localStorage.getItem('lbx_photo_' + u.email), ini = (u.nama || '?').trim()[0].toUpperCase();
    document.querySelectorAll('.nav-avatar, .sidebar .av').forEach(a => {
      a.replaceChildren();
      if (ph) { const im = new Image(); im.src = ph; im.alt = ''; a.appendChild(im); } else a.textContent = ini;
      if (pop) { a.classList.remove('av-pop'); void a.offsetWidth; a.classList.add('av-pop'); }
    });
  }
  window.addEventListener('lbx:photo', () => paintAvatars(true));
  window.addEventListener('storage', (e) => { if (e.key && e.key.indexOf('lbx_photo_') === 0) paintAvatars(true); });

  function ui() {
    const nav = document.querySelector('.nav-links'); if (!nav) return;
    const u = me(), box = document.createElement('span'); box.className = 'nav-tools';
    const mk = (cls, txt, label) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'icon-btn ' + cls; b.textContent = txt; b.setAttribute('aria-label', label); return b; };
    if (u) {
      const sa = document.createElement('a'); sa.href = ROOT + 'saya.html'; sa.textContent = 'Rak saya'; nav.insertBefore(sa, nav.querySelector('.auth-nav'));
      const bell = mk('bell', '🔔', 'Pemberitahuan'), list = notes(), panel = document.createElement('div'); panel.className = 'bell-panel'; panel.hidden = true;
      if (list.length) { const c = document.createElement('i'); c.className = 'bell-badge'; c.textContent = list.length; bell.appendChild(c); }
      panel.innerHTML = '<h4>Pemberitahuan</h4>' + (list.length ? list.map(([t, x]) => '<a class="note ' + t + '" href="' + ROOT + 'pinjaman.html"></a>').join('') : '<p>Tidak ada pemberitahuan.</p>');
      panel.querySelectorAll('.note').forEach((a, i) => a.textContent = list[i][1]);
      bell.onclick = (e) => { e.stopPropagation(); panel.hidden = !panel.hidden; };
      document.addEventListener('click', e => { if (!panel.contains(e.target)) panel.hidden = true; });
      box.append(bell, panel);
    }
    const th = mk('theme', '', 'Ganti tema terang atau gelap'), sync = () => { th.textContent = document.documentElement.dataset.theme === 'dark' ? '☀' : '☾'; };
    th.onclick = () => { const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('lbx_theme', t); const apply = () => { setTheme(t); sync(); };
      if (matchMedia('(prefers-reduced-motion: reduce)').matches || !document.body.animate) return apply();
      themeFx(t, apply); th.animate([{ transform: 'rotate(0) scale(1)' }, { transform: 'rotate(360deg) scale(1.25)', offset: .5 }, { transform: 'rotate(720deg) scale(1)' }], { duration: 900, easing: 'ease-in-out' }); };
    sync(); box.appendChild(th);
    if (u) { const na = document.createElement('a'); na.className = 'nav-avatar'; na.href = ROOT + 'saya.html'; na.title = 'Profil saya'; na.setAttribute('aria-label', 'Profil saya: ' + u.nama); box.appendChild(na); }
    nav.appendChild(box); paintAvatars();

    // navbar sisi kiri: sidebar geser dengan logo, menu, dan akun
    const bar = document.querySelector('.navbar'), brand = bar && bar.querySelector('.brand');
    if (brand) {
      const left = document.createElement('div'); left.className = 'nav-left'; bar.insertBefore(left, brand);
      const mb = mk('menu-btn', '☰', 'Buka menu'); mb.setAttribute('aria-expanded', 'false'); left.append(mb, brand); brand.onclick = () => { location.href = ROOT + 'index.html'; };
      const ov = document.createElement('div'), sb = document.createElement('aside'), page = location.pathname.split('/').slice(-1)[0] || 'index.html', ph = localStorage.getItem('lbx_photo_' + (u ? u.email : ''));
      ov.className = 'side-overlay'; sb.className = 'sidebar'; sb.setAttribute('aria-label', 'Menu utama'); sb.inert = true;
      const link = (href, ico, txt, badge, here) => '<a href="' + ROOT + href + '"' + (here ? ' class="here" aria-current="page"' : '') + '><i>' + ico + '</i>' + txt + (badge ? '<em>' + badge + '</em>' : '') + '</a>';
      const nb = u && typeof Loans !== 'undefined' ? Loans.badge() : 0, on = (p) => page === p && !location.search && !location.hash;
      sb.innerHTML = '<div class="side-head"><img src="' + ROOT + 'logo.png" alt=""><strong>LibraXion</strong><button class="side-close" aria-label="Tutup menu">&times;</button></div>' +
        (u ? '<div class="side-user"><span class="av"></span><span><b></b><small></small></span></div>' : '') +
        '<nav class="side-nav"><h5>Jelajah</h5>' + link('index.html', '⌂', 'Beranda', 0, on('index.html')) + link('index.html#koleksi', '▤', 'Semua buku') +
        link('index.html?genre=drama#koleksi', '●', 'Novel Drama') + link('index.html?genre=fantasy#koleksi', '●', 'Novel Fantasy') + link('index.html?genre=komedi#koleksi', '●', 'Novel Komedi') + link('index.html?genre=pelajaran#koleksi', '●', 'Buku Pelajaran') +
        (u ? '<h5>Akun saya</h5>' + link('saya.html', '♡', 'Rak saya', 0, page === 'saya.html') + link('pinjaman.html', '⇄', 'Pinjaman', nb, page === 'pinjaman.html') : '') +
        '<h5>Info</h5>' + link('index.html#tentang', 'ⓘ', 'Tentang') + '</nav><div class="side-foot"></div>';
      if (u) { const av = sb.querySelector('.av'); if (ph) { const im = new Image(); im.src = ph; im.alt = ''; av.appendChild(im); } else av.textContent = u.nama.trim()[0].toUpperCase(); sb.querySelector('.side-user b').textContent = u.nama; sb.querySelector('.side-user small').textContent = u.email; }
      const ft = sb.querySelector('.side-foot');
      if (u) { const o = document.createElement('button'); o.textContent = 'Keluar'; o.onclick = () => { Auth.logout(); location.href = ROOT + 'index.html'; }; ft.appendChild(o); }
      else ft.innerHTML = '<a href="' + ROOT + 'login.html">Masuk</a><a class="cta" href="' + ROOT + 'register.html">Daftar</a>';
      document.body.append(ov, sb);
      const toggle = (open) => { sb.classList.toggle('open', open); ov.classList.toggle('open', open); sb.inert = !open; mb.setAttribute('aria-expanded', open); if (open) sb.querySelector('.side-close').focus(); else mb.focus(); };
      mb.onclick = () => toggle(true); ov.onclick = sb.querySelector('.side-close').onclick = () => toggle(false);
      sb.addEventListener('click', e => { if (e.target.closest('.side-nav a') && /#/.test(e.target.closest('a').getAttribute('href')) && location.pathname.endsWith('index.html')) toggle(false); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && sb.classList.contains('open')) toggle(false); });
    }

    // tombol favorit di kartu buku (beranda)
    document.querySelectorAll('.book-card').forEach(card => {
      const cov = card.querySelector('.book-cover'), href = card.dataset.href; if (!cov || !href) return;
      const b = mk('fav-btn', '', 'Favorit'), bk = () => ({ href, title: card.querySelector('h3').textContent, author: card.querySelector('.book-info p').textContent, cover: card.querySelector('img').getAttribute('src'), genre: card.dataset.genre });
      const paint = () => { const on = u && Fav.has(href); b.textContent = on ? '♥' : '♡'; b.classList.toggle('on', !!on); b.setAttribute('aria-pressed', !!on); };
      b.onclick = (e) => { e.preventDefault(); if (!me()) { location.href = ROOT + 'login.html?next=index.html'; return; } Fav.toggle(bk()); paint(); };
      paint(); cov.appendChild(b);
    });

    // data progres baca lama (fitur persentase sudah dihapus) dibersihkan sekali
    if (u) localStorage.removeItem('lbx_prog_' + u.email);
  }
  document.addEventListener('DOMContentLoaded', ui);
})();

/* LibraXion - animasi & poles UI (Poin 17) */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const start = () => {
    const bar = document.createElement('div'); bar.className = 'lbx-progress'; bar.setAttribute('aria-hidden', 'true'); document.body.appendChild(bar);
    const up = document.createElement('button'); up.className = 'to-top'; up.type = 'button'; up.setAttribute('aria-label', 'Kembali ke atas'); up.textContent = '\u2191'; document.body.appendChild(up);
    up.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
    const nav = document.querySelector('.navbar'); let tick = false;
    const onScroll = () => { if (tick) return; tick = true; requestAnimationFrame(() => {
      const y = window.scrollY, max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
      if (nav) nav.classList.toggle('scrolled', y > 8);
      up.classList.toggle('show', y > 600); tick = false; }); };
    addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); onScroll();

    // Urutan muncul kartu buku (hanya yang sedang tampil)
    const grid = document.querySelector('.book-container');
    if (grid) {
      const index = () => { let n = 0; grid.querySelectorAll('.book-card').forEach(c => { if (!c.hidden) c.style.setProperty('--i', Math.min(n++, 10)); }); };
      index(); new MutationObserver(index).observe(grid, { attributes: true, attributeFilter: ['hidden'], subtree: true });
    }
    // Hati favorit membal
    document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('.fav-btn'); if (!b) return; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); setTimeout(() => b.classList.remove('pop'), 550); });
    // (Transisi tema kini lewat View Transitions di tombol tema)
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();

/* LibraXion - animasi tambahan (Poin 18) */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const start = () => {
    if (reduce) return;
    // Transisi keluar halaman saat pindah ke halaman lain
    document.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank' || a.hasAttribute('download')) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || (u.pathname === location.pathname && u.hash) || !/\.html$/.test(u.pathname)) return;
      e.preventDefault(); document.body.classList.add('leaving'); setTimeout(() => { location.href = a.href; }, 200);
    });
    addEventListener('pageshow', (e) => { if (e.persisted) document.body.classList.remove('leaving'); });

    // Muncul saat digulir
    const targets = '.section-heading, .pick-info, .about-content > *, .footer-grid > *, .team, .loan-wrap .rule-note';
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .15, rootMargin: '0px 0px -6% 0px' });
      document.querySelectorAll(targets).forEach((el, i) => { el.classList.add('rv'); el.style.setProperty('--d', i % 4); io.observe(el); });
      document.querySelectorAll('.member').forEach((el, i) => { el.classList.add('rv'); el.style.setProperty('--d', i); io.observe(el); });
    }

    // Ripple pada tombol
    document.addEventListener('pointerdown', (e) => {
      const b = e.target.closest && e.target.closest('.borrow-button, .read-link, .category, .btn-sm, button.auth-btn, .auth-card button[type=submit], .loan-box button');
      if (!b) return; b.classList.add('rip');
      const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2, w = document.createElement('span');
      w.className = 'rip-wave'; w.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px';
      b.appendChild(w); setTimeout(() => w.remove(), 650);
    });

    // Kartu buku miring 3D (hanya perangkat dengan mouse)
    if (fine) {
      document.addEventListener('pointermove', (e) => {
        const c = e.target.closest && e.target.closest('.book-cover');
        document.querySelectorAll('.book-cover.tilting').forEach(x => { if (x !== c) { x.classList.remove('tilting'); x.style.removeProperty('--rx'); x.style.removeProperty('--ry'); } });
        if (!c || e.pointerType !== 'mouse') return;
        const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        c.classList.add('tilting'); c.style.setProperty('--ry', ((px - .5) * 14).toFixed(2) + 'deg'); c.style.setProperty('--rx', ((.5 - py) * 14).toFixed(2) + 'deg');
        c.style.setProperty('--gx', (px * 100) + '%'); c.style.setProperty('--gy', (py * 100) + '%');
      }, { passive: true });
    }

    // Angka statistik menghitung naik
    const count = (el) => {
      const m = el.textContent.match(/^(\D*)([\d.]+)(\D*)$/); if (!m || el.dataset.cnt === el.textContent) return;
      const to = parseInt(m[2].replace(/\./g, ''), 10); if (!to || to > 1e7) return;
      const t0 = performance.now(), D = 900, fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, m[2].includes('.') ? '.' : '');
      const step = (t) => { const k = Math.min(1, (t - t0) / D), v = Math.round(to * (1 - Math.pow(1 - k, 3)));
        el.textContent = m[1] + fmt(v) + m[3]; if (k < 1) requestAnimationFrame(step); else el.dataset.cnt = el.textContent; };
      requestAnimationFrame(step);
    };
    document.querySelectorAll('.loan-stats').forEach(box => {
      let busy = false; const run = () => { if (busy) return; busy = true; box.querySelectorAll('strong').forEach(count); setTimeout(() => { busy = false; }, 50); };
      new MutationObserver(run).observe(box, { childList: true }); run();
    });

    // Konfeti saat berhasil meminjam
    const toast = document.getElementById('toast');
    const confetti = () => {
      const cv = document.createElement('canvas'); cv.className = 'confetti'; cv.width = innerWidth; cv.height = innerHeight; document.body.appendChild(cv);
      const g = cv.getContext('2d'), cols = ['#e3a21a', '#1b6ca8', '#7653b5', '#d9791c', '#1f8a70', '#f1b52f'];
      const ps = Array.from({ length: 90 }, () => ({ x: innerWidth / 2, y: innerHeight * .72, vx: (Math.random() - .5) * 16, vy: -8 - Math.random() * 10, s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[(Math.random() * cols.length) | 0] }));
      let f = 0; (function loop() { g.clearRect(0, 0, cv.width, cv.height); ps.forEach(p => { p.vy += .45; p.x += p.vx; p.y += p.vy; p.r += p.vr; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.globalAlpha = Math.max(0, 1 - f / 110); g.fillRect(-p.s / 2, -p.s / 3, p.s, p.s / 1.6); g.restore(); });
        if (++f < 110) requestAnimationFrame(loop); else cv.remove(); })();
    };
    const watch = (t) => new MutationObserver(() => { if (!t.hidden && /Berhasil dipinjam/.test(t.textContent)) confetti(); }).observe(t, { childList: true, attributes: true, attributeFilter: ['hidden'] });
    if (toast) watch(toast); else new MutationObserver((_, o) => { const t = document.getElementById('toast'); if (t) { o.disconnect(); watch(t); setTimeout(() => { if (!t.hidden && /Berhasil dipinjam/.test(t.textContent)) confetti(); }, 0); } }).observe(document.body, { childList: true });

    // Placeholder pencarian mengetik sendiri
    const q = document.getElementById('q');
    if (q) {
      const words = ['Laskar Pelangi', 'Andrea Hirata', 'Fantasy', 'Matematika kelas XI', 'Komedi', 'Perahu Kertas'], base = q.placeholder;
      let w = 0, c = 0, dir = 1, timer;
      const tick = () => { if (document.activeElement === q || q.value) { q.placeholder = base; timer = setTimeout(tick, 1500); return; }
        c += dir; q.placeholder = 'Cari ' + words[w].slice(0, c) + (c < words[w].length || dir < 0 ? '|' : '');
        let d = dir > 0 ? 90 : 45; if (c === words[w].length && dir > 0) { dir = -1; d = 1400; } else if (c === 0 && dir < 0) { dir = 1; w = (w + 1) % words.length; d = 400; }
        timer = setTimeout(tick, d); };
      tick();
    }
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();

/* LibraXion - surga animasi: layar pembuka, partikel, pita judul, kursor, tombol magnet (Poin 19) */
(() => {
  const ROOT = document.currentScript.getAttribute('src').replace('features.js', '');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isHome = /(^|\/)(index\.html)?$/.test(location.pathname);
  if (reduce) return;

  // Layar pembuka: sekali per sesi di beranda
  let splash = null;
  try {
    if (isHome && !sessionStorage.getItem('lbx_splash')) {
      sessionStorage.setItem('lbx_splash', '1');
      splash = document.createElement('div'); splash.className = 'splash'; splash.style.cssText = 'position:fixed;inset:0;background:#0a211c;z-index:2000';
      splash.innerHTML = '<div class="splash-inner"><img src="' + ROOT + 'logo.png" alt=""><span>LibraXion</span><div class="splash-bar"></div></div>';
      document.documentElement.appendChild(splash);
      const hide = () => { splash.classList.add('out'); setTimeout(() => splash.remove(), 700); };
      setTimeout(hide, 1300); addEventListener('load', () => setTimeout(hide, 1300));
    }
  } catch (e) {}

  const start = () => {
    // Partikel berkelip di hero
    const stage = document.querySelector('.stage');
    if (stage) {
      const cv = document.createElement('canvas'); cv.className = 'stage-fx'; cv.setAttribute('aria-hidden', 'true'); stage.appendChild(cv);
      const g = cv.getContext('2d'); let W = 0, H = 0, vis = true, ps = [];
      const size = () => { W = cv.width = stage.clientWidth; H = cv.height = stage.clientHeight; };
      const mk = (init) => ({ x: Math.random() * W, y: init ? Math.random() * H : H + 10, r: 1 + Math.random() * 2.4, vy: .15 + Math.random() * .5, vx: (Math.random() - .5) * .25, ph: Math.random() * 6.28, c: Math.random() < .4 ? '241,181,47' : '255,255,255' });
      size(); ps = Array.from({ length: innerWidth < 700 ? 22 : 46 }, () => mk(true)); addEventListener('resize', size);
      new IntersectionObserver((e) => { vis = e[0].isIntersecting; }).observe(stage);
      let t = 0; (function loop() {
        requestAnimationFrame(loop); if (!vis || document.hidden) return; t += .03; g.clearRect(0, 0, W, H);
        ps.forEach((p, i) => { p.y -= p.vy; p.x += p.vx + Math.sin(t + p.ph) * .2; if (p.y < -10) ps[i] = mk(false);
          const a = .25 + .55 * Math.abs(Math.sin(t * 1.4 + p.ph)); g.fillStyle = 'rgba(' + p.c + ',' + (a * .22).toFixed(2) + ')'; g.beginPath(); g.arc(p.x, p.y, p.r * 3, 0, 6.283); g.fill(); g.fillStyle = 'rgba(' + p.c + ',' + a.toFixed(2) + ')'; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill(); });
      })();
      if (fine) stage.addEventListener('pointermove', (e) => { const r = stage.getBoundingClientRect(); stage.style.setProperty('--mx', ((e.clientX - r.left) / r.width - .5).toFixed(3)); stage.style.setProperty('--my', ((e.clientY - r.top) / r.height - .5).toFixed(3)); }, { passive: true });
      if (fine) stage.addEventListener('pointerleave', () => { stage.style.setProperty('--mx', 0); stage.style.setProperty('--my', 0); });

    }

    // Senter kursor di bagian gelap
    if (fine) document.querySelectorAll('.about, .site-footer').forEach(el => el.addEventListener('pointermove', (e) => { const r = el.getBoundingClientRect(); el.style.setProperty('--cx', (e.clientX - r.left) + 'px'); el.style.setProperty('--cy', (e.clientY - r.top) + 'px'); }, { passive: true }));

    // Jejak kilau mengikuti kursor + tombol magnet
    if (fine) {
      let lx = 0, ly = 0;
      document.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        if (Math.hypot(e.clientX - lx, e.clientY - ly) > 26) {
          lx = e.clientX; ly = e.clientY; const s = document.createElement('i'); s.className = 'spark'; s.style.left = lx + 'px'; s.style.top = ly + 'px';
          s.style.setProperty('--dx', ((Math.random() - .5) * 30).toFixed(0) + 'px'); s.style.setProperty('--dy', (14 + Math.random() * 22).toFixed(0) + 'px');
          document.body.appendChild(s); setTimeout(() => s.remove(), 800);
        }
        const b = e.target.closest && e.target.closest('.borrow-button, .read-link');
        document.querySelectorAll('.mag').forEach(x => { if (x !== b) { x.classList.remove('mag'); x.style.translate = ''; } });
        if (b) { const r = b.getBoundingClientRect(); b.classList.add('mag'); b.style.translate = ((e.clientX - r.left - r.width / 2) * .22).toFixed(1) + 'px ' + ((e.clientY - r.top - r.height / 2) * .32).toFixed(1) + 'px'; }
      }, { passive: true });
    }

    // Letupan hati kecil saat favorit
    document.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('.fav-btn'); if (!b) return; const r = b.getBoundingClientRect();
      for (let i = 0; i < 7; i++) { const h = document.createElement('i'); h.className = 'heart-bit'; h.textContent = '\u2665'; h.style.left = (r.left + r.width / 2) + 'px'; h.style.top = (r.top + r.height / 2) + 'px';
        const a = (i / 7) * 6.283 + Math.random(); h.style.setProperty('--dx', (Math.cos(a) * 38) + 'px'); h.style.setProperty('--dy', (Math.sin(a) * 38 - 12) + 'px'); h.style.setProperty('--r', ((Math.random() - .5) * 90) + 'deg');
        document.body.appendChild(h); setTimeout(() => h.remove(), 850); }
    });
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();

/* LibraXion - efek lagi (Poin 20) */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const start = () => {
    // Judul hero huruf demi huruf (berlaku juga untuk slide yang dibuat belakangan)
    const split = (h) => { if (h.dataset.split) return; h.dataset.split = '1'; const t = h.textContent; h.setAttribute('aria-label', t); h.textContent = '';
      [...t].forEach((c, i) => { const s = document.createElement('span'); s.className = 'ch'; s.setAttribute('aria-hidden', 'true'); s.style.setProperty('--ci', i); s.textContent = c; h.appendChild(s); }); };
    const stage = document.querySelector('.stage');
    if (stage) { const run = () => stage.querySelectorAll('.slide h2').forEach(split); run(); new MutationObserver(run).observe(stage, { childList: true, subtree: true }); }

    // Hiasan melayang di koleksi + paralaks gulir
    const col = document.querySelector('.section.collection');
    if (col) {
      const box = document.createElement('div'); box.className = 'float-deco'; box.setAttribute('aria-hidden', 'true');
      const kinds = ['ring', 'dot', 'plus', 'tri'], cols = ['#e3a21a', '#1b6ca8', '#7653b5', '#d9791c', '#1f8a70'];
      for (let i = 0; i < 14; i++) { const d = document.createElement('i'); d.className = 'fd ' + kinds[i % 4]; const s = 14 + Math.random() * 22;
        d.style.cssText = '--x:' + (Math.random() * 96).toFixed(1) + '%;--y:' + (Math.random() * 96).toFixed(1) + '%;--s:' + s.toFixed(0) + 'px;--c:' + cols[i % 5] + ';--t:' + (9 + Math.random() * 9).toFixed(1) + 's;--k:' + (.05 + Math.random() * .2).toFixed(2);
        d.style.animationDelay = (-Math.random() * 10).toFixed(1) + 's'; box.appendChild(d); }
      col.prepend(box); let tick = false;
      addEventListener('scroll', () => { if (tick) return; tick = true; requestAnimationFrame(() => { col.style.setProperty('--sy', (scrollY - col.offsetTop).toFixed(0)); tick = false; }); }, { passive: true });
    }

    // Cincin muncul di titik klik/sentuh
    document.addEventListener('pointerdown', (e) => { const r = document.createElement('i'); r.className = 'click-ring'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'; document.body.appendChild(r); setTimeout(() => r.remove(), 650); }, { passive: true });

    // Ikon tema berputar saat diganti
    document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('.icon-btn'); if (b && !b.querySelector('.bell-badge') && /[\u263E\u2600]/.test(b.textContent)) { b.classList.remove('spin'); void b.offsetWidth; b.classList.add('spin'); setTimeout(() => b.classList.remove('spin'), 650); } });
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
})();


/* LibraXion - Poin 28: animasi tombol Pinjam (ripple, sukses, sampul terbang ke lonceng) */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  var COLORS = ['#e3a21a', '#2f8f5b', '#ff8a5c', '#7fd1b9', '#f3d98a'];
  function burst(x, y, n) {
    for (var i = 0; i < n; i++) {
      var s = document.createElement('i'), a = Math.random() * Math.PI * 2, d = 26 + Math.random() * 38;
      s.className = 'pj-bit'; s.style.left = x + 'px'; s.style.top = y + 'px';
      s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px');
      s.style.setProperty('--r', (Math.random() * 360 - 180) + 'deg'); s.style.setProperty('--c', COLORS[i % COLORS.length]);
      document.body.appendChild(s); setTimeout(function (el) { el.remove(); }.bind(null, s), 800);
    }
  }
  function fly(img) {
    var bell = document.querySelector('.icon-btn .bell-badge'); bell = bell && bell.closest('.icon-btn');
    var r = img.getBoundingClientRect(); if (!r.width) return;
    var f = img.cloneNode(); f.className = 'pj-pop-img pj-fly'; f.removeAttribute('id');
    f.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
    document.body.appendChild(f);
    var t = bell ? bell.getBoundingClientRect() : { left: innerWidth - 60, top: 20, width: 40, height: 40 };
    var dx = t.left + t.width / 2 - (r.left + r.width / 2), dy = t.top + t.height / 2 - (r.top + r.height / 2);
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      f.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(.12) rotate(18deg)'; f.style.opacity = '.2';
    }); });
    setTimeout(function () {
      f.remove(); if (!bell) return; var c = bell.getBoundingClientRect();
      burst(c.left + c.width / 2, c.top + c.height / 2, 8);
      bell.classList.remove('pj-catch'); void bell.offsetWidth; bell.classList.add('pj-catch');
    }, 820);
  }
  // Ripple pada tombol Pinjam di kartu (tombol lain sudah ditangani blok ripple lama)
  document.addEventListener('pointerdown', function (e) {
    var b = e.target.closest && e.target.closest('.pinjam-btn'); if (!b) return;
    var r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2, w = document.createElement('span');
    w.className = 'rip-wave'; w.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px';
    b.appendChild(w); setTimeout(function () { w.remove(); }, 650);
  });
  // Deteksi pinjaman berhasil: tombol kartu berubah dari Pinjam/Ambil menjadi "Lihat pinjaman"
  function watch() {
    var list = document.querySelectorAll('.pinjam-btn'); if (!list.length) return;
    var mo = new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        var b = m.target, old = m.oldValue;
        if (b.dataset.mode === 'view' && (old === 'borrow' || old === 'claim') && /pinjaman/i.test(b.textContent)) {
          var card = b.closest('.book-card'), img = card && card.querySelector('img'), st = card && card.querySelector('.loan-status');
          b.classList.remove('pj-pop'); void b.offsetWidth; b.classList.add('pj-pop');
          var r = b.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 14);
          if (st) { st.classList.remove('pj-flash'); void st.offsetWidth; st.classList.add('pj-flash'); }
          if (img) fly(img);
        }
      });
    });
    list.forEach(function (b) { mo.observe(b, { attributes: true, attributeFilter: ['data-mode'], attributeOldValue: true }); });
  }
  // Tombol dibuat oleh skrip beranda setelah DOMContentLoaded, jadi pasang pengamat agak lambat
  window.addEventListener('load', function () { setTimeout(watch, 50); });
})();


/* LibraXion - Poin 37: tombol lihat/sembunyikan password di semua kolom password */
(function () {
  'use strict';
  var EYE = '<svg class="pw-on" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>' +
    '<svg class="pw-off" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.9 17.9A10.6 10.6 0 0112 19C5.6 19 2 12 2 12a18.5 18.5 0 015.1-5.9M9.9 5.2A9.8 9.8 0 0112 5c6.4 0 10 7 10 7a18.6 18.6 0 01-2.2 3.2M14.1 14.1a3 3 0 11-4.2-4.2"/><path d="M2 2l20 20"/></svg>';
  function add(inp) {
    if (inp.dataset.pw) return; inp.dataset.pw = '1';
    var wrap = document.createElement('span'); wrap.className = 'pw-wrap';
    inp.parentNode.insertBefore(wrap, inp); wrap.appendChild(inp);
    var b = document.createElement('button'); b.type = 'button'; b.className = 'pw-toggle'; b.innerHTML = EYE;
    function label(show) { b.setAttribute('aria-pressed', show ? 'true' : 'false'); b.setAttribute('aria-label', show ? 'Sembunyikan password' : 'Tampilkan password'); b.title = b.getAttribute('aria-label'); }
    label(false); wrap.appendChild(b);
    b.addEventListener('mousedown', function (e) { e.preventDefault(); });
    b.addEventListener('click', function () {
      var show = inp.type === 'password', s = inp.selectionStart, e = inp.selectionEnd;
      inp.type = show ? 'text' : 'password'; label(show); inp.focus();
      try { inp.setSelectionRange(s, e); } catch (x) {}
    });
    var form = inp.form; if (form) form.addEventListener('submit', function () { if (inp.type === 'text') { inp.type = 'password'; label(false); } });
  }
  function scan() { document.querySelectorAll('input[type="password"]').forEach(add); }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', scan) : scan();
  window.addEventListener('load', scan);
})();
