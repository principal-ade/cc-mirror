# LM Studio Integration Research

> Research findings for integrating LM Studio with cc-mirror

**Last Updated:** 2026-01-02

---

## Executive Summary

LM Studio **does NOT have native Anthropic API compatibility**. It only exposes an OpenAI-compatible API. To use LM Studio with cc-mirror (or any Anthropic-expecting client like Claude Code), you need a translation proxy such as **LiteLLM** or **anthropic-proxy-litellm**.

**Recommendation:** Rather than adding LM Studio as a standalone provider, document it as a LiteLLM backend option. Users would:
1. Run LM Studio with local server enabled
2. Configure LiteLLM to use LM Studio as an OpenAI-compatible backend
3. Use the existing "LiteLLM" provider in cc-mirror

---

## 1. Anthropic API Compatibility

### Finding: No Native Anthropic Support

LM Studio does **NOT** have native Anthropic API compatibility. It only supports:

- **OpenAI Chat Completions API** (`/v1/chat/completions`)
- **OpenAI Embeddings API** (`/v1/embeddings`)
- **OpenAI Completions API** (`/v1/completions`)
- **OpenAI Models API** (`GET /v1/models`)
- **OpenAI Responses API** (`/v1/responses`) - Added in v0.3.29 (October 2025)

### Why This Matters

Claude Code (and cc-mirror) uses the Anthropic Messages API format (`/v1/messages`). This is a fundamentally different protocol:

| Feature | Anthropic API | OpenAI API |
|---------|---------------|------------|
| Chat Endpoint | `/v1/messages` | `/v1/chat/completions` |
| Message Format | `messages` with `role`/`content` | Similar but different structure |
| Tool Calling | `tool_use` blocks | `function_call` / `tools` |
| Response Format | `content` blocks | `choices` array |
| Streaming | `event: content_block_delta` | `event: data` with SSE |

**A translation layer is required** - you cannot simply point `ANTHROPIC_BASE_URL` at LM Studio.

---

## 2. LM Studio API Format

### OpenAI-Compatible Endpoints

LM Studio runs a local server that accepts OpenAI-format requests:

```
GET  /v1/models              # List loaded models
POST /v1/chat/completions    # Chat with model
POST /v1/embeddings          # Generate embeddings
POST /v1/completions         # Legacy completions
POST /v1/responses           # OpenAI Responses API (v0.3.29+)
```

### Supported Parameters

For `/v1/chat/completions`:
- `model` - Model identifier
- `messages` - Array of message objects
- `temperature` - Sampling temperature (0.0-2.0)
- `max_tokens` - Maximum response length
- `top_p` - Nucleus sampling
- `top_k` - Top-k sampling (LM Studio extension)
- `stream` - Enable streaming
- `stop` - Stop sequences
- `presence_penalty` - Presence penalty
- `frequency_penalty` - Frequency penalty
- `repeat_penalty` - Repeat penalty (LM Studio extension)
- `logit_bias` - Token biases
- `seed` - Reproducible sampling

### LM Studio REST API

In addition to OpenAI compatibility, LM Studio has its own native REST API with enhanced features:
- Token/second performance stats
- Time to First Token (TTFT) metrics
- Rich model information (loaded state, max context, quantization)

---

## 3. Default Server Endpoint and Port

### Default Configuration

| Setting | Default Value |
|---------|---------------|
| Host | `127.0.0.1` (localhost only) |
| Port | `1234` |
| Base URL | `http://localhost:1234/v1` |

### Network Access

To allow network access (for Docker containers, other machines, etc.):
1. Change Network Interface from `127.0.0.1` to `0.0.0.0`
2. Configure firewall if needed

### CLI Server Control

```bash
# Start server
lms server start

# Start on specific port
lms server start --port 8080

# Start with network access
lms server start --cors
```

---

## 4. Using LM Studio with LiteLLM

### Overview

LiteLLM can act as a translation proxy between Anthropic-format clients and LM Studio:

```
Claude Code / cc-mirror
        |
        v (Anthropic Messages API)
    LiteLLM Proxy
        |
        v (OpenAI Chat Completions)
    LM Studio
        |
        v
    Local Model (GGUF)
```

### LiteLLM Configuration

#### Option 1: Using `lm_studio/` prefix

```yaml
# litellm_config.yaml
model_list:
  - model_name: claude-sonnet-4-20250514
    litellm_params:
      model: lm_studio/your-model-name
      api_base: http://localhost:1234/v1
      api_key: lm-studio  # Dummy key required
```

#### Option 2: Using `openai/` prefix

```yaml
# litellm_config.yaml
model_list:
  - model_name: claude-sonnet-4-20250514
    litellm_params:
      model: openai/your-model-name
      api_base: http://localhost:1234/v1
      api_key: lm-studio  # Dummy key required
```

### Important Notes

1. **Dummy API Key Required**: LM Studio requires a non-empty API key even though it doesn't use authentication. Pass any string (e.g., `lm-studio`, `sk-local-xxxx`).

2. **Model Mapping**: You can map any model name Claude Code expects (like `claude-sonnet-4-20250514`) to whatever model is loaded in LM Studio.

3. **Port Conflicts**: If running both LM Studio (1234) and LiteLLM (4000), ensure no port conflicts.

### Starting LiteLLM

```bash
# Install LiteLLM
pip install 'litellm[proxy]'

# Start with config
litellm --config ./litellm_config.yaml

# Or quick start with single model
litellm --model lm_studio/llama-3.2-8b-instruct --api_base http://localhost:1234/v1 --api_key lm-studio

# Proxy will run at http://localhost:4000
```

### cc-mirror Configuration

Once LiteLLM is running with Anthropic passthrough enabled:

```bash
# Use the LiteLLM provider in cc-mirror
# The default LiteLLM config already points to http://localhost:4000/anthropic
```

Environment variables for Claude Code:
```bash
export ANTHROPIC_BASE_URL="http://localhost:4000"
export ANTHROPIC_AUTH_TOKEN="your-litellm-key"  # Or any key if no auth
```

---

## 5. Common Models Available in LM Studio

### Trending Models (2025)

| Model Family | Popular Variants | Use Case |
|--------------|------------------|----------|
| **Llama 3.2** | 8B, 11B, 90B | General purpose, instruction following |
| **Qwen 3** | 4B, 8B, 30B MoE | Coding, reasoning |
| **Mistral** | 7B Instruct | Fast, general purpose |
| **DeepSeek-R1** | Distilled variants | Reasoning, thinking |
| **Gemma 3n** | Various | Multimodal, efficient |
| **Phi-4** | Various | Compact, efficient |

### Recommended for Claude Code Usage

For best results with cc-mirror and Claude Code workflows:

1. **Qwen3-Coder** (30B MoE) - Excellent code generation, Apache 2.0 licensed
2. **DeepSeek-Coder-V2** - Strong coding performance
3. **Llama 3.2 8B/11B Instruct** - Good balance of speed and quality
4. **Mistral 7B Instruct** - Fast responses, good for iteration

### Model Format

LM Studio supports **GGUF format** models. You can:
- Download directly from LM Studio's Discover tab
- Search by keyword (llama, qwen, mistral, etc.)
- Import from Hugging Face URLs

---

## 6. Setup Guide: LM Studio with Anthropic-Expecting Client

### Complete Setup Process

#### Step 1: Install and Configure LM Studio

1. Download LM Studio from https://lmstudio.ai/
2. Launch and navigate to Discover tab
3. Download a model (e.g., `Qwen/Qwen3-8B-GGUF`)
4. Load the model in the Chat tab

#### Step 2: Start LM Studio Server

1. Go to Local Server tab (or Developer > Local Server)
2. Ensure model is loaded
3. Click "Start Server"
4. Note the server URL: `http://localhost:1234/v1`

#### Step 3: Install and Configure LiteLLM

```bash
# Install
pip install 'litellm[proxy]'

# Create config file
cat > litellm_config.yaml << 'EOF'
model_list:
  # Map Claude model names to your local model
  - model_name: claude-sonnet-4-20250514
    litellm_params:
      model: openai/qwen3-8b  # Your loaded model
      api_base: http://localhost:1234/v1
      api_key: lm-studio
      timeout: 600
      stream: true

  - model_name: claude-3-5-sonnet-20241022
    litellm_params:
      model: openai/qwen3-8b
      api_base: http://localhost:1234/v1
      api_key: lm-studio
      timeout: 600
      stream: true

general_settings:
  master_key: sk-litellm-master-key  # Optional auth

litellm_settings:
  drop_params: true  # Drop unsupported params
  set_verbose: false
EOF

# Start LiteLLM proxy
litellm --config ./litellm_config.yaml --port 4000
```

#### Step 4: Configure cc-mirror / Claude Code

Using cc-mirror's LiteLLM provider:
```bash
# The default LiteLLM configuration works:
# Base URL: http://localhost:4000/anthropic (or http://localhost:4000)
# API Key: sk-litellm-master-key (or any value if no auth)
```

Or set environment variables directly:
```bash
export ANTHROPIC_BASE_URL="http://localhost:4000"
export ANTHROPIC_AUTH_TOKEN="sk-litellm-master-key"
```

#### Step 5: Test the Setup

```bash
# Test LM Studio directly
curl http://localhost:1234/v1/models

# Test LiteLLM proxy (OpenAI format)
curl http://localhost:4000/v1/models

# Test LiteLLM Anthropic passthrough
curl http://localhost:4000/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk-litellm-master-key" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

---

## 7. Direct Integration Possibilities

### Why Direct Integration is Difficult

1. **Protocol Mismatch**: LM Studio speaks OpenAI, cc-mirror expects Anthropic
2. **Tool Calling Differences**: Anthropic's `tool_use` vs OpenAI's `function_call`
3. **Streaming Format**: Different SSE event formats
4. **Response Structure**: Different JSON schemas

### Alternative Approaches

#### Option A: Anthropic-to-OpenAI Proxy (Recommended)

Use LiteLLM or a dedicated proxy like `anthropic-proxy-litellm`:

```bash
# Install anthropic-proxy-litellm
pip install anthropic-proxy-litellm

# Run it
anthropic-proxy --backend http://localhost:1234/v1 --port 8082
```

This project specifically translates Anthropic Messages API to OpenAI Chat Completions.

#### Option B: Modify cc-mirror for OpenAI Compatibility

This would require:
1. Adding an "OpenAI-compatible" provider type
2. Converting all Anthropic API calls to OpenAI format
3. Handling response translation
4. **Significant development effort** - not recommended

#### Option C: LM Studio Plugin (Theoretical)

LM Studio has a plugin system. A theoretical "Anthropic Endpoint" plugin could:
1. Listen on `/v1/messages`
2. Translate to internal LM Studio calls
3. Return Anthropic-format responses

**Status**: No such plugin currently exists.

---

## 8. Recommendations for cc-mirror

### Primary Recommendation

**Do NOT add LM Studio as a standalone provider.** Instead:

1. Keep the "LiteLLM" provider as the path for all local LLMs
2. Add documentation for LM Studio as a LiteLLM backend
3. Provide example LiteLLM configs for LM Studio

### Documentation to Add

Create `docs/LM-STUDIO-SETUP.md` covering:
- Prerequisites (LM Studio, LiteLLM, Python)
- Step-by-step setup guide (as above)
- Recommended models for coding tasks
- Troubleshooting common issues

### Provider Screen Update

In the LiteLLM provider setup screen, add text like:

> **Supported Backends:**
> - LM Studio (OpenAI-compatible)
> - Ollama (OpenAI-compatible)
> - vLLM (OpenAI-compatible)
> - llama.cpp server
> - Any OpenAI-compatible endpoint
>
> LiteLLM translates the Anthropic API that Claude Code uses to the
> OpenAI format that these backends expect.

### Future Consideration

If LM Studio ever adds native Anthropic API support (unlikely, but possible), revisit this decision. Monitor:
- LM Studio GitHub issues/discussions
- LM Studio changelog for new API endpoints

---

## 9. Sources

### Official Documentation
- [LM Studio OpenAI Compatibility Endpoints](https://lmstudio.ai/docs/developer/openai-compat)
- [LM Studio REST API](https://lmstudio.ai/docs/developer/rest/endpoints)
- [LM Studio Local Server Settings](https://lmstudio.ai/docs/developer/core/server/settings)
- [LM Studio Model Catalog](https://lmstudio.ai/models)

### LiteLLM Documentation
- [LiteLLM LM Studio Provider](https://docs.litellm.ai/docs/providers/lm_studio)
- [LiteLLM Anthropic Messages Format](https://docs.litellm.ai/docs/anthropic_unified)
- [LiteLLM Anthropic Passthrough](https://docs.litellm.ai/docs/pass_through/anthropic_completion)
- [LiteLLM OpenAI Compatible Providers](https://docs.litellm.ai/docs/providers/openai_compatible)

### Community Resources
- [anthropic-proxy-litellm GitHub](https://github.com/CJHwong/anthropic-proxy-litellm)
- [Claude Code LLM Gateway Docs](https://code.claude.com/docs/en/llm-gateway)
- [Connecting Claude Code to Local LLMs (Medium)](https://medium.com/@michael.hannecke/connecting-claude-code-to-local-llms-two-practical-approaches-faa07f474b0f)

---

## Appendix: Quick Reference

### Port Summary

| Service | Default Port | Base URL |
|---------|--------------|----------|
| LM Studio | 1234 | `http://localhost:1234/v1` |
| LiteLLM Proxy | 4000 | `http://localhost:4000` |
| LiteLLM Anthropic | 4000 | `http://localhost:4000/anthropic` |

### Environment Variables

```bash
# LM Studio (for LiteLLM)
LM_STUDIO_API_BASE=http://localhost:1234/v1
LM_STUDIO_API_KEY=lm-studio  # Dummy, but required

# LiteLLM
LITELLM_MASTER_KEY=sk-your-key

# Claude Code / cc-mirror
ANTHROPIC_BASE_URL=http://localhost:4000
ANTHROPIC_AUTH_TOKEN=sk-your-key
```

### Minimal LiteLLM Config for LM Studio

```yaml
model_list:
  - model_name: claude-sonnet-4-20250514
    litellm_params:
      model: openai/local-model
      api_base: http://localhost:1234/v1
      api_key: x
```
