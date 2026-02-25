"use strict";

const configManager = require("./config-manager");
const marketMonitor = require("./market-monitor");
const sentimentAnalyzer = require("./sentiment-analyzer");

function generateSignal(market, sentiment, strategy) {
  const params = strategy.parameters;
  const yesPrice = market.outcomePrices[0];
  const priceDeviation = Math.abs(yesPrice - 0.5);

  const combinedScore =
    sentiment.score * params.sentimentWeight +
    yesPrice * params.priceWeight;

  let action = "HOLD";
  let reason = "";

  for (const rule of strategy.rules) {
    if (rule.action === "BUY") {
      const minSentiment = params.minSentimentScore || params.extremeThreshold || 0.6;
      const minPrice = params.minPriceChange || params.minPriceDeviation || 0.02;

      if (strategy.name === "contrarian") {
        if (sentiment.score < (1 - params.extremeThreshold) && yesPrice < 0.2) {
          action = "BUY";
          reason = `Contrarian: extreme negative sentiment (${(sentiment.score * 100).toFixed(1)}%) with low price (${(yesPrice * 100).toFixed(1)}%)`;
          break;
        }
      } else {
        if (sentiment.score > minSentiment && priceDeviation > minPrice) {
          action = "BUY";
          reason = `${strategy.name}: positive sentiment (${(sentiment.score * 100).toFixed(1)}%) with price deviation (${(priceDeviation * 100).toFixed(1)}%)`;
          break;
        }
      }
    } else if (rule.action === "SELL") {
      if (strategy.name === "contrarian") {
        if (sentiment.score > params.extremeThreshold && yesPrice > 0.8) {
          action = "SELL";
          reason = `Contrarian: extreme positive sentiment (${(sentiment.score * 100).toFixed(1)}%) with high price (${(yesPrice * 100).toFixed(1)}%)`;
          break;
        }
      } else {
        const minSentiment = params.minSentimentScore || 0.6;
        if (sentiment.score < (1 - minSentiment) && priceDeviation > (params.minPriceChange || 0.02)) {
          action = "SELL";
          reason = `${strategy.name}: negative sentiment (${(sentiment.score * 100).toFixed(1)}%) with price deviation (${(priceDeviation * 100).toFixed(1)}%)`;
          break;
        }
      }
    }
  }

  if (action === "HOLD") {
    reason = `No strong signal (sentiment: ${(sentiment.score * 100).toFixed(1)}%, confidence: ${(sentiment.confidence * 100).toFixed(1)}%)`;
  }

  const sizing = calculatePositionSize(action, sentiment, params);

  return {
    market: market.question,
    marketId: market.id,
    action,
    reason,
    sentiment: sentiment.score,
    confidence: sentiment.confidence,
    combinedScore: Math.round(combinedScore * 1000) / 1000,
    suggestedSize: sizing,
    timestamp: new Date().toISOString(),
  };
}

function calculatePositionSize(action, sentiment, params) {
  if (action === "HOLD") return 0;

  const maxSize = params.maxExposure || 0.2;
  const baseSize = maxSize * sentiment.confidence;
  const capped = Math.min(baseSize, maxSize);

  return Math.round(capped * 1000) / 1000;
}

function formatSignalReport(signals) {
  const lines = [
    "=".repeat(60),
    "POLYMARKET TRADER — TRADE SIGNALS",
    "=".repeat(60),
    `Generated: ${new Date().toISOString()}`,
    `Total markets analyzed: ${signals.length}`,
    "",
  ];

  const buys = signals.filter((s) => s.action === "BUY");
  const sells = signals.filter((s) => s.action === "SELL");
  const holds = signals.filter((s) => s.action === "HOLD");

  lines.push(`BUY signals: ${buys.length} | SELL signals: ${sells.length} | HOLD: ${holds.length}`);
  lines.push("-".repeat(60));

  for (const signal of signals) {
    const icon = signal.action === "BUY" ? ">>>" : signal.action === "SELL" ? "<<<" : "---";
    lines.push("");
    lines.push(`${icon} ${signal.action}: ${signal.market}`);
    lines.push(`    Reason: ${signal.reason}`);
    lines.push(`    Sentiment: ${(signal.sentiment * 100).toFixed(1)}% | Confidence: ${(signal.confidence * 100).toFixed(1)}%`);
    if (signal.suggestedSize > 0) {
      lines.push(`    Suggested exposure: ${(signal.suggestedSize * 100).toFixed(1)}%`);
    }
  }

  lines.push("");
  lines.push("=".repeat(60));
  lines.push("MODE: DRY-RUN — No real trades executed");
  lines.push("=".repeat(60));

  return lines.join("\n");
}

function generateSummaryReport(signals, config, strategy) {
  return {
    timestamp: new Date().toISOString(),
    mode: config.mode,
    strategy: strategy.name,
    marketsAnalyzed: signals.length,
    signals: {
      buy: signals.filter((s) => s.action === "BUY").length,
      sell: signals.filter((s) => s.action === "SELL").length,
      hold: signals.filter((s) => s.action === "HOLD").length,
    },
    details: signals,
  };
}

async function run(argv) {
  const startTime = Date.now();
  const args = configManager.parseArgs(argv || process.argv);

  // Load configuration
  let config;
  try {
    config = configManager.loadConfig(args.config);
    config = configManager.applyCliOverrides(config, args);
  } catch (err) {
    console.error(`Configuration error: ${err.message}`);
    process.exitCode = 1;
    return { success: false, error: err.message };
  }

  // Validate config
  const validationErrors = configManager.validateConfig(config);
  if (validationErrors.length > 0) {
    console.error("Configuration validation errors:");
    validationErrors.forEach((e) => console.error(`  - ${e}`));
    process.exitCode = 1;
    return { success: false, error: validationErrors.join("; ") };
  }

  // Load strategy
  let strategy;
  try {
    strategy = configManager.getStrategy(config);
  } catch (err) {
    console.error(`Strategy error: ${err.message}`);
    process.exitCode = 1;
    return { success: false, error: err.message };
  }

  console.log(`Polymarket Trader starting...`);
  console.log(`Mode: ${config.mode}`);
  console.log(`Strategy: ${strategy.name} — ${strategy.description}`);
  console.log("");

  // Fetch markets
  let markets;
  try {
    if (config.markets.watchlist && config.markets.watchlist.length > 0) {
      console.log(`Searching for markets: ${config.markets.watchlist.join(", ")}`);
      markets = await marketMonitor.searchMarkets(
        config,
        config.markets.watchlist,
        config.markets.maxConcurrent
      );
    } else {
      console.log(`Fetching top ${config.markets.maxConcurrent} trending markets...`);
      markets = await marketMonitor.fetchMarkets(config, {
        limit: config.markets.maxConcurrent,
      });
    }
  } catch (err) {
    console.error(`Market data error: ${err.message}`);
    process.exitCode = 1;
    return { success: false, error: err.message };
  }

  if (markets.length === 0) {
    console.log("No markets found matching criteria.");
    return { success: true, signals: [], markets: 0 };
  }

  console.log(`Found ${markets.length} markets to analyze.\n`);

  // Analyze each market
  const signals = [];
  for (const market of markets) {
    const sentiment = sentimentAnalyzer.aggregateSentiment(market, config);
    const signal = generateSignal(market, sentiment, strategy);
    signals.push(signal);

    // Print individual sentiment report
    console.log(sentimentAnalyzer.formatSentimentReport(market, sentiment));
    console.log("");
  }

  // Print trade signals
  console.log(formatSignalReport(signals));

  const summary = generateSummaryReport(signals, config, strategy);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nCompleted in ${elapsed}s`);

  return { success: true, summary };
}

// Run if executed directly
if (require.main === module) {
  run().catch((err) => {
    console.error(`Fatal error: ${err.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  run,
  generateSignal,
  calculatePositionSize,
  formatSignalReport,
  generateSummaryReport,
};
