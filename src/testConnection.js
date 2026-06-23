/**
 * testConnection.js
 * Script diagnostik untuk memverifikasi koneksi ke Google Sheets.
 * Jalankan dengan: node src/testConnection.js
 */

require("dotenv").config();

const { GoogleSpreadsheet } = require("google-spreadsheet");
const { JWT } = require("google-auth-library");
const fs = require("fs");
const path = require("path");

async function testConnection() {
  console.log("=== TEST KONEKSI GOOGLE SHEETS ===\n");

  try {
    // 1. Baca credentials
    const credPath = path.resolve(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH);
    const credentials = JSON.parse(fs.readFileSync(credPath, "utf8"));
    console.log(`✅ Credentials ditemukan`);
    console.log(`   Service Account: ${credentials.client_email}\n`);

    // 2. Autentikasi
    const auth = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    // 3. Koneksi ke spreadsheet
    const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, auth);
    await doc.loadInfo();
    console.log(`✅ Spreadsheet ditemukan: "${doc.title}"`);
    console.log(`   Sheet yang tersedia: ${Object.keys(doc.sheetsByTitle).join(", ")}\n`);

    // 4. Cek sheet target
    const sheetName = process.env.SHEET_NAME || "Cashflow";
    const sheet = doc.sheetsByTitle[sheetName];
    if (!sheet) {
      console.error(`❌ Sheet "${sheetName}" TIDAK DITEMUKAN!`);
      return;
    }
    console.log(`✅ Sheet "${sheetName}" ditemukan`);
    console.log(`   Jumlah baris: ${sheet.rowCount}, Jumlah kolom: ${sheet.columnCount}\n`);

    // 5. Baca 3 baris pertama untuk verifikasi header
    await sheet.loadCells("A1:I3");
    console.log("📋 Isi baris 1-3 (kolom A-I):");
    for (let r = 0; r < 3; r++) {
      const row = [];
      for (let c = 0; c < 9; c++) {
        const cell = sheet.getCell(r, c);
        row.push(cell.value ?? "(kosong)");
      }
      console.log(`   Row ${r + 1}: [${row.join(" | ")}]`);
    }

    // 6. Test tulis satu baris (baris tes)
    console.log("\n📝 Mencoba menulis baris TEST...");
    const testRow = await sheet.addRow([
      46174,        // Tanggal serial (= 1 Juni 2026)
      "Pengeluaran",
      "TEST",
      "TEST KONEKSI - BOLEH DIHAPUS",
      "Tunai",
      1,            // Nominal Rp1
      "",
      "",
      "test",
    ]);
    console.log(`✅ BERHASIL menulis baris test! Row index: ${testRow.rowNumber}`);
    console.log(`\n🎉 Semua OK! Bot siap digunakan.`);
    console.log(`   (Hapus baris "TEST KONEKSI" di spreadsheet Anda)`);

  } catch (err) {
    console.error(`\n❌ ERROR: ${err.message}`);
    if (err.message.includes("403")) {
      console.error(`\n⚠️  Kemungkinan penyebab: Service Account belum di-share ke spreadsheet.`);
      console.error(`   Buka spreadsheet → Share → tambahkan email Service Account sebagai Editor.`);
    }
  }
}

testConnection();
