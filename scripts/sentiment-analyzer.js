"use strict";

const POSITIVE_WORDS = [
  "win", "won", "winning", "success", "successful", "approve", "approved",
  "approval", "pass", "passed", "passing", "gain", "gains", "rise", "rising",
  "increase", "increased", "grow", "growth", "positive", "support", "supported",
  "agree", "agreement", "yes", "likely", "probable", "confirmed", "achieve",
  "achieved", "progress", "improve", "improved", "strong", "strength",
  "momentum", "bullish", "optimistic", "favorable", "upward", "surge",
  "surging", "rally", "boost", "boosted", "confident", "confidence",
  "outperform", "beat", "exceed", "exceeded", "record", "high", "peak",
  "breakout", "breakthrough", "advance", "advancing",
];

const NEGATIVE_WORDS = [
  "lose", "lost", "losing", "fail", "failed", "failure", "reject", "rejected",
  "rejection", "decline", "declining", "decrease", "decreased", "fall",
  "falling", "drop", "dropped", "negative", "oppose", "opposed", "disagree",
  "no", "unlikely", "improbable", "denied", "deny", "collapse", "weak",
  "weakness", "bearish", "pessimistic", "unfavorable", "downward", "plunge",
  "plunging", "crash", "crashed", "risk", "risky", "threat", "threaten",
  "underperform", "miss", "missed", "low", "bottom", "breakdown", "retreat",
  "retreating", "concern", "worried", "uncertain", "uncertainty",
];

const INTENSIFIERS = [
  "very", "extremely", "highly", "significantly", "strongly", "dramatically",
  "substantially", "remarkably", "exceptionally", "overwhelmingly",
];

const NEGATORS = [
  "not", "no", "never", "neither", "nor", "hardly", "barely", "scarcely",
  "doesn't", "don't", "didn't", "isn't", "aren't", "wasn't", "weren't",
  "won't", "wouldn't", "couldn't", "shouldn't",
];

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function analyzeText(text) {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return { score: 0.5, positive: 0, negative: 0, total: 0, confidence: 0 };
  }

  const words = tokenize(text);
  const total = words.length;
  if (total === 0) {
    return { score: 0.5, positive: 0, negative: 0, total: 0, confidence: 0 };
  }

  let positiveCount = 0;
  let negativeCount = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const prevWord = i > 0 ? words[i - 1] : null;
    const prevPrevWord = i > 1 ? words[i - 2] : null;
    const isNegated =
      (prevWord && NEGATORS.includes(prevWord)) ||
      (prevPrevWord && NEGATORS.includes(prevPrevWord));
    const isIntensified = prevWord && INTENSIFIERS.includes(prevWord);
    const multiplier = isIntensified ? 1.5 : 1;

    if (POSITIVE_WORDS.includes(word)) {
      if (isNegated) {
        negativeCount += multiplier;
      } else {
        positiveCount += multiplier;
      }
    } else if (NEGATIVE_WORDS.includes(word)) {
      if (isNegated) {
        positiveCount += multiplier;
      } else {
        negativeCount += multiplier;
      }
    }
  }

  const sentimentWords = positiveCount + negativeCount;
  if (sentimentWords === 0) {
    return { score: 0.5, positive: 0, negative: 0, total, confidence: 0 };
  }

  const rawScore = positiveCount / sentimentWords;
  const confidence = Math.min(sentimentWords / Math.max(total * 0.1, 1), 1);

  // Blend raw score toward 0.5 based on confidence
  const score = 0.5 + (rawScore - 0.5) * confidence;

  return {
    score: Math.round(score * 1000) / 1000,
    positive: positiveCount,
    negative: negativeCount,
    total,
    confidence: Math.round(confidence * 1000) / 1000,
  };
}

function analyzePriceSignal(yesPrice) {
  // Price itself is a sentiment indicator: high Yes price = positive sentiment
  const price = parseFloat(yesPrice) || 0.5;
  const score = price; // Direct mapping: 0.7 price = 0.7 sentiment
  const confidence = Math.abs(price - 0.5) * 2; // More extreme = more confident
  return {
    score: Math.round(score * 1000) / 1000,
    confidence: Math.round(confidence * 1000) / 1000,
    label: score > 0.6 ? "positive" : score < 0.4 ? "negative" : "neutral",
  };
}

function analyzeVolumeSignal(volume, avgVolume) {
  if (!avgVolume || avgVolume === 0) {
    return { score: 0.5, confidence: 0, label: "neutral" };
  }
  const ratio = volume / avgVolume;
  // High volume relative to average indicates conviction (slightly bullish bias)
  const score = Math.min(0.5 + (ratio - 1) * 0.1, 1);
  const bounded = Math.max(0, Math.min(1, score));
  const confidence = Math.min(Math.abs(ratio - 1) * 0.5, 1);
  return {
    score: Math.round(bounded * 1000) / 1000,
    confidence: Math.round(confidence * 1000) / 1000,
    label: bounded > 0.6 ? "positive" : bounded < 0.4 ? "negative" : "neutral",
  };
}

function aggregateSentiment(market, config) {
  const weights = {
    description: 0.2,
    price: 0.5,
    volume: 0.3,
  };

  const textResult = analyzeText(`${market.question} ${market.description}`);
  const priceResult = analyzePriceSignal(market.outcomePrices[0]);
  const volumeResult = analyzeVolumeSignal(market.volume, 10000); // Use 10k as default avg

  const totalWeight =
    weights.description + weights.price + weights.volume;
  const weightedScore =
    (textResult.score * weights.description +
      priceResult.score * weights.price +
      volumeResult.score * weights.volume) /
    totalWeight;

  const avgConfidence =
    (textResult.confidence * weights.description +
      priceResult.confidence * weights.price +
      volumeResult.confidence * weights.volume) /
    totalWeight;

  const score = Math.round(weightedScore * 1000) / 1000;
  const confidence = Math.round(avgConfidence * 1000) / 1000;

  let label;
  const posThreshold = (config && config.sentiment && config.sentiment.positiveThreshold) || 0.6;
  const negThreshold = (config && config.sentiment && config.sentiment.negativeThreshold) || 0.4;

  if (score >= posThreshold) label = "positive";
  else if (score <= negThreshold) label = "negative";
  else label = "neutral";

  return {
    score,
    confidence,
    label,
    sources: {
      text: { score: textResult.score, confidence: textResult.confidence },
      price: { score: priceResult.score, confidence: priceResult.confidence },
      volume: { score: volumeResult.score, confidence: volumeResult.confidence },
    },
  };
}

function formatSentimentReport(market, sentiment) {
  const bar = (v) => {
    const filled = Math.round(v * 20);
    return "[" + "#".repeat(filled) + "-".repeat(20 - filled) + "]";
  };

  return [
    `Market: ${market.question}`,
    `Overall Sentiment: ${sentiment.label.toUpperCase()} (${(sentiment.score * 100).toFixed(1)}%)`,
    `Confidence: ${(sentiment.confidence * 100).toFixed(1)}%`,
    `  Text:   ${bar(sentiment.sources.text.score)} ${(sentiment.sources.text.score * 100).toFixed(1)}%`,
    `  Price:  ${bar(sentiment.sources.price.score)} ${(sentiment.sources.price.score * 100).toFixed(1)}%`,
    `  Volume: ${bar(sentiment.sources.volume.score)} ${(sentiment.sources.volume.score * 100).toFixed(1)}%`,
  ].join("\n");
}

module.exports = {
  analyzeText,
  analyzePriceSignal,
  analyzeVolumeSignal,
  aggregateSentiment,
  formatSentimentReport,
  tokenize,
  POSITIVE_WORDS,
  NEGATIVE_WORDS,
};
