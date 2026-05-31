const axios = require('axios');

const PAWAN_API = 'https://pawan-osint.vercel.app/api';
const PAWAN_KEY = 'toxicadminn';
const SECONDARY_URL = 'https://nv3.ek4nsh.in/api/lookup';

function getSurname(name) {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1].toLowerCase();
}

function mergeFields(primary, secondary) {
  const merged = {};
  const allKeys = new Set([
    ...Object.keys(primary || {}),
    ...Object.keys(secondary || {}),
  ]);
  for (const key of allKeys) {
    merged[key] = (primary && primary[key]) || (secondary && secondary[key]) || '';
  }
  return merged;
}

async function lookupChain(number) {
  let pawanResults = null;

  try {
    const { data } = await axios.get(PAWAN_API, {
      params: { apikey: PAWAN_KEY, number },
      timeout: 20000,
    });
    if (data && data.success && data.result && data.result.results) {
      pawanResults = data.result.results;
    }
  } catch {}

  if (!pawanResults || pawanResults.length === 0) return null;

  const enriched = [];
  for (const item of pawanResults) {
    const primaryData = {
      searchedNumber: item.mobile || number,
      mobile: item.mobile || '',
      name: item.name || '',
      fatherName: item.father_name || '',
      address: item.address || '',
      circle: item.circle || '',
      alternateNumber: item.alternate_number || '',
      aadhaarNumber: item.aadhaar || '',
      email: '',
    };

    let secondaryData = null;
    try {
      const { data } = await axios.get(SECONDARY_URL, {
        params: { term: item.mobile || number },
        timeout: 8000,
      });
      if (data && data.success && data.data && data.data.length > 0) {
        const e = data.data[0];
        secondaryData = {
          email: e.email || '',
          name: e.name || '',
          fatherName: e.fatherName || '',
          address: e.address || '',
          circle: e.circle || '',
        };
      }
    } catch {}

    enriched.push(mergeFields(primaryData, secondaryData));
  }

  const surname = getSurname(enriched[0].name);
  if (!surname) return enriched;

  return enriched.filter(r => getSurname(r.name) === surname);
}

module.exports = { lookupChain };
