"use strict";

const https = require("https");

const DEFAULT_BASE_URL = "https://gamma-api.polymarket.com";

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        if (res.statusCode >= 400) {
          reject(
            new Error(`HTTP ${res.statusCode} from ${url}: ${data.slice(0, 200)}`)
          );
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Invalid JSON from ${url}: ${e.message}`));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error(`Request timeout for ${url}`));
    });
  });
}

function buildQueryString(params) {
  const parts = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  }
  return parts.length > 0 ? `?${parts.join("&")}` : "";
}

async function fetchMarkets(config, options = {}) {
  const baseUrl = (config && config.apiBaseUrl) || DEFAULT_BASE_URL;
  const limit = (options && options.limit) || 10;
  const active = options.active !== undefined ? options.active : true;

  const params = {
    limit,
    active,
    closed: false,
    order: "volume",
    ascending: false,
  };

  if (options.offset) {
    params.offset = options.offset;
  }

  const url = `${baseUrl}/markets${buildQueryString(params)}`;
  const markets = await httpsGet(url);

  if (!Array.isArray(markets)) {
    throw new Error("Unexpected API response: expected array of markets");
  }

  return markets.map(normalizeMarket);
}

async function fetchMarketById(config, marketId) {
  const baseUrl = (config && config.apiBaseUrl) || DEFAULT_BASE_URL;
  const url = `${baseUrl}/markets/${encodeURIComponent(marketId)}`;
  const market = await httpsGet(url);
  return normalizeMarket(market);
}

async function searchMarkets(config, searchTerms, limit) {
  const allMarkets = await fetchMarkets(config, { limit: 100 });
  const terms = searchTerms.map((t) => t.toLowerCase());

  const matched = allMarkets.filter((m) => {
    const text = `${m.question} ${m.description}`.toLowerCase();
    return terms.some((term) => text.includes(term));
  });

  return matched.slice(0, limit || 10);
}

function normalizeMarket(raw) {
  const outcomePrices = parseOutcomePrices(raw.outcomePrices);
  const yesPrice = outcomePrices[0] || 0.5;
  const noPrice = outcomePrices[1] || 1 - yesPrice;

  return {
    id: raw.id || raw.condition_id || "unknown",
    question: raw.question || "Unknown market",
    description: raw.description || "",
    slug: raw.slug || "",
    outcomes: raw.outcomes || ["Yes", "No"],
    outcomePrices: [yesPrice, noPrice],
    volume: parseFloat(raw.volume) || 0,
    liquidity: parseFloat(raw.liquidity) || 0,
    active: raw.active !== false,
    closed: raw.closed === true,
    endDate: raw.endDate || null,
    createdAt: raw.createdAt || null,
  };
}

function parseOutcomePrices(prices) {
  if (!prices) return [0.5, 0.5];
  if (typeof prices === "string") {
    try {
      prices = JSON.parse(prices);
    } catch {
      return [0.5, 0.5];
    }
  }
  if (Array.isArray(prices)) {
    return prices.map((p) => parseFloat(p) || 0.5);
  }
  return [0.5, 0.5];
}

function computePriceChange(currentPrice, previousPrice) {
  if (!previousPrice || previousPrice === 0) return 0;
  return (currentPrice - previousPrice) / previousPrice;
}

function detectVolumeSpike(currentVolume, avgVolume) {
  if (!avgVolume || avgVolume === 0) return false;
  return currentVolume > avgVolume * 1.5;
}

function formatMarketSummary(market) {
  const yesPrice = (market.outcomePrices[0] * 100).toFixed(1);
  const noPrice = (market.outcomePrices[1] * 100).toFixed(1);
  const volume = market.volume >= 1000
    ? `$${(market.volume / 1000).toFixed(1)}k`
    : `$${market.volume.toFixed(0)}`;

  return `[${market.id}] ${market.question}\n  Yes: ${yesPrice}% | No: ${noPrice}% | Volume: ${volume}`;
}

module.exports = {
  fetchMarkets,
  fetchMarketById,
  searchMarkets,
  normalizeMarket,
  parseOutcomePrices,
  computePriceChange,
  detectVolumeSpike,
  formatMarketSummary,
  httpsGet,
};
