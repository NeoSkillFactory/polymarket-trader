"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  generateSignal,
  calculatePositionSize,
  formatSignalReport,
  generateSummaryReport,
} = require("./trader");

describe("trader", () => {
  const mockMarket = {
    id: "123",
    question: "Will X happen?",
    description: "Test market",
    outcomePrices: [0.75, 0.25],
    volume: 10000,
  };

  const momentumStrategy = {
    name: "sentiment-momentum",
    parameters: {
      sentimentWeight: 0.6,
      priceWeight: 0.4,
      minSentimentScore: 0.6,
      minPriceChange: 0.02,
      holdPeriodMs: 3600000,
      maxExposure: 0.2,
    },
    rules: [
      { condition: "buy_condition", action: "BUY", sizing: "proportional_to_confidence" },
      { condition: "sell_condition", action: "SELL", sizing: "proportional_to_confidence" },
    ],
  };

  const contrarianStrategy = {
    name: "contrarian",
    parameters: {
      sentimentWeight: 0.7,
      priceWeight: 0.3,
      extremeThreshold: 0.85,
      minPriceDeviation: 0.05,
      holdPeriodMs: 7200000,
      maxExposure: 0.15,
    },
    rules: [
      { condition: "sell_condition", action: "SELL", sizing: "fixed_small" },
      { condition: "buy_condition", action: "BUY", sizing: "fixed_small" },
    ],
  };

  describe("generateSignal", () => {
    it("generates BUY signal for positive sentiment with momentum strategy", () => {
      const sentiment = { score: 0.75, confidence: 0.8, label: "positive" };
      const signal = generateSignal(mockMarket, sentiment, momentumStrategy);
      assert.equal(signal.action, "BUY");
      assert.ok(signal.reason.includes("positive sentiment"));
      assert.equal(signal.marketId, "123");
    });

    it("generates SELL signal for negative sentiment", () => {
      const market = { ...mockMarket, outcomePrices: [0.25, 0.75] };
      const sentiment = { score: 0.3, confidence: 0.7, label: "negative" };
      const signal = generateSignal(market, sentiment, momentumStrategy);
      assert.equal(signal.action, "SELL");
      assert.ok(signal.reason.includes("negative sentiment"));
    });

    it("generates HOLD signal for neutral sentiment", () => {
      const market = { ...mockMarket, outcomePrices: [0.5, 0.5] };
      const sentiment = { score: 0.52, confidence: 0.3, label: "neutral" };
      const signal = generateSignal(market, sentiment, momentumStrategy);
      assert.equal(signal.action, "HOLD");
      assert.equal(signal.suggestedSize, 0);
    });

    it("generates contrarian SELL for extreme positive", () => {
      const market = { ...mockMarket, outcomePrices: [0.9, 0.1] };
      const sentiment = { score: 0.9, confidence: 0.9, label: "positive" };
      const signal = generateSignal(market, sentiment, contrarianStrategy);
      assert.equal(signal.action, "SELL");
      assert.ok(signal.reason.includes("Contrarian"));
    });

    it("generates contrarian BUY for extreme negative", () => {
      const market = { ...mockMarket, outcomePrices: [0.1, 0.9] };
      const sentiment = { score: 0.1, confidence: 0.9, label: "negative" };
      const signal = generateSignal(market, sentiment, contrarianStrategy);
      assert.equal(signal.action, "BUY");
      assert.ok(signal.reason.includes("Contrarian"));
    });

    it("includes timestamp in signal", () => {
      const sentiment = { score: 0.5, confidence: 0.5, label: "neutral" };
      const signal = generateSignal(mockMarket, sentiment, momentumStrategy);
      assert.ok(signal.timestamp);
      assert.ok(new Date(signal.timestamp).getTime() > 0);
    });
  });

  describe("calculatePositionSize", () => {
    it("returns 0 for HOLD", () => {
      const size = calculatePositionSize("HOLD", { confidence: 0.9 }, { maxExposure: 0.2 });
      assert.equal(size, 0);
    });

    it("scales with confidence", () => {
      const lowConf = calculatePositionSize("BUY", { confidence: 0.3 }, { maxExposure: 0.2 });
      const highConf = calculatePositionSize("BUY", { confidence: 0.9 }, { maxExposure: 0.2 });
      assert.ok(highConf > lowConf);
    });

    it("caps at maxExposure", () => {
      const size = calculatePositionSize("BUY", { confidence: 1.5 }, { maxExposure: 0.2 });
      assert.ok(size <= 0.2);
    });
  });

  describe("formatSignalReport", () => {
    it("formats report with signals", () => {
      const signals = [
        { action: "BUY", market: "Test?", reason: "test", sentiment: 0.7, confidence: 0.8, suggestedSize: 0.1 },
        { action: "SELL", market: "Other?", reason: "test", sentiment: 0.3, confidence: 0.6, suggestedSize: 0.05 },
        { action: "HOLD", market: "Neutral?", reason: "test", sentiment: 0.5, confidence: 0.3, suggestedSize: 0 },
      ];
      const report = formatSignalReport(signals);
      assert.ok(report.includes("BUY signals: 1"));
      assert.ok(report.includes("SELL signals: 1"));
      assert.ok(report.includes("HOLD: 1"));
      assert.ok(report.includes("DRY-RUN"));
      assert.ok(report.includes(">>>"));
      assert.ok(report.includes("<<<"));
    });

    it("handles empty signals", () => {
      const report = formatSignalReport([]);
      assert.ok(report.includes("Total markets analyzed: 0"));
    });
  });

  describe("generateSummaryReport", () => {
    it("creates summary with correct counts", () => {
      const signals = [
        { action: "BUY" },
        { action: "BUY" },
        { action: "SELL" },
        { action: "HOLD" },
      ];
      const config = { mode: "dry-run" };
      const strategy = { name: "sentiment-momentum" };
      const summary = generateSummaryReport(signals, config, strategy);
      assert.equal(summary.mode, "dry-run");
      assert.equal(summary.strategy, "sentiment-momentum");
      assert.equal(summary.marketsAnalyzed, 4);
      assert.equal(summary.signals.buy, 2);
      assert.equal(summary.signals.sell, 1);
      assert.equal(summary.signals.hold, 1);
    });
  });
});
