/**
 * [DISCUSSIONARCHIVER-CORE.JS — CORE GADGET LOGIC]
 *
 * •==============================================•
 * > Type  : JavaScript (MediaWiki Gadget — shared core)
 * > Version : 3.0.0
 * > Function: Shared logic for archiving inactive
 * discussion threads with bulk selection.
 * •==============================================•
 */
// <nowiki>
(function () {
  "use strict";

  // Prevent multiple executions
  if (window.DiscussionArchiverCore) return;

  // ── CSS STYLING ───────────────────────────────────────────────────────
  mw.util.addCSS(`
    /* ── Light mode tokens (default) ── */
    .da-dialog {
      --cdx-color-base:                    #202122;
      --cdx-color-subtle:                  #54595d;
      --cdx-color-placeholder:             #72777d;
      --cdx-color-inverted:                #ffffff;
      --cdx-color-progressive:             #3366cc;
      --cdx-color-progressive--hover:      #2a4b8d;
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
      --cdx-border-radius-base: 2px;
    }

    /* ── Forced night mode (Vector 2022 / Minerva) ── */
    html.skin-theme-clientpref-night .da-dialog {
      --cdx-color-base:                    #eaecf0;
      --cdx-color-subtle:                  #a2a9b1;
      --cdx-color-inverted:                #101418;
      --cdx-color-progressive:             #6699ff;
      --cdx-color-progressive--hover:      #99b3ff;
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

    /* ── Auto night mode (OS preference) ── */
    @media screen and (prefers-color-scheme: dark) {
      html.skin-theme-clientpref-os .da-dialog {
        --cdx-color-base:                    #eaecf0;
        --cdx-color-subtle:                  #a2a9b1;
        --cdx-color-inverted:                #101418;
        --cdx-color-progressive:             #6699ff;
        --cdx-color-progressive--hover:      #99b3ff;
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

    /* ── Overlay and Dialog Container ── */
    .da-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      z-index: 100000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 12px;
      animation: da-fadein .15s ease-out;
    }
    .da-dialog {
      background: var(--cdx-background-color-base);
      color: var(--cdx-color-base);
      border: 1px solid var(--cdx-border-color-base);
      border-radius: var(--cdx-border-radius-base);
      width: min(680px, 96%);
      max-height: 88vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0,0,0,0.35);
      font-family: var(--cdx-font-family-sans);
      font-size: 14px;
      animation: da-slidein .15s ease-out;
    }

    /* ── Header ── */
    .da-dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      border-bottom: 1px solid var(--cdx-border-color-subtle);
      background: var(--cdx-background-color-neutral);
      font-weight: 700;
      font-size: 16px;
      flex-shrink: 0;
    }
    .da-dialog-close {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--cdx-color-subtle);
      font-size: 16px;
      padding: 4px 8px;
      border-radius: var(--cdx-border-radius-base);
      transition: background 0.1s, color 0.1s;
    }
    .da-dialog-close:hover {
      background: var(--cdx-background-color-neutral--hover);
      color: var(--cdx-color-base);
    }

    /* ── Body and Footer ── */
    .da-dialog-body {
      padding: 16px 20px;
      overflow-y: auto;
      flex: 1;
      line-height: 1.6;
    }
    .da-dialog-footer {
      padding: 12px 20px;
      border-top: 1px solid var(--cdx-border-color-subtle);
      background: var(--cdx-background-color-neutral);
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      flex-shrink: 0;
    }

    /* ── Buttons ── */
    .da-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 6px 14px;
      border-radius: var(--cdx-border-radius-base);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid transparent;
      transition: background 0.1s, border-color 0.1s, color 0.1s;
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

    /* ── List and Inputs ── */
    .da-thread-list {
      list-style: none;
      margin: 12px 0 0 0;
      padding: 0;
      max-height: 320px;
      overflow-y: auto;
      border: 1px solid var(--cdx-border-color-subtle);
      border-radius: var(--cdx-border-radius-base);
    }
    .da-thread-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 10px 14px;
      border-bottom: 1px solid var(--cdx-border-color-subtle);
      transition: background 0.1s;
    }
    .da-thread-item:last-child { border-bottom: none; }
    .da-thread-item:hover { background: var(--cdx-background-color-neutral--hover); }
    .da-thread-title { font-weight: 700; color: var(--cdx-color-base); }
    .da-thread-meta { font-size: 12px; color: var(--cdx-color-subtle); margin-top: 2px; }
    .da-badge {
      display: inline-flex;
      background: var(--cdx-background-color-destructive--subtle);
      color: var(--cdx-color-destructive);
      border-radius: var(--cdx-border-radius-base);
      padding: 1px 6px;
      font-size: 11px;
      font-weight: 700;
      margin-left: 6px;
    }
    .da-archive-label { font-size: 12px; color: var(--cdx-color-progressive); margin-top: 2px; }
    .da-progress, .da-empty { text-align: center; padding: 24px 0; color: var(--cdx-color-subtle); }

    /* ── Floating Action Button (Round Emoji) ── */
    #da-float-btn {
      position: fixed;
      bottom: 35px;
      right: 35px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #3366cc;
      color: #ffffff;
      border: none;
      cursor: pointer;
      z-index: 99999;
      font-size: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,.25);
      transition: transform 100ms, background-color 100ms;
    }
    #da-float-btn:hover {
      background: #2a4b8d;
      transform: scale(1.05);
    }

    @keyframes da-fadein { from { opacity: 0; } to { opacity: 1; } }
    @keyframes da-slidein { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
  `);

  // ── UTILITIES ─────────────────────────────────────────────────────────

  function getDaysDifference(from, to) {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.floor((to - from) / msPerDay);
  }

  function notify(msg, type = "info") {
    mw.notify
      ? mw.notify(msg, { type })
      : console.log("[DiscussionArchiver]", msg);
  }

  // ── DIALOG COMPONENT ──────────────────────────────────────────────────

  /**
   * Create a dialog interface with Esc and Close button handlers.
   * @param {string} titleHtml
   * @param {string} bodyHtml
   * @returns {Object} Elements and a close function
   */
  function createDialog(titleHtml, bodyHtml) {
    const overlay = document.createElement("div");
    overlay.className = "da-overlay";

    const dialog = document.createElement("div");
    dialog.className = "da-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.innerHTML = `
      <div class="da-dialog-header">
        <div class="da-dialog-header-title">${titleHtml}</div>
        <button class="da-dialog-close" aria-label="Tutup">✕</button>
      </div>
      <div class="da-dialog-body">${bodyHtml}</div>
      <div class="da-dialog-footer"></div>
    `;

    overlay.appendChild(dialog);

    // Global cleanup handler
    const closeDialog = () => {
      window.removeEventListener("keydown", handleKeyDown);
      overlay.remove();
    };

    // Close on Escape key press
    const handleKeyDown = (e) => {
      if (e.key === "Escape") closeDialog();
    };

    // Event listeners for closing
    dialog
      .querySelector(".da-dialog-close")
      .addEventListener("click", closeDialog);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeDialog();
    });
    window.addEventListener("keydown", handleKeyDown);

    document.body.appendChild(overlay);

    return {
      overlay,
      dialog,
      body: dialog.querySelector(".da-dialog-body"),
      footer: dialog.querySelector(".da-dialog-footer"),
      close: closeDialog,
    };
  }

  function addBtn(footer, label, weight, onClick) {
    const btn = document.createElement("button");
    btn.className = "da-btn da-btn--" + weight;
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    footer.appendChild(btn);
    return btn;
  }

  // ── CORE LOGIC ────────────────────────────────────────────────────────

  /**
   * Parse wikitext into separate level-2 heading block structures.
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
      threads.push({
        title: positions[i].title,
        content: wikitext.substring(positions[i].start, positions[i + 1].start),
        start: positions[i].start,
        end: positions[i + 1].start,
      });
    }
    return threads;
  }

  /**
   * Remove selected threads from source and append to target archive pages.
   */
  async function doArchive(threadsToArchive, cfg, api, page) {
    // Fetch latest revision to prevent edit conflicts
    const res = await api.get({
      action: "query",
      prop: "revisions",
      rvprop: ["content", "timestamp"],
      titles: page,
      formatversion: 2,
    });
    const pageData = res.query.pages[0];
    let text = pageData.revisions[0].content;
    const baseTimestamp = pageData.revisions[0].timestamp;

    // Group threads by destination archive
    const groupMap = {};
    for (const t of threadsToArchive) {
      const tgt = cfg.getArchiveTitle(t);
      if (!groupMap[tgt]) groupMap[tgt] = [];
      groupMap[tgt].push(t);
    }
    const archiveTitles = Object.keys(groupMap);
    const sourceTitle = page.replace(/_/g, " ");

    // Sort threads from bottom to top to avoid offset shifting during removal
    const sortedThreads = [...threadsToArchive].sort(
      (a, b) => b.start - a.start,
    );
    for (const t of sortedThreads) {
      const before = text.substring(0, t.start);
      const after = text.substring(t.end);
      text = before.trim() + "\n\n" + after.trim();
    }
    text = text.trim();

    // 1. Process target append requests
    for (const archTitle of archiveTitles) {
      const threads = groupMap[archTitle];
      const arsRes = await api.get({
        action: "query",
        prop: "revisions",
        rvprop: "content",
        titles: archTitle,
        formatversion: 2,
      });
      let arsText =
        (arsRes.query.pages[0].revisions &&
          arsRes.query.pages[0].revisions[0].content) ||
        "";

      if (!arsText) arsText = cfg.archiveHeader(sourceTitle, archTitle);

      const newBlocks = threads.map((t) => t.content.trim()).join("\n\n");
      arsText = arsText.trim() + "\n\n" + newBlocks + "\n";

      await api.postWithToken("csrf", {
        action: "edit",
        title: archTitle,
        text: arsText.trim(),
        summary: `Menambahkan ${threads.length} utas dari [[${sourceTitle}]]`,
      });
    }

    // 2. Save source page deletions
    await api.postWithToken("csrf", {
      action: "edit",
      title: page,
      text: text,
      summary: `Mengarsipkan ${threadsToArchive.length} utas tidak aktif.`,
      basetimestamp: baseTimestamp,
    });

    return { archivedCount: threadsToArchive.length, archiveTitles };
  }

  // ── MAIN APPLICATION RUNNER ───────────────────────────────────────────

  async function runArchiver(cfg, api, page) {
    const view = createDialog(
      "Arsipkan diskusi",
      '<div class="da-progress">⏳ Membaca isi halaman...</div>',
    );

    try {
      // 1. Fetch wikitext
      const data = await api.get({
        action: "query",
        prop: "revisions",
        rvprop: "content",
        titles: page,
        formatversion: 2,
      });
      const wikitext =
        (data.query.pages[0].revisions &&
          data.query.pages[0].revisions[0].content) ||
        "";
      if (!wikitext) {
        view.body.innerHTML = '<div class="da-empty">Halaman kosong.</div>';
        addBtn(view.footer, "Tutup", "normal", () => view.close());
        return;
      }

      // 2. Parse and filter stale threads
      const allThreads = parseThreads(wikitext);
      const now = new Date();
      const staleDays = cfg.staleDays || 7;

      const staleThreads = allThreads.filter((t) => {
        const ts = cfg.getLatestTimestamp(t.content);
        const resolved = cfg.isResolved ? cfg.isResolved(t.content) : false;
        if (resolved) return true;
        if (!ts) return false;
        return getDaysDifference(ts, now) >= staleDays;
      });

      if (!staleThreads.length) {
        view.body.innerHTML = `<div class="da-empty">Semua utas masih aktif (komentar terakhir &lt; ${staleDays} hari).</div>`;
        addBtn(view.footer, "Tutup", "normal", () => view.close());
        return;
      }

      // 3. Build Checkbox UI
      view.dialog.querySelector(".da-dialog-header-title").textContent =
        "Pilih utas yang akan diarsipkan";

      let bodyHtml = `
        <div style="margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px;">
          <input type="text" id="da-search-input" placeholder="Cari utas berdasarkan judul..." style="width: 100%; padding: 6px 10px; border: 1px solid var(--cdx-border-color-base); border-radius: 2px; background: var(--cdx-background-color-base); color: var(--cdx-color-base); font-family: inherit;">
          <div style="display: flex; align-items: center; gap: 8px; padding: 2px 4px;">
            <input type="checkbox" id="da-select-all" checked style="cursor: pointer;">
            <label for="da-select-all" style="font-weight: 700; cursor: pointer; user-select: none;">Pilih semua</label>
          </div>
        </div>
        <ul class="da-thread-list">
      `;

      staleThreads.forEach((t, idx) => {
        const ts = cfg.getLatestTimestamp(t.content);
        const age = ts ? getDaysDifference(ts, now) : "?";
        const tgtTitle = cfg.getArchiveTitle(t);
        const tsTxt = ts ? cfg.formatTanggal(ts) : "Tidak terdeteksi";

        bodyHtml += `
          <li class="da-thread-item" data-title="${mw.html.escape(t.title).toLowerCase()}">
            <input type="checkbox" class="da-thread-cb" data-idx="${idx}" checked style="margin-top: 4px; cursor: pointer;">
            <div style="flex: 1;">
              <div class="da-thread-title">${mw.html.escape(t.title)}</div>
              <div class="da-thread-meta">
                Komentar terakhir: <b>${tsTxt}</b> <span class="da-badge">~${age} hari lalu</span>
              </div>
              <div class="da-archive-label">➔ Halaman arsip: <i>${mw.html.escape(tgtTitle)}</i></div>
            </div>
          </li>
        `;
      });
      bodyHtml += "</ul>";
      view.body.innerHTML = bodyHtml;

      // 4. Attach UI Listeners (Filter & Select All)
      const searchInput = document.getElementById("da-search-input");
      const listItems = view.body.querySelectorAll(".da-thread-item");

      searchInput.addEventListener("input", () => {
        const query = searchInput.value.toLowerCase().trim();
        listItems.forEach((item) => {
          const title = item.getAttribute("data-title");
          item.style.display = title.includes(query) ? "flex" : "none";
        });
      });

      const selectAllCb = document.getElementById("da-select-all");
      const itemCbs = view.body.querySelectorAll(".da-thread-cb");

      selectAllCb.addEventListener("change", () => {
        const isChecked = selectAllCb.checked;
        // Apply check state only to items currently visible through the search filter
        listItems.forEach((item, i) => {
          if (item.style.display !== "none") itemCbs[i].checked = isChecked;
        });
      });

      itemCbs.forEach((cb) => {
        cb.addEventListener("change", () => {
          const visibleCbs = Array.from(listItems)
            .filter((item) => item.style.display !== "none")
            .map((item) => item.querySelector(".da-thread-cb"));

          const totalChecked = visibleCbs.filter((c) => c.checked).length;
          selectAllCb.checked =
            totalChecked > 0 && totalChecked === visibleCbs.length;
          selectAllCb.indeterminate =
            totalChecked > 0 && totalChecked < visibleCbs.length;
        });
      });

      // 5. Submit Action
      addBtn(view.footer, "Batal", "normal", () => view.close());
      addBtn(view.footer, "Arsipkan", "progressive", async () => {
        const checkedNodes = Array.from(
          view.body.querySelectorAll(".da-thread-cb:checked"),
        );
        if (checkedNodes.length === 0) {
          alert("Silakan pilih minimal satu utas untuk diarsipkan.");
          return;
        }

        const approved = checkedNodes.map(
          (cb) => staleThreads[parseInt(cb.getAttribute("data-idx"), 10)],
        );

        // Transition layout into active background task progress monitor
        view.body.innerHTML =
          '<div class="da-progress" id="da-prog-msg">⏳ Memproses...</div>';
        view.footer.innerHTML = ""; // Lock action controls

        const progMsg = document.getElementById("da-prog-msg");
        try {
          progMsg.textContent = "⏳ Menyimpan ke halaman arsip...";
          const { archivedCount, archiveTitles } = await doArchive(
            approved,
            cfg,
            api,
            page,
          );

          const uniqueTitles = [...new Set(archiveTitles)];
          const links = uniqueTitles
            .map(
              (t) =>
                `<a href="/wiki/${encodeURIComponent(t.replace(/ /g, "_"))}" target="_blank">${mw.html.escape(t)}</a>`,
            )
            .join(", ");

          progMsg.innerHTML = `✅ <b>${archivedCount} utas</b> berhasil diarsipkan ke: ${links}.`;
          addBtn(view.footer, "Tutup & muat ulang", "progressive", () => {
            view.close();
            location.reload();
          });
        } catch (err) {
          console.error("[DiscussionArchiver] Error:", err);
          progMsg.textContent =
            "❌ Gagal mengarsipkan. Lihat konsol untuk detail.";
          addBtn(view.footer, "Tutup", "destructive", () => view.close());
        }
      });
    } catch (e) {
      view.body.innerHTML =
        '<div class="da-progress">❌ Gagal memuat konten halaman.</div>';
      addBtn(view.footer, "Tutup", "normal", () => view.close());
    }
  }

  // ── PUBLIC API EXPORT ─────────────────────────────────────────────────

  function init(cfg) {
    const mwCfg = mw.config.get();
    const api = new mw.Api();
    const page = mwCfg.wgPageName;

    // Validate minimum config requirements
    if (
      typeof cfg.isAllowedPage !== "function" ||
      typeof cfg.getLatestTimestamp !== "function" ||
      typeof cfg.getArchiveTitle !== "function"
    ) {
      console.error("[DiscussionArchiver] Invalid configuration provided.");
      return;
    }

    // Permission and page guards
    if (!(mwCfg.wgUserGroups || []).includes("sysop")) return;
    if (!cfg.isAllowedPage(mwCfg)) return;
    if (
      mwCfg.wgAction === "history" ||
      mwCfg.wgDiffNewId ||
      mwCfg.wgCurRevisionId !== mwCfg.wgRevisionId
    )
      return;

    // Mount floating UI trigger (Round Emoji)
    const floatBtn = document.createElement("button");
    floatBtn.id = "da-float-btn";
    floatBtn.textContent = "📦";
    floatBtn.title = cfg.floatBtnTitle || "Arsipkan diskusi tidak aktif";
    floatBtn.addEventListener("click", () => runArchiver(cfg, api, page));
    document.body.appendChild(floatBtn);
  }

  window.DiscussionArchiverCore = { init };
})();
// </nowiki>
