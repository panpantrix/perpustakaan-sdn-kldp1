/**
 * script.js — logika UI situs statis (UKK target #69)
 * Optimasi: cache sessionStorage, debounce search, index pencarian, render efisien
 */
(function () {
  var cfg = window.APP_CONFIG || {};
  var CACHE_KEY = "perpus_data_v2";
  var CACHE_TTL = 30 * 60 * 1000; // 30 menit
  var _searchTimer = null;
  var _katFilled = false;

  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function stars(n) {
    var full = Math.round(Number(n) || 0);
    var s = "";
    for (var i = 1; i <= 5; i++) s += i <= full ? "★" : "☆";
    return s;
  }

  function availabilityBadge(a, stok) {
    if (stok <= 0 || a === "unavailable") return '<span class="badge badge-no">Tidak tersedia</span>';
    if (a === "limited" || stok === 1) return '<span class="badge badge-warn">Stok terbatas</span>';
    return '<span class="badge badge-ok">Tersedia</span>';
  }

  /** Index string pencarian sekali saat load (lebih cepat filter berulang) */
  function indexBooks(books) {
    for (var i = 0; i < books.length; i++) {
      var b = books[i];
      if (!b._q) {
        b._q = (b.judul + " " + b.pengarang + " " + b.kode + " " + (b.kategori || "")).toLowerCase();
      }
    }
    return books;
  }

  function applyConfig() {
    $all("[data-config]").forEach(function (el) {
      var keys = el.getAttribute("data-config").split(".");
      var val = cfg;
      for (var i = 0; i < keys.length; i++) {
        val = val && val[keys[i]] != null ? val[keys[i]] : "";
      }
      if (val !== "" && val != null) el.textContent = val;
    });
    var theme = document.querySelector('meta[name="theme-color"]');
    if (theme && cfg.themeColor) theme.setAttribute("content", cfg.themeColor);

    $all("[data-wa-link]").forEach(function (a) {
      var phone = String((cfg.contact && cfg.contact.whatsapp) || "").replace(/\D/g, "");
      if (phone.charAt(0) === "0") phone = "62" + phone.slice(1);
      var text = encodeURIComponent("Halo Admin " + (cfg.shortName || "Perpus") + ", saya ingin bertanya.");
      if (phone) a.href = "https://api.whatsapp.com/send?phone=" + phone + "&text=" + text;
    });
    $all("[data-live-app]").forEach(function (a) {
      if (cfg.liveAppUrl) a.href = cfg.liveAppUrl;
    });
    $all("[data-email-link]").forEach(function (a) {
      var em = cfg.contact && cfg.contact.email;
      if (em) a.href = "mailto:" + em;
    });
  }

  function markNav() {
    var path = location.pathname;
    $all("[data-nav]").forEach(function (a) {
      var key = a.getAttribute("data-nav");
      var active = path.indexOf(key) !== -1 || (key === "home" && /index\.html$|\/$/.test(path));
      a.classList.toggle("is-active", active);
    });
  }

  function wireNav() {
    var btn = $("#nav-toggle");
    var nav = $("#site-nav");
    if (btn && nav) {
      btn.addEventListener("click", function () {
        nav.classList.toggle("open");
      });
    }
    var sideBtn = $("#sidebar-toggle");
    var side = $("#sidebar");
    if (sideBtn && side) {
      sideBtn.addEventListener("click", function () {
        side.classList.toggle("open");
      });
    }
  }

  function readCache() {
    try {
      var raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || !obj.ts || Date.now() - obj.ts > CACHE_TTL) return null;
      return obj.data;
    } catch (e) {
      return null;
    }
  }

  function writeCache(data) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data }));
    } catch (e) { /* quota / private mode */ }
  }

  function applyData(json) {
    var books = indexBooks(json.buku || []);
    window.__BOOKS = books;
    window.__DATA = json;
    fillKat(json.kategori || books);
    renderBooks();
    renderChart(books);
    renderTestCases(json.test_cases || []);
    renderReport(books);
  }

  function renderReport(books) {
    var tb = $("#report-body");
    if (!tb || !books || !books.length) return;
    tb.innerHTML = books.map(function (b) {
      return "<tr><td>" + escapeHtml(b.kode) + "</td><td>" + escapeHtml(b.judul) +
        "</td><td>" + b.stok + "</td><td>" + escapeHtml(b.availability) + "</td></tr>";
    }).join("");
  }

  /** Katalog dari data.json — cache + fetch */
  function loadCatalog() {
    var grid = $("#book-grid");
    var needBooks = !!grid || !!$("#chart-kategori") || !!$("#tc-table") || !!$("#report-body");
    if (!needBooks && !grid) {
      // tetap coba load jika ada tabel test case
      if (!$("#tc-body") && !$("#test-case-body")) return;
    }

    var cached = readCache();
    if (cached) {
      applyData(cached);
    }

    var dataUrl =
      (grid && grid.getAttribute("data-json")) ||
      ($("#tc-body") && $("#tc-body").getAttribute("data-json")) ||
      ($("#test-case-body") && $("#test-case-body").getAttribute("data-json")) ||
      "../data/data.json";

    // path relatif dari root pages
    if (location.pathname.indexOf("/pages/") === -1 && location.pathname.indexOf("/docs/") === -1) {
      if (dataUrl.indexOf("../") === 0) dataUrl = dataUrl.replace("../", "");
    }

    fetch(dataUrl, { cache: "force-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (json) {
        writeCache(json);
        applyData(json);
      })
      .catch(function () {
        if (cached) return; // sudah pakai cache
        if (grid) {
          grid.innerHTML =
            '<p class="empty">Gagal memuat data.json — pastikan path benar di GitHub Pages.</p>';
        }
      });

    var sq = $("#search-q");
    var fk = $("#filter-kat");
    if (sq) {
      sq.addEventListener("input", function () {
        clearTimeout(_searchTimer);
        _searchTimer = setTimeout(renderBooks, 120);
      });
    }
    if (fk) fk.addEventListener("change", renderBooks);
  }

  function fillKat(src) {
    var sel = $("#filter-kat");
    if (!sel || _katFilled) return;
    var list = [];
    if (src && src.length && typeof src[0] === "string") {
      list = src.slice().sort();
    } else if (Array.isArray(src)) {
      var set = {};
      src.forEach(function (b) {
        if (b.kategori) set[b.kategori] = true;
      });
      list = Object.keys(set).sort();
    }
    list.forEach(function (k) {
      var o = document.createElement("option");
      o.value = k;
      o.textContent = k;
      sel.appendChild(o);
    });
    _katFilled = true;
  }

  function renderBooks() {
    var grid = $("#book-grid");
    if (!grid || !window.__BOOKS) return;
    var q = (($("#search-q") && $("#search-q").value) || "").trim().toLowerCase();
    var kat = ($("#filter-kat") && $("#filter-kat").value) || "";
    var books = window.__BOOKS;
    var list = [];
    for (var i = 0; i < books.length; i++) {
      var b = books[i];
      if (kat && b.kategori !== kat) continue;
      if (q && (b._q || "").indexOf(q) === -1) continue;
      list.push(b);
    }
    if (!list.length) {
      grid.innerHTML = '<p class="empty">Tidak ada buku yang cocok.</p>';
      return;
    }
    var html = "";
    for (var j = 0; j < list.length; j++) {
      var x = list[j];
      html +=
        '<article class="card book-card">' +
        '<div class="book-cover">' +
        escapeHtml(x.judul.charAt(0)) +
        "</div>" +
        '<div class="book-body">' +
        '<span class="muted">' +
        escapeHtml(x.kode) +
        " · " +
        escapeHtml(x.kategori) +
        "</span>" +
        "<h3>" +
        escapeHtml(x.judul) +
        "</h3>" +
        '<p class="muted">' +
        escapeHtml(x.pengarang) +
        " · " +
        x.tahun +
        "</p>" +
        '<p class="stars" title="Rating">' +
        stars(x.rating) +
        ' <span class="muted">' +
        x.rating +
        "</span></p>" +
        "<p>" +
        escapeHtml(x.deskripsi) +
        "</p>" +
        availabilityBadge(x.availability, x.stok) +
        ' <span class="badge badge-sold">Dipinjam ' +
        (x.sold || 0) +
        "×</span>" +
        ' <span class="muted">Stok: ' +
        x.stok +
        "</span>" +
        "</div></article>";
    }
    grid.innerHTML = html;
  }

  /** Grafik sederhana (canvas) — target #9 / #33 */
  function renderChart(books) {
    var canvas = $("#chart-kategori");
    if (!canvas || !canvas.getContext) return;
    var counts = {};
    for (var i = 0; i < books.length; i++) {
      var k = books[i].kategori;
      counts[k] = (counts[k] || 0) + 1;
    }
    var labels = Object.keys(counts);
    var values = labels.map(function (k) { return counts[k]; });
    var ctx = canvas.getContext("2d");
    var w = canvas.width;
    var h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    var max = Math.max.apply(null, values.concat([1]));
    var barW = labels.length ? (w - 40) / labels.length : 0;
    for (var i = 0; i < labels.length; i++) {
      var bh = (values[i] / max) * (h - 50);
      var x = 30 + i * barW;
      var y = h - 30 - bh;
      ctx.fillStyle = "#6366f1";
      ctx.fillRect(x + 8, y, barW - 16, bh);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px sans-serif";
      ctx.fillText(labels[i].slice(0, 8), x + 4, h - 12);
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(String(values[i]), x + barW / 2 - 4, y - 4);
    }
  }

  /** Isi tabel test case jika ada di halaman pengujian */
  function renderTestCases(cases) {
    var body = $("#tc-body") || $("#test-case-body");
    if (!body || !cases.length) return;
    var html = "";
    for (var i = 0; i < cases.length; i++) {
      var t = cases[i];
      html +=
        "<tr><td>" +
        escapeHtml(t.id) +
        "</td><td>" +
        escapeHtml(t.modul) +
        "</td><td>" +
        escapeHtml(t.skenario) +
        "</td><td>" +
        escapeHtml(t.data) +
        "</td><td>" +
        escapeHtml(t.hasil) +
        "</td></tr>";
    }
    body.innerHTML = html;
  }

  /** Login mock (UI only) — validasi client */
  function wireLoginMock() {
    var form = $("#login-mock-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var user = ($("#login-name") && $("#login-name").value) || "";
      var pass = ($("#login-pass") && $("#login-pass").value) || "";
      var box = $("#login-msg");
      if (!box) return;
      if (!user || !pass) {
        box.className = "alert alert-false";
        box.textContent = "FALSE — Nama dan password wajib diisi (validasi).";
        return;
      }
      if (pass.length < 6) {
        box.className = "alert alert-false";
        box.textContent = "FALSE — Password minimal 6 karakter.";
        return;
      }
      box.className = "alert alert-true";
      box.textContent = "TRUE — Format valid (demo UI saja; login nyata di aplikasi PHP).";
    });
  }

  /** Komentar lokal (localStorage) */
  function wireComments() {
    var list = $("#comment-list");
    var form = $("#comment-form");
    if (!list || !form) return;
    var key = "perpus_comments_v1";
    function load() {
      try {
        return JSON.parse(localStorage.getItem(key) || "[]");
      } catch (e) {
        return [];
      }
    }
    function save(arr) {
      localStorage.setItem(key, JSON.stringify(arr));
    }
    function render() {
      var arr = load();
      list.innerHTML = arr.length
        ? arr
            .map(function (c) {
              return (
                '<div class="comment-item"><strong>' +
                escapeHtml(c.name) +
                '</strong> <span class="muted">' +
                escapeHtml(c.at) +
                "</span><p>" +
                escapeHtml(c.text) +
                "</p></div>"
              );
            })
            .join("")
        : '<p class="muted">Belum ada komentar.</p>';
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = ($("#c-name") && $("#c-name").value) || "Anonim";
      var text = ($("#c-text") && $("#c-text").value) || "";
      if (text.trim().length < 3) return;
      var arr = load();
      arr.unshift({ name: name, text: text, at: new Date().toLocaleString("id-ID") });
      save(arr.slice(0, 50));
      form.reset();
      render();
    });
    render();
  }

  document.addEventListener("DOMContentLoaded", function () {
    applyConfig();
    markNav();
    wireNav();
    loadCatalog();
    wireLoginMock();
    wireComments();
  });
})();
