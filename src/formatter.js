/**
 * formatter.js
 * Utilitas untuk memformat pesan balasan Telegram
 * dan mendapatkan tanggal hari ini dalam format yang sesuai template MrFinance.
 */

/**
 * Mendapatkan tanggal hari ini dalam format DD/MM/YYYY
 * sesuai kolom "Tanggal" di template MrFinance.
 * @returns {string} - Contoh: "23/06/2026"
 */
function getTodayDate() {
  const now = new Date();
  const day   = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year  = now.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Memformat angka ke format Rupiah yang mudah dibaca.
 * @param {number} amount - Angka murni, contoh: 45000
 * @returns {string} - Contoh: "45.000"
 */
function formatRupiah(amount) {
  return Number(amount).toLocaleString("id-ID");
}

/**
 * Membuat pesan sukses yang dikirim kembali ke pengguna Telegram.
 * Menggunakan key baru sesuai template MrFinance.
 * @param {Object} transaction - Objek transaksi hasil ekstraksi Gemini
 * @returns {string}
 */
function buildSuccessMessage(transaction) {
  const isPemasukan = transaction.Tipe === "Pemasukan";
  const emoji = isPemasukan ? "💰" : "✅";

  return (
    `${emoji} *${transaction.Keterangan}* sebesar *Rp${formatRupiah(transaction.Nominal)}* berhasil dicatat!\n\n` +
    `📂 Kategori : \`${transaction.Kategori}\`\n` +
    `📊 Tipe     : \`${transaction.Tipe}\`\n` +
    `💳 Akun     : \`${transaction.Akun}\`\n` +
    `📅 Tanggal  : \`${transaction.Tanggal}\``
  );
}

/**
 * Pesan panduan yang ditampilkan saat pengguna mengirim /start
 * atau pesan yang bukan transaksi keuangan.
 */
function buildGuideMessage() {
  return (
    `👋 *Halo! Saya bot pencatat keuangan MrFinance Anda.*\n\n` +
    `Kirim pesan transaksi dalam bahasa sehari-hari, contoh:\n\n` +
    `💸 *Pengeluaran:*\n` +
    `• \`makan Bebek Hokky 45.000\`\n` +
    `• \`beli token PLN 100rb pake BRImo\`\n` +
    `• \`belanja Indomaret 50k pake GoPay\`\n` +
    `• \`bayar Grab ke bandara 80.000\`\n` +
    `• \`beli CCTV untuk toko 350.000\`\n\n` +
    `💰 *Pemasukan:*\n` +
    `• \`gajian bulan ini 5jt ke Livin\`\n` +
    `• \`terima bonus 500rb ke BRImo\`\n\n` +
    `💳 *Akun yang dikenali:*\n` +
    `\`BRImo\` • \`Livin'\` • \`E-Wallet/QRIS\` • \`Tunai\`\n\n` +
    `🔢 *Format nominal:*\n` +
    `\`45.000\` • \`50k\` • \`100rb\` • \`1.5jt\``
  );
}

/**
 * Pesan error generik saat terjadi masalah teknis.
 */
function buildErrorMessage() {
  return (
    `❌ *Maaf, terjadi kesalahan saat memproses pesan Anda.*\n\n` +
    `Silakan coba lagi dalam beberapa saat.\n` +
    `Ketik /start untuk melihat panduan input.`
  );
}

module.exports = {
  getTodayDate,
  formatRupiah,
  buildSuccessMessage,
  buildGuideMessage,
  buildErrorMessage,
};
