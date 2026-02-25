---
name: polymarket-trader
description: Automated Polymarket monitoring and trading based on real-time sentiment analysis
version: 1.0.0
author: openclaw
tags:
  - trading
  - polymarket
  - sentiment-analysis
  - automation
---

# 1. Skill Name
polymarket-trader

# 2. One-Sentence Description
Automated Polymarket monitoring and trading based on real-time sentiment analysis to maximize profit potential.

# 3. Core Capabilities
- Monitor Polymarket markets for real-time price movements and market data via the public CLOB API
- Analyze sentiment from configurable text sources to generate trading signals
- Execute automated trades based on predefined algorithms and risk parameters
- Provide CLI interface for direct use and manual override
- Integrate seamlessly with OpenClaw agent workflows
- Handle errors gracefully and provide meaningful feedback to users
- Generate trading reports and performance analytics
- Support dry-run mode for safe strategy testing

# 4. Out of Scope
- Financial advisory or investment recommendations
- Guaranteed profit trading strategies
- Manual trading interface or GUI
- Integration with other trading platforms (Binance, Coinbase, etc.)
- Advanced technical analysis tools (chart patterns, indicators)
- Portfolio management features
- Tax reporting or compliance features

# 5. Trigger Scenarios
- "Monitor Polymarket and trade based on sentiment"
- "Automate Polymarket trading with sentiment analysis"
- "Analyze Polymarket market sentiment and execute trades"
- "Build a Polymarket trading bot using sentiment analysis"
- "I want my OpenClaw agent to trade on Polymarket automatically"
- "Create automated Polymarket trading based on real-time sentiment"

# 6. Required Resources
- `scripts/` — Implementation code for trading logic, market monitoring, and sentiment analysis
- `references/` — API documentation, trading strategy references
- `assets/` — Configuration templates and default trading strategies

# 7. Key Files
- `SKILL.md` — This file; skill documentation and metadata
- `scripts/trader.js` — Main trading logic, order execution, and orchestration
- `scripts/sentiment-analyzer.js` — Sentiment analysis using keyword-based NLP
- `scripts/market-monitor.js` — Real-time market data collection from Polymarket API
- `scripts/config-manager.js` — Configuration management and validation
- `references/polymarket-api.md` — Polymarket CLOB API documentation
- `references/sentiment-sources.md` — Documentation on sentiment data sources
- `assets/default-strategies.json` — Pre-configured trading strategies
- `assets/config-template.json` — Template configuration with all options

# 8. Acceptance Criteria
- Skill triggers correctly when users ask about Polymarket trading automation
- Scripts run end-to-end without errors using dry-run mode with real market data
- Output is immediately useful without manual editing or configuration
- Error handling provides meaningful feedback and graceful degradation
- CLI interface is intuitive and functional with clear documentation
- Default configuration provides reasonable out-of-the-box functionality
- Trading strategies are configurable and well-documented
