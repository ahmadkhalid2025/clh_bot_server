const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const axios = require("axios");

// ======== CONFIG ======== //
const TOKEN = "8323268194:AAHuQyObZuSMbE4TY2EazadKek3O3LW-jkk";
const CHANNEL_ID = "-1003468727602";  // Private VIP channel
const SHEET_ID = "آی_دی_شیت_گوگل";   // بعداً می‌گذاری

// ======== BOT START ======== //
const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();

// حافظۀ ساده برای مراحل کاربر
let steps = {};

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  steps[userId] = "ask_name";

  bot.sendMessage(chatId,
    "خوش آمدید به سیستم ثبت‌نام CLH Academic.\n\nنام‌تان را ارسال کنید:");
});

// دریافت پیام‌ها و مدیریت مراحل
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  if (!steps[userId] || text === "/start") return;

  if (steps[userId] === "ask_name") {
    steps[userId] = "ask_phone";
    saveField(userId, "full_name", text);
    return bot.sendMessage(chatId, "شماره تماس‌تان را ارسال کنید:");
  }

  if (steps[userId] === "ask_phone") {
    steps[userId] = "ask_class";
    saveField(userId, "phone", text);
    return bot.sendMessage(chatId, "صنف‌تان را ارسال کنید:");
  }

  if (steps[userId] === "ask_class") {
    steps[userId] = "ask_payment";
    saveField(userId, "class", text);

    return bot.sendMessage(
      chatId,
      "ثبت‌نام اولیه انجام شد.\n\nبرای فعال شدن اشتراک:\n۱) هزینه 100 افغانی را پرداخت کنید.\n۲) رسید پرداخت را ارسال کنید."
    );
  }

  if (steps[userId] === "ask_payment") {
    saveField(userId, "payment", "sent");

    bot.sendMessage(chatId, "رسید دریافت شد. بررسی می‌شود.");

    await appendToSheet(userId);

    return;
  }
});

// ذخیره‌سازی موقتی
let cache = {};

function saveField(userId, field, value) {
  if (!cache[userId]) cache[userId] = {};
  cache[userId][field] = value;
}

// ذخیره در Google Sheet
async function appendToSheet(userId) {
  const doc = new GoogleSpreadsheet(SHEET_ID);

  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_EMAIL,
    private_key: process.env.GOOGLE_KEY.replace(/\\n/g, "\n"),
  });

  await doc.loadInfo();

  const sheet = doc.sheetsByIndex[0];

  await sheet.addRow({
    user_id: userId,
    full_name: cache[userId].full_name,
    phone: cache[userId].phone,
    class_group: cache[userId].class,
    payment_status: "waiting",
    subscription_active: "no",
  });
}

// ======== EXPRESS SERVER ======== //
app.get("/", (req, res) => {
  res.send("CLH Academic Bot Server Running...");
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
