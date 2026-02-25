"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  analyzeText,
  analyzePriceSignal,
  analyzeVolumeSignal,
  aggregateSentiment,
  formatSentimentReport,
  tokenize,
} = require("./sentiment-analyzer");

describe("sentiment-analyzer", () => {
  describe("tokenize", () => {
    it("lowercases and splits text", () => {
      const tokens = tokenize("Hello World");
      assert.deepEqual(tokens, ["hello", "world"]);
    });

    it("removes punctuation", () => {
      const tokens = tokenize("Will X happen? Yes!");
      assert.deepEqual(tokens, ["will", "happen", "yes"]);
    });

    it("filters single-character tokens", () => {
      const tokens = tokenize("I am a test");
      assert.ok(!tokens.includes("a"));
      assert.ok(!tokens.includes("I"));
    });

    it("handles empty string", () => {
      assert.deepEqual(tokenize(""), []);
    });
  });

  describe("analyzeText", () => {
    it("returns neutral for empty text", () => {
      const result = analyzeText("");
      assert.equal(result.score, 0.5);
      assert.equal(result.confidence, 0);
    });

    it("returns neutral for null", () => {
      const result = analyzeText(null);
      assert.equal(result.score, 0.5);
    });

    it("detects positive sentiment", () => {
      const result = analyzeText("The project was a great success and achieved strong growth");
      assert.ok(result.score > 0.5, `Expected positive score, got ${result.score}`);
      assert.ok(result.positive > 0);
    });

    it("detects negative sentiment", () => {
      const result = analyzeText("The project failed and suffered a major decline and collapse");
      assert.ok(result.score < 0.5, `Expected negative score, got ${result.score}`);
      assert.ok(result.negative > 0);
    });

    it("handles negation", () => {
      const positive = analyzeText("The project will win and gain support");
      const negated = analyzeText("The project will not win and not gain support");
      assert.ok(negated.score < positive.score, "Negation should reduce score");
    });

    it("handles intensifiers", () => {
      const normal = analyzeText("This is a success");
      const intensified = analyzeText("This is a very success");
      // Intensifier increases positive count, potentially changing score
      assert.ok(intensified.positive >= normal.positive);
    });

    it("returns score between 0 and 1", () => {
      const texts = [
        "everything is amazing wonderful success",
        "total failure disaster collapse",
        "normal text without sentiment",
      ];
      for (const text of texts) {
        const result = analyzeText(text);
        assert.ok(result.score >= 0 && result.score <= 1, `Score ${result.score} out of range for: ${text}`);
      }
    });
  });

  describe("analyzePriceSignal", () => {
    it("maps high price to positive sentiment", () => {
      const result = analyzePriceSignal(0.85);
      assert.ok(result.score > 0.6);
      assert.equal(result.label, "positive");
    });

    it("maps low price to negative sentiment", () => {
      const result = analyzePriceSignal(0.15);
      assert.ok(result.score < 0.4);
      assert.equal(result.label, "negative");
    });

    it("maps 0.5 to neutral", () => {
      const result = analyzePriceSignal(0.5);
      assert.equal(result.score, 0.5);
      assert.equal(result.label, "neutral");
    });

    it("handles string input", () => {
      const result = analyzePriceSignal("0.7");
      assert.equal(result.score, 0.7);
    });

    it("handles invalid input gracefully", () => {
      const result = analyzePriceSignal(null);
      assert.equal(result.score, 0.5);
    });
  });

  describe("analyzeVolumeSignal", () => {
    it("high volume gives positive signal", () => {
      const result = analyzeVolumeSignal(20000, 10000);
      assert.ok(result.score > 0.5);
    });

    it("low volume gives neutral/negative signal", () => {
      const result = analyzeVolumeSignal(5000, 10000);
      assert.ok(result.score <= 0.5);
    });

    it("returns neutral for zero average", () => {
      const result = analyzeVolumeSignal(100, 0);
      assert.equal(result.score, 0.5);
      assert.equal(result.label, "neutral");
    });

    it("clamps score to [0, 1]", () => {
      const result = analyzeVolumeSignal(1000000, 100);
      assert.ok(result.score >= 0 && result.score <= 1);
    });
  });

  describe("aggregateSentiment", () => {
    const mockMarket = {
      question: "Will this succeed?",
      description: "A project expected to achieve strong growth and win approval",
      outcomePrices: [0.75, 0.25],
      volume: 15000,
    };

    it("returns aggregated score", () => {
      const result = aggregateSentiment(mockMarket, {});
      assert.ok(typeof result.score === "number");
      assert.ok(result.score >= 0 && result.score <= 1);
    });

    it("returns confidence", () => {
      const result = aggregateSentiment(mockMarket, {});
      assert.ok(typeof result.confidence === "number");
      assert.ok(result.confidence >= 0 && result.confidence <= 1);
    });

    it("returns label", () => {
      const result = aggregateSentiment(mockMarket, {});
      assert.ok(["positive", "negative", "neutral"].includes(result.label));
    });

    it("includes source breakdown", () => {
      const result = aggregateSentiment(mockMarket, {});
      assert.ok(result.sources);
      assert.ok(result.sources.text);
      assert.ok(result.sources.price);
      assert.ok(result.sources.volume);
    });

    it("respects config thresholds", () => {
      const config = {
        sentiment: { positiveThreshold: 0.9, negativeThreshold: 0.1 },
      };
      const result = aggregateSentiment(mockMarket, config);
      // With very extreme thresholds, most results should be neutral
      if (result.score < 0.9 && result.score > 0.1) {
        assert.equal(result.label, "neutral");
      }
    });
  });

  describe("formatSentimentReport", () => {
    it("formats readable output", () => {
      const market = { question: "Test market?" };
      const sentiment = {
        score: 0.7,
        confidence: 0.5,
        label: "positive",
        sources: {
          text: { score: 0.6, confidence: 0.3 },
          price: { score: 0.8, confidence: 0.7 },
          volume: { score: 0.5, confidence: 0.2 },
        },
      };
      const report = formatSentimentReport(market, sentiment);
      assert.ok(report.includes("Test market?"));
      assert.ok(report.includes("POSITIVE"));
      assert.ok(report.includes("70.0%"));
    });
  });
});
