# Polymarket Trader — Quick Start

## Setup

```bash
cd skill
npm install
```

## Usage

### Dry-run mode (default, no real trades)
```bash
node scripts/trader.js
```

### Monitor specific markets
```bash
node scripts/trader.js --markets "Will X happen?,Will Y happen?"
```

### Use a specific strategy
```bash
node scripts/trader.js --strategy contrarian
```

### Custom config
```bash
node scripts/trader.js --config path/to/config.json
```

## Configuration

Copy `assets/config-template.json` and adjust:

- `mode` — `dry-run` (default) or `live`
- `trading.strategy` — `sentiment-momentum`, `contrarian`, or `conservative`
- `trading.maxPositionSize` — Maximum position size in dollars
- `trading.minConfidence` — Minimum confidence to execute (0-1)
- `sentiment.positiveThreshold` — Sentiment score to consider positive (0-1)
- `markets.watchlist` — Array of market slugs to monitor (empty = trending)

## Strategies

See `assets/default-strategies.json` for available strategies:

| Strategy | Risk | Description |
|----------|------|-------------|
| sentiment-momentum | Medium | Trades with sentiment trend + price confirmation |
| contrarian | Medium-High | Bets against extreme sentiment readings |
| conservative | Low | Only trades on very strong signals |

## Troubleshooting

- **No markets found**: Polymarket API may be temporarily unavailable. Retry after a few minutes.
- **Sentiment score always neutral**: Check that market descriptions contain analyzable text.
- **Config validation errors**: Compare your config against `config-template.json` for required fields.
