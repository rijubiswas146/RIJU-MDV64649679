// plugins/bin/flirt_engine.js — brain of the Bengali flirt chatbot (no WhatsApp code in here)
//  • understands the mood of a message (sad, love, funny, greeting …) in Bengali script + Banglish
//  • picks a matching line that was not used lately in that chat
//  • keeps a never-ending conversation: a follow-up question is added to most replies,
//    and short "story" chapters continue one beat per message
//  • learns the person's gender if they say it; switches to a friendly, non-flirty mode for under-18s
import * as D from "./flirt_data.js";

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Latin words must stand alone ("hi" must not match "this"); Bengali / emoji match anywhere
const re = (list) =>
  new RegExp(
    list.map((t) => (/^[a-z0-9 ?']+$/.test(t) ? `(?<![a-z])${esc(t)}(?![a-z])` : esc(t))).join("|"),
    "iu"
  );

const MOODS = [
  ["selfHarm", re(["মরে যেতে", "মরে যাব", "মরতে চাই", "আত্মহত্যা", "বাঁচতে ইচ্ছা করে না", "বাঁচতে চাই না", "জীবন শেষ করে", "suicide", "kill myself", "end my life", "want to die", "morte chai", "morte jete chai", "atmohatya", "bachte chai na", "bachte ichha kore na", "jibon shesh"])],
  ["cry", re(["ব্রেকআপ", "ছেড়ে গেছে", "ছেড়ে চলে গেছে", "ছেড়ে গেল", "ধোঁকা", "প্রতারণা", "বিশ্বাসঘাতক", "ভুলে গেছে", "ছেড়ে দিয়েছে", "ডিভোর্স", "সম্পর্ক শেষ", "breakup", "break up", "cheated", "cheat", "dhoka", "dhokha", "chere gese", "chere gelo", "chere dilo", "chere diyeche", "bhule gese", "vule gese", "betrayed"])],
  ["sad", re(["কান্না", "কাঁদ", "কষ্ট", "দুঃখ", "মন খারাপ", "একা লাগ", "একা একা", "ভালো নেই", "ভাল নেই", "হতাশ", "ডিপ্রেশন", "ক্লান্ত", "কেউ নেই", "কেউ বোঝে না", "কিছু ভালো লাগছে না", "কিছুই ভালো লাগে না", "অসহ্য", "kanna", "kandchi", "kadchi", "kadchhi", "kosto", "dukkho", "dukho", "mon kharap", "mon valo nei", "mon bhalo nei", "bhalo nei", "valo nei", "valo nai", "bhalo nai", "ekla", "lonely", "alone", "sad", "cry", "crying", "depressed", "depression", "tired", "hopeless", "upset", "😢", "😭", "💔", "😞", "😔", "☹️", "😟"])],
  ["loveYou", re(["ভালোবাসি", "ভালবাসি", "প্রেমে পড়েছি", "প্রেমে পড়ে গেছি", "আই লাভ ইউ", "i love you", "love you", "luv u", "i luv u", "ilu", "valobashi", "bhalobashi", "valobasi", "bhalobasi", "love u", "propose", "😍", "🥰", "😘", "❤️", "❤", "💕", "💖", "💗", "💞", "💓", "💘"])],
  ["miss", re(["মিস করছি", "মিস করি", "মিস ইউ", "মনে পড়ছে", "মনে পড়ে", "miss you", "miss u", "missing you", "mis you", "miss korchi", "miss kori", "mone porche", "mone pore"])],
  ["goodNight", re(["শুভ রাত্রি", "শুভরাত্রি", "গুড নাইট", "ঘুমাতে যাচ্ছি", "ঘুমোতে যাচ্ছি", "good night", "gn", "gnight", "shuvo ratri", "subho ratri", "shubho ratri", "ghumate jachi", "ghumabo", "sleep now", "bye", "টাটা", "বিদায়", "tata"])],
  ["goodMorning", re(["শুভ সকাল", "সুপ্রভাত", "গুড মর্নিং", "good morning", "gm", "gmorning", "shuvo sokal", "subho sokal", "shubho sokal"])],
  ["compliment", re(["সুন্দর", "কিউট", "হ্যান্ডসাম", "স্মার্ট", "অসাধারণ", "মিষ্টি", "sundor", "sundar", "cute", "handsome", "beautiful", "pretty", "smart", "awesome", "amazing", "mishti", "gorgeous"])],
  ["howAreYou", re(["কেমন আছ", "কেমন আছো", "কেমন আছেন", "কি খবর", "কী খবর", "কেমন চলছে", "kemon acho", "kemon aco", "kemon aso", "kemon asho", "kmn acho", "kmn aso", "how are you", "how r u", "hru", "ki khobor", "ki khabor", "kemon achen", "khobor ki"])],
  ["whatDoing", re(["কী করছ", "কি করছ", "কি করো", "কী করো", "কি করছো", "কী করছো", "ki korcho", "ki korchho", "ki koro", "what are you doing", "what r u doing", "wyd", "kisu korcho", "kichu korcho"])],
  ["eaten", re(["খেয়েছ", "খেয়েছো", "খেয়েছেন", "খাইছ", "খাইসো", "kheyecho", "kheyechho", "khaiso", "khaicho", "khaichho", "khawa hoyeche", "lunch korecho", "dinner korecho"])],
  ["who", re(["তুমি কে", "তোমার নাম", "নাম কী", "নাম কি", "কে তুমি", "বট নাকি", "রোবট", "মানুষ নাকি", "ছেলে নাকি মেয়ে", "তুমি কি বট", "tumi ke", "tomar nam", "tomar naam", "nam ki", "who are you", "your name", "are you bot", "bot naki", "robot", "tumi bot", "ke tumi", "name ki"])],
  ["relationship", re(["প্রেমিক", "প্রেমিকা", "গার্লফ্রেন্ড", "বয়ফ্রেন্ড", "সিঙ্গেল", "সিংগেল", "রিলেশন", "প্রেম করবে", "প্রেম করো", "বিয়ে", "girlfriend", "boyfriend", "gf", "bf", "single", "relationship", "prem", "crush", "biye"])],
  ["photo", re(["ছবি", "ডিপি", "সেলফি", "ফটো", "pic", "photo", "dp", "selfie", "image"])],
  ["meetCall", re(["নাম্বার", "নম্বর", "কল করো", "কল দাও", "ভিডিও কল", "দেখা করি", "দেখা করবে", "কোথায় থাকো", "কোথায় থাকেন", "লোকেশন", "ঠিকানা", "ইমো", "number", "call", "video call", "vc", "meet", "meet up", "kothay thako", "kothay thaken", "location", "address", "imo"])],
  ["hugKiss", re(["চুমু", "কিস", "জড়িয়ে", "আদর", "হাগ", "chumu", "jorie", "jhoriye", "kiss", "hug", "adar", "cuddle"])],
  ["angry", re(["বোকা", "পাগল", "চুপ", "বাজে", "হারামি", "শয়তান", "ফালতু", "বেয়াদব", "গাধা", "stupid", "idiot", "nonsense", "shut up", "fuck", "bokachoda", "faltu", "pagol", "chup"])],
  ["bored", re(["বোর", "বিরক্ত", "ভালো লাগছে না", "ভালো লাগে না", "কিছু করার নেই", "bore", "boring", "bored", "bor lagche", "bore lagche", "kichu korar nei", "nothing to do"])],
  ["sleepy", re(["ঘুম পাচ্ছে", "ঘুম আসছে", "ঘুমাব", "ঘুমোব", "ঘুম", "ghum", "ghum pacche", "ghum pache", "sleepy", "sleep"])],
  ["happy", re(["হা হা", "হাহা", "হিহি", "মজা", "মজার", "হাসি", "খুশি", "আনন্দ", "haha", "hahaha", "hehe", "hihi", "lol", "lmao", "majar", "maja", "mazaa", "funny", "khushi", "happy", "hasi", "😂", "🤣", "😆", "😄", "😁", "😹"])],
];
const GREET = re(["হাই", "হ্যালো", "হেলো", "হেই", "নমস্কার", "আসসালামু", "সালাম", "আদাব", "ওগো", "ওই", "hi", "hii", "hey", "heyy", "hello", "hellow", "helo", "hlo", "hloo", "hlw", "namaskar", "assalamualaikum", "salam", "adab", "oi"]);
const THANKS = re(["ধন্যবাদ", "থ্যাংকস", "থ্যাঙ্কস", "ঠিক আছে", "আচ্ছা", "ওকে", "হুম", "হুমম", "হ্যাঁ", "না", "thanks", "thank you", "thx", "ok", "okay", "okk", "k", "hmm", "hm", "accha", "achha", "acha", "ha", "hya", "na", "nah", "thik ache", "thik"]);
const STORY_START = re(["গল্প", "golpo", "story", "গল্প বলো", "গল্প শোনাও"]);
const STORY_NEXT = re(["তারপর", "আরও বলো", "আরো বলো", "বলো না", "শোনাও", "শুনি", "tarpor", "tarpar", "tarpore", "aro bolo", "next", "continue"]);

const GENDER_F = re(["আমি মেয়ে", "আমি একটা মেয়ে", "মেয়ে", "ami meye", "ami ekta meye", "i am a girl", "i'm a girl", "i am female", "meye", "girl", "female"]);
const GENDER_M = re(["আমি ছেলে", "আমি একটা ছেলে", "ছেলে", "ami chele", "ami ekta chele", "i am a boy", "i'm a boy", "i am male", "chele", "boy", "male"]);

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
const normalize = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)))
    .replace(/([a-z])\1{2,}/g, "$1$1")
    .trim();

// under-18 signals: "age 15", "15 years", "বয়স ১৬", "class 9", "ক্লাস ১০", "school student"
function looksMinor(t) {
  const age =
    t.match(/(?:age|বয়স|boyos|bayas|বয়েস)\s*[:\-]?\s*(\d{1,2})/) ||
    t.match(/(\d{1,2})\s*(?:years?|yrs?|yo|y\/o|বছর|bochor|bosor)/);
  if (age && Number(age[1]) >= 5 && Number(age[1]) <= 17) return true;
  const cls = t.match(/(?:class|ক্লাস|std)\s*[:\-]?\s*(\d{1,2})/);
  if (cls && Number(cls[1]) >= 1 && Number(cls[1]) <= 12) return true;
  return /school student|স্কুলে পড়ি|স্কুলের ছাত্র|স্কুলের ছাত্রী|i am a minor|nabalok|নাবালক/.test(t);
}

export function detectMood(rawText) {
  const t = normalize(rawText);
  const len = [...t].length;
  for (const [name, rx] of MOODS) if (rx.test(t)) return name;
  if (len <= 40 && GREET.test(t)) return "greet";
  if (len <= 14 && THANKS.test(t)) return "thanks";
  return "fallback";
}

export function createEngine({ rng = Math.random } = {}) {
  const recent = new Map(); // chat → last used lines
  const rnd = (n) => Math.floor(rng() * n);
  const chance = (p) => rng() < p;

  function pick(arr, chatKey) {
    const seen = recent.get(chatKey) || [];
    let line = arr[rnd(arr.length)];
    for (let i = 0; i < 10 && seen.includes(line); i++) line = arr[rnd(arr.length)];
    seen.push(line);
    if (seen.length > 80) seen.splice(0, seen.length - 80);
    recent.set(chatKey, seen);
    return line;
  }

  const isQuestion = (s) => /[?？]/.test(s.slice(-10));
  const flirtPool = (g) => (g === "f" ? D.flirtGirl : g === "m" ? D.flirtBoy : D.flirtNeutral);
  const hookFor = (g, chatKey) => {
    if (g === "f" && chance(0.3)) return pick(D.hooksGirl, chatKey);
    if (g === "m" && chance(0.3)) return pick(D.hooksBoy, chatKey);
    return pick(D.hooks, chatKey);
  };

  function fallbackLine(g, chatKey) {
    const r = rng();
    if (r < 0.45) return pick(flirtPool(g), chatKey);
    if (r < 0.6) return pick(D.romantic, chatKey);
    if (r < 0.68) return pick(D.shayari, chatKey);
    return pick(D.fallback, chatKey);
  }

  function nextStoryBeat(profile) {
    if (!profile.story) {
      const k = (profile.sc || 0) % D.stories.length;
      profile.sc = (profile.sc || 0) + 1;
      profile.story = { k, i: 0 };
    }
    const st = D.stories[profile.story.k];
    const beat = st.beats[profile.story.i];
    profile.story.i += 1;
    if (profile.story.i >= st.beats.length) profile.story = null; // finished → next time a new story
    return beat;
  }

  /**
   * @param {{text:string, profile:object, chatKey:string}} p
   * profile fields: g ('f'|'m'|null), minor, asked, story, sc, n
   * @returns {{text:string, mood:string}}
   */
  function respond({ text, profile, chatKey }) {
    profile.n = (profile.n || 0) + 1;
    const t = normalize(text);
    let mood = detectMood(text);

    // learn facts about the person
    if (looksMinor(t)) profile.minor = true;
    let justLearnedGender = false;
    if (!profile.g) {
      if (profile.asked || /(আমি|ami|i am|i'm)/.test(t)) {
        if (GENDER_F.test(t) && !GENDER_M.test(t)) { profile.g = "f"; justLearnedGender = true; }
        else if (GENDER_M.test(t) && !GENDER_F.test(t)) { profile.g = "m"; justLearnedGender = true; }
      }
    }

    // safety first
    if (mood === "selfHarm") return { text: pick(D.selfHarm, chatKey), mood };

    // under-18 → friendly only (comfort allowed when sad)
    if (profile.minor) {
      if (mood === "sad" || mood === "cry") return { text: pick(D.sad, chatKey), mood };
      const base = pick(D.friendly, chatKey);
      const extra = !isQuestion(base) && chance(0.6) ? "\n\n" + pick(D.friendlyHooks, chatKey) : "";
      return { text: base + extra, mood: "friendly" };
    }

    if (justLearnedGender && mood === "fallback") {
      return { text: pick(D.ack[profile.g], chatKey) + "\n\n" + hookFor(profile.g, chatKey), mood: "gender" };
    }

    // story handling
    const wantsStory = STORY_START.test(t) || (STORY_NEXT.test(t) && !profile.story);
    const continuesStory = profile.story && (STORY_NEXT.test(t) || mood === "thanks" || mood === "fallback" || mood === "happy");
    if (wantsStory || continuesStory) return { text: nextStoryBeat(profile), mood: "story" };

    let base;
    switch (mood) {
      case "greet": base = pick(D.greet, chatKey); break;
      case "howAreYou": base = pick(D.howAreYou, chatKey); break;
      case "whatDoing": base = pick(D.whatDoing, chatKey); break;
      case "eaten": base = pick(D.eaten, chatKey); break;
      case "goodMorning": base = pick(D.goodMorning, chatKey); break;
      case "goodNight": base = pick(D.goodNight, chatKey); break;
      case "who": base = pick(D.who, chatKey); break;
      case "relationship": base = pick(D.relationship, chatKey); break;
      case "photo": base = pick(D.photo, chatKey); break;
      case "meetCall": base = pick(D.meetCall, chatKey); break;
      case "miss": base = pick(D.miss, chatKey); break;
      case "loveYou": base = pick(D.loveYou, chatKey); break;
      case "compliment": base = pick(D.compliment, chatKey); break;
      case "happy": base = pick(D.happy, chatKey); break;
      case "sad": return { text: pick(D.sad, chatKey), mood };
      case "cry": return { text: pick(D.cry, chatKey), mood };
      case "bored": base = pick(D.bored, chatKey); break;
      case "sleepy": base = pick(D.sleepy, chatKey); break;
      case "hugKiss": base = pick(D.hugKiss, chatKey); break;
      case "angry": return { text: pick(D.angry, chatKey), mood };
      case "thanks": base = pick(D.thanks, chatKey); break;
      default: {
        // ask the person's gender once, a few messages in
        if (!profile.g && !profile.asked && profile.n >= 3) {
          profile.asked = true;
          return { text: pick(D.genderAsk, chatKey), mood: "genderAsk" };
        }
        if (isQuestion(String(text).trim()) && chance(0.5)) base = pick(D.askBack, chatKey);
        else base = fallbackLine(profile.g, chatKey);
      }
    }

    // never-ending chat: most replies end with a new question or a flirty follow-up
    let extra = "";
    if (!isQuestion(base)) {
      if (chance(0.62)) extra = hookFor(profile.g, chatKey);
      else if (["greet", "howAreYou", "whatDoing", "thanks", "happy", "compliment"].includes(mood) && chance(0.5)) {
        extra = pick(flirtPool(profile.g), chatKey);
      }
    }
    return { text: extra ? base + "\n\n" + extra : base, mood };
  }

  return { respond, detectMood };
}

export const newProfile = () => ({ g: null, minor: false, asked: false, story: null, sc: 0, n: 0 });
