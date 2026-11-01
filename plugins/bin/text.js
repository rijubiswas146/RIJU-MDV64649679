import crypto from "crypto";

// Group welcome text (use &mention for the new member)
export const WELCOME_TEXTS = [
  `\`𝐇𝐄𝐘𝐘 &mention\`

⎯꯭⃜ 𔘓 [] 𝐖ᴇʟᴄᴏᴍᴇ 𝐓ᴏ 𝐎ᴜʀ 𝐆𝐂
⎯꯭⃜ 𔘓 [] 𝐆ʟᴀᴅ 𝐓ᴏ 𝐇ᴀᴠᴇ 𝐘ᴏᴜ 𝐇ᴇʀᴇ!

⎯꯭⃜ 𔘓 [] 𝐈ɴᴛʀᴏ 𝐖ɪᴛʜ 𝐎ɴᴇ𝐕ɪᴇᴡ 𝐏ɪᴄ

━( 𝐑ɪᴊᴜ 𝐌𝐃 💜 )━`,
];

// Group left text (use &mention for the member who left)
export const GOODBYE_TEXTS = [
  `&mention

*⎯‌᳑⎯꯭⃜ ꯭𔘓⃪꯭[]꯭𝐋꯭ᴇ꯭ғ꯭ᴛ꯭ ⟶꯭𝐓꯭ᴏ꯭ 𝐁꯭ᴏ꯭ᴋ꯭ᴀ꯭ᴄ꯭ʜ꯭ᴜ꯭ᴅ꯭ᴀ꯭)꯭ ⟶᯦꯭*
*⎯‌᳑⎯꯭⃜ ꯭𔘓⃪꯭[]꯭𝐏꯭ʟ꯭ᴇ꯭ᴀ꯭s꯭ᴇ꯭ 𝐃꯭ᴏ꯭ɴ’ᴛ꯭ 𝐂꯭ᴏ꯭ᴍ꯭ᴇ꯭ 𝐁꯭ᴀ꯭ᴄ꯭ᴋ꯭ ⟶꯭*

*━( 𝐑ɪᴊᴜ 𝐌𝐃 ⎯꯭̽💜 )━*`,
];

export function pickRandom(arr) {
  const index = crypto.randomInt(0, arr.length);
  return arr[index];
}
