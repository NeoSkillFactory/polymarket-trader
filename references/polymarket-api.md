# Polymarket API Reference

## Overview

Polymarket exposes two main APIs for interacting with prediction markets:

1. **Gamma API** — Public market data (no authentication required)
2. **CLOB API** — Order book and trading (requires authentication for writes)

## Gamma API (Public Market Data)

Base URL: `https://gamma-api.polymarket.com`

### GET /markets

Fetch a list of markets.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max results to return (default: 100) |
| `offset` | number | Pagination offset |
| `active` | boolean | Filter for active markets only |
| `closed` | boolean | Filter for closed markets |
| `order` | string | Sort order: `volume`, `liquidity`, `created_at` |
| `ascending` | boolean | Sort direction |

**Response:**
```json
[
  {
    "id": "12345",
    "question": "Will X happen by Y date?",
    "description": "Detailed description...",
    "outcomes": ["Yes", "No"],
    "outcomePrices": ["0.65", "0.35"],
    "volume": "50000",
    "liquidity": "25000",
    "active": true,
    "closed": false,
    "slug": "will-x-happen-by-y-date",
    "endDate": "2026-12-31T00:00:00Z",
    "createdAt": "2026-01-01T00:00:00Z"
  }
]
```

### GET /markets/:id

Fetch a single market by ID.

### GET /events

Fetch events (groups of related markets).

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | number | Max results |
| `active` | boolean | Active events only |
| `slug` | string | Filter by event slug |

## CLOB API (Order Book)

Base URL: `https://clob.polymarket.com`

### GET /markets

Fetch available CLOB markets.

### GET /book

Get the order book for a token.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `token_id` | string | The token ID for the outcome |

**Response:**
```json
{
  "market": "0x...",
  "asset_id": "token_id",
  "bids": [{"price": "0.60", "size": "100"}],
  "asks": [{"price": "0.65", "size": "50"}]
}
```

### POST /order (Authenticated)

Place an order. Requires API key and signature.

**Body:**
```json
{
  "tokenID": "token_id",
  "price": "0.60",
  "size": "10",
  "side": "BUY",
  "type": "GTC"
}
```

## Rate Limits

- Gamma API: 100 requests/minute (public)
- CLOB API: 50 requests/minute (authenticated)

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad request / invalid parameters |
| 401 | Unauthorized (CLOB API) |
| 404 | Market not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
