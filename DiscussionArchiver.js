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

  // ── CSS ──────────────────────────────────────────────────────────────
  mw.util.addCSS(`
    /* ── Variabel warna: light mode (default) ── */
    .da-overlay, .da-dialog, .da-dialog * {
      --da-bg:          #ffffff;
      --da-bg-subtle:   #f8f9fa;
      --da-bg-hover:    #f0f2f4;
      --da-border:      #a2a9b1;
      --da-border-subtle: #eaecf0;
      --da-text:        #202122;
      --da-text-subtle: #54595d;
      --da-text-muted:  #72777d;
      --da-link:        #3366cc;
      --da-badge-bg:    #fee7e6;
      --da-badge-text:  #b32424;
    }

    /* ── Variabel warna: dark mode ── */
    @media (prefers-color-scheme: dark) {
      .da-overlay, .da-dialog, .da-dialog * {
        --da-bg:          #1e1e1e;
        --da-bg-subtle:   #2a2a2a;
        --da-bg-hover:    #333333;
        --da-border:      #54595d;
        --da-border-subtle: #3a3a3a;
        --da-text:        #eaecf0;
        --da-text-subtle: #a2a9b1;
        --da-text-muted:  #72777d;
        --da-link:        #6699ff;
        --da-badge-bg:    #4a1a1a;
        --da-badge-text:  #ff8080;
      }
    }

    .da-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.50);
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      animation: da-fadein .15s ease-out;
    }
    .da-dialog {
      background: var(--da-bg);
      color: var(--da-text);
      border: 1px solid var(--da-border);
      border-radius: 8px;
      width: min(680px, 96%);
      max-height: 88vh;
      overflow: auto;
      box-shadow: 0 8px 24px rgba(0,0,0,0.40);
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
      animation: da-slidein .15s ease-out;
    }
    .da-dialog-header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--da-border-subtle);
      background: var(--da-bg-subtle);
      color: var(--da-text);
      font-weight: bold;
      font-size: 1.05em;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .da-dialog-body {
      padding: 14px 16px;
      font-size: 0.95em;
      color: var(--da-text);
    }
    .da-dialog-footer {
      padding: 10px 16px;
      border-top: 1px solid var(--da-border-subtle);
      background: var(--da-bg-subtle);
      text-align: right;
    }
    .da-dialog-footer button {
      margin-left: 6px;
    }
    .da-thread-list {
      list-style: none;
      margin: 10px 0;
      padding: 0;
      max-height: 340px;
      overflow-y: auto;
      border: 1px solid var(--da-border-subtle);
      border-radius: 4px;
    }
    .da-thread-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 9px 12px;
      border-bottom: 1px solid var(--da-border-subtle);
      cursor: pointer;
      transition: background .1s;
    }
    .da-thread-item:last-child { border-bottom: none; }
    .da-thread-item:hover { background: var(--da-bg-hover); }
    .da-thread-item input[type=checkbox] {
      margin-top: 3px;
      flex-shrink: 0;
      cursor: pointer;
    }
    .da-thread-title {
      font-weight: 600;
      font-size: 0.92em;
      color: var(--da-text);
    }
    .da-thread-meta {
      font-size: 0.82em;
      color: var(--da-text-muted);
      margin-top: 2px;
    }
    .da-badge {
      display: inline-block;
      background: var(--da-badge-bg);
      color: var(--da-badge-text);
      border-radius: 3px;
      padding: 1px 6px;
      font-size: 0.78em;
      font-weight: 700;
      margin-left: 6px;
      vertical-align: middle;
    }
    .da-confirm-box {
      background: var(--da-bg-subtle);
      border: 1px solid var(--da-border-subtle);
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 10px;
    }
    .da-confirm-box strong {
      display: block;
      margin-bottom: 4px;
      color: var(--da-text);
    }
    .da-confirm-meta {
      font-size: 0.85em;
      color: var(--da-text-subtle);
      margin: 4px 0 8px;
    }
    .da-archive-target {
      font-size: 0.88em;
      color: var(--da-link);
      word-break: break-all;
    }
    .da-progress {
      font-size: 0.9em;
      color: var(--da-text-subtle);
      margin-top: 8px;
      min-height: 1.4em;
    }
    .da-empty {
      text-align: center;
      padding: 28px 0;
      color: var(--da-text-muted);
      font-size: 0.93em;
    }
    .da-select-all-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 12px;
      background: var(--da-bg-subtle);
      border-bottom: 1px solid var(--da-border-subtle);
      font-size: 0.88em;
      color: var(--da-text-subtle);
    }
    @keyframes da-fadein {
      from { opacity: 0; } to { opacity: 1; }
    }
    @keyframes da-slidein {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    #da-float-btn {
      position: fixed;
      bottom: 130px;
      right: 25px;
      background: #36c;
      color: #fff;
      border: none;
      padding: 8px 13px;
      border-radius: 5px;
      cursor: pointer;
      z-index: 99999;
      font-weight: bold;
      font-size: 0.93em;
      box-shadow: 0 2px 8px rgba(0,0,0,0.22);
      transition: background .15s;
    }
    #da-float-btn:hover { background: #2a55a8; }
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
    dialog.innerHTML = `
      <div class="da-dialog-header">📦 ${titleHtml}</div>
      <div class="da-dialog-body">${bodyHtml}</div>
      <div class="da-dialog-footer"></div>
    `;
    overlay.appendChild(dialog);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    return {
      overlay,
      dialog,
      body: dialog.querySelector('.da-dialog-body'),
      footer: dialog.querySelector('.da-dialog-footer')
    };
  }

  function addBtn(footer, label, cls, onClick) {
    const btn = document.createElement('button');
    btn.className = `mw-ui-button ${cls}`;
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
  function confirmPerThread(threads, archiveTitle) {
    return new Promise(resolve => {
      const approved = [];
      let idx = 0;

      function showNext() {
        if (idx >= threads.length) {
          resolve(approved);
          return;
        }

        const t = threads[idx];
        const ts = getLatestTimestamp(t.content);
        const usia = ts ? selisihBulan(ts, new Date()) : '?';
        const tsTxt = ts ? formatTanggal(ts) : 'Tidak terdeteksi';

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
          <p style="font-size:0.92em;color:var(--da-text-subtle);margin:6px 0 0">
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
   * Proses pengarsipan: hapus utas dari halaman asal, tambahkan ke halaman arsip.
   */
  async function doArchive(threadsToArchive, archiveTitle) {
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

    // Hapus setiap utas dari teks asal (cocokkan berdasarkan konten)
    for (const t of threadsToArchive) {
      // Escape agar aman dipakai di regex
      const escaped = t.content.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(escaped);
      text = text.replace(re, '');
    }
    text = text.replace(/\n{3,}/g, '\n\n').trim();

    // Ambil atau buat halaman arsip
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
      // Buat header halaman arsip baru
      const sourceTitle = page.replace(/_/g, ' ');
      arsText = `{{Arsip|${sourceTitle}}}\n__ARCHIVEDTALK__\n__NOINDEX__\n`;
    }

    const newBlocks = threadsToArchive.map(t => t.content.trim()).join('\n\n');
    arsText = `${arsText.trim()}\n\n${newBlocks}\n`;

    // Simpan halaman asal
    await api.postWithToken('csrf', {
      action: 'edit',
      title: page,
      text,
      summary: `Mengarsipkan ${threadsToArchive.length} utas tidak aktif ke [[${archiveTitle}]]`,
      basetimestamp: baseTimestamp
    });

    // Simpan halaman arsip
    await api.postWithToken('csrf', {
      action: 'edit',
      title: archiveTitle,
      text: arsText.trim(),
      summary: `Menambahkan ${threadsToArchive.length} utas diarsipkan dari [[${page.replace(/_/g, ' ')}]]`
    });
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
          ✅ Semua utas masih aktif (komentar terakhir &lt; 2 bulan).<br>
          Tidak ada yang perlu diarsipkan saat ini.
        </div>`
      );
      addBtn(footer, 'Tutup', 'mw-ui-quiet', () => overlay.remove());
      return;
    }

    // 4. Tentukan judul halaman arsip berdasarkan tahun sekarang
    const year = now.getFullYear();
    const archiveTitle = `${page.replace(/_/g, ' ')}/Arsip ${year}`;

    // 5. Tampilkan ringkasan dulu sebelum konfirmasi per utas
    await new Promise(resolve => {
      const listItems = staleThreads.map(t => {
        const ts = getLatestTimestamp(t.content);
        const usia = ts ? selisihBulan(ts, now) : '?';
        const tsTxt = ts ? formatTanggal(ts) : '—';
        return `<li class="da-thread-item" style="cursor:default">
          <div>
            <div class="da-thread-title">${mw.html.escape(t.title)}</div>
            <div class="da-thread-meta">Komentar terakhir: ${tsTxt} <span class="da-badge">~${usia} bln</span></div>
          </div>
        </li>`;
      }).join('');

      const { overlay, footer } = createDialog(
        `Pengarsip Diskusi — ${staleThreads.length} Utas Tidak Aktif`,
        `<p style="margin:0 0 8px;font-size:0.93em">
          Utas berikut memiliki komentar terakhir <b>≥ 2 bulan</b> yang lalu.
          Klik <b>Lanjut</b> untuk mengkonfirmasi setiap utas satu per satu.
        </p>
        <ul class="da-thread-list">${listItems}</ul>
        <p style="font-size:0.85em;color:var(--da-text-subtle);margin:6px 0 0">
          → Arsip tujuan: <span class="da-archive-target">${mw.html.escape(archiveTitle)}</span>
        </p>`
      );

      addBtn(footer, 'Batal', 'mw-ui-destructive', () => { overlay.remove(); resolve('cancel'); });
      addBtn(footer, 'Lanjut →', 'mw-ui-progressive', () => { overlay.remove(); resolve('ok'); });
    }).then(async result => {
      if (result === 'cancel') return;

      // 6. Konfirmasi per utas
      const approved = await confirmPerThread(staleThreads, archiveTitle);

      if (!approved.length) {
        notify('ℹ️ Tidak ada utas yang dipilih untuk diarsipkan.', 'info');
        return;
      }

      // 7. Dialog progres + eksekusi
      const { overlay, body, footer } = createDialog(
        `Mengarsipkan ${approved.length} Utas…`,
        `<div class="da-progress" id="da-prog-msg">⏳ Memproses…</div>`
      );

      const progMsg = document.getElementById('da-prog-msg');

      try {
        progMsg.textContent = `⏳ Menyimpan perubahan ke ${page.replace(/_/g, ' ')} dan ${archiveTitle}…`;
        await doArchive(approved, archiveTitle);
        progMsg.innerHTML = `✅ <b>${approved.length} utas</b> berhasil diarsipkan ke <a href="/wiki/${encodeURIComponent(archiveTitle)}" target="_blank">${mw.html.escape(archiveTitle)}</a>.`;
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
