/**
 * geminiExtractor.js
 * Modul untuk menghubungi Google Gemini AI dan mengekstrak
 * data transaksi keuangan dari pesan teks bebas (bahasa Indonesia).
 *
 * Disesuaikan dengan template MrFinance:
 * Kolom: Tanggal | Tipe | Kategori | Keterangan | Akun/Sumber Dana | Nominal (Rp)
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Inisialisasi Gemini client menggunakan API Key dari .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * System prompt yang disesuaikan dengan struktur sheet MrFinance.
 * Kolom target: Tanggal, Tipe, Kategori, Keterangan, Akun, Nominal
 */
const SYSTEM_PROMPT = `Kamu adalah asisten pencatat keuangan pribadi yang sangat teliti.
Tugasmu adalah mengekstrak informasi transaksi keuangan dari pesan teks bahasa Indonesia sehari-hari.

ATURAN WAJIB:
1. Selalu kembalikan respons HANYA dalam format JSON valid, tanpa teks tambahan, tanpa markdown, tanpa backtick.
2. JSON harus memiliki tepat 6 key: Tanggal, Tipe, Kategori, Keterangan, Akun, Nominal.
3. Jika pesan BUKAN transaksi keuangan (contoh: sapaan, pertanyaan umum, perintah /start), kembalikan JSON dengan key "error" berisi string penjelasan singkat.

ATURAN PER KEY:
- "Tanggal": Tanggal hari ini dalam format DD/MM/YYYY. Gunakan tanggal yang disediakan di konteks.
- "Tipe": HANYA boleh "Pemasukan" atau "Pengeluaran".
  * "Pengeluaran" untuk: beli, bayar, belanja, makan, minum, isi, transfer keluar, dll.
  * "Pemasukan" untuk: terima, gajian, dapat uang, transfer masuk, bonus, dll.
- "Kategori": Kategori dalam BAHASA INDONESIA. Tebak berdasarkan konteks:
  * Makanan, minuman, makan, minum, kopi, resto -> "Makan & Minum"
  * Transportasi, grab, gojek, bensin, tol, parkir, tiket -> "Transportasi"
  * Listrik, air, internet, token PLN, pulsa, wifi -> "Utilitas"
  * Hiburan, bioskop, game, streaming, netflix, spotify -> "Hiburan"
  * Belanja, indomaret, alfamart, supermarket, toko -> "Belanja Kebutuhan"
  * HP, laptop, elektronik, gadget, charger, kabel, cctv -> "Gadget & Elektronik"
  * Kesehatan, obat, dokter, apotek, klinik -> "Kesehatan"
  * Baju, pakaian, sepatu, fashion -> "Pakaian"
  * Buku, kursus, sekolah, kuliah -> "Pendidikan"
  * Gaji, honor, upah, salary -> "Gaji"
  * Bonus, THR, komisi, reward -> "Bonus"
  * Investasi, saham, reksadana -> "Investasi"
  * Lainnya -> "Lain-lain"
- "Nominal": Angka MURNI tanpa simbol, titik, atau koma ribuan.
  * "45.000" atau "45,000" -> 45000
  * "100rb" atau "100ribu" -> 100000
  * "50k" -> 50000
  * "1.5jt" atau "1,5juta" -> 1500000
  * "2jt" -> 2000000
- "Keterangan": Deskripsi singkat dan jelas dari transaksi dalam Bahasa Indonesia.
- "Akun": Sumber atau tujuan dana. Pilih dari opsi berikut berdasarkan konteks:
  * Kata "BRI", "brimo", "bri mobile" -> "BRImo"
  * Kata "mandiri", "livin", "livin'" -> "Livin'"
  * Kata "gopay", "ovo", "dana", "shopeepay", "qris", "e-wallet", "dompet digital" -> "E-Wallet/QRIS"
  * Kata "tunai", "cash", "kontan", atau TIDAK disebutkan sama sekali -> "Tunai"

CONTOH INPUT & OUTPUT:
Input: "makan Bebek Hokky 45.000"
Output: {"Tanggal":"23/06/2026","Tipe":"Pengeluaran","Kategori":"Makan & Minum","Nominal":45000,"Keterangan":"Makan Bebek Hokky","Akun":"Tunai"}

Input: "beli token PLN 100rb pake BRImo"
Output: {"Tanggal":"23/06/2026","Tipe":"Pengeluaran","Kategori":"Utilitas","Nominal":100000,"Keterangan":"Beli token PLN","Akun":"BRImo"}

Input: "belanja di Indomaret 50k pake GoPay"
Output: {"Tanggal":"23/06/2026","Tipe":"Pengeluaran","Kategori":"Belanja Kebutuhan","Nominal":50000,"Keterangan":"Belanja di Indomaret","Akun":"E-Wallet/QRIS"}

Input: "bayar Grab ke bandara 80.000"
Output: {"Tanggal":"23/06/2026","Tipe":"Pengeluaran","Kategori":"Transportasi","Nominal":80000,"Keterangan":"Grab ke bandara","Akun":"Tunai"}

Input: "gajian 5jt ke livin"
Output: {"Tanggal":"23/06/2026","Tipe":"Pemasukan","Kategori":"Gaji","Nominal":5000000,"Keterangan":"Gaji bulanan","Akun":"Livin'"}

Input: "halo" atau "/start"
Output: {"error":"Pesan bukan transaksi keuangan"}`;

// Urutan model yang akan dicoba jika model sebelumnya gagal (fallback chain)
const MODEL_FALLBACK_CHAIN = [
  "gemini-2.5-flash-lite",  // Prioritas utama: Free Tier, limit paling longgar
  "gemini-2.5-flash",       // Fallback 1: lebih kuat, masih Free Tier
  "gemini-2.5-pro",         // Fallback 2: paling kuat, Free Tier terbatas
];

/**
 * Delay helper — menunggu sejumlah milidetik sebelum melanjutkan.
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Memanggil satu model Gemini dengan retry otomatis (exponential backoff).
 */
async function callWithRetry(modelName, prompt, maxRetries = 3) {
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_PROMPT,
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (err) {
      const isRetryable =
        err.message.includes("503") ||
        err.message.includes("429") ||
        err.message.includes("500");

      const isLastAttempt = attempt === maxRetries;

      if (isRetryable && !isLastAttempt) {
        const backoffMs = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        console.warn(
          `[Gemini] Model ${modelName} gagal (attempt ${attempt}/${maxRetries}). ` +
          `Retry dalam ${(backoffMs / 1000).toFixed(1)}s...`
        );
        await delay(backoffMs);
      } else {
        throw err;
      }
    }
  }
}

/**
 * Fungsi utama: menerima teks pesan dan mengembalikan objek JSON transaksi.
 * Key yang dikembalikan: Tanggal, Tipe, Kategori, Keterangan, Akun, Nominal
 *
 * @param {string} messageText - Pesan mentah dari pengguna Telegram
 * @param {string} todayDate - Tanggal hari ini dalam format DD/MM/YYYY
 * @returns {Promise<Object>}
 */
async function extractTransaction(messageText, todayDate) {
  const prompt = `Tanggal hari ini: ${todayDate}\nPesan transaksi: "${messageText}"`;
  let lastError = null;

  for (const modelName of MODEL_FALLBACK_CHAIN) {
    try {
      console.log(`[Gemini] Mencoba model: ${modelName}`);
      const responseText = await callWithRetry(modelName, prompt);

      const cleanedResponse = responseText
        .replace(/^```json\n?/, "")
        .replace(/\n?```$/, "")
        .trim();

      const parsed = JSON.parse(cleanedResponse);
      console.log(`[Gemini] Berhasil dengan model: ${modelName}`);
      return parsed;

    } catch (err) {
      lastError = err;
      const is404 = err.message.includes("404") || err.message.includes("not found");
      const is503 = err.message.includes("503");
      const is429 = err.message.includes("429");

      if (is404 || is503 || is429) {
        console.warn(`[Gemini] Model ${modelName} tidak tersedia, mencoba fallback...`);
        continue;
      } else {
        console.error("[Gemini Error]", err.message);
        throw new Error(`Gagal memproses pesan dengan AI: ${err.message}`);
      }
    }
  }

  console.error("[Gemini] Semua model gagal:", lastError?.message);
  throw new Error("Semua model Gemini sedang tidak tersedia. Coba lagi dalam beberapa menit.");
}

module.exports = { extractTransaction };
