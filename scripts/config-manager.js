"use strict";

const fs = require("fs");
const path = require("path");

const ASSETS_DIR = path.join(__dirname, "..", "assets");
const DEFAULT_CONFIG_PATH = path.join(ASSETS_DIR, "config-template.json");
const STRATEGIES_PATH = path.join(ASSETS_DIR, "default-strategies.json");

const REQUIRED_SECTIONS = ["trading", "sentiment", "markets", "polling"];

const SCHEMA = {
  apiBaseUrl: { type: "string" },
  clobApiUrl: { type: "string" },
  mode: { type: "string", enum: ["dry-run", "live"] },
  polling: {
    type: "object",
    properties: {
      intervalMs: { type: "number", min: 1000 },
      maxRetries: { type: "number", min: 0 },
      retryDelayMs: { type: "number", min: 100 },
    },
  },
  trading: {
    type: "object",
    properties: {
      strategy: { type: "string" },
      maxPositionSize: { type: "number", min: 0 },
      minConfidence: { type: "number", min: 0, max: 1 },
      riskLimit: { type: "number", min: 0, max: 1 },
      stopLoss: { type: "number", min: 0, max: 1 },
      takeProfit: { type: "number", min: 0, max: 1 },
    },
  },
  sentiment: {
    type: "object",
    properties: {
      sources: { type: "array" },
      positiveThreshold: { type: "number", min: 0, max: 1 },
      negativeThreshold: { type: "number", min: 0, max: 1 },
      decayHalfLifeMs: { type: "number", min: 0 },
    },
  },
  markets: {
    type: "object",
    properties: {
      watchlist: { type: "array" },
      maxConcurrent: { type: "number", min: 1 },
      minLiquidity: { type: "number", min: 0 },
    },
  },
  reporting: {
    type: "object",
    properties: {
      enabled: { type: "boolean" },
      format: { type: "string", enum: ["json", "text"] },
      outputDir: { type: "string" },
    },
  },
};

function validateValue(value, rule, fieldPath) {
  const errors = [];
  if (rule.type === "number") {
    if (typeof value !== "number" || Number.isNaN(value)) {
      errors.push(`${fieldPath}: expected number, got ${typeof value}`);
    } else {
      if (rule.min !== undefined && value < rule.min) {
        errors.push(`${fieldPath}: value ${value} is below minimum ${rule.min}`);
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push(`${fieldPath}: value ${value} exceeds maximum ${rule.max}`);
      }
    }
  } else if (rule.type === "string") {
    if (typeof value !== "string") {
      errors.push(`${fieldPath}: expected string, got ${typeof value}`);
    } else if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`${fieldPath}: value "${value}" not in [${rule.enum.join(", ")}]`);
    }
  } else if (rule.type === "boolean") {
    if (typeof value !== "boolean") {
      errors.push(`${fieldPath}: expected boolean, got ${typeof value}`);
    }
  } else if (rule.type === "array") {
    if (!Array.isArray(value)) {
      errors.push(`${fieldPath}: expected array, got ${typeof value}`);
    }
  }
  return errors;
}

function validateConfig(config) {
  const errors = [];

  for (const section of REQUIRED_SECTIONS) {
    if (!config[section]) {
      errors.push(`Missing required section: ${section}`);
    }
  }

  for (const [key, rule] of Object.entries(SCHEMA)) {
    if (config[key] === undefined) continue;

    if (rule.type === "object" && rule.properties) {
      if (typeof config[key] !== "object" || config[key] === null) {
        errors.push(`${key}: expected object`);
        continue;
      }
      for (const [prop, propRule] of Object.entries(rule.properties)) {
        if (config[key][prop] === undefined) continue;
        errors.push(...validateValue(config[key][prop], propRule, `${key}.${prop}`));
      }
    } else {
      errors.push(...validateValue(config[key], rule, key));
    }
  }

  return errors;
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function loadDefaults() {
  const raw = fs.readFileSync(DEFAULT_CONFIG_PATH, "utf-8");
  return JSON.parse(raw);
}

function loadStrategies() {
  const raw = fs.readFileSync(STRATEGIES_PATH, "utf-8");
  return JSON.parse(raw);
}

function loadConfig(customPath) {
  const defaults = loadDefaults();

  if (!customPath) {
    return defaults;
  }

  const resolved = path.resolve(customPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Config file not found: ${resolved}`);
  }

  const raw = fs.readFileSync(resolved, "utf-8");
  const custom = JSON.parse(raw);
  return deepMerge(defaults, custom);
}

function getStrategy(config) {
  const strategies = loadStrategies();
  const name = config.trading.strategy;
  const strategy = strategies.strategies[name];
  if (!strategy) {
    const available = Object.keys(strategies.strategies).join(", ");
    throw new Error(`Unknown strategy "${name}". Available: ${available}`);
  }
  return { name, ...strategy };
}

function applyCliOverrides(config, args) {
  if (args.strategy) {
    config.trading.strategy = args.strategy;
  }
  if (args.markets) {
    config.markets.watchlist = args.markets.split(",").map((m) => m.trim());
  }
  if (args.limit) {
    config.markets.maxConcurrent = parseInt(args.limit, 10);
  }
  if (args.mode) {
    config.mode = args.mode;
  }
  return config;
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

module.exports = {
  loadConfig,
  loadDefaults,
  loadStrategies,
  validateConfig,
  getStrategy,
  applyCliOverrides,
  parseArgs,
  deepMerge,
};
