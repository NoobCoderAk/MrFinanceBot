/**
 * sheetsWriter.js
 * Menulis data transaksi ke Google Sheets menggunakan appendRow langsung,
 * tanpa bergantung pada header matching.
 *
 * Struktur sheet MrFinance (Cashflow):
 * Row 1 : Judul "💰 CASHFLOW TRACKER — TOKO SISWA"
 * Row 2 : Header -> Tanggal | Tipe | Kategori | Keterangan | Akun/Sumber Dana | Nominal (Rp) | Bulan | Tahun | Catatan
 * Row 3+ : Data transaksi
 */

const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
const fs = require("fs");
const path = require("path");

let cachedSheet = null;

async function getSheet() {
  if (cachedSheet) return cachedSheet;

  const credentialsPath = path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH);

  if (!fs.existsSync(credentialsPath)) {
    throw new Error(`File credentials tidak ditemukan di: ${credentialsPath}`);
  }

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));

  const serviceAccountAuth = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, serviceAccountAuth);
  await doc.loadInfo();
  console.log(`[Sheets] Terhubung ke: "${doc.title}"`);

  const sheetName = process.env.SHEET_NAME || "Cashflow";
  const sheet = doc.sheetsByTitle[sheetName];

  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" tidak ditemukan. Periksa nama tab di spreadsheet.`);
  }

  cachedSheet = sheet;
  return cachedSheet;
}

/**
 * Mengonversi string tanggal DD/MM/YYYY ke serial number Google Sheets.
 *
 * Google Sheets menyimpan tanggal sebagai angka (serial):
 * - 1 = 1 Januari 1900
 * - Serial ini yang membuat formula MONTH() dan YEAR() bisa bekerja.
 *
 * @param {string} dateStr - Format: "23/06/2026"
 * @returns {number} - Serial number untuk Google Sheets
 */
function toSheetsSerial(dateStr) {
  const [day, month, year] = dateStr.split("/").map(Number);
  const date = new Date(year, month - 1, day);
  // Epoch Google Sheets dimulai 30 Desember 1899
  const epoch = new Date(1899, 11, 30);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((date - epoch) / msPerDay);
}

/**
 * Menambahkan baris transaksi dengan appendCells langsung ke Google Sheets API.
 * Metode ini tidak bergantung pada header matching — langsung tulis ke kolom A-F.
 *
 * Kolom yang diisi:
 * A: Tanggal (sebagai serial number agar formula Bulan/Tahun otomatis terhitung)
 * B: Tipe
 * C: Kategori
 * D: Keterangan
 * E: Akun/Sumber Dana
 * F: Nominal (Rp)
 * G-I: Dibiarkan kosong (Bulan & Tahun sudah ada formula di template)
 *
 * @param {Object} transaction - Hasil ekstraksi Gemini
 */
async function appendTransaction(transaction) {
  const sheet = await getSheet();

  // Konversi tanggal ke serial number Google Sheets
  const dateSerial = toSheetsSerial(transaction.Tanggal);

  // Siapkan values sebagai array berurutan sesuai kolom A-I
  // Kolom G (Bulan), H (Tahun), I (Catatan) dikosongkan — Bulan & Tahun via formula
  const values = [
    dateSerial,               // A: Tanggal (serial number)
    transaction.Tipe,         // B: Tipe
    transaction.Kategori,     // C: Kategori
    transaction.Keterangan,   // D: Keterangan
    transaction.Akun,         // E: Akun/Sumber Dana
    transaction.Nominal,      // F: Nominal (Rp)
    "",                       // G: Bulan (formula otomatis)
    "",                       // H: Tahun (formula otomatis)
    "",                       // I: Catatan
  ];

  // appendRow() menulis langsung ke baris berikutnya setelah data terakhir
  // tanpa perlu tahu nomor baris — cocok untuk append log transaksi
  await sheet.addRow(values);

  console.log(`[Sheets] Baris berhasil ditambahkan: Tanggal=${transaction.Tanggal}, ` +
    `Tipe=${transaction.Tipe}, Kategori=${transaction.Kategori}, ` +
    `Nominal=${transaction.Nominal}, Akun=${transaction.Akun}`);
}

module.exports = { appendTransaction };