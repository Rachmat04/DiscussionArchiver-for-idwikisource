/**
 * [DISCUSSIONARCHIVER.JS — GADGET PENGARSIP DISKUSI — WIKISUMBER]
 *
 * •==============================================•
 * > Tipe: JavaScript (MediaWiki Gadget)
 * > Target: Ruang nama Wikisumber: (Wikisumber:)
 * > Fungsi: Mengarsipkan utas diskusi yang komentar
 *           terakhirnya sudah >= 2 bulan dari sekarang
 * > Hak: Hanya sysop
 * •==============================================•
 */
// <nowiki>
(function () {
  const cfg = mw.config.get();
  const api = new mw.Api();
  const page = cfg.wgPageName;
  const groups = cfg.wgUserGroups || [];
  const isSysop = groups.includes('sysop');

  // Hanya aktif untuk sysop
  if (!isSysop) return;

  // Hanya aktif di ruang nama Wikisumber: (namespace 4)
  if (cfg.wgNamespaceNumber !== 4) return;

  // Jangan jalankan di halaman diff, history, atau arsip
  if (
    cfg.wgAction === 'history' ||
    cfg.wgDiffNewId ||
    cfg.wgDiffOldId ||
    cfg.wgCurRevisionId !== cfg.wgRevisionId
  ) return;

  const excludedPatterns = ['/Arsip/', '/Arsip'];
  if (excludedPatterns.some(p => page.includes(p))) return;

  // ── CSS ───────────────────────────────────────────────────────────────
  //
  // Strategi dark mode yang benar untuk Vector 2022 & Minerva:
  //   1. Default (light): variabel --da-* didefinisikan di .da-dialog
  //   2. Night mode paksa : html.skin-theme-clientpref-night .da-dialog
  //   3. Night mode otomatis (ikut OS): @media (prefers-color-scheme:dark)
  //                                     html.skin-theme-clientpref-os .da-dialog
  //
  // Token Codex yang benar (MediaWiki 1.42+):
  //   --background-color-base       → latar konten utama
  //   --background-color-neutral    → latar header/footer/box
  //   --background-color-neutral-subtle → latar hover ringan
  //   --color-base                  → teks utama
  //   --color-subtle                → teks sekunder
  //   --color-placeholder           → teks muted/placeholder
  //   --color-progressive           → biru aksi utama (#36c)
  //   --color-progressive--hover    → biru hover
  //   --color-destructive           → merah (#b32424)
  //   --border-color-base           → border standar
  //   --border-color-subtle         → border ringan

  mw.util.addCSS(`
    /* ── Variabel lokal: light mode (default) ── */
    .da-dialog {
      --da-bg:        #ffffff;
      --da-bg-sub:    #f8f9fa;
      --da-bg-hover:  #eaecf0;
      --da-border:    #a2a9b1;
      --da-border-s:  #eaecf0;
      --da-text:      #202122;
      --da-text-s:    #54595d;
      --da-text-m:    #72777d;
      --da-link:      #3366cc;
      --da-prog:      #3366cc;
      --da-prog-h:    #2a4b8d;
      --da-dest:      #b32424;
      --da-badge-bg:  #fee7e6;
      --da-badge-c:   #b32424;
    }

    /* ── Night mode paksa (Vector 2022 / Minerva) ── */
    html.skin-theme-clientpref-night .da-dialog {
      --da-bg:        #101418;
      --da-bg-sub:    #1e2328;
      --da-bg-hover:  #2a3038;
      --da-border:    #54595d;
      --da-border-s:  #2e3136;
      --da-text:      #eaecf0;
      --da-text-s:    #a2a9b1;
      --da-text-m:    #72777d;
      --da-link:      #6699ff;
      --da-prog:      #6699ff;
      --da-prog-h:    #4477ee;
      --da-dest:      #ff8080;
      --da-badge-bg:  #3a1010;
      --da-badge-c:   #ff8080;
    }

    /* ── Night mode otomatis (ikut OS, skin-theme-clientpref-os) ── */
    @media screen and (prefers-color-scheme: dark) {
      html.skin-theme-clientpref-os .da-dialog {
        --da-bg:        #101418;
        --da-bg-sub:    #1e2328;
        --da-bg-hover:  #2a3038;
        --da-border:    #54595d;
        --da-border-s:  #2e3136;
        --da-text:      #eaecf0;
        --da-text-s:    #a2a9b1;
        --da-text-m:    #72777d;
        --da-link:      #6699ff;
        --da-prog:      #6699ff;
        --da-prog-h:    #4477ee;
        --da-dest:      #ff8080;
        --da-badge-bg:  #3a1010;
        --da-badge-c:   #ff8080;
      }
    }

    /* ── Overlay ── */
    .da-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.55);
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      animation: da-fadein .15s ease-out;
    }

    /* ── Dialog shell ── */
    .da-dialog {
      background: var(--da-bg);
      color: var(--da-text);
      border: 1px solid var(--da-border);
      border-radius: 2px;
      width: min(680px, 96%);
      max-height: 88vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0,0,0,0.40);
      font-family: var(--font-family-base, system-ui, -apple-system, sans-serif);
      font-size: 0.9375em;
      animation: da-slidein .15s ease-out;
    }

    /* ── Header ── */
    .da-dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 12px 20px;
      border-bottom: 1px solid var(--da-border-s);
      background: var(--da-bg-sub);
      font-weight: 700;
      font-size: 1em;
      flex-shrink: 0;
    }
    .da-dialog-header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--da-text);
    }
    .da-dialog-close {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--da-text-s);
      font-size: 1.2em;
      line-height: 1;
      padding: 2px 5px;
      border-radius: 2px;
      transition: background 0.1s, color 0.1s;
    }
    .da-dialog-close:hover {
      background: var(--da-bg-hover);
      color: var(--da-text);
    }

    /* ── Body ── */
    .da-dialog-body {
      padding: 16px 20px;
      overflow-y: auto;
      flex: 1;
      color: var(--da-text);
      line-height: 1.6;
    }

    /* ── Footer ── */
    .da-dialog-footer {
      padding: 12px 20px;
      border-top: 1px solid var(--da-border-s);
      background: var(--da-bg-sub);
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      flex-shrink: 0;
    }

    /* ── Tombol ── */
    .da-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 2px;
      font-size: 0.875em;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      border: 1px solid transparent;
      transition: background 0.1s, border-color 0.1s, color 0.1s;
      white-space: nowrap;
    }
    .da-btn:focus-visible {
      outline: 2px solid var(--da-prog);
      outline-offset: 2px;
    }
    .da-btn-normal {
      background: var(--da-bg);
      color: var(--da-text);
      border-color: var(--da-border);
    }
    .da-btn-normal:hover {
      background: var(--da-bg-hover);
      border-color: var(--da-text-s);
    }
    .da-btn-progressive {
      background: var(--da-prog);
      color: #fff;
      border-color: var(--da-prog);
    }
    .da-btn-progressive:hover {
      background: var(--da-prog-h);
      border-color: var(--da-prog-h);
    }
    .da-btn-destructive {
      background: var(--da-bg);
      color: var(--da-dest);
      border-color: var(--da-dest);
    }
    .da-btn-destructive:hover {
      background: var(--da-dest);
      color: #fff;
    }

    /* ── Daftar utas ── */
    .da-thread-list {
      list-style: none;
      margin: 12px 0;
      padding: 0;
      max-height: 320px;
      overflow-y: auto;
      border: 1px solid var(--da-border-s);
      border-radius: 2px;
    }
    .da-thread-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 14px;
      border-bottom: 1px solid var(--da-border-s);
      transition: background 0.1s;
    }
    .da-thread-item:last-child { border-bottom: none; }
    .da-thread-item:hover { background: var(--da-bg-hover); }
    .da-thread-title {
      font-weight: 700;
      font-size: 0.93em;
      color: var(--da-text);
    }
    .da-thread-meta {
      font-size: 0.82em;
      color: var(--da-text-s);
      margin-top: 3px;
    }

    /* ── Badge ── */
    .da-badge {
      display: inline-flex;
      align-items: center;
      background: var(--da-badge-bg);
      color: var(--da-badge-c);
      border-radius: 2px;
      padding: 1px 6px;
      font-size: 0.76em;
      font-weight: 700;
      margin-left: 6px;
      vertical-align: middle;
    }

    /* ── Kotak konfirmasi ── */
    .da-confirm-box {
      background: var(--da-bg-sub);
      border: 1px solid var(--da-border-s);
      border-left: 3px solid var(--da-prog);
      border-radius: 2px;
      padding: 12px 16px;
      margin-bottom: 12px;
    }
    .da-confirm-box strong {
      display: block;
      margin-bottom: 4px;
      color: var(--da-text);
    }
    .da-confirm-meta {
      font-size: 0.85em;
      color: var(--da-text-s);
      margin: 4px 0 8px;
    }
    .da-archive-target {
      font-size: 0.86em;
      color: var(--da-link);
      word-break: break-all;
    }

    /* ── Progress & kosong ── */
    .da-progress {
      font-size: 0.92em;
      color: var(--da-text-s);
      margin-top: 8px;
      min-height: 1.5em;
      line-height: 1.6;
    }
    .da-empty {
      text-align: center;
      padding: 32px 0;
      color: var(--da-text-m);
      font-size: 0.93em;
    }
    .da-empty-icon {
      font-size: 2em;
      display: block;
      margin-bottom: 8px;
    }
    .da-hint {
      font-size: 0.84em;
      color: var(--da-text-s);
      margin: 8px 0 0;
    }
    .da-archive-label {
      font-size: 0.86em;
      color: var(--da-link);
      word-break: break-all;
    }

    /* ── Animasi ── */
    @keyframes da-fadein {
      from { opacity: 0; } to { opacity: 1; }
    }
    @keyframes da-slidein {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Tombol mengambang ── */
    #da-float-btn {
      position: fixed;
      bottom: 130px;
      right: 25px;
      background: #3366cc;
      color: #fff;
      border: none;
      padding: 8px 14px;
      border-radius: 2px;
      cursor: pointer;
      z-index: 99999;
      font-weight: 700;
      font-size: 0.875em;
      font-family: inherit;
      box-shadow: 0 2px 8px rgba(0,0,0,0.22);
      transition: background 0.15s, box-shadow 0.15s;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    #da-float-btn:hover {
      background: #2a4b8d;
      box-shadow: 0 4px 12px rgba(0,0,0,0.30);
    }
    #da-float-btn:active {
      background: #2a4b8d;
    }
  `);

  // ── Utilitas ──────────────────────────────────────────────────────────

  const BULAN_ID = {
    'Januari': 0, 'Februari': 1, 'Maret': 2, 'April': 3,
    'Mei': 4, 'Juni': 5, 'Juli': 6, 'Agustus': 7,
    'September': 8, 'Oktober': 9, 'November': 10, 'Desember': 11
  };

  /**
   * Mengambil timestamp terbaru dari sebuah blok teks wikitext.
   * Format yang dideteksi: "12 Januari 2024 12.34 (UTC)"
   * @param {string} text
   * @returns {Date|null}
   */
  function getLatestTimestamp(text) {
    // Pola tanda tangan Wikisumber Indonesia:
    // "12 Januari 2024 12.34 (UTC)" atau "12 Januari 2024 pukul 12.34 (UTC)"
    const pattern = /(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})\s+(?:pukul\s+)?(\d{1,2})[.:](\d{2})\s+\(UTC\)/g;
    let latest = null;
    let m;
    while ((m = pattern.exec(text)) !== null) {
      const d = new Date(Date.UTC(
        parseInt(m[3]),
        BULAN_ID[m[2]],
        parseInt(m[1]),
        parseInt(m[4]),
        parseInt(m[5])
      ));
      if (!latest || d > latest) latest = d;
    }
    return latest;
  }

  /**
   * Format tanggal ke string Indonesia yang ramah baca.
   * @param {Date} d
   * @returns {string}
   */
  function formatTanggal(d) {
    const bulanNama = Object.keys(BULAN_ID);
    return `${d.getUTCDate()} ${bulanNama[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }

  /**
   * Hitung selisih bulan antara dua tanggal.
   * @param {Date} dari
   * @param {Date} ke
   * @returns {number}
   */
  function selisihBulan(dari, ke) {
    return (ke.getFullYear() - dari.getFullYear()) * 12
      + (ke.getMonth() - dari.getMonth());
  }

  function notify(msg, type = 'info') {
    mw.notify ? mw.notify(msg, { type }) : console.log('[DiscussionArchiver:Wikisumber]', msg);
  }

  // ── Dialog ────────────────────────────────────────────────────────────

  function createDialog(titleHtml, bodyHtml) {
    const overlay = document.createElement('div');
    overlay.className = 'da-overlay';
    const dialog = document.createElement('div');
    dialog.className = 'da-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.innerHTML = `
      <div class="da-dialog-header">
        <div class="da-dialog-header-title">${titleHtml}</div>
        <button class="da-dialog-close" aria-label="Tutup">✕</button>
      </div>
      <div class="da-dialog-body">${bodyHtml}</div>
      <div class="da-dialog-footer"></div>
    `;
    overlay.appendChild(dialog);
    dialog.querySelector('.da-dialog-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    return {
      overlay,
      dialog,
      body: dialog.querySelector('.da-dialog-body'),
      footer: dialog.querySelector('.da-dialog-footer')
    };
  }

  function addBtn(footer, label, type, onClick) {
    const typeClass = {
      'mw-ui-progressive': 'da-btn-progressive',
      'mw-ui-destructive':  'da-btn-destructive',
      'mw-ui-quiet':        'da-btn-normal'
    }[type] || 'da-btn-normal';
    const btn = document.createElement('button');
    btn.className = 'da-btn ' + typeClass;
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    footer.appendChild(btn);
    return btn;
  }

  // ── Logika utama ──────────────────────────────────────────────────────

  /**
   * Parsing wikitext menjadi array utas level-2.
   * @param {string} wikitext
   * @returns {Array<{title:string, content:string, start:number, end:number}>}
   */
  function parseThreads(wikitext) {
    const headerRe = /^==\s*([^=\n][^\n]*?)\s*==\s*$/gm;
    const positions = [];
    let m;
    while ((m = headerRe.exec(wikitext)) !== null) {
      positions.push({ title: m[1].trim(), start: m.index });
    }
    positions.push({ title: null, start: wikitext.length });

    const threads = [];
    for (let i = 0; i < positions.length - 1; i++) {
      const start = positions[i].start;
      const end = positions[i + 1].start;
      threads.push({
        title: positions[i].title,
        content: wikitext.substring(start, end),
        start,
        end
      });
    }
    return threads;
  }

  /**
   * Menjalankan dialog konfirmasi per utas, satu per satu.
   * Mengembalikan Promise yang resolve ke array utas yang disetujui.
   */
  function confirmPerThread(threads) {
    return new Promise(resolve => {
      const approved = [];
      let idx = 0;
      const sourceTitle = page.replace(/_/g, ' ');

      function showNext() {
        if (idx >= threads.length) {
          resolve(approved);
          return;
        }

        const t = threads[idx];
        const ts = getLatestTimestamp(t.content);
        const usia = ts ? selisihBulan(ts, new Date()) : '?';
        const tsTxt = ts ? formatTanggal(ts) : 'Tidak terdeteksi';
        const year = ts ? ts.getUTCFullYear() : new Date().getFullYear();
        const archiveTitle = `${sourceTitle}/Arsip ${year}`;

        const { overlay, footer } = createDialog(
          `Konfirmasi Arsip Utas (${idx + 1}/${threads.length})`,
          `<div class="da-confirm-box">
            <strong>📄 ${mw.html.escape(t.title)}</strong>
            <div class="da-confirm-meta">
              Komentar terakhir: <b>${tsTxt}</b>
              <span class="da-badge">~${usia} bulan lalu</span>
            </div>
            <div class="da-archive-target">→ Akan diarsipkan ke: <b>${mw.html.escape(archiveTitle)}</b></div>
          </div>
          <p class="da-hint">
            Lewati untuk melewati utas ini tanpa mengarsipkan.
          </p>`
        );

        addBtn(footer, 'Lewati', 'mw-ui-quiet', () => {
          overlay.remove();
          idx++;
          showNext();
        });
        addBtn(footer, 'Arsipkan', 'mw-ui-progressive', () => {
          approved.push(t);
          overlay.remove();
          idx++;
          showNext();
        });
      }

      showNext();
    });
  }

  /**
   * Proses pengarsipan: hapus utas dari halaman asal,
   * kelompokkan per tahun timestamp, lalu tambahkan ke halaman arsip masing-masing.
   * @param {Array} threadsToArchive
   * @returns {Object} { archivedCount, archiveTitles }
   */
  async function doArchive(threadsToArchive) {
    // Ambil ulang wikitext terbaru (hindari konflik edit)
    const res = await api.get({
      action: 'query',
      prop: 'revisions',
      rvprop: ['content', 'timestamp'],
      titles: page,
      formatversion: 2
    });
    const pageData = res.query.pages[0];
    let text = pageData.revisions[0].content;
    const baseTimestamp = pageData.revisions[0].timestamp;

    // Hapus setiap utas dari teks asal
    for (const t of threadsToArchive) {
      const escaped = t.content.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(new RegExp(escaped), '');
    }
    text = text.replace(/\n{3,}/g, '\n\n').trim();

    // Kelompokkan utas berdasarkan tahun timestamp terakhirnya
    const byYear = {};
    for (const t of threadsToArchive) {
      const ts = getLatestTimestamp(t.content);
      const year = ts ? ts.getUTCFullYear() : new Date().getFullYear();
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(t);
    }

    const sourceTitle = page.replace(/_/g, ' ');
    const archiveTitles = [];

    // Simpan ke halaman arsip per tahun
    for (const year of Object.keys(byYear).sort()) {
      const threads = byYear[year];
      const archiveTitle = `${sourceTitle}/Arsip ${year}`;
      archiveTitles.push(archiveTitle);

      const arsRes = await api.get({
        action: 'query',
        prop: 'revisions',
        rvprop: 'content',
        titles: archiveTitle,
        formatversion: 2
      });
      const arsPage = arsRes.query.pages[0];
      let arsText = (arsPage.revisions && arsPage.revisions[0].content) || '';

      if (!arsPage.revisions) {
        arsText = `{{Arsip|${sourceTitle}}}\n__ARCHIVEDTALK__\n__NOINDEX__\n`;
      }

      const newBlocks = threads.map(t => t.content.trim()).join('\n\n');
      arsText = `${arsText.trim()}\n\n${newBlocks}\n`;

      await api.postWithToken('csrf', {
        action: 'edit',
        title: archiveTitle,
        text: arsText.trim(),
        summary: `Menambahkan ${threads.length} utas dari [[${sourceTitle}]]`
      });
    }

    // Simpan halaman asal (sekali saja, setelah semua arsip selesai)
    const archiveList = archiveTitles.map(t => `[[${t}]]`).join(', ');
    await api.postWithToken('csrf', {
      action: 'edit',
      title: page,
      text,
      summary: `Mengarsipkan ${threadsToArchive.length} utas tidak aktif ke ${archiveList}`,
      basetimestamp: baseTimestamp
    });

    return { archivedCount: threadsToArchive.length, archiveTitles };
  }

  // ── Alur utama ────────────────────────────────────────────────────────

  async function runArchiver() {
    // 1. Ambil wikitext halaman
    let data;
    try {
      data = await api.get({
        action: 'query',
        prop: 'revisions',
        rvprop: 'content',
        titles: page,
        formatversion: 2
      });
    } catch (e) {
      notify('⚠️ Gagal memuat isi halaman.', 'error');
      return;
    }

    const wikitext = (data.query.pages[0] && data.query.pages[0].revisions && data.query.pages[0].revisions[0] && data.query.pages[0].revisions[0].content) || '';
    if (!wikitext) {
      notify('⚠️ Halaman kosong atau gagal dimuat.', 'warn');
      return;
    }

    // 2. Parse utas level-2
    const allThreads = parseThreads(wikitext);
    if (!allThreads.length) {
      notify('ℹ️ Tidak ditemukan utas level-2 di halaman ini.', 'info');
      return;
    }

    // 3. Filter utas yang komentar terakhirnya >= 2 bulan
    const now = new Date();
    const staleThreads = allThreads.filter(t => {
      const ts = getLatestTimestamp(t.content);
      if (!ts) return false;
      return selisihBulan(ts, now) >= 2;
    });

    if (!staleThreads.length) {
      // Dialog: tidak ada yang perlu diarsipkan
      const { overlay, footer } = createDialog(
        'Pengarsip Diskusi — Tidak Ada Utas Kedaluwarsa',
        `<div class="da-empty">
          <span class="da-empty-icon">✅</span>
          Semua utas masih aktif (komentar terakhir &lt; 2 bulan).<br>
          Tidak ada yang perlu diarsipkan saat ini.
        </div>`
      );
      addBtn(footer, 'Tutup', 'mw-ui-quiet', () => overlay.remove());
      return;
    }

    // 4. Tentukan arsip tujuan per utas (berdasarkan tahun timestamp)
    const sourceTitle = page.replace(/_/g, ' ');
    const getArchiveTitle = t => {
      const ts = getLatestTimestamp(t.content);
      const year = ts ? ts.getUTCFullYear() : now.getFullYear();
      return `${sourceTitle}/Arsip ${year}`;
    };

    // 5. Tampilkan ringkasan dulu sebelum konfirmasi per utas
    await new Promise(resolve => {
      const listItems = staleThreads.map(t => {
        const ts = getLatestTimestamp(t.content);
        const usia = ts ? selisihBulan(ts, now) : '?';
        const tsTxt = ts ? formatTanggal(ts) : '—';
        const archiveTitle = getArchiveTitle(t);
        return `<li class="da-thread-item" style="cursor:default">
          <div>
            <div class="da-thread-title">${mw.html.escape(t.title)}</div>
            <div class="da-thread-meta">
              Komentar terakhir: ${tsTxt} <span class="da-badge">~${usia} bln</span><br>
              <span style="color:var(--da-link)">→ ${mw.html.escape(archiveTitle)}</span>
            </div>
          </div>
        </li>`;
      }).join('');

      const { overlay, footer } = createDialog(
        `Pengarsip Diskusi — ${staleThreads.length} Utas Tidak Aktif`,
        `<p style="margin:0 0 8px;font-size:0.93em;color:var(--da-text,#202122)">
          Utas berikut memiliki komentar terakhir <b>≥ 2 bulan</b> yang lalu.
          Klik <b>Lanjut</b> untuk mengkonfirmasi setiap utas satu per satu.
        </p>
        <ul class="da-thread-list">${listItems}</ul>`
      );

      addBtn(footer, 'Batal', 'mw-ui-destructive', () => { overlay.remove(); resolve('cancel'); });
      addBtn(footer, 'Lanjut →', 'mw-ui-progressive', () => { overlay.remove(); resolve('ok'); });
    }).then(async result => {
      if (result === 'cancel') return;

      // 6. Konfirmasi per utas
      const approved = await confirmPerThread(staleThreads);

      if (!approved.length) {
        notify('ℹ️ Tidak ada utas yang dipilih untuk diarsipkan.', 'info');
        return;
      }

      // 7. Dialog progres + eksekusi
      const { overlay, footer } = createDialog(
        `Mengarsipkan ${approved.length} Utas…`,
        `<div class="da-progress" id="da-prog-msg">⏳ Memproses…</div>`
      );

      const progMsg = document.getElementById('da-prog-msg');

      try {
        progMsg.textContent = '⏳ Menyimpan ke halaman arsip…';
        const { archivedCount, archiveTitles } = await doArchive(approved);
        const links = archiveTitles.map(t =>
          `<a href="/wiki/${encodeURIComponent(t.replace(/ /g, '_'))}" target="_blank">${mw.html.escape(t)}</a>`
        ).join(', ');
        progMsg.innerHTML = `✅ <b>${archivedCount} utas</b> berhasil diarsipkan ke: ${links}.`;
        addBtn(footer, 'Tutup & Muat Ulang', 'mw-ui-progressive', () => {
          overlay.remove();
          location.reload();
        });
      } catch (e) {
        console.error('[DiscussionArchiver:Wikisumber] Error:', e);
        progMsg.textContent = '❌ Gagal mengarsipkan. Lihat konsol untuk detail.';
        addBtn(footer, 'Tutup', 'mw-ui-destructive', () => overlay.remove());
      }
    });
  }

  // ── Tombol mengambang ─────────────────────────────────────────────────

  const floatBtn = document.createElement('button');
  floatBtn.id = 'da-float-btn';
  floatBtn.textContent = '📦 Arsipkan Diskusi';
  floatBtn.title = 'DiscussionArchiver.js (Wikisumber) — Arsipkan utas tidak aktif (≥ 2 bulan)';
  floatBtn.addEventListener('click', runArchiver);
  document.body.appendChild(floatBtn);

})();
// </nowiki>
