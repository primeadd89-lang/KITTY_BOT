const axios = require('axios');

const HEADER = '╔══════════════════════════╗\n║       KittyOsint v1       ║\n╚══════════════════════════╝';

function mk() {
  const row = [];
  const groupLink = process.env.GROUP_LINK;
  const channelLink = process.env.CHANNEL_LINK;
  if (groupLink) row.push({ text: '👤 Owner Group', url: groupLink });
  if (channelLink) row.push({ text: '📢 Channel', url: channelLink });
  return { inline_keyboard: [row] };
}

function rk() {
  return {
    keyboard: [
      [{ text: '/numinfo' }, { text: '/aadharinfo' }],
      [{ text: '/pangstinfo' }, { text: '/vehicleinfo' }],
      [{ text: '/help' }],
    ],
    resize_keyboard: true,
  };
}

const PROMPT_NUM = q(`${HEADER}\n\n📞 ${b('Number Lookup')}\n\nPlease enter a phone number (5-15 digits).\n\nExample: ${c('9939440327')}`);
const PROMPT_AAD = q(`${HEADER}\n\n🆔 ${b('Aadhaar Lookup')}\n\nPlease enter a 12-digit Aadhaar number.\n\nExample: ${c('908767335776')}`);
const PROMPT_PAN = q(`${HEADER}\n\n📄 ${b('PAN to GST Lookup')}\n\nPlease enter a 10-character PAN.\n\nExample: ${c('ABCDE1234F')}`);
const PROMPT_VEH = q(`${HEADER}\n\n🚗 ${b('Vehicle Lookup')}\n\nPlease enter a vehicle number.\n\nExample: ${c('DL10CA7539')}`);

const userState = new Map();

function q(text) {
  return `<blockquote>${text}</blockquote>`;
}

function esc(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function b(text) {
  return `<b>${esc(text)}</b>`;
}

function c(text) {
  return `<code>${esc(text)}</code>`;
}

function fmtLine(emoji, label, val) {
  return `│ ${emoji} ${b(label)}: ${val}`;
}

const HELP_TEXT = `${HEADER}

🔍 ${b('Available Commands')}

/numinfo ${c('<number>')} — Look up phone number details
/aadharinfo ${c('<aadhaar>')} — Look up Aadhaar family details
/pangstinfo ${c('<PAN>')} — Look up GST from PAN
/vehicleinfo ${c('<number>')} — Look up vehicle details
/help — Show this message

You can also send a phone number directly.`;

const UNKNOWN_CMD = q(`${HEADER}\n\n❌ ${b('Unknown command!')}\n\nUse /help to see available commands.`);
const LOADER_NUM = q(`⏳ ${b('KittyOsint')} is looking up the number...`);
const LOADER_AAD = q(`⏳ ${b('KittyOsint')} is looking up the Aadhaar...`);
const LOADER_PAN = q(`⏳ ${b('KittyOsint')} is looking up the PAN...`);
const LOADER_VEH = q(`⏳ ${b('KittyOsint')} is looking up the vehicle...`);
const ERR_NODATA = (n) => q(`${HEADER}\n\n❌ No data found for ${c(n)}.`);
const ERR_FAIL = q(`${HEADER}\n\n❌ Lookup failed. Try again later.`);

function fval(v) {
  return v ? esc(v) : '';
}

function formatResults(results) {
  const entries = Object.entries(results);
  let parts = [HEADER];
  entries.forEach(([key, item]) => {
    const num = entries.length > 1 ? key.toUpperCase() : '';
    parts.push(`\n┌──── ${num} ─────┐`);

    const fields = [
      ['📞', 'Number', c(item.searchedNumber)],
      ['👤', 'Name', fval(item.name)],
      ['👨', 'Father', fval(item.fatherName)],
      ['📍', 'Address', fval(item.address)],
      ['📡', 'Circle', fval(item.circle)],
      ['🔄', 'Alternate', c(item.alternateNumber)],
      ['🆔', 'Aadhaar', c(item.aadhaarNumber)],
      ['📧', 'Email', c(item.email)],
    ];
    fields.forEach(([emoji, label, val]) => {
      if (val) parts.push(fmtLine(emoji, label, val));
    });
    parts.push(`└${'─'.repeat(18)}┘`);
  });
  return q(parts.join('\n'));
}

function formatAadhaar(data) {
  const r = data.result;
  if (!r || !r.success || !r.results || r.results.length === 0) {
    return q(`${HEADER}\n\n❌ No data found for this Aadhaar.`);
  }

  let parts = [HEADER];

  r.results.forEach((entry, idx) => {
    const rc = entry.ration_card_details || {};
    const ai = entry.additional_info || {};

    if (r.results.length > 1) parts.push(`\n┌─── RESULT ${idx + 1} ───┐`);

    parts.push(`\n┌─── RATION CARD ───┐`);
    if (rc.ration_card_no) parts.push(fmtLine('📇', 'RC No.', c(rc.ration_card_no)));
    if (rc.state_name) parts.push(fmtLine('🏛️', 'State', fval(rc.state_name)));
    if (rc.district_name) parts.push(fmtLine('📍', 'District', fval(rc.district_name)));
    if (rc.scheme_name) parts.push(fmtLine('📋', 'Scheme', fval(rc.scheme_name)));
    parts.push(`└${'─'.repeat(18)}┘`);

    if (entry.members && entry.members.length > 0) {
      parts.push(`\n┌─── FAMILY MEMBERS ───┐`);
      entry.members.forEach(m => {
        parts.push(`│ 👤 ${b(m.member_name)}`);
        if (m.remark) parts.push(`│   Remark: ${fval(m.remark)}`);
      });
      parts.push(`└${'─'.repeat(22)}┘`);
    }

    parts.push(`\n┌─── ADDITIONAL INFO ───┐`);
    parts.push(fmtLine('✅', 'Central Repository', ai.exists_in_central_repository ? 'Yes' : 'No'));
    parts.push(fmtLine('🔄', 'IMPDs Allowed', ai.impds_transaction_allowed ? 'Yes' : 'No'));
    parts.push(fmtLine('🏪', 'FPS Category', fval(ai.fps_category)));
    parts.push(fmtLine('⚠️', 'Duplicate Benef.', ai.duplicate_aadhaar_beneficiary ? 'Yes' : 'No'));
    parts.push(`└${'─'.repeat(22)}┘`);
  });

  return q(parts.join('\n'));
}

function formatPAN(data) {
  const r = data.result;
  if (!r || !r.items || r.items.length === 0) {
    return q(`${HEADER}\n\n❌ No GST found for PAN ${c(data.pan)}.`);
  }

  let parts = [HEADER];
  parts.push(`\n┌─── PAN TO GST ───┐`);
  parts.push(fmtLine('📇', 'PAN', c(data.pan)));
  parts.push(`└${'─'.repeat(18)}┘`);

  r.items.forEach((item, idx) => {
    if (r.items.length > 1) parts.push(`\n┌─── GST ${idx + 1} ───┐`);
    else parts.push(`\n┌─── GST INFO ───┐`);
    if (item.gstin) parts.push(fmtLine('🆔', 'GSTIN', c(item.gstin)));
    if (item.auth_status) parts.push(fmtLine('✅', 'Status', fval(item.auth_status)));
    if (item.state) parts.push(fmtLine('📍', 'State', fval(item.state)));
    parts.push(`└${'─'.repeat(18)}┘`);
  });

  return q(parts.join('\n'));
}

function formatVehicle(data) {
  const r = data.result;
  if (!r || !r.make_model) {
    return q(`${HEADER}\n\n❌ No data found for vehicle ${c(data.vehicle)}.`);
  }

  let parts = [HEADER];
  parts.push(`\n┌─── VEHICLE INFO ───┐`);
  parts.push(fmtLine('🔢', 'Number', c(data.vehicle)));
  parts.push(fmtLine('🚗', 'Model', fval(r.make_model)));
  parts.push(fmtLine('🏭', 'Make', fval(r.make_name)));
  parts.push(fmtLine('⛽', 'Fuel', fval(r.fuel_type)));
  parts.push(fmtLine('🎨', 'Color', fval(r.vehicle_color)));
  parts.push(fmtLine('📅', 'Reg. Date', fval(r.registration_date)));
  parts.push(fmtLine('👤', 'Owner', fval(r.owner_name)));
  parts.push(fmtLine('📍', 'Address', fval(r.permanent_address)));
  parts.push(fmtLine('🔧', 'Engine', c(r.engine_number || '')));
  parts.push(fmtLine('🔩', 'Chassis', c(r.chassis_number || '')));
  parts.push(fmtLine('🏷️', 'Type', fval(r.vehicle_type)));
  parts.push(fmtLine('🏪', 'Insurer', fval(r.previous_insurer)));
  if (r.previous_policy_expiry_date) parts.push(fmtLine('📄', 'Policy Expiry', fval(r.previous_policy_expiry_date)));
  parts.push(`└${'─'.repeat(18)}┘`);

  return q(parts.join('\n'));
}

async function sendJSONFile(chatId, bot, data, filename, replyId) {
  const json = JSON.stringify(data, null, 2);
  try {
    await bot.sendDocument(chatId, Buffer.from(json, 'utf8'), {
      caption: `📥 ${filename}`,
      reply_to_message_id: replyId,
      reply_markup: mk(),
    }, {
      filename,
      contentType: 'application/json',
    });
  } catch {}
}

function isGroup(msg) {
  const allowed = String(process.env.GROUP_ID);
  if (!allowed) return false;
  const result = String(msg.chat.id) === allowed;
  if (!result) console.log(`[isGroup] chat.id=${msg.chat.id}, expected=${allowed}, type=${msg.chat.type}`);
  return result;
}

const KNOWN_COMMANDS = ['start', 'help', 'numinfo', 'aadharinfo', 'pangstinfo', 'vehicleinfo'];

const CHANNEL_UN = process.env.CHANNEL || 'kittyxosintupdates';

const JOIN_REQUIRED = q(`${HEADER}

🔒 ${b('Access Restricted')}

You haven't joined our channel yet!

👇 ${b('Join below to unlock KittyOsint:')}`);

function channelKeyboard() {
  return {
    inline_keyboard: [[
      { text: '📢 Join @' + CHANNEL_UN, url: `https://t.me/${CHANNEL_UN}` }
    ]]
  };
}

async function requireChannel(bot, msg) {
  if (!msg.from) return false;
  try {
    const member = await bot.getChatMember(`@${CHANNEL_UN}`, msg.from.id);
    return ['creator', 'administrator', 'member'].includes(member.status);
  } catch {
    return true;
  }
}

function setupBot(bot) {
  const JOIN_GROUP_TEXT = q(`❌ ${b('Group Only!')}\n\nThis bot only works in the authorized group.\nJoin the group to use it.`);

  async function processNumLookup(msg, chatId, number) {
    const sent = await bot.sendMessage(chatId, LOADER_NUM, { parse_mode: 'HTML', reply_markup: mk(), reply_to_message_id: msg.message_id });
    try {
      const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
      const { data } = await axios.get(`${API_URL}/api/chain`, { params: { number }, timeout: 30000 });
      if (!data.success || !data.results) {
        return bot.editMessageText(ERR_NODATA(number), { chat_id: chatId, message_id: sent.message_id, parse_mode: 'HTML', reply_markup: mk() });
      }
      await bot.editMessageText(formatResults(data.results), { chat_id: chatId, message_id: sent.message_id, parse_mode: 'HTML', reply_markup: mk() });
      sendJSONFile(chatId, bot, data, `${number}.json`, msg.message_id);
    } catch {
      await bot.editMessageText(ERR_FAIL, { chat_id: chatId, message_id: sent.message_id, parse_mode: 'HTML', reply_markup: mk() });
    }
  }

  async function processAadLookup(msg, chatId, aadhaar) {
    const sent = await bot.sendMessage(chatId, LOADER_AAD, { parse_mode: 'HTML', reply_markup: mk(), reply_to_message_id: msg.message_id });
    try {
      const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
      const { data } = await axios.get(`${API_URL}/api/aadhaar`, { params: { aadhaar }, timeout: 20000 });
      await bot.editMessageText(formatAadhaar(data), { chat_id: chatId, message_id: sent.message_id, parse_mode: 'HTML', reply_markup: mk() });
      sendJSONFile(chatId, bot, data, `${aadhaar}.json`, msg.message_id);
    } catch {
      await bot.editMessageText(ERR_FAIL, { chat_id: chatId, message_id: sent.message_id, parse_mode: 'HTML', reply_markup: mk() });
    }
  }

  async function processPanLookup(msg, chatId, pan) {
    const sent = await bot.sendMessage(chatId, LOADER_PAN, { parse_mode: 'HTML', reply_markup: mk(), reply_to_message_id: msg.message_id });
    try {
      const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
      const { data } = await axios.get(`${API_URL}/api/pangst`, { params: { pan }, timeout: 20000 });
      if (!data.success || !data.result || !data.result.items || data.result.items.length === 0) {
        return bot.editMessageText(`${HEADER}\n\n❌ No GST found for PAN ${c(pan)}.`, { chat_id: chatId, message_id: sent.message_id, parse_mode: 'HTML', reply_markup: mk() });
      }
      await bot.editMessageText(formatPAN(data), { chat_id: chatId, message_id: sent.message_id, parse_mode: 'HTML', reply_markup: mk() });
      sendJSONFile(chatId, bot, data, `${pan}.json`, msg.message_id);
    } catch {
      await bot.editMessageText(ERR_FAIL, { chat_id: chatId, message_id: sent.message_id, parse_mode: 'HTML', reply_markup: mk() });
    }
  }

  async function processVehLookup(msg, chatId, vehicle) {
    const sent = await bot.sendMessage(chatId, LOADER_VEH, { parse_mode: 'HTML', reply_markup: mk(), reply_to_message_id: msg.message_id });
    try {
      const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
      const { data } = await axios.get(`${API_URL}/api/vehicle`, { params: { vehicle }, timeout: 20000 });
      if (!data.success || !data.result || !data.result.make_model) {
        return bot.editMessageText(q(`${HEADER}\n\n❌ No data found for vehicle ${c(vehicle)}.`), { chat_id: chatId, message_id: sent.message_id, parse_mode: 'HTML', reply_markup: mk() });
      }
      await bot.editMessageText(formatVehicle(data), { chat_id: chatId, message_id: sent.message_id, parse_mode: 'HTML', reply_markup: mk() });
      sendJSONFile(chatId, bot, data, `${vehicle}.json`, msg.message_id);
    } catch {
      await bot.editMessageText(ERR_FAIL, { chat_id: chatId, message_id: sent.message_id, parse_mode: 'HTML', reply_markup: mk() });
    }
  }

  bot.on('new_chat_members', (msg) => {
    if (!isGroup(msg)) return;
    const chatId = msg.chat.id;
    msg.new_chat_members.forEach(member => {
      if (member.is_bot) return;
      const name = esc(member.first_name || 'User');
      const text = `${HEADER}

🎉 ${b('Welcome ' + name + '!')} ${b('KittyOsint')} is here.

┌─── ${b('Available Commands')} ───┐
│ 📞 ${b('/numinfo')} ${c('<number>')}
│   └ Look up phone number details
│ 🆔 ${b('/aadharinfo')} ${c('<aadhaar>')}
│   └ Look up Aadhaar family details
│ ❓ ${b('/help')}
│   └ Show this message
└${'─'.repeat(28)}┘

${b('💡 Tip:')} You can also send a number directly!`;
      bot.sendMessage(chatId, q(text), { parse_mode: 'HTML', reply_markup: rk() });
    });
  });

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    if (!isGroup(msg)) {
      return bot.sendMessage(chatId, JOIN_GROUP_TEXT, { parse_mode: 'HTML', reply_markup: rk(), reply_to_message_id: msg.message_id });
    }
    bot.sendMessage(
      chatId,
      q(`🎉 ${b('Welcome to KittyOsint!')}\n\nSend a phone number to look up its details, or use the commands below.\n\n${HELP_TEXT}`),
      { parse_mode: 'HTML', reply_markup: rk(), reply_to_message_id: msg.message_id }
    );
  });

  bot.onText(/\/help/, (msg) => {
    if (!isGroup(msg)) return;
    bot.sendMessage(msg.chat.id, q(HELP_TEXT), { parse_mode: 'HTML', reply_markup: rk(), reply_to_message_id: msg.message_id });
  });

  bot.onText(/\/numinfo(?:\s+(\d+))?$/, async (msg, match) => {
    if (!isGroup(msg)) return;
    const chatId = msg.chat.id;
    const number = match[1];
    if (!number) {
      userState.set(msg.from.id, { cmd: 'numinfo', chatId });
      if (!(await requireChannel(bot, msg))) return bot.sendMessage(chatId, JOIN_REQUIRED, { parse_mode: 'HTML', reply_markup: channelKeyboard(), reply_to_message_id: msg.message_id });
      return bot.sendMessage(chatId, PROMPT_NUM, { parse_mode: 'HTML', reply_markup: rk(), reply_to_message_id: msg.message_id });
    }
    if (!(await requireChannel(bot, msg))) return bot.sendMessage(chatId, JOIN_REQUIRED, { parse_mode: 'HTML', reply_markup: channelKeyboard(), reply_to_message_id: msg.message_id });
    return processNumLookup(msg, chatId, number);
  });

  bot.onText(/\/aadharinfo(?:\s+(\d+))?$/, async (msg, match) => {
    if (!isGroup(msg)) return;
    const chatId = msg.chat.id;
    const aadhaar = match[1];
    if (!aadhaar) {
      userState.set(msg.from.id, { cmd: 'aadharinfo', chatId });
      if (!(await requireChannel(bot, msg))) return bot.sendMessage(chatId, JOIN_REQUIRED, { parse_mode: 'HTML', reply_markup: channelKeyboard(), reply_to_message_id: msg.message_id });
      return bot.sendMessage(chatId, PROMPT_AAD, { parse_mode: 'HTML', reply_markup: rk(), reply_to_message_id: msg.message_id });
    }
    if (!(await requireChannel(bot, msg))) return bot.sendMessage(chatId, JOIN_REQUIRED, { parse_mode: 'HTML', reply_markup: channelKeyboard(), reply_to_message_id: msg.message_id });
    return processAadLookup(msg, chatId, aadhaar);
  });

  bot.onText(/\/pangstinfo(?:\s+([A-Za-z0-9]+))?$/, async (msg, match) => {
    if (!isGroup(msg)) return;
    const chatId = msg.chat.id;
    const pan = match[1] ? match[1].toUpperCase() : null;
    if (!pan) {
      userState.set(msg.from.id, { cmd: 'pangstinfo', chatId });
      if (!(await requireChannel(bot, msg))) return bot.sendMessage(chatId, JOIN_REQUIRED, { parse_mode: 'HTML', reply_markup: channelKeyboard(), reply_to_message_id: msg.message_id });
      return bot.sendMessage(chatId, PROMPT_PAN, { parse_mode: 'HTML', reply_markup: rk(), reply_to_message_id: msg.message_id });
    }
    if (!(await requireChannel(bot, msg))) return bot.sendMessage(chatId, JOIN_REQUIRED, { parse_mode: 'HTML', reply_markup: channelKeyboard(), reply_to_message_id: msg.message_id });
    if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) return bot.sendMessage(chatId, '❌ Invalid PAN. Format: ABCDE1234F', { reply_markup: rk(), reply_to_message_id: msg.message_id });
    return processPanLookup(msg, chatId, pan);
  });

  bot.onText(/\/vehicleinfo(?:\s+(.+))?$/, async (msg, match) => {
    if (!isGroup(msg)) return;
    const chatId = msg.chat.id;
    const vehicle = match[1] ? match[1].trim().toUpperCase() : null;
    if (!vehicle) {
      userState.set(msg.from.id, { cmd: 'vehicleinfo', chatId });
      if (!(await requireChannel(bot, msg))) return bot.sendMessage(chatId, JOIN_REQUIRED, { parse_mode: 'HTML', reply_markup: channelKeyboard(), reply_to_message_id: msg.message_id });
      return bot.sendMessage(chatId, PROMPT_VEH, { parse_mode: 'HTML', reply_markup: rk(), reply_to_message_id: msg.message_id });
    }
    if (!(await requireChannel(bot, msg))) return bot.sendMessage(chatId, JOIN_REQUIRED, { parse_mode: 'HTML', reply_markup: channelKeyboard(), reply_to_message_id: msg.message_id });
    if (!/^[A-Z]{2}\s?[0-9]{1,2}\s?[A-Z]{1,2}\s?[0-9]{1,4}$/.test(vehicle)) return bot.sendMessage(chatId, q(`${HEADER}\n\n❌ ${b('Invalid vehicle number!')}\n\nFormat: ${c('DL10CA7539')}`), { parse_mode: 'HTML', reply_markup: rk(), reply_to_message_id: msg.message_id });
    return processVehLookup(msg, chatId, vehicle);
  });

  bot.on('message', async (msg) => {
    if (!isGroup(msg)) return;
    const chatId = msg.chat.id;
    const text = msg.text?.trim();
    if (!text) return;

    const state = userState.get(msg.from.id);
    if (state) {
      userState.delete(msg.from.id);
      if (!(await requireChannel(bot, msg))) return bot.sendMessage(chatId, JOIN_REQUIRED, { parse_mode: 'HTML', reply_markup: channelKeyboard(), reply_to_message_id: msg.message_id });
      const input = text;

      if (state.cmd === 'numinfo') {
        if (!/^\d{5,15}$/.test(input)) return bot.sendMessage(chatId, '❌ Phone number must be 5-15 digits.', { reply_markup: rk(), reply_to_message_id: msg.message_id });
        return processNumLookup(msg, chatId, input);
      }
      if (state.cmd === 'aadharinfo') {
        if (!/^\d{12}$/.test(input)) return bot.sendMessage(chatId, '❌ Aadhaar must be exactly 12 digits.', { reply_markup: rk(), reply_to_message_id: msg.message_id });
        return processAadLookup(msg, chatId, input);
      }
      if (state.cmd === 'pangstinfo') {
        const pan = input.toUpperCase();
        if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(pan)) return bot.sendMessage(chatId, '❌ Invalid PAN. Format: ABCDE1234F', { reply_markup: rk(), reply_to_message_id: msg.message_id });
        return processPanLookup(msg, chatId, pan);
      }
      if (state.cmd === 'vehicleinfo') {
        const veh = input.toUpperCase();
        if (!/^[A-Z]{2}\s?[0-9]{1,2}\s?[A-Z]{1,2}\s?[0-9]{1,4}$/.test(veh)) return bot.sendMessage(chatId, q(`${HEADER}\n\n❌ ${b('Invalid vehicle number!')}\n\nFormat: ${c('DL10CA7539')}`), { parse_mode: 'HTML', reply_markup: rk(), reply_to_message_id: msg.message_id });
        return processVehLookup(msg, chatId, veh);
      }
    }

    if (text.startsWith('/')) {
      const cmd = text.split(/\s+/)[0].toLowerCase().replace('/', '');
      if (!KNOWN_COMMANDS.includes(cmd)) {
        return bot.sendMessage(chatId, UNKNOWN_CMD, { parse_mode: 'HTML', reply_markup: rk(), reply_to_message_id: msg.message_id });
      }
      return;
    }

    if (!/^\d{5,15}$/.test(text)) {
      return bot.sendMessage(chatId, '❌ Please send a valid number (5-15 digits).', { reply_markup: rk(), reply_to_message_id: msg.message_id });
    }

    if (!(await requireChannel(bot, msg))) {
      return bot.sendMessage(chatId, JOIN_REQUIRED, { parse_mode: 'HTML', reply_markup: channelKeyboard(), reply_to_message_id: msg.message_id });
    }

    const sent = await bot.sendMessage(chatId, LOADER_NUM, { parse_mode: 'HTML', reply_markup: mk(), reply_to_message_id: msg.message_id });

    try {
      const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
      const { data } = await axios.get(`${API_URL}/api/chain`, {
        params: { number: text },
        timeout: 30000,
      });

      if (!data.success || !data.results) {
        return bot.editMessageText(ERR_NODATA(text), {
          chat_id: chatId,
          message_id: sent.message_id,
          parse_mode: 'HTML',
          reply_markup: mk(),
        });
      }

      await bot.editMessageText(formatResults(data.results), {
        chat_id: chatId,
        message_id: sent.message_id,
        parse_mode: 'HTML',
        reply_markup: mk(),
      });
      sendJSONFile(chatId, bot, data, `${text}.json`, msg.message_id);
    } catch {
      await bot.editMessageText(ERR_FAIL, {
        chat_id: chatId,
        message_id: sent.message_id,
        parse_mode: 'HTML',
        reply_markup: mk(),
      });
    }
  });
}

module.exports = { setupBot };
