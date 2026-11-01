# © 𝐑ɪᴊᴜ 𝐌ᴅ

Developer: 𝐑ɪᴊᴜ
Owner: +917364934516
WhatsApp Channel: https://whatsapp.com/channel/0029Vb9Gp0u0lwgqXxsJoR39
Telegram: https://t.me/rijumd

© 𝐑ɪᴊᴜ 𝐌ᴅ


## RIJU MD Web Panel

A black-and-gold browser panel is included in `public/index.html`. The Express server serves it at `/`; the JSON health endpoint is `/health`.

**Security warning before public deployment:** the existing session and pairing routes in `index.js` were designed as open endpoints and do not implement per-user ownership/authentication. Do not expose this server to the public internet until those API routes are secured and tested. Pairing codes and session credentials must be treated as secrets. This web panel does not turn the existing bot into a securely isolated multi-tenant hosting service by itself.
