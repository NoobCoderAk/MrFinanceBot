/**
 * ============================================================
 *  TELEGRAM FINANCE BOT — index.js
 *  Disesuaikan dengan template MrFinance (sheet: Cashflow)
 * ============================================================
 */

require("dotenv").config();

const TelegramBot = require("node-telegram-bot-api");
const { extractTransaction } = require("./geminiExtractor");
const { appendTransaction } = require("./sheetsWriter");
const {
  getTodayDate,
  buildSuccessMessage,
  buildGuideMessage,
  buildErrorMessage,
} = require("./formatter");

// Validasi environment variables wajib
const REQUIRED_ENV = [
  "TELEGRAM_BOT_TOKEN",
  "GEMINI_API_KEY",
  "SPREADSHEET_ID",
  "GOOGLE_SERVICE_ACCOUNT_KEY_PATH",
];

const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(
    `[ERROR] Variabel berikut belum diisi di file .env:\n  - ${missingEnv.join("\n  - ")}`
  );
  process.exit(1);
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
console.log("🤖 Bot Telegram aktif dan mendengarkan pesan...");

// Handler /start dan /help
bot.onText(/\/(start|help)/, (msg) => {
  const chatId = msg.chat.id;
  console.log(`[Bot] Perintah /start dari chat ID: ${chatId}`);
  bot.sendMessage(chatId, buildGuideMessage(), { parse_mode: "Markdown" });
});

// Handler pesan teks umum
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;

  if (!messageText || messageText.startsWith("/")) return;

  console.log(`[Bot] Pesan masuk dari ${chatId}: "${messageText}"`);
  bot.sendChatAction(chatId, "typing");

  try {
    // LANGKAH 1: Ekstraksi via Gemini AI
    const todayDate = getTodayDate(); // Format: DD/MM/YYYY
    const transaction = await extractTransaction(messageText, todayDate);

    // Cek jika bukan transaksi
    if (transaction.error) {
      console.log(`[Bot] Bukan transaksi: "${transaction.error}"`);
      await bot.sendMessage(chatId, buildGuideMessage(), { parse_mode: "Markdown" });
      return;
    }

    // LANGKAH 2: Validasi data — key sesuai template MrFinance
    const isValid =
      transaction.Tanggal &&
      (transaction.Tipe === "Pemasukan" || transaction.Tipe === "Pengeluaran") &&
      transaction.Kategori &&
      transaction.Nominal > 0 &&
      transaction.Keterangan &&
      transaction.Akun;

    if (!isValid) {
      console.warn("[Bot] Data tidak valid:", transaction);
      await bot.sendMessage(
        chatId,
        `⚠️ Tidak dapat memahami transaksi tersebut.\n\nCoba tulis lebih detail, contoh:\n\`makan siang warteg 15.000\``,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // LANGKAH 3: Simpan ke Google Sheets
    await appendTransaction(transaction);

    // LANGKAH 4: Kirim konfirmasi ke pengguna
    await bot.sendMessage(chatId, buildSuccessMessage(transaction), {
      parse_mode: "Markdown",
    });

    console.log(`[Bot] Transaksi berhasil disimpan.`);

  } catch (err) {
    console.error("[Bot] Error tidak terduga:", err.message);
    await bot.sendMessage(chatId, buildErrorMessage(), { parse_mode: "Markdown" });
  }
});

// Handler error polling
bot.on("polling_error", (err) => {
  console.error("[Polling Error]", err.message);
  if (err.message.includes("401")) {
    console.error("[FATAL] Token tidak valid. Periksa TELEGRAM_BOT_TOKEN di .env");
    process.exit(1);
  }
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n[Bot] Menghentikan bot...");
  bot.stopPolling();
  process.exit(0);
});

process.on("SIGTERM", () => {
  bot.stopPolling();
  process.exit(0);
});
