const express = require('express');
const axios = require('axios');
const { lookupChain } = require('./lookup');

const router = express.Router();

const OWNER = process.env.OWNER || 'zenox_dev';
const CHANNEL = process.env.CHANNEL || 'zenox_network';

const AADHAAR_API = 'https://aadhar-family.vercel.app/';
const AADHAAR_KEY = 'toxicadminn';

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
      params: { aadhaar, apikey: AADHAAR_KEY },
      timeout: 15000,
    });

    if (!data || !data.success) {
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
      result: data.result || data,
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

module.exports = router;
