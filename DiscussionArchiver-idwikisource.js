/**
 * [DISCUSSIONARCHIVER-IDWIKISOURCE.JS]
 *
 * •==============================================•
 * > Type: JavaScript (MediaWiki Gadget — Config)
 * > Target: Wikisource namespace
 * > Function: Loads specific parsing rules for id-wikisource
 * to be consumed by DiscussionArchiver-core.js
 * •==============================================•
 */
// <nowiki>
(function () {
  // Ensure the core script is fully loaded before executing
  if (!window.DiscussionArchiverCore) {
    console.error(
      "DiscussionArchiverCore is missing. Please ensure core.js is loaded first.",
    );
    return;
  }

  const BULAN_ID = {
    Januari: 0,
    Februari: 1,
    Maret: 2,
    April: 3,
    Mei: 4,
    Juni: 5,
    Juli: 6,
    Agustus: 7,
    September: 8,
    Oktober: 9,
    November: 10,
    Desember: 11,
  };

  window.DiscussionArchiverCore.init({
    // Hanya izinkan alat ini dimuat pada halaman khusus Warung kopi
    isAllowedPage: function (mwCfg) {
      return mwCfg.wgPageName === "Wikisumber:Warung_kopi";
    },

    // Minimum inactive days required for a thread to be archived (7 days)
    staleDays: 7,

    // Teks yang akan ditampilkan pada portlet link menu "Lainnya"
    portletText: "📦 Arsipkan diskusi",

    // Parse the standard Indonesian Wikisource timestamp format
    getLatestTimestamp: function (text) {
      const pattern =
        /(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})\s+(?:pukul\s+)?(\d{1,2})[.:](\d{2})\s+\(UTC\)/g;
      let latest = null;
      let m;
      while ((m = pattern.exec(text)) !== null) {
        const d = new Date(
          Date.UTC(
            parseInt(m[3], 10),
            BULAN_ID[m[2]],
            parseInt(m[1], 10),
            parseInt(m[4], 10),
            parseInt(m[5], 10),
          ),
        );
        if (!latest || d > latest) latest = d;
      }
      return latest;
    },

    // UI presentation logic for displaying thread dates
    formatTanggal: function (d) {
      const bulanNama = Object.keys(BULAN_ID);
      return `${d.getUTCDate()} ${bulanNama[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    },

    // Define the destination path for archived threads
    getArchiveTitle: function (thread) {
      const ts = this.getLatestTimestamp(thread.content);
      const year = ts ? ts.getUTCFullYear() : new Date().getFullYear();
      const pageName = mw.config.get("wgPageName").replace(/_/g, " ");
      return `${pageName}/Arsip ${year}`;
    },

    // Boilerplate content automatically prepended if the archive page doesn't exist yet
    archiveHeader: function (sourceTitle, archiveTitle) {
      return `{{Arsip|${sourceTitle}}}\n__ARCHIVEDTALK__\n__NOINDEX__\n`;
    },
  });
})();
// </nowiki>
