# Senior Navigator V4 Backend

Node.js/Express backend for Senior Navigator with LLM-powered care recommendations.

## Features

- ✅ **Deterministic scoring** - Tier calculation based on answer scores (always available)
- ✅ **LLM enhancement** - Optional AI-powered recommendations using GPT-4o-mini
- ✅ **Adjudication logic** - Smart reconciliation between deterministic and LLM tiers
- ✅ **Cognitive gate** - Filters memory care tiers based on cognitive indicators
- ✅ **Risk flagging** - Identifies safety and care concerns
- ✅ **MCIP contract** - Returns standardized CareRecommendation format

## Installation

```bash
cd backend
npm install
```

## Configuration

Create a `.env` file in the backend directory:

```bash
# Copy example file
cp .env.example .env

# Edit with your settings
nano .env
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Only for LLM | - | OpenAI API key (get from https://platform.openai.com/api-keys) |
| `FEATURE_GCP_LLM_TIER` | No | `off` | LLM mode: `off`, `shadow`, or `assist` |
| `PORT` | No | `3000` | Server port |

### LLM Modes

- **`off`** (default): Deterministic scoring only, no LLM calls
- **`shadow`**: Calls LLM but always uses deterministic tier (logs for analysis)
- **`assist`**: Uses LLM tier when confidence ≥ 0.7, otherwise deterministic

## Running

### Development Mode
```bash
npm run dev
# Server runs on http://localhost:3000 with auto-reload
```

### Production Mode
```bash
npm start
# Server runs on http://localhost:3000
```

## API Endpoints

### POST /api/gcp/submit

Submit GCP assessment and get care recommendation.

**Request:**
```json
{
  "age_range": "75_84",
  "living_situation": "with_family",
  "memory_changes": "moderate",
  "badls": ["transferring"],
  "iadls": ["housekeeping"],
  ...
}
```

**Response:**
```json
{
  "recommendation": "assisted_living",
  "confidence": 0.85,
  "raw_scores": {
    "total_score": 18,
    "cognitive_score": 2,
    "adl_score": 2,
    "safety_score": 1
  },
  "flags": ["moderate_cognitive_decline", "chronic_present"],
  "user_inputs": {...},
  "assessment_id": "assess_1234567890",
  "timestamp": "2025-11-07T23:54:06.233Z",
  "version": "v2025.11"
}
```

### GET /api/gcp/tiers

Get care tier descriptions and score ranges.

### GET /health

Health check endpoint.

## Tier Thresholds

| Tier | Score Range | Description |
|------|-------------|-------------|
| `no_care_needed` | 0-8 | Managing well independently |
| `in_home` | 9-16 | Needs regular in-home support |
| `assisted_living` | 17-24 | Needs assisted living environment |
| `memory_care` | 25-39 | Needs specialized memory care |
| `memory_care_high_acuity` | 40-100 | Needs intensive memory care |

## Architecture

```
backend/
├── server.js                      # Express server setup
├── routes/
│   └── gcp.js                    # GCP API endpoints
├── services/
│   ├── gcpScoring.js            # Deterministic scoring engine
│   ├── gcpNaviEngine.js         # LLM-powered recommendations
│   └── llmClient.js             # OpenAI API client
└── .env                          # Environment configuration
```

## LLM Integration

When enabled (mode = `shadow` or `assist`), the system:

1. **Calculates deterministic tier** - Always computed as baseline
2. **Generates LLM recommendation** - Calls GPT-4o-mini with structured prompt
3. **Applies cognitive gate** - Restricts memory care tiers if cognitive indicators insufficient
4. **Adjudicates final tier** - Smart reconciliation logic:
   - Uses LLM if confidence ≥ 0.7 (assist mode)
   - Uses deterministic if LLM confidence < 0.7
   - Uses deterministic if LLM tier not in allowed set
   - Logs disagreements with 🔥 emoji for analysis

### Example Log Output (LLM Disagreement)

```
🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
[DISAGREEMENT] LLM overrode deterministic engine!
[DISAGREEMENT] Deterministic: assisted_living → LLM: memory_care
[DISAGREEMENT] Reason: high_confidence_0.87
🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥

[GCP_ADJ] chosen=memory_care llm=memory_care det=assisted_living source=llm 
allowed=assisted_living,in_home,memory_care,no_care_needed conf=0.87 
reason=high_confidence_0.87 id=a3f8bc9d2e1
```

## Testing

```bash
# Health check
curl http://localhost:3000/health

# Get tier descriptions
curl http://localhost:3000/api/gcp/tiers

# Submit assessment (requires POST with JSON body)
curl -X POST http://localhost:3000/api/gcp/submit \
  -H "Content-Type: application/json" \
  -d @sample_assessment.json
```

## Production Deployment

1. Set environment variables in your hosting platform
2. Ensure `OPENAI_API_KEY` is set if using LLM features
3. Set `FEATURE_GCP_LLM_TIER=assist` for production LLM mode
4. Use `npm start` to run server
5. Set up reverse proxy (nginx/Apache) for HTTPS
6. Configure CORS origins for your frontend domain

## Security Notes

- ⚠️ Never commit `.env` file to version control
- ⚠️ Keep `OPENAI_API_KEY` secret
- ⚠️ In production, restrict CORS origins to your frontend domain
- ⚠️ Use HTTPS in production
- ⚠️ Consider rate limiting for API endpoints

## Troubleshooting

### LLM not being called

Check:
1. `OPENAI_API_KEY` is set in `.env`
2. `FEATURE_GCP_LLM_TIER` is set to `shadow` or `assist` (not `off`)
3. Server restarted after changing `.env`

### CORS errors from frontend

Ensure backend's CORS configuration in `server.js` includes your frontend origin (currently set for `http://localhost:4200`).

### Module config not loading

Verify path to `gcp_module.json` in `routes/gcp.js` points to frontend's assets folder.

## License

Proprietary - CCA Senior Navigator
