"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const {
  loadConfig,
  loadDefaults,
  loadStrategies,
  validateConfig,
  getStrategy,
  applyCliOverrides,
  parseArgs,
  deepMerge,
} = require("./config-manager");

describe("config-manager", () => {
  describe("loadDefaults", () => {
    it("loads default config from assets", () => {
      const config = loadDefaults();
      assert.equal(typeof config, "object");
      assert.equal(config.mode, "dry-run");
      assert.ok(config.trading);
      assert.ok(config.sentiment);
      assert.ok(config.markets);
      assert.ok(config.polling);
    });

    it("has correct default values", () => {
      const config = loadDefaults();
      assert.equal(config.trading.strategy, "sentiment-momentum");
      assert.equal(config.trading.minConfidence, 0.65);
      assert.equal(config.sentiment.positiveThreshold, 0.6);
      assert.equal(config.sentiment.negativeThreshold, 0.4);
    });
  });

  describe("loadConfig", () => {
    it("returns defaults when no custom path given", () => {
      const config = loadConfig();
      assert.equal(config.mode, "dry-run");
    });

    it("throws for non-existent config file", () => {
      assert.throws(() => loadConfig("/nonexistent/config.json"), {
        message: /Config file not found/,
      });
    });
  });

  describe("loadStrategies", () => {
    it("loads available strategies", () => {
      const data = loadStrategies();
      assert.ok(data.strategies);
      assert.ok(data.strategies["sentiment-momentum"]);
      assert.ok(data.strategies["contrarian"]);
      assert.ok(data.strategies["conservative"]);
    });

    it("each strategy has required fields", () => {
      const data = loadStrategies();
      for (const [name, strategy] of Object.entries(data.strategies)) {
        assert.ok(strategy.description, `${name} missing description`);
        assert.ok(strategy.parameters, `${name} missing parameters`);
        assert.ok(strategy.rules, `${name} missing rules`);
        assert.ok(Array.isArray(strategy.rules), `${name} rules not array`);
      }
    });
  });

  describe("validateConfig", () => {
    it("passes for valid default config", () => {
      const config = loadDefaults();
      const errors = validateConfig(config);
      assert.equal(errors.length, 0);
    });

    it("catches missing required sections", () => {
      const errors = validateConfig({});
      assert.ok(errors.length > 0);
      assert.ok(errors.some((e) => e.includes("trading")));
    });

    it("catches invalid mode", () => {
      const config = loadDefaults();
      config.mode = "invalid";
      const errors = validateConfig(config);
      assert.ok(errors.some((e) => e.includes("mode")));
    });

    it("catches out-of-range values", () => {
      const config = loadDefaults();
      config.trading.minConfidence = 2;
      const errors = validateConfig(config);
      assert.ok(errors.some((e) => e.includes("minConfidence")));
    });

    it("catches wrong types", () => {
      const config = loadDefaults();
      config.trading.maxPositionSize = "not-a-number";
      const errors = validateConfig(config);
      assert.ok(errors.some((e) => e.includes("maxPositionSize")));
    });
  });

  describe("getStrategy", () => {
    it("returns sentiment-momentum strategy", () => {
      const config = loadDefaults();
      const strategy = getStrategy(config);
      assert.equal(strategy.name, "sentiment-momentum");
      assert.ok(strategy.description);
      assert.ok(strategy.parameters);
    });

    it("throws for unknown strategy", () => {
      const config = loadDefaults();
      config.trading.strategy = "nonexistent";
      assert.throws(() => getStrategy(config), {
        message: /Unknown strategy/,
      });
    });
  });

  describe("applyCliOverrides", () => {
    it("overrides strategy", () => {
      const config = loadDefaults();
      applyCliOverrides(config, { strategy: "contrarian" });
      assert.equal(config.trading.strategy, "contrarian");
    });

    it("overrides markets watchlist", () => {
      const config = loadDefaults();
      applyCliOverrides(config, { markets: "bitcoin,election" });
      assert.deepEqual(config.markets.watchlist, ["bitcoin", "election"]);
    });

    it("overrides limit", () => {
      const config = loadDefaults();
      applyCliOverrides(config, { limit: "3" });
      assert.equal(config.markets.maxConcurrent, 3);
    });
  });

  describe("parseArgs", () => {
    it("parses key-value args", () => {
      const args = parseArgs(["node", "script.js", "--strategy", "contrarian", "--limit", "5"]);
      assert.equal(args.strategy, "contrarian");
      assert.equal(args.limit, "5");
    });

    it("parses boolean flags", () => {
      const args = parseArgs(["node", "script.js", "--verbose"]);
      assert.equal(args.verbose, true);
    });

    it("returns empty for no args", () => {
      const args = parseArgs(["node", "script.js"]);
      assert.deepEqual(args, {});
    });
  });

  describe("deepMerge", () => {
    it("merges nested objects", () => {
      const target = { a: { b: 1, c: 2 }, d: 3 };
      const source = { a: { b: 10 }, e: 5 };
      const result = deepMerge(target, source);
      assert.equal(result.a.b, 10);
      assert.equal(result.a.c, 2);
      assert.equal(result.d, 3);
      assert.equal(result.e, 5);
    });

    it("does not mutate originals", () => {
      const target = { a: { b: 1 } };
      const source = { a: { c: 2 } };
      deepMerge(target, source);
      assert.equal(target.a.c, undefined);
    });

    it("overwrites arrays", () => {
      const target = { list: [1, 2] };
      const source = { list: [3] };
      const result = deepMerge(target, source);
      assert.deepEqual(result.list, [3]);
    });
  });
});
