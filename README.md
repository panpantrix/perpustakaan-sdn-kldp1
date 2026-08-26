# Perpustakaan Digital SDN 1 Kalidadap — GitHub Pages

Situs **statis** untuk dokumentasi, katalog contoh, mock UI login/dashboard, dan ceklist target Pra Uji UKK 2026.

| Layanan | URL |
|---------|-----|
| **GitHub Pages** | [https://panpantrix.github.io/perpustakaan-sdn-kldp1/](https://panpantrix.github.io/perpustakaan-sdn-kldp1/) |
| **Aplikasi live (PHP/MySQL)** | [https://peminjamanbuku.infinityfreeapp.com/](https://peminjamanbuku.infinityfreeapp.com/) |
| **Dokumen UKK (buka di browser)** | [Buka dokumen](https://view.officeapps.live.com/op/view.aspx?src=https%3A%2F%2Fraw.githubusercontent.com%2Fpanpantrix%2Fperpustakaan-sdn-kldp1%2Fmain%2FDOKUMEN_UKK_PERPUSTAKAAN_DIGITAL%20%281%29.docx) |
## File wajib UKK Pages (#67–72)

| # | File | Path |
|---|------|------|
| 67 | index.html | `/index.html` |
| 68 | config.js | `/config.js` |
| 69 | script.js | `/assets/js/script.js` |
| 70 | style.css | `/assets/css/style.css` |
| 71 | data.json | `/data/data.json` |
| 72 | README.md | `/README.md` |

## Cara deploy

1. Extract isi folder ini ke **root** repo (jangan upload `.zip` utuh).
2. Pastikan root berisi `index.html`, `config.js`, `assets/`, `data/`, `pages/`, `docs/`.
3. GitHub → **Settings → Pages** → branch `main` → folder `/ (root)`.
4. URL: `https://panpantrix.github.io/perpus-sdn-kldp/`
5. Di `config.js` pastikan: `basePath: "/perpus-sdn-kldp"` dan `liveAppUrl` mengarah ke hosting PHP.

## Struktur folder (rapi)

```
/
├── index.html
├── config.js
├── README.md
├── .nojekyll
├── 404.html
├── assets/
│   ├── css/style.css
│   ├── js/script.js
│   ├── icons/book.svg
│   ├── img/
│   └── video/
├── data/data.json
├── pages/
│   ├── katalog.html
│   ├── login.html
│   ├── dashboard.html
│   ├── dokumentasi.html
│   ├── pengujian.html
│   ├── kontak.html
│   └── help.html
└── docs/ceklist-ukk.html
```

## Catatan

- Semua halaman memakai navigasi konsisten + tombol **Aplikasi Live** yang langsung mengarah ke `liveAppUrl` di `config.js`.
- Target database, stored procedure, trigger, commit/rollback → **aplikasi PHP (InfinityFree)**.
- Target GitHub Pages (index, config, script, style, data.json, README, UI) → **repo ini**.
- Ceklist lengkap target 1–102: [docs/ceklist-ukk.html](docs/ceklist-ukk.html)

## Versi

`1.1.1` — struktur dirapikan, nav seragam, tombol live app dipromosikan.
