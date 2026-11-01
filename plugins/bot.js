// .bot / .sim — fun Bangla chat bot (ported from the GoatBot "bot" command)
//   .bot            → random greeting (mentions you)
//   .bot <message>  → bot answers
//   reply to any bot answer/greeting → the chat continues without typing .bot again
import axios from "axios";
import { Module } from "../lib/plugins.js";
import config from "../config.js";
import { rememberSim, simMessages } from "../lib/simState.js";

const API_LIST = "https://raw.githubusercontent.com/MOHAMMAD-NAYAN-07/Nayan/main/api.json";
const FALLBACK = "🤖 I'm not sure how to respond to that.";

const greetings = [
  "আহ শুনা আমার তোমার অলিতে গলিতে উম্মাহ😇😘",
  "কি গো সোনা আমাকে ডাকছ কেনো",
  "বার বার আমাকে ডাকস কেন😡",
  "আহ শোনা আমার আমাকে এতো ডাক্তাছো কেনো আসো বুকে আশো🥱",
  "হুম জান তোমার অইখানে উম্মমাহ😷😘",
  "আসসালামু আলাইকুম বলেন আপনার জন্য কি করতে পারি",
  "আমাকে এতো না ডেকে বস নয়নকে একটা গফ দে 🙄",
  "আরে বাবা, আমায় ডাকলে চা-নাস্তা তো লাগবেই ☕🍪",
  "এই যে শুনছেন, আমি কিন্তু আপনার জন্যই অনলাইনে আছি 😉",
  "ডাক দিলেন তো আসলাম, এখন ভাড়া দিবেন নাকি? 😏",
  "আমাকে বেশি ডাকবেন না, আমি VIP bot বুঝছেন 🤖👑",
  "ডাকতে ডাকতে যদি প্রেমে পড়ে যান, দায় আমি নেব না ❤️",
  "শুধু ডাকবেন না, খাওয়াবেনও! ভাত-মাংস হলে চলবে 🍛🐓",
  "আমি বট হইলেও কিন্তু feelings আছে 😌",
  "ডাক দিলেন, হাজির হলাম, এখন কি গান গাইতে হবে নাকি? 🎶",
  "আপনাকে না দেখলে নাকি আমার RAM হ্যাং হয়ে যায় 😜",
  "আপনি ডাক দিলেই আমি হাজির, বাকি বটরা হিংসা করে 😂",
];

let apiBase = "";
let apiBaseAt = 0;
async function getApiBase() {
  if (apiBase && Date.now() - apiBaseAt < 10 * 60_000) return apiBase;
  const { data } = await axios.get(API_LIST, { timeout: 15000 });
  apiBase = data?.api || "";
  apiBaseAt = Date.now();
  if (!apiBase) throw new Error("api.json has no api field");
  return apiBase;
}

async function askSim(text) {
  const base = await getApiBase();
  const { data } = await axios.get(`${base}/sim?type=ask&ask=${encodeURIComponent(text)}`, { timeout: 20000 });
  return data?.data?.msg || data?.msg || FALLBACK;
}

async function sendAndRemember(message, payload) {
  let sent;
  try {
    sent = await message.conn.sendMessage(message.from, payload, { quoted: message.raw || message.gift });
  } catch {
    sent = await message.conn.sendMessage(message.from, payload, { quoted: message.gift });
  }
  rememberSim(sent?.key?.id, message.from);
  return sent;
}

Module({
  command: "bot",
  aliases: ["sim"],
  package: "ai",
  description: "Chat with the fun Bangla bot. Usage: .bot <message>",
  usage: ".bot hi",
})(async (message, match) => {
  const text = String(match || "").trim();
  try {
    if (!text) {
      const g = greetings[Math.floor(Math.random() * greetings.length)];
      const num = String(message.sender || "").split("@")[0].split(":")[0];
      return await sendAndRemember(message, { text: `@${num}, ${g}`, mentions: [message.sender] });
    }
    const reply = await askSim(text);
    await sendAndRemember(message, { text: reply });
  } catch (err) {
    console.error("[bot] error:", err?.message || err);
    try {
      await message.conn.sendMessage(message.from, { text: "❌ Something went wrong while talking with bot." }, { quoted: message.gift });
    } catch {}
  }
});

// Reply to a .bot message → continue the conversation
Module({ on: "text" })(async (message) => {
  try {
    const qid = message.quoted?.id;
    if (!qid || !simMessages.has(qid)) return;
    const body = String(message.body || "").trim();
    if (!body || body.startsWith(config.prefix || ".")) return;
    if (message.isFromMe && message.fromMe) return; // never answer our own messages
    const reply = await askSim(body);
    await sendAndRemember(message, { text: reply });
  } catch (err) {
    console.error("[bot] reply error:", err?.message || err);
    try {
      await message.conn.sendMessage(message.from, { text: "❌ Failed to continue conversation." }, { quoted: message.gift });
    } catch {}
  }
});
