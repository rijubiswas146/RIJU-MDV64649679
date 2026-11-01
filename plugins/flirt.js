// PABITRA-BOT V19: context-aware WhatsApp auto-reply.
// Private chats are enabled by default; groups reply when mentioned/replied to.
import axios from "axios";
import { Module } from "../lib/plugins.js";
import { db } from "../lib/client.js";
import config from "../config.js";
import { simMessages } from "../lib/simState.js";
import { createEngine, newProfile } from "./bin/flirt_engine.js";

const API = "https://eliteprotech-apis.zone.id/ai/chatgpt";
const sessions = new Map();
const lastReply = new Map();
const busy = new Set();
const histories = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const scopeOf = (m) => String(m.conn?.user?.id || "bot").split(":")[0].split("@")[0];
const numOf = (jid) => String(jid || "").split("@")[0].split(":")[0];

function getMode(scope, jid, isGroup) {
  const v = db.get(scope, `flirt_chat:${jid}`, null);
  if (v === "off") return "off";
  if (isGroup) return v === "all" ? "all" : "smart";
  return db.get(scope, "flirt_dm", true) !== false ? "on" : "off";
}

function extractAnswer(data) {
  const candidates = [
    data?.result, data?.response, data?.answer, data?.message,
    data?.text, data?.content, data?.data?.result, data?.data?.response,
    data?.data?.answer, data?.data?.message, data?.data?.content,
    data?.choices?.[0]?.message?.content, data?.result?.text,
    data?.result?.response, data?.result?.answer,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (value && typeof value === "object") {
      const nested = value.text || value.content || value.answer || value.response;
      if (typeof nested === "string" && nested.trim()) return nested.trim();
    }
  }
  return "";
}

// offline brain: mood-aware Bengali replies (used when the API is down or gives nothing)
const engine = createEngine();
const profiles = new Map();
function fallbackAnswer(text, chatKey = "x") {
  let profile = profiles.get(chatKey);
  if (!profile) { profile = newProfile(); profiles.set(chatKey, profile); if (profiles.size > 800) profiles.delete(profiles.keys().next().value); }
  try { return engine.respond({ text, profile, chatKey }).text; }
  catch (e) { console.warn("[chatbot] engine error:", e?.message || e); return "বুঝলাম 😊 আরেকটু বলো তো?"; }
}

async function makeReply(text, history, chatKey) {
  const system = "তুমি 𝐑ɪᴊᴜ 𝐌ᴅ-এর বন্ধুসুলভ বাংলা WhatsApp assistant। মানুষের মতো স্বাভাবিক, সংক্ষিপ্ত, প্রসঙ্গমাফিক উত্তর দেবে; অল্প ও মানানসই emoji ব্যবহার করবে। নিজেকে মানুষ বলে দাবি করবে না। আগের কথার প্রসঙ্গ ধরে উত্তর দেবে।";
  const prompt = `${system}\n\nConversation:\n${history.map(x => `${x.role}: ${x.content}`).join("\n")}\nuser: ${text}\nassistant:`;
  // This endpoint has no public schema supplied with the URL, so support both common GET and POST shapes.
  const attempts = [
    () => axios.get(API, { params: { text: prompt, prompt, message: prompt, q: prompt }, timeout: 8000, headers: { Accept: "application/json" } }),
    () => axios.post(API, { text: prompt, prompt, message: prompt }, { timeout: 8000, headers: { "Content-Type": "application/json", Accept: "application/json" } }),
  ];
  for (const request of attempts) {
    try {
      const { data } = await request();
      const answer = extractAnswer(data);
      if (answer) return answer.slice(0, 1400);
    } catch (e) {
      console.warn("[chatbot:AI] API attempt failed:", e?.response?.status || e?.code || e?.message || e);
    }
  }
  return fallbackAnswer(text, chatKey);
}

Module({ on: "text" })(async (m) => {
  try {
    if (m.isFromMe) return;
    const body = String(m.body || "").trim();
    if (!body || body.startsWith(config.prefix || ".")) return;
    if (m.quoted?.id && simMessages.has(m.quoted.id)) return; // .bot chat handles its own replies
    const jid = m.from || "";
    if (!jid || jid.endsWith("@newsletter") || jid.endsWith("@broadcast") || jid === "status@broadcast") return;
    const scope = scopeOf(m);
    const mode = getMode(scope, jid, !!m.isGroup);
    if (mode === "off") return;
    const rawMsg = m.raw; // grab now — the serializer drops it after ~5s
    const userJid = m.sender || jid;
    const user = numOf(userJid);
    const key = `${jid}|${user}`;
    if (m.isGroup) {
      const trigger = mode === "all" || m.isMentioned || m.quoted?.fromMe || /riju|পবিত্র|bot|বট/i.test(body) || (sessions.get(key) || 0) > Date.now();
      if (!trigger) return;
      sessions.set(key, Date.now() + 10 * 60_000);
    }
    const now = Date.now();
    if (busy.has(key) || now - (lastReply.get(key) || 0) < 2500) return;
    busy.add(key);
    try {
      const history = histories.get(key) || [];
      const text = await makeReply(body, history, key);
      history.push({ role: "user", content: body.slice(0, 500) }, { role: "assistant", content: text.slice(0, 700) });
      histories.set(key, history.slice(-8));
      await m.conn.sendPresenceUpdate("composing", jid).catch(() => {});
      await sleep(Math.min(1400, 300 + text.length * 10));
      const mentions = userJid ? [userJid] : [];
      // quote the person's own message (keepQuoted → no vcard card) and @mention them
      const out = m.isGroup ? `@${user} ${text}` : text;
      const opts = rawMsg ? { quoted: rawMsg, keepQuoted: true } : {};
      await m.conn.sendMessage(jid, { text: out, mentions: m.isGroup ? mentions : [] }, opts);
      await m.conn.sendPresenceUpdate("paused", jid).catch(() => {});
      lastReply.set(key, Date.now());
    } finally { busy.delete(key); }
  } catch (e) { console.error("[chatbot]", e?.message || e); }
});

Module({ command: "flirt", aliases: ["chatbot", "pchat"], package: "fun", description: "Context-aware WhatsApp chatbot: on / all / off / dm on / status", usage: ".flirt on" })(async (m, match) => {
  if (!m.isFromMe) return m.send("🔒 Only the bot owner can change chatbot settings.");
  const scope = scopeOf(m);
  const args = String(match || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  const a = args[0] || "";
  if (a === "dm") { const on = args[1] === "on"; await db.set(scope, "flirt_dm", on); return m.send(`💬 Private chatbot: ${on ? "ON" : "OFF"}`); }
  if (a === "status") return m.send(`Chatbot: ${getMode(scope, m.from, !!m.isGroup)}\nPrivate chats: ${db.get(scope, "flirt_dm", true) ? "ON" : "OFF"}`);
  if (a === "on" || a === "all") { await db.set(scope, `flirt_chat:${m.from}`, a === "all" ? "all" : "smart"); return m.send(`✅ Chatbot ${a === "all" ? "ALL messages" : "smart mention/reply mode"} enabled in this group.`); }
  if (a === "off") { await db.set(scope, `flirt_chat:${m.from}`, "off"); return m.send("⛔ Chatbot disabled in this chat."); }
  return m.send("*© 𝐑ɪᴊᴜ 𝐌ᴅ CHATBOT*\n.flirt on — smart group replies\n.flirt all — reply to all group messages\n.flirt off — disable in this group\n.flirt dm on — enable private chats\n.flirt dm off — disable private chats\n.flirt status — show settings");
});
