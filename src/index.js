require('dotenv').config();

const express = require('express');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const apiRouter = require('./api');
const { setupBot } = require('./bot');

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';

const app = express();

app.use('/api', apiRouter);

app.get('/', (req, res) => {
  res.json({
    service: 'KittyOsint API',
    owner: process.env.OWNER || 'zenox_dev',
    channel: process.env.CHANNEL || 'zenox_network',
    endpoints: {
      chain: '/api/chain?number=6296913508',
      aadhaar: '/api/aadhaar?aadhaar=828333416307',
      pangst: '/api/pangst?pan=ABCDE1234F',
      vehicle: '/api/vehicle?vehicle=DL10CA7539',
      ffinfo: '/api/ffinfo?uid=123456789',
      tginfo: '/api/tginfo?info=@thekittydev',
    },
  });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  const selfUrl = process.env.SELF_URL;
  if (selfUrl) {
    setInterval(async () => {
      try { await axios.get(selfUrl, { timeout: 10000 }); }
      catch {}
    }, 10 * 60 * 1000);
    console.log('Self-ping every 10 min to', selfUrl);
  }
});

function esc(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function q(text) {
  return `<blockquote>${text}</blockquote>`;
}

function b(text) {
  return `<b>${esc(text)}</b>`;
}

function startHealthMonitor(bot) {
  const chatId = process.env.GROUP_ID;
  if (!chatId) return;

  const apiBase = `http://localhost:${PORT}`;
  let systemDown = false;
  let initial = true;
  const HEADER = '╔══════════════════════════╗\n║       KittyOsint v1       ║\n╚══════════════════════════╝';

  async function check() {
    let allUp = true;

    const checks = [
      axios.get(`${apiBase}/api/chain?number=6296913508`, { timeout: 15000 }).catch(() => { allUp = false; }),
      axios.get(`${apiBase}/api/aadhaar?aadhaar=828333416307`, { timeout: 15000 }).catch(() => { allUp = false; }),
      axios.get(`${apiBase}/api/pangst?pan=AAACB4834H`, { timeout: 15000 }).catch(() => { allUp = false; }),
      axios.get(`${apiBase}/api/vehicle?vehicle=DL10CA7539`, { timeout: 15000 }).catch(() => { allUp = false; }),
      axios.get(`${apiBase}/api/ffinfo?uid=123456789`, { timeout: 15000 }).catch(() => { allUp = false; }),
      axios.get(`${apiBase}/api/tginfo?info=@thekittydev`, { timeout: 15000 }).catch(() => { allUp = false; }),
    ];

    await Promise.all(checks);

    if (initial) { initial = false; systemDown = !allUp; return; }

    if (!allUp && !systemDown) {
      systemDown = true;
      const msg = q(`${HEADER}

⚠️ ${b('KittyOsint API Unavailable')}

Sorry, the API is currently down.

🙏 Please keep patience.
We will be back soon.`);
      try { await bot.sendMessage(chatId, msg, { parse_mode: 'HTML' }); } catch {}
      console.log('[Health] APIs went DOWN');
    } else if (allUp && systemDown) {
      systemDown = false;
      const msg = q(`${HEADER}

✅ ${b('KittyOsint API is back online!')}

All services are running normally again.

🕵️ Happy digging!`);
      try { await bot.sendMessage(chatId, msg, { parse_mode: 'HTML' }); } catch {}
      console.log('[Health] APIs are BACK UP');
    }
  }

  check();
  setInterval(check, 5 * 60 * 1000);
  console.log('Health monitor started (check every 5 min)');
}

if (BOT_TOKEN && BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
  const bot = new TelegramBot(BOT_TOKEN, { polling: true });
  setupBot(bot);
  startHealthMonitor(bot);
  console.log('Bot is running...');
} else {
  console.log('Bot not started: set BOT_TOKEN in .env');
}
