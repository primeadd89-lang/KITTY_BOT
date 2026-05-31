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

if (BOT_TOKEN && BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE') {
  const bot = new TelegramBot(BOT_TOKEN, { polling: true });
  setupBot(bot);
  console.log('Bot is running...');
} else {
  console.log('Bot not started: set BOT_TOKEN in .env');
}
