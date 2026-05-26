/**
 * [DISCUSSIONARCHIVER-CORE.JS — INTI GADGET PENGARSIP DISKUSI]
 *
 * •==============================================•
 * > Tipe  : JavaScript (MediaWiki Gadget — shared core)
 * > Versi : 2.0.0
 * > Fungsi: Logika bersama untuk mengarsipkan utas
 *           diskusi yang tidak aktif.
 *
 * Cara pakai:
 *   Muat file ini lebih dulu, lalu muat salah satu
 *   file konfigurasi wiki:
 *     • DiscussionArchiver-idwikisource.js
 *     • DiscussionArchiver-gorwiki.js
 *     • DiscussionArchiver-acewiki.js
 *
 *   File konfigurasi memanggil:
 *     window.DiscussionArchiverCore.init(CONFIG)
 * •==============================================•
 */
// <nowiki>
(function () {
  'use strict';

  // Tolak jika sudah dimuat sebelumnya
  if (window.DiscussionArchiverCore) return;

  // ── CSS — Codex Wikimedia Design System ──────────────────────────────
  //
  // Token mengacu pada:
  // https://doc.wikimedia.org/codex/latest/design-tokens/overview.html
  //
  // Strategi dark mode:
  //   1. Light (default)   : variabel di .da-dialog
  //   2. Night mode paksa  : html.skin-theme-clientpref-night .da-dialog
  //   3. Night mode OS     : @media (prefers-color-scheme:dark)
  //                          html.skin-theme-clientpref-os .da-dialog

  mw.util.addCSS(`
    /* ── Token: light mode (default) ── */
    .da-dialog {
      --cdx-color-base:                    #202122;
      --cdx-color-subtle:                  #54595d;
      --cdx-color-placeholder:             #72777d;
      --cdx-color-inverted:                #ffffff;

      --cdx-color-progressive:             #3366cc;
      --cdx-color-progressive--hover:      #2a4b8d;
      --cdx-color-progressive--active:     #2a4b8d;
      --cdx-color-destructive:             #d73333;
      --cdx-color-destructive--hover:      #b32424;

      --cdx-background-color-base:                  #ffffff;
      --cdx-background-color-neutral:               #f8f9fa;
      --cdx-background-color-neutral--hover:        #eaecf0;
      --cdx-background-color-destructive--subtle:   #fee7e6;

      --cdx-border-color-base:             #a2a9b1;
      --cdx-border-color-subtle:           #eaecf0;
      --cdx-border-color-progressive:      #3366cc;

      --cdx-font-family-sans:   system-ui, -apple-system, sans-serif;
      --cdx-font-size-small:    0.8125rem;
      --cdx-font-size-medium:   0.875rem;
      --cdx-font-size-large:    1rem;
      --cdx-font-weight-bold:   700;
      --cdx-line-height-medium: 1.5;
      --cdx-border-radius-base: 2px;

      --cdx-spacing-25:   2px;
      --cdx-spacing-50:   4px;
      --cdx-spacing-75:   6px;
      --cdx-spacing-100:  8px;
      --cdx-spacing-150:  12px;
      --cdx-spacing-200:  16px;
      --cdx-spacing-300:  24px;
    }

    /* ── Token: night mode paksa (Vector 2022 / Minerva) ── */
    html.skin-theme-clientpref-night .da-dialog {
      --cdx-color-base:                    #eaecf0;
      --cdx-color-subtle:                  #a2a9b1;
      --cdx-color-placeholder:             #72777d;
      --cdx-color-inverted:                #101418;

      --cdx-color-progressive:             #6699ff;
      --cdx-color-progressive--hover:      #99b3ff;
      --cdx-color-progressive--active:     #99b3ff;
      --cdx-color-destructive:             #ff8080;
      --cdx-color-destructive--hover:      #ffb3b3;

      --cdx-background-color-base:                  #101418;
      --cdx-background-color-neutral:               #1e2228;
      --cdx-background-color-neutral--hover:        #2a3040;
      --cdx-background-color-destructive--subtle:   #3a1010;

      --cdx-border-color-base:             #54595d;
      --cdx-border-color-subtle:           #2a3040;
      --cdx-border-color-progressive:      #6699ff;
    }

    /* ── Token: night mode otomatis (ikut OS) ── */
    @media screen and (prefers-color-scheme: dark) {
      html.skin-theme-clientpref-os .da-dialog {
        --cdx-color-base:                    #eaecf0;
        --cdx-color-subtle:                  #a2a9b1;
        --cdx-color-placeholder:             #72777d;
        --cdx-color-inverted:                #101418;

        --cdx-color-progressive:             #6699ff;
        --cdx-color-progressive--hover:      #99b3ff;
        --cdx-color-progressive--active:     #99b3ff;
        --cdx-color-destructive:             #ff8080;
        --cdx-color-destructive--hover:      #ffb3b3;

        --cdx-background-color-base:                  #101418;
        --cdx-background-color-neutral:               #1e2228;
        --cdx-background-color-neutral--hover:        #2a3040;
        --cdx-background-color-destructive--subtle:   #3a1010;

        --cdx-border-color-base:             #54595d;
        --cdx-border-color-subtle:           #2a3040;
        --cdx-border-color-progressive:      #6699ff;
      }
    }

    /* ── Overlay ── */
    .da-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--cdx-spacing-150);
      animation: da-fadein .15s ease-out;
    }

    /* ── Dialog — mengikuti pola cdx-dialog ── */
    .da-dialog {
      background: var(--cdx-background-color-base);
      color: var(--cdx-color-base);
      border: 1px solid var(--cdx-border-color-base);
      border-radius: var(--cdx-border-radius-base);
      width: min(672px, 96%);
      max-height: 88vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 2px 2px 0 rgba(0,0,0,.2), 0 0 2px 0 rgba(0,0,0,.1);
      font-family: var(--cdx-font-family-sans);
      font-size: var(--cdx-font-size-medium);
      line-height: var(--cdx-line-height-medium);
      animation: da-slidein .15s ease-out;
    }

    /* ── Header ── */
    .da-dialog-header {
      padding: var(--cdx-spacing-150) var(--cdx-spacing-200);
      border-bottom: 1px solid var(--cdx-border-color-subtle);
      background: var(--cdx-background-color-neutral);
      font-size: var(--cdx-font-size-large);
      font-weight: var(--cdx-font-weight-bold);
      color: var(--cdx-color-base);
      display: flex;
      align-items: center;
      gap: var(--cdx-spacing-100);
      flex-shrink: 0;
    }

    /* ── Body ── */
    .da-dialog-body {
      padding: var(--cdx-spacing-200);
      overflow-y: auto;
      flex: 1;
      color: var(--cdx-color-base);
    }

    /* ── Footer ── */
    .da-dialog-footer {
      padding: var(--cdx-spacing-150) var(--cdx-spacing-200);
      border-top: 1px solid var(--cdx-border-color-subtle);
      background: var(--cdx-background-color-neutral);
      display: flex;
      justify-content: flex-end;
      gap: var(--cdx-spacing-100);
      flex-shrink: 0;
    }

    /* ── Tombol — cdx-button ── */
    .da-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 32px;
      padding: 5px var(--cdx-spacing-150);
      border-radius: var(--cdx-border-radius-base);
      font-family: var(--cdx-font-family-sans);
      font-size: var(--cdx-font-size-medium);
      font-weight: var(--cdx-font-weight-bold);
      line-height: 1.4286rem;
      cursor: pointer;
      transition: background-color 100ms, color 100ms, border-color 100ms;
      white-space: nowrap;
      border: 1px solid transparent;
      text-decoration: none;
    }
    .da-btn:focus-visible {
      outline: 2px solid var(--cdx-color-progressive);
      outline-offset: 2px;
    }
    .da-btn--normal {
      background: var(--cdx-background-color-base);
      color: var(--cdx-color-base);
      border-color: var(--cdx-border-color-base);
    }
    .da-btn--normal:hover {
      background: var(--cdx-background-color-neutral--hover);
      border-color: var(--cdx-color-base);
    }
    .da-btn--progressive {
      background: var(--cdx-color-progressive);
      color: var(--cdx-color-inverted);
      border-color: var(--cdx-color-progressive);
    }
    .da-btn--progressive:hover {
      background: var(--cdx-color-progressive--hover);
      border-color: var(--cdx-color-progressive--hover);
    }
    .da-btn--destructive {
      background: var(--cdx-color-destructive);
      color: var(--cdx-color-inverted);
      border-color: var(--cdx-color-destructive);
    }
    .da-btn--destructive:hover {
      background: var(--cdx-color-destructive--hover);
      border-color: var(--cdx-color-destructive--hover);
    }

    /* ── Daftar utas ── */
    .da-thread-list {
      list-style: none;
      margin: var(--cdx-spacing-100) 0;
      padding: 0;
      max-height: 320px;
      overflow-y: auto;
      border: 1px solid var(--cdx-border-color-subtle);
      border-radius: var(--cdx-border-radius-base);
    }
    .da-thread-item {
      display: flex;
      align-items: flex-start;
      gap: var(--cdx-spacing-100);
      padding: var(--cdx-spacing-100) var(--cdx-spacing-150);
      border-bottom: 1px solid var(--cdx-border-color-subtle);
      transition: background 100ms;
    }
    .da-thread-item:last-child { border-bottom: none; }
    .da-thread-item:hover { background: var(--cdx-background-color-neutral--hover); }
    .da-thread-title {
      font-weight: var(--cdx-font-weight-bold);
      font-size: var(--cdx-font-size-medium);
      color: var(--cdx-color-base);
    }
    .da-thread-meta {
      font-size: var(--cdx-font-size-small);
      color: var(--cdx-color-subtle);
      margin-top: var(--cdx-spacing-25);
    }

    /* ── Badge — cdx-message status ── */
    .da-badge {
      display: inline-flex;
      align-items: center;
      background: var(--cdx-background-color-destructive--subtle);
      color: var(--cdx-color-destructive);
      border-radius: var(--cdx-border-radius-base);
      padding: 0 var(--cdx-spacing-75);
      font-size: var(--cdx-font-size-small);
      font-weight: var(--cdx-font-weight-bold);
      margin-left: var(--cdx-spacing-75);
      vertical-align: middle;
      line-height: 18px;
    }

    /* ── Kotak konfirmasi ── */
    .da-confirm-box {
      background: var(--cdx-background-color-neutral);
      border: 1px solid var(--cdx-border-color-subtle);
      border-left: 3px solid var(--cdx-color-progressive);
      border-radius: var(--cdx-border-radius-base);
      padding: var(--cdx-spacing-100) var(--cdx-spacing-150);
      margin-bottom: var(--cdx-spacing-150);
    }
    .da-confirm-box strong {
      display: block;
      margin-bottom: var(--cdx-spacing-50);
      font-weight: var(--cdx-font-weight-bold);
      color: var(--cdx-color-base);
    }
    .da-confirm-meta {
      font-size: var(--cdx-font-size-small);
      color: var(--cdx-color-subtle);
      margin: var(--cdx-spacing-50) 0 var(--cdx-spacing-100);
    }
    .da-archive-target {
      font-size: var(--cdx-font-size-small);
      color: var(--cdx-color-progressive);
      word-break: break-all;
    }

    /* ── Progres & status kosong ── */
    .da-progress {
      font-size: var(--cdx-font-size-medium);
      color: var(--cdx-color-subtle);
      margin-top: var(--cdx-spacing-100);
      min-height: 1.4em;
    }
    .da-empty {
      text-align: center;
      padding: var(--cdx-spacing-300) 0;
      color: var(--cdx-color-placeholder);
      font-size: var(--cdx-font-size-medium);
    }
    .da-hint {
      font-size: var(--cdx-font-size-small);
      color: var(--cdx-color-subtle);
      margin: var(--cdx-spacing-75) 0 0;
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
      color: #ffffff;
      border: 1px solid #3366cc;
      padding: 5px 12px;
      border-radius: 2px;
      cursor: pointer;
      z-index: 99999;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.875rem;
      font-weight: 700;
      line-height: 1.4286rem;
      box-shadow: 0 2px 2px 0 rgba(0,0,0,.2);
      transition: background-color 100ms, border-color 100ms;
    }
    #da-float-btn:hover {
      background: #2a4b8d;
      border-color: #2a4b8d;
    }
    #da-float-btn:focus-visible {
      outline: 2px solid #3366cc;
      outline-offset: 2px;
    }
  `);

  // ── Utilitas bersama ──────────────────────────────────────────────────

  /**
   * Hitung selisih bulan antara dua Date.
   * @param {Date} dari
   * @param {Date} ke
   * @returns {number}
   */
  function selisihBulan(dari, ke) {
    return (ke.getFullYear() - dari.getFullYear()) * 12
      + (ke.getMonth() - dari.getMonth());
  }

  /**
   * Tampilkan notifikasi MediaWiki.
   * @param {string} msg
   * @param {'info'|'warn'|'error'} type
   */
  function notify(msg, type) {
    type = type || 'info';
    if (mw.notify) {
      mw.notify(msg, { type: type });
    } else {
      console.log('[DiscussionArchiver]', msg);
    }
  }

  // ── UI ────────────────────────────────────────────────────────────────

  /**
   * Buat dialog modal.
   * @param {string} titleHtml
   * @param {string} bodyHtml
   * @returns {{ overlay, dialog, body, footer }}
   */
  function createDialog(titleHtml, bodyHtml) {
    var overlay = document.createElement('div');
    overlay.className = 'da-overlay';

    var dialog = document.createElement('div');
    dialog.className = 'da-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.innerHTML =
      '<div class="da-dialog-header">\uD83D\uDCE6 ' + titleHtml + '</div>' +
      '<div class="da-dialog-body">' + bodyHtml + '</div>' +
      '<div class="da-dialog-footer"></div>';

    overlay.appendChild(dialog);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);

    return {
      overlay: overlay,
      dialog: dialog,
      body: dialog.querySelector('.da-dialog-body'),
      footer: dialog.querySelector('.da-dialog-footer')
    };
  }

  /**
   * Tambahkan tombol ke footer dialog.
   * @param {HTMLElement} footer
   * @param {string} label
   * @param {'normal'|'progressive'|'destructive'} weight
   * @param {Function} onClick
   * @returns {HTMLButtonElement}
   */
  function addBtn(footer, label, weight, onClick) {
    var btn = document.createElement('button');
    btn.className = 'da-btn da-btn--' + weight;
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    footer.appendChild(btn);
    return btn;
  }

  // ── Logika bersama ────────────────────────────────────────────────────

  /**
   * Parse wikitext menjadi array utas level-2.
   * @param {string} wikitext
   * @returns {Array<{title:string, content:string, start:number, end:number}>}
   */
  function parseThreads(wikitext) {
    var headerRe = /^==\s*([^=\n][^\n]*?)\s*==\s*$/gm;
    var positions = [];
    var m;
    while ((m = headerRe.exec(wikitext)) !== null) {
      positions.push({ title: m[1].trim(), start: m.index });
    }
    positions.push({ title: null, start: wikitext.length });

    var threads = [];
    for (var i = 0; i < positions.length - 1; i++) {
      var start = positions[i].start;
      var end = positions[i + 1].start;
      threads.push({
        title: positions[i].title,
        content: wikitext.substring(start, end),
        start: start,
        end: end
      });
    }
    return threads;
  }

  /**
   * Konfirmasi pengarsipan per utas, satu per satu.
   * Mengembalikan Promise yang resolve ke array utas yang disetujui.
   *
   * @param {Array} threads      - Utas yang perlu dikonfirmasi
   * @param {Object} cfg         - Konfigurasi wiki (lihat init())
   * @returns {Promise<Array>}
   */
  function confirmPerThread(threads, cfg) {
    return new Promise(function (resolve) {
      var approved = [];
      var idx = 0;

      function showNext() {
        if (idx >= threads.length) {
          resolve(approved);
          return;
        }

        var t = threads[idx];
        var ts = cfg.getLatestTimestamp(t.content);
        var resolved = cfg.isResolved ? cfg.isResolved(t.content) : false;
        var usia = ts ? selisihBulan(ts, new Date()) : (resolved ? 'resolved' : '?');
        var tsTxt = ts
          ? cfg.formatTanggal(ts)
          : (resolved ? 'Terdeteksi: {{section resolved}}' : 'Tidak terdeteksi');
        var tgtTitle = cfg.getArchiveTitle(t);

        var ui = createDialog(
          'Konfirmasi Arsip Utas (' + (idx + 1) + '/' + threads.length + ')',
          '<div class="da-confirm-box">' +
            '<strong>\uD83D\uDCC4 ' + mw.html.escape(t.title) + '</strong>' +
            '<div class="da-confirm-meta">' +
              'Komentar terakhir: <b>' + tsTxt + '</b>' +
              '<span class="da-badge">~' + usia + ' bulan lalu</span>' +
            '</div>' +
            '<div class="da-archive-target">\u2192 Akan diarsipkan ke: <b>' +
              mw.html.escape(tgtTitle) + '</b></div>' +
          '</div>' +
          '<p class="da-hint">Klik <b>Lewati</b> untuk melewati utas ini tanpa mengarsipkan.</p>'
        );

        addBtn(ui.footer, 'Lewati', 'normal', function () {
          ui.overlay.remove();
          idx++;
          showNext();
        });
        addBtn(ui.footer, 'Arsipkan', 'progressive', function () {
          approved.push(t);
          ui.overlay.remove();
          idx++;
          showNext();
        });
      }

      showNext();
    });
  }

  /**
   * Hapus utas dari halaman asal, lalu simpan ke halaman arsip yang sesuai.
   *
   * @param {Array}  threadsToArchive  - Utas yang sudah disetujui
   * @param {Object} cfg               - Konfigurasi wiki
   * @param {mw.Api} api
   * @param {string} page              - Nama halaman asal (wgPageName)
   * @returns {Promise<{archivedCount:number, archiveTitles:string[]}>}
   */
  async function doArchive(threadsToArchive, cfg, api, page) {
    // Ambil ulang wikitext terbaru agar tidak bentrok dengan edit lain
    var res = await api.get({
      action: 'query',
      prop: 'revisions',
      rvprop: ['content', 'timestamp'],
      titles: page,
      formatversion: 2
    });
    var pageData = res.query.pages[0];
    var text = pageData.revisions[0].content;
    var baseTimestamp = pageData.revisions[0].timestamp;

    // Hapus setiap utas dari teks asal
    for (var i = 0; i < threadsToArchive.length; i++) {
      var escaped = threadsToArchive[i].content.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = text.replace(new RegExp(escaped), '');
    }
    text = text.replace(/\n{3,}/g, '\n\n').trim();

    // Kelompokkan utas berdasarkan halaman arsip tujuannya
    var groupMap = {};
    for (var j = 0; j < threadsToArchive.length; j++) {
      var t = threadsToArchive[j];
      var archiveTitle = cfg.getArchiveTitle(t);
      if (!groupMap[archiveTitle]) groupMap[archiveTitle] = [];
      groupMap[archiveTitle].push(t);
    }

    var archiveTitles = Object.keys(groupMap);
    var sourceTitle = page.replace(/_/g, ' ');
    var archiveList = archiveTitles.map(function (t) { return '[[' + t + ']]'; }).join(', ');

    // Simpan halaman asal
    await api.postWithToken('csrf', {
      action: 'edit',
      title: page,
      text: text,
      summary: 'Mengarsipkan ' + threadsToArchive.length + ' utas tidak aktif ke ' + archiveList,
      basetimestamp: baseTimestamp
    });

    // Simpan setiap halaman arsip
    for (var archiveTitle in groupMap) {
      var threads = groupMap[archiveTitle];

      var arsRes = await api.get({
        action: 'query',
        prop: 'revisions',
        rvprop: 'content',
        titles: archiveTitle,
        formatversion: 2
      });
      var arsPage = arsRes.query.pages[0];
      var arsText = (arsPage.revisions && arsPage.revisions[0].content) || '';

      if (!arsPage.revisions) {
        arsText = cfg.archiveHeader(sourceTitle, archiveTitle);
      }

      var newBlocks = threads.map(function (t) { return t.content.trim(); }).join('\n\n');
      arsText = arsText.trim() + '\n\n' + newBlocks + '\n';

      await api.postWithToken('csrf', {
        action: 'edit',
        title: archiveTitle,
        text: arsText.trim(),
        summary: 'Menambahkan ' + threads.length + ' utas dari [[' + sourceTitle + ']]'
      });
    }

    return { archivedCount: threadsToArchive.length, archiveTitles: archiveTitles };
  }

  // ── Alur utama ────────────────────────────────────────────────────────

  /**
   * Jalankan alur pengarsipan lengkap.
   *
   * @param {Object} cfg  - Konfigurasi wiki (lihat init())
   * @param {mw.Api} api
   * @param {string} page - wgPageName
   */
  async function runArchiver(cfg, api, page) {
    // 1. Ambil wikitext
    var data;
    try {
      data = await api.get({
        action: 'query',
        prop: 'revisions',
        rvprop: 'content',
        titles: page,
        formatversion: 2
      });
    } catch (e) {
      notify('\u26A0\uFE0F Gagal memuat isi halaman.', 'error');
      return;
    }

    var wikitext = (
      data.query.pages[0] &&
      data.query.pages[0].revisions &&
      data.query.pages[0].revisions[0] &&
      data.query.pages[0].revisions[0].content
    ) || '';

    if (!wikitext) {
      notify('\u26A0\uFE0F Halaman kosong atau gagal dimuat.', 'warn');
      return;
    }

    // 2. Parse utas level-2
    var allThreads = parseThreads(wikitext);
    if (!allThreads.length) {
      notify('\u2139\uFE0F Tidak ditemukan utas level-2 di halaman ini.', 'info');
      return;
    }

    // 3. Filter utas tidak aktif
    var now = new Date();
    var staleThreads = allThreads.filter(function (t) {
      var ts = cfg.getLatestTimestamp(t.content);
      var resolved = cfg.isResolved ? cfg.isResolved(t.content) : false;
      if (resolved) return true;
      if (!ts) return false;
      return selisihBulan(ts, now) >= cfg.staleMonths;
    });

    // 4. Tidak ada yang kedaluwarsa
    if (!staleThreads.length) {
      var ui0 = createDialog(
        'Pengarsip Diskusi \u2014 Tidak Ada Utas Kedaluwarsa',
        '<div class="da-empty">' +
          '\u2705 Semua utas masih aktif (komentar terakhir &lt; ' + cfg.staleMonths + ' bulan).' +
          (cfg.isResolved ? ' Tidak ada templat {{section resolved}}.' : '') +
          '<br>Tidak ada yang perlu diarsipkan saat ini.</div>'
      );
      addBtn(ui0.footer, 'Tutup', 'normal', function () { ui0.overlay.remove(); });
      return;
    }

    // 5. Ringkasan sebelum konfirmasi per utas
    var proceed = await new Promise(function (resolve) {
      var listItems = staleThreads.map(function (t) {
        var ts = cfg.getLatestTimestamp(t.content);
        var resolved = cfg.isResolved ? cfg.isResolved(t.content) : false;
        var usia = ts ? selisihBulan(ts, now) : (resolved ? 'resolved' : '?');
        var tsTxt = ts ? cfg.formatTanggal(ts) : (resolved ? 'Terdeteksi: {{section resolved}}' : '\u2014');
        var tgtTitle = cfg.getArchiveTitle(t);
        return '<li class="da-thread-item" style="cursor:default">' +
          '<div>' +
            '<div class="da-thread-title">' + mw.html.escape(t.title) + '</div>' +
            '<div class="da-thread-meta">' +
              'Komentar terakhir: ' + tsTxt +
              '<span class="da-badge">~' + usia + ' bln</span><br>' +
              '<span style="color:var(--cdx-color-progressive)">\u2192 ' +
                mw.html.escape(tgtTitle) + '</span>' +
            '</div>' +
          '</div>' +
        '</li>';
      }).join('');

      var resolvedNote = cfg.isResolved
        ? ' atau mengandung templat <code>{{section resolved}}</code>'
        : '';

      var ui = createDialog(
        'Pengarsip Diskusi \u2014 ' + staleThreads.length + ' Utas Tidak Aktif',
        '<p style="margin:0 0 8px;font-size:var(--cdx-font-size-medium);color:var(--cdx-color-base)">' +
          'Utas berikut memiliki komentar terakhir <b>\u2265 ' + cfg.staleMonths + ' bulan</b>' +
          ' yang lalu' + resolvedNote + '.' +
          ' Klik <b>Lanjut</b> untuk mengkonfirmasi setiap utas satu per satu.' +
        '</p>' +
        '<ul class="da-thread-list">' + listItems + '</ul>'
      );

      addBtn(ui.footer, 'Batal', 'destructive', function () {
        ui.overlay.remove();
        resolve(false);
      });
      addBtn(ui.footer, 'Lanjut \u2192', 'progressive', function () {
        ui.overlay.remove();
        resolve(true);
      });
    });

    if (!proceed) return;

    // 6. Konfirmasi per utas
    var approved = await confirmPerThread(staleThreads, cfg);

    if (!approved.length) {
      notify('\u2139\uFE0F Tidak ada utas yang dipilih untuk diarsipkan.', 'info');
      return;
    }

    // 7. Dialog progres + eksekusi
    var targetPages = approved
      .map(function (t) { return cfg.getArchiveTitle(t); })
      .filter(function (v, i, a) { return a.indexOf(v) === i; });

    var uiProg = createDialog(
      'Mengarsipkan ' + approved.length + ' Utas\u2026',
      '<div class="da-progress" id="da-prog-msg">\u23F3 Memproses\u2026</div>'
    );
    var progMsg = document.getElementById('da-prog-msg');

    try {
      progMsg.textContent = '\u23F3 Menyimpan ke ' + targetPages.join(', ') + '\u2026';
      var result = await doArchive(approved, cfg, api, page);
      var links = result.archiveTitles.map(function (t) {
        return '<a href="/wiki/' + encodeURIComponent(t.replace(/ /g, '_')) +
          '" target="_blank" style="color:var(--cdx-color-progressive)">' +
          mw.html.escape(t) + '</a>';
      }).join(', ');
      progMsg.innerHTML = '\u2705 <b>' + result.archivedCount + ' utas</b> berhasil diarsipkan ke: ' + links + '.';
      addBtn(uiProg.footer, 'Tutup & Muat Ulang', 'progressive', function () {
        uiProg.overlay.remove();
        location.reload();
      });
    } catch (e) {
      console.error('[DiscussionArchiver] Error:', e);
      progMsg.textContent = '\u274C Gagal mengarsipkan. Lihat konsol untuk detail.';
      addBtn(uiProg.footer, 'Tutup', 'destructive', function () { uiProg.overlay.remove(); });
    }
  }

  // ── API publik ────────────────────────────────────────────────────────

  /**
   * Inisialisasi gadget untuk satu wiki.
   *
   * @param {Object} cfg - Konfigurasi wiki dengan properti berikut:
   *
   *   === Guard ===
   *   cfg.isAllowedPage(mwConfig)
   *     → Function(mwConfig): boolean
   *       Kembalikan true jika gadget boleh berjalan di halaman ini.
   *
   *   === Timestamp ===
   *   cfg.getLatestTimestamp(text)
   *     → Function(string): Date|null
   *       Cari dan kembalikan timestamp terbaru dalam blok wikitext.
   *
   *   cfg.formatTanggal(date)
   *     → Function(Date): string
   *       Format Date ke string yang ditampilkan di UI.
   *
   *   === Arsip ===
   *   cfg.getArchiveTitle(thread)
   *     → Function({content:string, title:string, ...}): string
   *       Kembalikan judul halaman arsip untuk sebuah utas.
   *
   *   cfg.archiveHeader(sourceTitle, archiveTitle)
   *     → Function(string, string): string
   *       Kembalikan konten awal halaman arsip baru (jika belum ada).
   *
   *   === Opsional ===
   *   cfg.staleMonths  {number}   - Ambang batas bulan tidak aktif (default: 2)
   *
   *   cfg.isResolved(text)
   *     → Function(string): boolean
   *       Deteksi apakah utas punya tanda "resolved" (misal templat).
   *       Jika tidak didefinisikan, fitur ini tidak aktif.
   *
   *   cfg.floatBtnTitle {string} - Tooltip tombol mengambang (opsional)
   */
  function init(cfg) {
    var mwCfg = mw.config.get();
    var api = new mw.Api();
    var page = mwCfg.wgPageName;

    // Validasi konfigurasi minimum
    if (typeof cfg.isAllowedPage !== 'function') {
      console.error('[DiscussionArchiver] cfg.isAllowedPage harus berupa fungsi.');
      return;
    }
    if (typeof cfg.getLatestTimestamp !== 'function') {
      console.error('[DiscussionArchiver] cfg.getLatestTimestamp harus berupa fungsi.');
      return;
    }
    if (typeof cfg.formatTanggal !== 'function') {
      console.error('[DiscussionArchiver] cfg.formatTanggal harus berupa fungsi.');
      return;
    }
    if (typeof cfg.getArchiveTitle !== 'function') {
      console.error('[DiscussionArchiver] cfg.getArchiveTitle harus berupa fungsi.');
      return;
    }
    if (typeof cfg.archiveHeader !== 'function') {
      console.error('[DiscussionArchiver] cfg.archiveHeader harus berupa fungsi.');
      return;
    }

    cfg.staleMonths = cfg.staleMonths || 2;

    // Guard: izin akses sysop
    var groups = mwCfg.wgUserGroups || [];
    if (!groups.includes('sysop')) return;

    // Guard: kondisi spesifik wiki
    if (!cfg.isAllowedPage(mwCfg)) return;

    // Guard: jangan jalan di diff / history / revisi lama
    if (
      mwCfg.wgAction === 'history' ||
      mwCfg.wgDiffNewId ||
      mwCfg.wgDiffOldId ||
      mwCfg.wgCurRevisionId !== mwCfg.wgRevisionId
    ) return;

    // Tombol mengambang
    var floatBtn = document.createElement('button');
    floatBtn.id = 'da-float-btn';
    floatBtn.textContent = '\uD83D\uDCE6 Arsipkan Diskusi';
    floatBtn.title = cfg.floatBtnTitle || 'DiscussionArchiver — Arsipkan utas tidak aktif';
    floatBtn.addEventListener('click', function () { runArchiver(cfg, api, page); });
    document.body.appendChild(floatBtn);
  }

  // ── Ekspor ────────────────────────────────────────────────────────────

  window.DiscussionArchiverCore = { init: init };

})();
// </nowiki>
