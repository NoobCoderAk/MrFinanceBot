# 🤖 Telegram Finance Bot

Bot Telegram pencatat keuangan pribadi yang menggunakan **Google Gemini AI** untuk memahami pesan bahasa Indonesia sehari-hari dan menyimpannya langsung ke **Google Sheets**.

---

## 📁 Struktur Folder

```
telegram-finance-bot/
├── src/
│   ├── index.js            # Entry point — inisialisasi bot & handler pesan
│   ├── geminiExtractor.js  # Modul AI: ekstraksi data transaksi via Gemini
│   ├── sheetsWriter.js     # Modul Sheets: tulis data ke Google Sheets
│   └── formatter.js        # Utilitas format pesan & tanggal
├── .env                    # ⚠️ Konfigurasi rahasia (JANGAN di-commit ke Git)
├── .gitignore
├── credentials.json        # ⚠️ Service Account key (JANGAN di-commit ke Git)
├── package.json
└── README.md
```

---

## 🚀 Panduan Setup Lengkap

### Langkah 1 — Instalasi Dependencies

```bash
# Masuk ke folder project
cd telegram-finance-bot

# Install semua library yang dibutuhkan
npm install
```

Library yang akan terinstall:
- `node-telegram-bot-api` — Menerima & membalas pesan Telegram
- `@google/generative-ai` — Client resmi Google Gemini AI
- `google-spreadsheet` — Baca/tulis Google Sheets
- `google-auth-library` — Autentikasi Service Account Google
- `dotenv` — Memuat variabel dari file `.env`

---

### Langkah 2 — Buat Telegram Bot

1. Buka Telegram, cari **@BotFather**
2. Kirim `/newbot`
3. Ikuti instruksi (beri nama & username untuk bot Anda)
4. BotFather akan memberikan **Token** — copy dan simpan
5. Paste token ke file `.env` di variabel `TELEGRAM_BOT_TOKEN`

---

### Langkah 3 — Dapatkan Gemini API Key

1. Buka [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Klik **Create API Key**
3. Copy API Key tersebut
4. Paste ke file `.env` di variabel `GEMINI_API_KEY`

---

### Langkah 4 — Setup Google Cloud & Service Account

1. Buka [https://console.cloud.google.com](https://console.cloud.google.com)
2. Buat project baru atau pilih project yang sudah ada
3. Di menu pencarian, cari **"Google Sheets API"** → Klik **Enable**
4. Di menu kiri: **IAM & Admin** → **Service Accounts**
5. Klik **Create Service Account**
   - Beri nama, misal: `finance-bot`
   - Klik **Create and Continue** → **Done**
6. Klik service account yang baru dibuat
7. Tab **Keys** → **Add Key** → **Create new key** → pilih **JSON** → **Create**
8. File `credentials.json` akan otomatis terdownload
9. **Pindahkan file tersebut ke folder root project ini**

---

### Langkah 5 — Setup Google Sheets

1. Buka [Google Sheets](https://sheets.google.com) dan buat spreadsheet baru
2. Buat sheet dengan nama tab **"Cashflow"**
3. Isi header di baris pertama (A1 sampai F1):

   | A | B | C | D | E | F |
   |---|---|---|---|---|---|
   | Date | Type | Category | Amount | Notes | Account |

4. Ambil **Spreadsheet ID** dari URL:
   ```
   https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit
   ```
5. Paste ke file `.env` di variabel `SPREADSHEET_ID`
6. **Share spreadsheet** ke email Service Account Anda:
   - Klik tombol **Share** di kanan atas
   - Masukkan email dari `client_email` di file `credentials.json`
   - Berikan akses **Editor**
   - Klik **Send**

---

### Langkah 6 — Konfigurasi File .env

Edit file `.env` dan isi semua nilainya:

```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdef...
GEMINI_API_KEY=AIzaSy...
SPREADSHEET_ID=1BxiM...
SHEET_NAME=Cashflow
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./credentials.json
```

---

### Langkah 7 — Jalankan Bot

```bash
# Mode production
npm start

# Mode development (auto-restart saat ada perubahan file)
npm run dev
```

Jika berhasil, terminal akan menampilkan:
```
🤖 Bot Telegram aktif dan mendengarkan pesan...
[Sheets] Terhubung ke: "Nama Spreadsheet Anda"
```

---

## 💬 Cara Penggunaan

Kirim pesan ke bot Telegram Anda:

**Pengeluaran:**
```
makan Bebek Hokky 45.000
beli token PLN 100rb
belanja di Indomaret 50k pake GoPay
bayar Grab ke bandara 80.000
beli obat di apotek 35rb
nonton bioskop 60k pake OVO
```

**Pemasukan:**
```
gajian bulan ini 5jt
terima transfer freelance 500rb
dapat bonus 1.5jt
```

**Format nominal yang didukung:**
- `45.000` atau `45,000` → 45000
- `50k` → 50000
- `100rb` atau `100ribu` → 100000
- `1.5jt` atau `1,5juta` → 1500000

---

## 🔍 Troubleshooting

| Error | Solusi |
|-------|--------|
| `TELEGRAM_BOT_TOKEN tidak valid` | Periksa token di `.env`, pastikan tidak ada spasi |
| `File credentials tidak ditemukan` | Pastikan `credentials.json` ada di folder root project |
| `Sheet "Cashflow" tidak ditemukan` | Periksa nama tab sheet di Spreadsheet Anda |
| `403 Forbidden` (Sheets) | Share spreadsheet ke email di `client_email` dalam `credentials.json` |
| Bot tidak merespons | Jalankan ulang dengan `npm start`, cek terminal untuk error |
