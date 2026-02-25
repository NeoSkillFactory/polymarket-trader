# Sentiment Data Sources

## Overview

The sentiment analyzer uses multiple data sources to generate sentiment scores for Polymarket markets. Each source provides different perspectives on market sentiment.

## Built-in Sources

### 1. Market Description Analysis

- **Source**: Polymarket market description text
- **Method**: Keyword-based NLP analysis of the market question and description
- **Reliability**: Medium — descriptions are factual but contain sentiment cues
- **Update Frequency**: Static per market

### 2. Market Price Signals

- **Source**: Polymarket outcome prices
- **Method**: Price levels and price changes are interpreted as consensus sentiment
- **Reliability**: High — prices reflect aggregated market wisdom
- **Update Frequency**: Real-time via polling

### 3. Volume Analysis

- **Source**: Polymarket trading volume data
- **Method**: Volume spikes indicate increased interest and conviction
- **Reliability**: Medium-High — volume confirms price movements
- **Update Frequency**: Real-time via polling

## Sentiment Score Calculation

The final sentiment score is a weighted average of all active sources:

```
final_score = Σ(source_score × source_weight) / Σ(source_weight)
```

Default weights:
| Source | Weight |
|--------|--------|
| Market Description | 0.2 |
| Price Signal | 0.5 |
| Volume Analysis | 0.3 |

## Score Interpretation

| Range | Label | Action |
|-------|-------|--------|
| 0.0 - 0.3 | Strong Negative | Consider SELL |
| 0.3 - 0.45 | Negative | Weak SELL signal |
| 0.45 - 0.55 | Neutral | No action |
| 0.55 - 0.7 | Positive | Weak BUY signal |
| 0.7 - 1.0 | Strong Positive | Consider BUY |

## Adding Custom Sources

To add a custom sentiment source, implement the `SentimentSource` interface:

```javascript
class CustomSource {
  constructor(config) { /* init */ }
  async analyze(market) {
    // Return { score: 0-1, confidence: 0-1, label: string }
  }
}
```

Register it in the sentiment analyzer configuration.
