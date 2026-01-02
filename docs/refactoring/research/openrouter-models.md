# OpenRouter Models Research for cc-mirror Presets

Research compiled: 2026-01-02

## 1. OpenRouter Public API for Listing Models

Yes, OpenRouter provides a public API to list all available models.

### Endpoint

```
GET https://openrouter.ai/api/v1/models
```

### Authentication

Requires Bearer token in the Authorization header:

```bash
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `category` | string | Filter models by category |
| `supported_parameters` | string | Filter by supported parameters |
| `use_rss` | string | Return RSS feed format |
| `use_rss_chat_links` | string | Include chat links in RSS feed |

### Response Schema

Each model object includes:

```typescript
interface Model {
  id: string;                    // e.g., "anthropic/claude-sonnet-4.5"
  name: string;                  // Display name
  canonical_slug: string;        // URL-friendly identifier
  created: number;               // Unix timestamp
  description: string;           // Model details
  context_length: number;        // Maximum tokens supported
  architecture: {
    tokenizer: string;
    instruction_format: string;
    modality: string[];
  };
  supported_parameters: string[];  // e.g., ["temperature", "top_p", "tools"]
  default_parameters: object;
  pricing: {
    prompt: string;              // Per-token cost for input
    completion: string;          // Per-token cost for output
    image?: string;
    audio?: string;
  };
  per_request_limits: {
    prompt_tokens: number;
    completion_tokens: number;
  };
  top_provider: object;
}
```

### Sources

- [List all models API Reference](https://openrouter.ai/docs/api/api-reference/models/get-models)
- [Models Overview](https://openrouter.ai/docs/guides/overview/models)

---

## 2. Most Popular Models on OpenRouter

### Current Rankings (by token usage)

| Rank | Model | Tokens | Share |
|------|-------|--------|-------|
| 1 | DeepSeek | 81.6B | 6.8% |
| 2 | Claude Sonnet 4.5 | 64.5B | 5.4% |
| 3 | MiMo V2 Flash | 56.2B | 4.7% |
| 4 | Gemini 3 Flash Preview | 52.2B | 4.3% |
| 5 | Gemini 2.5 Flash | 46B | 3.8% |
| 6 | Claude Opus 4.5 | 37.2B | 3.1% |
| 7 | Gemini 2.5 Flash Lite | 34.7B | 2.9% |
| 8 | Grok 4.1 Fast | 33.7B | 2.8% |

### Provider Market Share

| Provider | Tokens | Share |
|----------|--------|-------|
| Google | 862B | 23.1% |
| X-AI | 494B | 13.3% |
| Anthropic | 461B | 12.4% |
| DeepSeek | 405B | 10.9% |
| OpenAI | 389B | 10.4% |

### Sources

- [OpenRouter Rankings](https://openrouter.ai/rankings)
- [State of AI](https://openrouter.ai/state-of-ai)

---

## 3. FREE Tier Models Available on OpenRouter

### Top Free Models

| Model ID | Provider | Context | Strengths |
|----------|----------|---------|-----------|
| `xiaomi/mimo-v2-flash` | Xiaomi | 256K | Top open-source, reasoning/coding |
| `mistralai/devstral-2-2512` | Mistral | 256K | Agentic coding specialist |
| `kwaipilot/kat-coder-pro-v1` | Kwaipilot | 256K | 73.4% SWE-Bench Verified |
| `tng-tech/deepseek-r1t2-chimera` | TNG Tech | 164K | Fast reasoning |
| `nex-agi/deepseek-v3.1-nex-n1` | Nex AGI | 131K | Agent/tool use focus |
| `nvidia/nemotron-3-nano-30b-a3b` | NVIDIA | 256K | Efficient MoE, agentic |
| `z-ai/glm-4.5-air` | Z.AI | 131K | Lightweight, reasoning mode |
| `nvidia/nemotron-nano-12b-2-vl` | NVIDIA | 128K | Multimodal, video |
| `google/gemma-3-27b` | Google | 131K | Multilingual, vision-language |
| `meta-llama/llama-3.3-70b-instruct` | Meta | 131K | Multilingual dialogue |
| `allenai/olmo-3.1-32b-think` | AllenAI | 66K | Deep reasoning, Apache 2.0 |
| `openai/gpt-oss-120b` | OpenAI | 131K | Open-weight MoE |

All free models: **$0/M tokens** for both input and output.

### Free Tier Rate Limits

| Account Status | Daily Limit | Per-Minute Limit |
|----------------|-------------|------------------|
| New users (< $10 credits purchased) | 50 requests/day | 20 requests/min |
| Users with $10+ credits purchased | 1000 requests/day | No stated limit |

### Sources

- [Free AI Models Collection](https://openrouter.ai/collections/free-models)
- [OpenRouter Pricing](https://openrouter.ai/pricing)

---

## 4. Model ID Format

### Standard Format

```
{author}/{model-name}
```

### Examples

- `anthropic/claude-sonnet-4.5`
- `anthropic/claude-opus-4.5`
- `anthropic/claude-3.5-sonnet`
- `anthropic/claude-3-haiku`
- `openai/gpt-5.1`
- `google/gemini-3-pro-preview`
- `deepseek/deepseek-v3.2`
- `meta-llama/llama-3.3-70b-instruct`

### Special Suffixes

Models can have suffixes for variants:

- `:thinking` - Extended thinking mode (e.g., `anthropic/claude-3.7-sonnet:thinking`)
- `:beta` - Beta versions
- `:free` - Free tier variant

---

## 5. Recommended Presets for cc-mirror

### A. Claude Models Preset (Official Anthropic via OpenRouter)

**Best balance of capability and cost:**

```bash
# Premium Claude preset (latest models)
npm run dev -- quick \
  --provider openrouter \
  --api-key "$OPENROUTER_API_KEY" \
  --model-sonnet "anthropic/claude-sonnet-4.5" \
  --model-opus "anthropic/claude-opus-4.5" \
  --model-haiku "anthropic/claude-haiku-4.5" \
  --model-small-fast "anthropic/claude-haiku-4.5" \
  --model-default "anthropic/claude-sonnet-4.5"
```

**Budget Claude preset (older but cheaper):**

```bash
# Budget Claude preset
npm run dev -- quick \
  --provider openrouter \
  --api-key "$OPENROUTER_API_KEY" \
  --model-sonnet "anthropic/claude-3.5-sonnet" \
  --model-opus "anthropic/claude-3-opus" \
  --model-haiku "anthropic/claude-3-haiku" \
  --model-small-fast "anthropic/claude-3-haiku" \
  --model-default "anthropic/claude-3.5-sonnet"
```

#### Claude Models Pricing Comparison

| Model ID | Input | Output | Context |
|----------|-------|--------|---------|
| `anthropic/claude-opus-4.5` | $5/M | $25/M | 200K |
| `anthropic/claude-sonnet-4.5` | $3/M | $15/M | 1M |
| `anthropic/claude-haiku-4.5` | $1/M | $5/M | 200K |
| `anthropic/claude-opus-4` | $15/M | $75/M | 200K |
| `anthropic/claude-sonnet-4` | $3/M | $15/M | 1M |
| `anthropic/claude-3.7-sonnet` | $3/M | $15/M | 200K |
| `anthropic/claude-3.5-sonnet` | $6/M | $30/M | 200K |
| `anthropic/claude-3.5-haiku` | $0.80/M | $4/M | 200K |
| `anthropic/claude-3-haiku` | $0.25/M | $1.25/M | 200K |
| `anthropic/claude-3-opus` | $15/M | $75/M | 200K |

### B. Free Models Preset (Best Free Alternatives)

```bash
# Free tier preset - best for experimentation
npm run dev -- quick \
  --provider openrouter \
  --api-key "$OPENROUTER_API_KEY" \
  --model-sonnet "mistralai/devstral-2-2512" \
  --model-opus "xiaomi/mimo-v2-flash" \
  --model-haiku "google/gemma-3-27b" \
  --model-small-fast "google/gemma-3-27b" \
  --model-default "mistralai/devstral-2-2512"
```

**Alternative free coding-focused preset:**

```bash
# Free coding preset
npm run dev -- quick \
  --provider openrouter \
  --api-key "$OPENROUTER_API_KEY" \
  --model-sonnet "kwaipilot/kat-coder-pro-v1" \
  --model-opus "xiaomi/mimo-v2-flash" \
  --model-haiku "nvidia/nemotron-3-nano-30b-a3b" \
  --model-small-fast "nvidia/nemotron-3-nano-30b-a3b" \
  --model-default "kwaipilot/kat-coder-pro-v1"
```

### C. Budget Preset (Cheapest Good Options)

```bash
# Budget preset - minimal cost, good capability
npm run dev -- quick \
  --provider openrouter \
  --api-key "$OPENROUTER_API_KEY" \
  --model-sonnet "anthropic/claude-3.5-haiku" \
  --model-opus "anthropic/claude-3.7-sonnet" \
  --model-haiku "anthropic/claude-3-haiku" \
  --model-small-fast "anthropic/claude-3-haiku" \
  --model-default "anthropic/claude-3.5-haiku"
```

**Mixed budget preset (Claude + alternatives):**

```bash
# Mixed budget preset
npm run dev -- quick \
  --provider openrouter \
  --api-key "$OPENROUTER_API_KEY" \
  --model-sonnet "google/gemini-2.5-flash" \
  --model-opus "anthropic/claude-sonnet-4.5" \
  --model-haiku "anthropic/claude-3-haiku" \
  --model-small-fast "anthropic/claude-3-haiku" \
  --model-default "google/gemini-2.5-flash"
```

---

## 6. Pricing Tiers

### Cost Categories

| Tier | Input Cost | Output Cost | Example Models |
|------|------------|-------------|----------------|
| **Free** | $0 | $0 | Llama 3.3 70B, Gemma 3 27B, DeepSeek free variants |
| **Budget** | $0.10-$1 | $0.50-$5 | Claude 3 Haiku, Claude 3.5 Haiku |
| **Mid-tier** | $1-$5 | $5-$20 | Claude Sonnet 4.5, GPT-4o |
| **Premium** | $5-$15 | $20-$75 | Claude Opus 4.5, Claude Opus 4 |

### Cost Optimization Strategies

1. **Task-based routing**: Use free/budget models for simple tasks, premium only for complex reasoning
2. **Model chaining**: Start with cheap model for ideas, refine with better model
3. **Context management**: Shorter contexts = lower costs
4. **Caching**: OpenRouter caches at the edge for faster, repeated requests

---

## 7. Rate Limits and Restrictions

### Platform Rate Limits

| Tier | Rate Limit | Notes |
|------|------------|-------|
| Free users | 50 req/day, 20 req/min | Limited to free models only |
| Users with $10+ credits | 1000 req/day on free models | No limit on paid models |
| Pay-as-you-go | No platform limits | Provider limits may apply |
| BYOK (Bring Your Own Key) | Provider-dependent | First 1M req/month free |

### BYOK (Bring Your Own Key)

- First 1M requests per month: **Free**
- Subsequent usage: **5% of normal model cost**
- Rate limits determined by your provider account

### Checking Rate Limits

```bash
curl https://openrouter.ai/api/v1/key \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"
```

### Error Handling

- **429 Too Many Requests**: Rate limit exceeded
- **Note**: Failed attempts count toward daily quota

### Content Policies

- OpenRouter does NOT log prompts by default
- Opt-in to prompt logging in account settings
- Some providers have their own content restrictions

---

## 8. Environment Variable Configuration for cc-mirror

### Required Variables

```bash
export ANTHROPIC_BASE_URL="https://openrouter.ai/api"
export ANTHROPIC_AUTH_TOKEN="$OPENROUTER_API_KEY"
export ANTHROPIC_API_KEY=""  # Must be empty string, not unset
```

### Model Override Variables

```bash
export ANTHROPIC_MODEL="anthropic/claude-sonnet-4.5"
export ANTHROPIC_DEFAULT_SONNET_MODEL="anthropic/claude-sonnet-4.5"
export ANTHROPIC_DEFAULT_OPUS_MODEL="anthropic/claude-opus-4.5"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="anthropic/claude-haiku-4.5"
export ANTHROPIC_SMALL_FAST_MODEL="anthropic/claude-haiku-4.5"
```

### Important Notes

1. **Tool Use Required**: Claude Code relies on tool use capabilities. Ensure selected models support `tools` in their `supported_parameters`.

2. **Context Window**: Use models with at least 128K context for best results in complex coding tasks.

3. **Empty API Key**: `ANTHROPIC_API_KEY` must be set to empty string (`""`), not unset, or Claude Code will try to authenticate with Anthropic servers.

---

## 9. Preset Configuration Templates

### settings.json Template (OpenRouter Claude Premium)

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://openrouter.ai/api",
    "ANTHROPIC_AUTH_TOKEN": "${OPENROUTER_API_KEY}",
    "ANTHROPIC_API_KEY": "",
    "ANTHROPIC_MODEL": "anthropic/claude-sonnet-4.5",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "anthropic/claude-sonnet-4.5",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "anthropic/claude-opus-4.5",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "anthropic/claude-haiku-4.5",
    "ANTHROPIC_SMALL_FAST_MODEL": "anthropic/claude-haiku-4.5",
    "API_TIMEOUT_MS": "120000"
  }
}
```

### settings.json Template (OpenRouter Free)

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://openrouter.ai/api",
    "ANTHROPIC_AUTH_TOKEN": "${OPENROUTER_API_KEY}",
    "ANTHROPIC_API_KEY": "",
    "ANTHROPIC_MODEL": "mistralai/devstral-2-2512",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "mistralai/devstral-2-2512",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "xiaomi/mimo-v2-flash",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "google/gemma-3-27b",
    "ANTHROPIC_SMALL_FAST_MODEL": "google/gemma-3-27b",
    "API_TIMEOUT_MS": "180000"
  }
}
```

### settings.json Template (OpenRouter Budget)

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://openrouter.ai/api",
    "ANTHROPIC_AUTH_TOKEN": "${OPENROUTER_API_KEY}",
    "ANTHROPIC_API_KEY": "",
    "ANTHROPIC_MODEL": "anthropic/claude-3.5-haiku",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "anthropic/claude-3.5-haiku",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "anthropic/claude-3.7-sonnet",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "anthropic/claude-3-haiku",
    "ANTHROPIC_SMALL_FAST_MODEL": "anthropic/claude-3-haiku",
    "API_TIMEOUT_MS": "120000"
  }
}
```

---

## 10. Quick Reference Card

### cc-mirror Commands

```bash
# Claude Premium (latest models)
npm run dev -- quick --provider openrouter --api-key "$OPENROUTER_API_KEY" \
  --model-sonnet "anthropic/claude-sonnet-4.5" \
  --model-opus "anthropic/claude-opus-4.5" \
  --model-haiku "anthropic/claude-haiku-4.5"

# Claude Budget (older, cheaper)
npm run dev -- quick --provider openrouter --api-key "$OPENROUTER_API_KEY" \
  --model-sonnet "anthropic/claude-3.5-sonnet" \
  --model-opus "anthropic/claude-3-opus" \
  --model-haiku "anthropic/claude-3-haiku"

# Free Models (experimental)
npm run dev -- quick --provider openrouter --api-key "$OPENROUTER_API_KEY" \
  --model-sonnet "mistralai/devstral-2-2512" \
  --model-opus "xiaomi/mimo-v2-flash" \
  --model-haiku "google/gemma-3-27b"
```

### Model Selection Guidelines

| Use Case | Recommended Model | Monthly Cost (est.) |
|----------|-------------------|---------------------|
| Heavy coding, complex tasks | `anthropic/claude-opus-4.5` | High |
| Daily development | `anthropic/claude-sonnet-4.5` | Medium |
| Quick queries, simple edits | `anthropic/claude-haiku-4.5` | Low |
| Experimentation only | Free tier models | Free |
| Budget production | `anthropic/claude-3.5-haiku` | Very Low |

---

## Sources

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [List All Models API](https://openrouter.ai/docs/api/api-reference/models/get-models)
- [Free Models Collection](https://openrouter.ai/collections/free-models)
- [OpenRouter Pricing](https://openrouter.ai/pricing)
- [API Rate Limits](https://openrouter.ai/docs/api/reference/limits)
- [Claude Code Integration Guide](https://openrouter.ai/docs/guides/guides/claude-code-integration)
- [OpenRouter Rankings](https://openrouter.ai/rankings)
- [Anthropic Models on OpenRouter](https://openrouter.ai/anthropic)
