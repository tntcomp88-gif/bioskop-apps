# Panduan Deployment Online - Aplikasi Bioskop PWA

Aplikasi ini dibangun menggunakan **React (Vite)** dan **Tailwind CSS**. Karena berarsitektur Client-Side SPA (Single Page Application) dengan penyimpanan data lokal (`localStorage`), Anda dapat menaruh aplikasi ini secara online (hosting) dengan sangat mudah dan **Gratis**.

Berikut adalah opsi terbaik dan langkah-langkah praktis untuk mengonlinekan aplikasi ini:

---

## Opsi 1: Vercel (Paling Direkomendasikan & Tercepat ⭐)
Vercel adalah platform hosting gratis yang sangat populer untuk aplikasi React/Vite. Sangat mudah digunakan dan mendukung pembaruan otomatis setiap kali Anda memperbarui kode.

### Langkah-langkah:
1. **Ekspor Projek dari AI Studio**:
   - Klik menu **Settings** di pojok kanan atas AI Studio.
   - Pilih opsi **Export to GitHub** jika ingin langsung terhubung ke gudang kode Anda, atau pilih **Download ZIP** untuk menyimpannya di komputer Anda.
2. **Unggah ke GitHub**:
   - Buat repositori baru di akun GitHub Anda (misal: `bioskop-pwa`).
   - Ekstrak ZIP dan unggah/push seluruh folder projek ini ke repositori tersebut.
3. **Hubungkan ke Vercel**:
   - Buka [vercel.com](https://vercel.com/) dan masuk menggunakan akun GitHub Anda.
   - Klik tombol **Add New** -> **Project**.
   - Pilih repositori `bioskop-pwa` yang baru saja Anda buat.
4. **Konfigurasi Build (Otomatis Terdeteksi)**:
   - **Framework Preset**: Pilih `Vite` (biasanya sudah otomatis).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. **Klik Deploy**:
   - Tunggu proses build selama kurang lebih 1 menit.
   - Selesai! Aplikasi Anda sekarang online dan memiliki domain bawaan dari Vercel (misalnya: `https://bioskop-pwa.vercel.app`).

---

## Opsi 2: Netlify (Sangat Mudah Drad-and-Drop)
Jika Anda tidak ingin mengunggah kode ke GitHub terlebih dahulu, Anda bisa melakukan deploy instan dengan cara melempar folder hasil kompilasi.

### Langkah-langkah:
1. **Build Projek Secara Lokal**:
   - Di komputer Anda, instal node dependencies terlebih dahulu: `npm install`
   - Buat versi produksi aplikasi Anda dengan mengetikkan: `npm run build`
   - Perintah di atas akan menghasilkan sebuah folder baru bernama **`dist`** yang berisi file HTML, JS, dan CSS statis.
2. **Kirim ke Netlify**:
   - Buka [app.netlify.com](https://app.netlify.com/) (daftar akun gratis jika belum punya).
   - Masuk ke menu **Sites**.
   - Cari bagian **"Drag and drop your site folder here"** di bagian paling bawah halaman.
   - Tarik dan lepas (drag & drop) folder **`dist`** tersebut ke area tersebut.
3. Sepersekian detik kemudian, aplikasi Anda telah online dan siap diakses!

---

## Opsi 3: Cloudflare Pages (Gratis & Sangat Cepat)
Sama seperti Vercel, Cloudflare Pages menawarkan hosting berkinerja tinggi yang terhubung langsung ke GitHub Anda secara gratis dengan kuota bandwidth tidak terbatas.

### Langkah-langkah:
1. Masuk ke dashboard [dash.cloudflare.com](https://dash.cloudflare.com/).
2. Masuk ke menu **Workers & Pages** -> Pilih tab **Pages** -> Klik **Connect to Git**.
3. Pilih repositori GitHub Anda.
4. Set konfigurasi build preset ke **Vite** (`npm run build` dan folder output `dist`).
5. Klik **Save and Deploy**.

---

## Catatan Penting
- **Penyimpanan Data**: Karena saat ini aplikasi menggunakan `localStorage` untuk database internal yang portabel (tanpa server database eksternal), maka semua data cinema, pemesanan tiket, voucher, dan saldo pengguna akan tersimpan dengan aman pada memori browser masing-masing pengguna. 
- Jika nantinya Anda ingin menyinkronkan data di antara semua perangkat secara terpusat (multi-pengguna online secara real-time), Anda dapat mengintegrasikannya dengan layanan database cloud murni seperti **Firebase Firestore** yang juga tersedia fiturnya di aplikasi ini.
