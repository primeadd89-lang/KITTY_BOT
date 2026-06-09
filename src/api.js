const express = require('express');
const axios = require('axios');
const { lookupChain } = require('./lookup');

const router = express.Router();

const OWNER = process.env.OWNER || 'zenox_dev';
const CHANNEL = process.env.CHANNEL || 'zenox_network';

const AADHAAR_API = 'https://believes-shore-funny-void.trycloudflare.com/search';

router.get('/chain', async (req, res) => {
  const { number } = req.query;
  if (!number || !/^\d{5,15}$/.test(number)) {
    return res.status(400).json({
      success: false,
      owner: OWNER,
      channel: CHANNEL,
      message: 'Provide a valid number (5-15 digits)',
    });
  }

  try {
    const data = await lookupChain(number);
    if (!data) {
      return res.json({
        success: true,
        owner: OWNER,
        channel: CHANNEL,
        message: 'No data found for this number',
        results: null,
      });
    }

    const results = {};
    data.forEach((item, i) => {
      results[`result ${i + 1}`] = item;
    });

    res.json({
      success: true,
      owner: OWNER,
      channel: CHANNEL,
      results,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      owner: OWNER,
      channel: CHANNEL,
      message: err.message,
    });
  }
});

router.get('/aadhaar', async (req, res) => {
  const { aadhaar } = req.query;
  if (!aadhaar || !/^\d{12}$/.test(aadhaar)) {
    return res.status(400).json({
      success: false,
      owner: OWNER,
      channel: CHANNEL,
      message: 'Provide a valid 12-digit Aadhaar number',
    });
  }

  try {
    const { data } = await axios.get(AADHAAR_API, {
      params: { q: aadhaar },
      timeout: 15000,
    });

    if (!data || !data.status || !data.results || data.results.length === 0) {
      return res.json({
        success: true,
        owner: OWNER,
        channel: CHANNEL,
        message: 'Aadhaar lookup returned no data',
        result: null,
      });
    }

    res.json({
      success: true,
      owner: OWNER,
      channel: CHANNEL,
      aadhaar,
      count: data.count,
      results: data.results,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      owner: OWNER,
      channel: CHANNEL,
      message: 'Aadhaar lookup failed',
    });
  }
});

const PAN_API = 'https://razorpay.com/api/gstin/pan/';

router.get('/pangst', async (req, res) => {
  const { pan } = req.query;
  if (!pan || !/^[A-Z]{5}\d{4}[A-Z]$/.test(pan.toUpperCase())) {
    return res.status(400).json({
      success: false,
      owner: OWNER,
      channel: CHANNEL,
      message: 'Provide a valid 10-character PAN (e.g. ABCDE1234F)',
    });
  }

  try {
    const { data } = await axios.get(`${PAN_API}${pan.toUpperCase()}`, {
      timeout: 15000,
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
    });

    res.json({
      success: true,
      owner: OWNER,
      channel: CHANNEL,
      pan: pan.toUpperCase(),
      result: data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      owner: OWNER,
      channel: CHANNEL,
      message: 'PAN lookup failed',
    });
  }
});

const VEHICLE_API = 'https://vehicle-information-seven.vercel.app/info';

router.get('/vehicle', async (req, res) => {
  const { vehicle } = req.query;
  if (!vehicle || !/^[A-Za-z]{2}\s?[0-9]{1,2}\s?[A-Za-z]{1,2}\s?[0-9]{1,4}$/.test(vehicle)) {
    return res.status(400).json({
      success: false,
      owner: OWNER,
      channel: CHANNEL,
      message: 'Provide a valid vehicle number (e.g. DL10CA7539)',
    });
  }

  try {
    const { data } = await axios.get(VEHICLE_API, {
      params: { vehicle: vehicle.toUpperCase() },
      timeout: 15000,
    });

    if (!data || data.error) {
      return res.json({
        success: true,
        owner: OWNER,
        channel: CHANNEL,
        message: 'No data found for this vehicle number',
        result: null,
      });
    }

    res.json({
      success: true,
      owner: OWNER,
      channel: CHANNEL,
      vehicle: vehicle.toUpperCase(),
      result: data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      owner: OWNER,
      channel: CHANNEL,
      message: 'Vehicle lookup failed',
    });
  }
});

const FF_API = 'https://mafuuuu-info-api.vercel.app/mafu-info';

router.get('/ffinfo', async (req, res) => {
  const { uid } = req.query;
  if (!uid || !/^\d{1,17}$/.test(uid)) {
    return res.status(400).json({
      success: false,
      owner: OWNER,
      channel: CHANNEL,
      message: 'Provide a valid Free Fire UID (numeric)',
    });
  }

  try {
    const { data } = await axios.get(FF_API, {
      params: { uid },
      timeout: 15000,
    });

    if (!data) {
      return res.json({
        success: true,
        owner: OWNER,
        channel: CHANNEL,
        message: 'No data found for this UID',
        result: null,
      });
    }

    res.json({
      success: true,
      owner: OWNER,
      channel: CHANNEL,
      uid,
      result: data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      owner: OWNER,
      channel: CHANNEL,
      message: 'Free Fire lookup failed',
    });
  }
});

const TG_API = 'https://krish-osintoy.lovable.app/api/v1/tg';
const TG_KEY = 'rtf-7e9m8w62cmqyrbgyfq4tnpln';

router.get('/tginfo', async (req, res) => {
  const { info } = req.query;
  if (!info) {
    return res.status(400).json({
      success: false,
      owner: OWNER,
      channel: CHANNEL,
      message: 'Provide a Telegram username or ID (e.g. @username)',
    });
  }

  try {
    const { data } = await axios.get(TG_API, {
      params: { key: TG_KEY, info },
      timeout: 15000,
    });

    if (!data || !data.success) {
      return res.json({
        success: true,
        owner: OWNER,
        channel: CHANNEL,
        message: 'No data found for this Telegram info',
        result: null,
      });
    }

    res.json({
      success: true,
      owner: OWNER,
      channel: CHANNEL,
      info,
      result: data,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      owner: OWNER,
      channel: CHANNEL,
      message: 'Telegram lookup failed',
    });
  }
});

module.exports = router;
