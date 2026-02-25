"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeMarket,
  parseOutcomePrices,
  computePriceChange,
  detectVolumeSpike,
  formatMarketSummary,
} = require("./market-monitor");

describe("market-monitor", () => {
  describe("parseOutcomePrices", () => {
    it("parses array of number strings", () => {
      const result = parseOutcomePrices(["0.65", "0.35"]);
      assert.deepEqual(result, [0.65, 0.35]);
    });

    it("parses JSON string", () => {
      const result = parseOutcomePrices('["0.70", "0.30"]');
      assert.deepEqual(result, [0.7, 0.3]);
    });

    it("returns defaults for null", () => {
      const result = parseOutcomePrices(null);
      assert.deepEqual(result, [0.5, 0.5]);
    });

    it("returns defaults for invalid JSON string", () => {
      const result = parseOutcomePrices("not-json");
      assert.deepEqual(result, [0.5, 0.5]);
    });

    it("handles numeric values", () => {
      const result = parseOutcomePrices([0.8, 0.2]);
      assert.deepEqual(result, [0.8, 0.2]);
    });
  });

  describe("normalizeMarket", () => {
    it("normalizes a raw market object", () => {
      const raw = {
        id: "123",
        question: "Will X happen?",
        description: "Test description",
        slug: "will-x-happen",
        outcomes: ["Yes", "No"],
        outcomePrices: ["0.60", "0.40"],
        volume: "50000",
        liquidity: "25000",
        active: true,
        closed: false,
      };
      const market = normalizeMarket(raw);
      assert.equal(market.id, "123");
      assert.equal(market.question, "Will X happen?");
      assert.deepEqual(market.outcomePrices, [0.6, 0.4]);
      assert.equal(market.volume, 50000);
      assert.equal(market.liquidity, 25000);
      assert.equal(market.active, true);
      assert.equal(market.closed, false);
    });

    it("handles missing fields with defaults", () => {
      const market = normalizeMarket({});
      assert.equal(market.id, "unknown");
      assert.equal(market.question, "Unknown market");
      assert.deepEqual(market.outcomePrices, [0.5, 0.5]);
      assert.equal(market.volume, 0);
      assert.equal(market.active, true);
    });

    it("uses condition_id as fallback id", () => {
      const market = normalizeMarket({ condition_id: "abc" });
      assert.equal(market.id, "abc");
    });
  });

  describe("computePriceChange", () => {
    it("computes positive change", () => {
      const change = computePriceChange(0.7, 0.5);
      assert.ok(Math.abs(change - 0.4) < 0.001);
    });

    it("computes negative change", () => {
      const change = computePriceChange(0.3, 0.5);
      assert.ok(Math.abs(change - (-0.4)) < 0.001);
    });

    it("returns 0 for zero previous price", () => {
      assert.equal(computePriceChange(0.5, 0), 0);
    });

    it("returns 0 for null previous price", () => {
      assert.equal(computePriceChange(0.5, null), 0);
    });
  });

  describe("detectVolumeSpike", () => {
    it("detects spike above 1.5x average", () => {
      assert.equal(detectVolumeSpike(2000, 1000), true);
    });

    it("no spike at normal volume", () => {
      assert.equal(detectVolumeSpike(1200, 1000), false);
    });

    it("returns false for zero average", () => {
      assert.equal(detectVolumeSpike(100, 0), false);
    });
  });

  describe("formatMarketSummary", () => {
    it("formats market info", () => {
      const market = {
        id: "123",
        question: "Test?",
        outcomePrices: [0.65, 0.35],
        volume: 50000,
      };
      const summary = formatMarketSummary(market);
      assert.ok(summary.includes("[123]"));
      assert.ok(summary.includes("Test?"));
      assert.ok(summary.includes("65.0%"));
      assert.ok(summary.includes("$50.0k"));
    });

    it("formats small volume without k suffix", () => {
      const market = {
        id: "1",
        question: "Q?",
        outcomePrices: [0.5, 0.5],
        volume: 500,
      };
      const summary = formatMarketSummary(market);
      assert.ok(summary.includes("$500"));
    });
  });
});
