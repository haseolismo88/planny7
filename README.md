# Planny3 — integrasi OpenAI

Projek lengkap untuk GitHub/Vercel. Reka bentuk, 30 hari × 4 idea, pilihan gaya/suara/durasi, prompt gambar/video, copy, eksport dan sejarah produk dikekalkan.

## Pembaikan

- Fail asal sudah mempunyai `/api/dialogue` dan panggilan HTTP ke OpenAI; bukan semua janaan dibuat secara tempatan. Tetapi dependency SDK rasmi dan `/api/generate` belum ada.
- Butang **Buatkan ayat video saya** kini memanggil `/api/generate` melalui SDK rasmi `openai` dan Responses API. `/api/dialogue` kekal sebagai alias untuk tab lama.
- Butang **Bina Content 30 Hari** dalam mod creator kini turut menjana dialog OpenAI berdasarkan storyline asal. Branding/views kekal mengikut matlamatnya. Skrip creator 32 saat (4 × 8 saat), dalam julat asal 25–35 saat.
- Produk: 10 idea setiap permintaan, lazimnya 12 permintaan untuk 120 idea. Konteks scene dihantar tanpa menggandakan keseluruhan prompt gambar/video, menjimatkan input. Server membuat maksimum tiga cubaan, membaiki hanya part yang gagal sambil mengekalkan part sah; frontend produk boleh mencuba sekali lagi jika menemui ayat berulang. Ini bukan 120 panggilan berasingan.
- SDK membaca **hanya** `process.env.OPENAI_API_KEY` pada server. Model sedia ada `gpt-4.1-mini` dikekalkan; `OPENAI_MODEL` boleh mengatasinya. Akses model sebenar bergantung pada akaun OpenAI anda.
- JSON berstruktur, ID, bilangan scene, 17–20 perkataan setiap part 8 saat dan ayat pendua disemak. Server tidak mencetak key, header, input pengguna atau mesej ralat SDK mentah.
- Loading/disable butang, ralat konfigurasi/auth/quota/server/timeout/JSON/network dan fallback jelas. Label **Templat tempatan · bukan OpenAI** kelihatan terus pada dialog dan eksport.
- Jika janaan produk terganggu, part AI yang siap dikekalkan dan baki menggunakan enjin tempatan. Dengan input/pilihan sama, tekan jana semula untuk menyambung part AI yang belum siap. Janaan tempatan tidak dikira sebagai set OpenAI lengkap. Mod creator mengekalkan idea templat apabila API gagal; percubaan semulanya menjana semula skrip creator.
- IndexedDB/Web Locks yang tidak tersedia tidak lagi menghalang panggilan API. Jika simpanan gagal, hasil boleh digunakan dalam sesi semasa dengan amaran untuk dimuat turun. Tanpa Web Locks, elakkan janaan serentak dalam beberapa tab.

## Deploy

1. Extract ZIP. Upload **semua fail dan folder dalam `planny3`**, termasuk `api/`, ke repository anda. Jangan upload ZIP sahaja.
2. Vercel Root Directory mesti menunjuk ke folder yang mengandungi `index.html`, `package.json`, `vercel.json` dan `api/`.
3. Framework Preset: **Other**, Node.js **22.x**. Kekalkan konfigurasi `builds` yang disertakan. Jangan campur dengan `functions`. Ia menetapkan binaan static dan Node Function secara eksplisit seperti projek asal.
4. Pastikan `OPENAI_API_KEY` tersedia untuk environment deployment yang digunakan (Production/Preview). Jangan masukkan nilainya ke HTML, GitHub atau fail public.
5. Pilihan: `OPENAI_MODEL=gpt-4.1-mini`. Deploy commit baharu yang mengandungi semua folder. Jika anda redeploy commit lama, pembaikan ini tidak akan digunakan.
6. Buka laman dan jana. Dialog mesti menunjukkan **Dijana OpenAI**. Jika fallback muncul, baca mesej ralat di hasil dan semak Vercel Function Logs.

`pnpm-lock.yaml` mengunci dependency. Vercel memasang dependency ketika membina. ZIP tidak mengandungi `node_modules` atau secret.

## Ujian

Dengan Node.js 22+ dan pnpm:

```sh
pnpm install
pnpm verify
pnpm test
pnpm exec playwright install chromium
pnpm test:browser
```

Untuk menggunakan Chrome sedia dipasang bagi ujian browser, tetapkan `PLAYWRIGHT_EXECUTABLE_PATH` kepada executable Chrome itu.

Selepas deploy:

```sh
pnpm smoke https://DOMAIN-ANDA.vercel.app
pnpm smoke https://DOMAIN-ANDA.vercel.app --live
```

Arahan pertama hanya menyemak GET 405 dan tidak menggunakan kredit. `--live` membuat satu permintaan idea kepada OpenAI melalui server dan menggunakan kredit API anda. Ia tidak membaca atau mendedahkan key. Selepas itu, uji butang dalam browser untuk mengesahkan dialog muncul.

## Status pengesahan pakej

- Semakan sintaks skrip HTML, fail JavaScript dan pemetaan route lulus.
- Ujian handler dan SDK rasmi dengan respons simulasi lulus: input tidak sah, key tiada, pembetulan output, refusal, 401/403/404/429/500, timeout dan perlindungan mesej ralat.
- Ujian browser automatik menggunakan endpoint HTTP tempatan dan respons model simulasi: 12 kumpulan/120 idea, payload produk, paparan/copy/eksport, hari 30, reload hasil tersimpan, mobile, 56 saat, storan disekat, fallback dan resume, branding, network dan JSON tidak sah.
- Ujian dijalankan dengan Node.js 24 dan Chrome tempatan; sasaran deployment kekal Node.js 22, disokong dependency SDK.
- Ujian semasa: lapan ujian backend lulus, termasuk 1/10 idea pada 8/32/56 saat, 17–20 perkataan diterima, 16/21 ditolak, pembaikan part terpilih, duplicate/ID/part salah, dan simulasi ralat API. Ujian browser lulus untuk kedua-dua mod, semua tujuh kod ralat, 120 idea, mobile, copy/eksport, simpanan dan resume tanpa ralat runtime.
- Satu panggilan OpenAI sebenar dengan key baharu berjaya: HTTP 200, dialog 17 perkataan selepas tiga cubaan. Ini tidak menjamin semua input atau batch besar akan berjaya. Deployment Vercel dan laman live belum diuji; jalankan smoke `--live` selepas deploy.
- Keunikan ayat disemak dalam kumpulan dan sejarah browser; keunikan makna atau merentas peranti tidak dijamin. Fallback tempatan mengekalkan sifat dan batasan enjin asal.

## Fail berubah / baharu

- `index.html` — kedua-dua aliran Generate, payload scene, kumpulan 10, fallback, label, simpanan, eksport dan dialog creator.
- `api/generate.js` — baharu; SDK rasmi, validasi, JSON dan pengendalian ralat.
- `api/dialogue.js` — alias serasi untuk endpoint lama.
- `package.json`, `pnpm-lock.yaml` — dependency dan arahan ujian.
- `vercel.json` — route/builder baharu sambil mengekalkan route lama.
- `scripts/verify-deploy.mjs`, `scripts/smoke.mjs` — semakan pakej dan deployment.
- `test/api.test.js`, `test/browser.mjs` — ujian API/SDK/browser.
- `README.md` — panduan dan batasan pengesahan.

`.env.example`, `.gitignore` dan `.vercelignore` dikekalkan.

Rujukan rasmi: [GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

## Pembaikan kestabilan dialog — 29 September 2026

- Punca: syarat tepat 18 perkataan di server dan kedua-dua mod frontend, retry seluruh batch, dan ralat creator yang disembunyikan.
- Validasi kini 17–20 perkataan, jenis string, ID, bilangan part dan pendua teks yang dinormalisasi. Persamaan makna sahaja tidak menolak output OpenAI.
- Retry maksimum tiga cubaan menyimpan part sah, menghantar hanya part gagal dengan konteks cerita penuh. Had masa keseluruhan 105 saat, di bawah timeout frontend 115 saat dan fungsi 120 saat.
- Responses API, Structured Outputs, model gpt-4.1-mini dan override OPENAI_MODEL dikekalkan. Rujukan rasmi: https://developers.openai.com/api/docs/guides/structured-outputs
- Key baharu disimpan hanya dalam .env.local. Fail ini diabaikan oleh Git dan Vercel. Ia tidak memasang key secara automatik dalam Vercel: tetapkan OPENAI_API_KEY untuk Production/Preview dan redeploy.
- Selepas deploy, uji kedua-dua mod, pilih 8/32/56 saat, semak label Dijana OpenAI, hari 30, copy/eksport dan refresh hasil tersimpan. Semak Function Logs jika ada kod ralat. Jangan uji key tidak sah pada Production; gunakan Preview jika perlu.
