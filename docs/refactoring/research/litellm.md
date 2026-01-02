# LiteLLM Research for Claude Code / cc-mirror Integration

## Overview

LiteLLM is a Python SDK and AI Gateway/Proxy Server that allows calling 100+ LLM APIs in OpenAI or Anthropic native format. It provides cost tracking, guardrails, load balancing, and comprehensive logging across providers including Bedrock, Azure, OpenAI, VertexAI, Cohere, Anthropic, Ollama, vLLM, and more.

**Current Version:** v1.80.11.rc.1 (as of December 2025)

**GitHub Repository:** [https://github.com/BerriAI/litellm](https://github.com/BerriAI/litellm)

**Official Documentation:** [https://docs.litellm.ai/docs/](https://docs.litellm.ai/docs/)

---

## 1. LiteLLM's Anthropic Proxy Mode

LiteLLM offers two main ways to handle Anthropic API compatibility:

### 1.1 Anthropic Passthrough Mode

Passthrough mode allows native calls to Anthropic endpoints without translation. Simply replace `https://api.anthropic.com` with `LITELLM_PROXY_BASE_URL/anthropic`.

**Features:**
- Cost tracking across `/messages` and `/v1/messages/batches` endpoints
- Full streaming support
- Logging across all integrations
- End-user tracking with Prometheus

**Example - Using Anthropic SDK with Passthrough:**
```python
from anthropic import Anthropic

client = Anthropic(
    base_url="http://0.0.0.0:4000/anthropic",  # <proxy-base-url>/anthropic
    api_key="sk-anything"  # proxy virtual key
)

response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello, world"}]
)
```

### 1.2 Unified /v1/messages Endpoint

The `/v1/messages` endpoint enables calling multiple LLM APIs using the Anthropic message format standard. This supports ALL LiteLLM supported providers including OpenAI, Gemini, Vertex AI, and AWS Bedrock.

**Features:**
- Cost tracking across all supported models
- Streaming capabilities
- Fallbacks and load balancing
- Guardrails for input/output text
- End-user tracking

**Python SDK Example:**
```python
response = await litellm.anthropic.messages.acreate(
    messages=[{"role": "user", "content": "Hello..."}],
    model="openai/gpt-4",
    max_tokens=100,
    stream=True
)
```

---

## 2. Default Port and Endpoint Configuration

### Default Port: 4000

LiteLLM proxy server runs on port 4000 by default.

**Change Port via CLI:**
```bash
litellm --port 8080
```

**Change Port via Environment Variable:**
```bash
export PORT=8080
```

### Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /chat/completions` | OpenAI-compatible chat completions |
| `POST /v1/messages` | Anthropic-compatible messages endpoint |
| `POST /completions` | Legacy completions |
| `POST /embeddings` | Embedding generation |
| `GET /models` | Available models on server |
| `POST /key/generate` | Generate proxy access keys |
| `/anthropic/*` | Anthropic passthrough endpoints |

**Swagger Documentation:** Available at `http://localhost:4000/` (root URL)

---

## 3. Setting Up LiteLLM to Proxy Local Models

### 3.1 Installation

```bash
# Python SDK only
pip install litellm

# With proxy server
pip install 'litellm[proxy]'
```

### 3.2 Ollama Configuration

LiteLLM supports two Ollama endpoint prefixes:
- `ollama/` - Uses `/api/generate` endpoint (completions)
- `ollama_chat/` - Uses `/api/chat` endpoint (recommended for chat)

**config.yaml for Ollama:**
```yaml
model_list:
  - model_name: "llama3.1"
    litellm_params:
      model: "ollama_chat/llama3.1"
      api_base: "http://localhost:11434"
      keep_alive: "8m"  # Keep model in memory
    model_info:
      supports_function_calling: true
```

**Environment Variable (Important for Function Calling):**
```bash
export OLLAMA_API_BASE="http://localhost:11434"
```

> **Gotcha:** LiteLLM makes calls to `OLLAMA_API_BASE/api/show` for model information. Setting this environment variable ensures proper feature detection including function calling.

### 3.3 vLLM Configuration

vLLM provides OpenAI-compatible endpoints. Use the `hosted_vllm/` or `openai/` prefix.

**config.yaml for vLLM:**
```yaml
model_list:
  - model_name: my-vllm-model
    litellm_params:
      model: hosted_vllm/facebook/opt-125m
      api_base: https://your-vllm-server.co
      api_key: os.environ/VLLM_API_KEY  # Optional

  # Alternative using openai/ prefix
  - model_name: vllm-model-alt
    litellm_params:
      model: openai/your-model-name
      api_base: http://0.0.0.0:3000/v1
      api_key: none
```

---

## 4. Configuration Examples

### 4.1 Basic Anthropic Proxy Setup

**config.yaml:**
```yaml
model_list:
  - model_name: claude-3-5-sonnet-20241022
    litellm_params:
      model: anthropic/claude-3-5-sonnet-20241022
      api_key: os.environ/ANTHROPIC_API_KEY

  - model_name: claude-3-5-haiku-20241022
    litellm_params:
      model: anthropic/claude-3-5-haiku-20241022
      api_key: os.environ/ANTHROPIC_API_KEY

litellm_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
```

**Start the proxy:**
```bash
export ANTHROPIC_API_KEY="your-anthropic-api-key"
export LITELLM_MASTER_KEY="sk-1234567890"
litellm --config /path/to/config.yaml
# RUNNING on http://0.0.0.0:4000
```

### 4.2 Multi-Provider Setup (Anthropic + Bedrock + Ollama)

**config.yaml:**
```yaml
model_list:
  # Anthropic Direct
  - model_name: claude-3-5-sonnet-20241022
    litellm_params:
      model: anthropic/claude-3-5-sonnet-20241022
      api_key: os.environ/ANTHROPIC_API_KEY

  # AWS Bedrock
  - model_name: claude-bedrock
    litellm_params:
      model: bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0
      aws_access_key_id: os.environ/AWS_ACCESS_KEY_ID
      aws_secret_access_key: os.environ/AWS_SECRET_ACCESS_KEY
      aws_region_name: us-east-1

  # Local Ollama
  - model_name: llama3.1-local
    litellm_params:
      model: ollama_chat/llama3.1
      api_base: http://localhost:11434
    model_info:
      supports_function_calling: true

  # Local vLLM
  - model_name: codellama-vllm
    litellm_params:
      model: hosted_vllm/codellama-34b
      api_base: http://localhost:8000

router_settings:
  model_group_alias:
    "claude": "claude-3-5-sonnet-20241022"  # Alias routing
```

### 4.3 Claude Code Integration

**Environment Variables:**
```bash
# Option 1: Use /anthropic passthrough endpoint
export ANTHROPIC_BASE_URL="http://0.0.0.0:4000/anthropic"
export ANTHROPIC_AUTH_TOKEN="$LITELLM_MASTER_KEY"

# Option 2: Use unified endpoint
export ANTHROPIC_BASE_URL="http://0.0.0.0:4000"
export ANTHROPIC_AUTH_TOKEN="$LITELLM_MASTER_KEY"
```

**Claude Code settings.json:**
```json
{
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "sk-litellm-static-key"
  }
}
```

**Start Claude Code:**
```bash
claude
# Or specify a model
claude --model claude-3-5-sonnet-20241022
```

### 4.4 Docker Deployment

**docker-compose.yml:**
```yaml
version: '3'
services:
  litellm:
    image: docker.litellm.ai/berriai/litellm:main-latest
    ports:
      - "4000:4000"
    volumes:
      - ./litellm_config.yaml:/app/config.yaml
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - LITELLM_MASTER_KEY=${LITELLM_MASTER_KEY}
    command: ["--config", "/app/config.yaml", "--detailed_debug"]
```

**Run:**
```bash
docker run \
  -v $(pwd)/litellm_config.yaml:/app/config.yaml \
  -e ANTHROPIC_API_KEY=... \
  -e LITELLM_MASTER_KEY=sk-1234 \
  -p 4000:4000 \
  docker.litellm.ai/berriai/litellm:main-latest \
  --config /app/config.yaml
```

---

## 5. Documentation Links

### Official Documentation
- **Main Docs:** [https://docs.litellm.ai/docs/](https://docs.litellm.ai/docs/)
- **Proxy Server Guide:** [https://docs.litellm.ai/docs/simple_proxy](https://docs.litellm.ai/docs/simple_proxy)
- **Anthropic Provider:** [https://docs.litellm.ai/docs/providers/anthropic](https://docs.litellm.ai/docs/providers/anthropic)
- **Anthropic Passthrough:** [https://docs.litellm.ai/docs/pass_through/anthropic_completion](https://docs.litellm.ai/docs/pass_through/anthropic_completion)
- **Unified /v1/messages:** [https://docs.litellm.ai/docs/anthropic_unified](https://docs.litellm.ai/docs/anthropic_unified)
- **Ollama Provider:** [https://docs.litellm.ai/docs/providers/ollama](https://docs.litellm.ai/docs/providers/ollama)
- **vLLM Provider:** [https://docs.litellm.ai/docs/providers/vllm](https://docs.litellm.ai/docs/providers/vllm)
- **OpenAI-Compatible Endpoints:** [https://docs.litellm.ai/docs/providers/openai_compatible](https://docs.litellm.ai/docs/providers/openai_compatible)
- **Config Settings:** [https://docs.litellm.ai/docs/proxy/config_settings](https://docs.litellm.ai/docs/proxy/config_settings)
- **Model Management:** [https://docs.litellm.ai/docs/proxy/model_management](https://docs.litellm.ai/docs/proxy/model_management)
- **Model Alias:** [https://docs.litellm.ai/docs/completion/model_alias](https://docs.litellm.ai/docs/completion/model_alias)
- **Claude Code Tutorial:** [https://docs.litellm.ai/docs/tutorials/claude_responses_api](https://docs.litellm.ai/docs/tutorials/claude_responses_api)

### GitHub Resources
- **Main Repository:** [https://github.com/BerriAI/litellm](https://github.com/BerriAI/litellm)
- **Issues Tracker:** [https://github.com/BerriAI/litellm/issues](https://github.com/BerriAI/litellm/issues)
- **Sample config.yaml:** [https://github.com/BerriAI/litellm/blob/main/proxy_server_config.yaml](https://github.com/BerriAI/litellm/blob/main/proxy_server_config.yaml)

### Community
- **Discord:** [https://discord.gg/wuPM9dRgDw](https://discord.gg/wuPM9dRgDw)
- **Contact:** ishaan@berri.ai / krrish@berri.ai

---

## 6. Gotchas and Common Issues

### 6.1 Streaming Issues with Claude Code

**Known Issue:** Claude Code versions 1.0.8+ may have issues with LiteLLM's Anthropic-compatible endpoints, particularly with streaming.

**Symptoms:**
- "Error: Streaming fallback triggered"
- "API Error: request ended without sending any chunks"
- "Content block not found" errors during tool calling

**Workarounds:**
- Check [Issue #11358](https://github.com/BerriAI/litellm/issues/11358) and [Issue #13373](https://github.com/BerriAI/litellm/issues/13373) for updates
- Try using the `/anthropic` passthrough endpoint instead of `/v1/messages`
- Consider pinning to an older LiteLLM version if issues persist

### 6.2 Authentication Errors

**Common Causes:**
1. Missing or invalid API key
2. `LITELLM_API_KEY` incorrectly set when using OpenAI (should be left blank)
3. "No connected db" error when following "Basic (no DB)" docs

**Solutions:**
- Ensure `ANTHROPIC_API_KEY` is properly set in environment
- For OpenAI models, ensure `OPENAI_API_KEY` is set, not `LITELLM_API_KEY`
- Check that your `LITELLM_MASTER_KEY` starts with `sk-`

### 6.3 Ollama Function Calling

**Issue:** Function calling may not work if `OLLAMA_API_BASE` environment variable is not set.

**Fix:**
```bash
export OLLAMA_API_BASE="http://localhost:11434"
```

**Also in config.yaml:**
```yaml
model_list:
  - model_name: "llama3.1"
    litellm_params:
      model: "ollama_chat/llama3.1"
      api_base: "http://localhost:11434"
    model_info:
      supports_function_calling: true
```

**Note:** LiteLLM version 1.41.27+ is required for native Ollama function calling.

### 6.4 URL Suffix Auto-Append

**Issue:** LiteLLM automatically appends `/v1/messages` or `/v1/complete` to custom Anthropic base URLs.

**Fix:** Set environment variable to disable:
```bash
export LITELLM_ANTHROPIC_DISABLE_URL_SUFFIX="true"
```

### 6.5 Header Forwarding

**Issue:** `anthropic-beta` headers from clients may not reach the LLM API.

**Fix:** Enable in `config.yaml`:
```yaml
general_settings:
  forward_client_headers_to_llm_api: true
```

### 6.6 Context Window Requirements

When using alternative models with Claude Code, ensure your model has a context window of at least 200,000 tokens. Claude Code expects this for its auto-compacting feature.

---

## 7. Model Mapping Requirements

### 7.1 Model Alias Mapping

The `model_name` parameter in config.yaml is the user-facing name that clients use. The `litellm_params.model` is the actual backend model identifier.

**Example - User-Friendly Aliases:**
```yaml
model_list:
  - model_name: claude          # User requests "claude"
    litellm_params:
      model: anthropic/claude-3-5-sonnet-20241022  # Actual model called

  - model_name: gpt-4           # User requests "gpt-4"
    litellm_params:
      model: azure/gpt-4-turbo   # Routes to Azure deployment
```

### 7.2 Router-Level Aliases

For routing requests between model groups:

```yaml
router_settings:
  model_group_alias:
    "gpt-4": "gpt-4o"     # All gpt-4 requests -> gpt-4o models
    "claude": "claude-3-5-sonnet-20241022"
```

### 7.3 Python SDK Alias Map

```python
import litellm

litellm.model_alias_map = {
    "GPT-3.5": "gpt-3.5-turbo-16k",
    "llama2": "replicate/meta/llama-2-70b-chat:02e509c789964a7ea8736978a43525956ef40397be9033abf9fd2badfe68c9e3"
}
```

### 7.4 Base Model for Cost Tracking

Use `base_model` for accurate cost mapping of custom deployments:

```yaml
model_list:
  - model_name: my-custom-claude
    litellm_params:
      model: custom/my-deployment
    model_info:
      base_model: anthropic/claude-3-5-sonnet-20241022
```

---

## 8. cc-mirror / Claude Code Alternative Integration

### 8.1 Related Tools

Several tools exist for using Claude Code with alternative backends:

| Tool | Description | Repository |
|------|-------------|------------|
| **claude-mirror** | Proxy server mirroring Claude Code interface to OpenAI models | [ericmichael/claude-mirror](https://github.com/ericmichael/claude-mirror) |
| **ccproxy** | Hook requests, modify responses, intelligent model routing | [starbased-co/ccproxy](https://github.com/starbased-co/ccproxy) |
| **claude-code-proxy** | Use Anthropic clients with Gemini, OpenAI, or Anthropic backends via LiteLLM | [1rgs/claude-code-proxy](https://github.com/1rgs/claude-code-proxy) |

### 8.2 Using LiteLLM with Claude Code for Local Models

**Step 1: Configure LiteLLM with local model:**
```yaml
# config.yaml
model_list:
  # Map Claude model names to local Ollama models
  - model_name: claude-3-5-sonnet-20241022
    litellm_params:
      model: ollama_chat/qwen2.5-coder:32b
      api_base: http://localhost:11434
    model_info:
      supports_function_calling: true
```

**Step 2: Start LiteLLM:**
```bash
export LITELLM_MASTER_KEY="sk-1234"
litellm --config config.yaml --port 4000
```

**Step 3: Configure Claude Code:**
```bash
export ANTHROPIC_BASE_URL="http://localhost:4000"
export ANTHROPIC_AUTH_TOKEN="sk-1234"
claude
```

### 8.3 Important Considerations

1. **Anthropic Disclaimer:** LiteLLM is a third-party proxy service. Anthropic does not endorse, maintain, or audit LiteLLM's security or functionality.

2. **Context Window:** Ensure local models have sufficient context (ideally 200k+ tokens) for Claude Code's compacting features.

3. **Tool/Function Calling:** Not all local models support function calling. Verify your model's capabilities and configure `supports_function_calling` appropriately.

4. **Streaming:** Some combinations of models and endpoints may have streaming issues. Test thoroughly.

---

## 9. Quick Start Commands

### Minimal Local Setup (Ollama + LiteLLM + Claude Code)

```bash
# 1. Install LiteLLM
pip install 'litellm[proxy]'

# 2. Start Ollama with a model
ollama pull llama3.1
ollama serve

# 3. Create config.yaml
cat > config.yaml << 'EOF'
model_list:
  - model_name: claude-3-5-sonnet-20241022
    litellm_params:
      model: ollama_chat/llama3.1
      api_base: http://localhost:11434
    model_info:
      supports_function_calling: true
EOF

# 4. Set environment and start LiteLLM
export OLLAMA_API_BASE="http://localhost:11434"
export LITELLM_MASTER_KEY="sk-local-dev-key"
litellm --config config.yaml --port 4000

# 5. In another terminal, configure and start Claude Code
export ANTHROPIC_BASE_URL="http://localhost:4000"
export ANTHROPIC_AUTH_TOKEN="sk-local-dev-key"
claude
```

---

## 10. Performance Notes

- LiteLLM proxy achieves **8ms P95 latency at 1k RPS** according to benchmarks
- Docker images tagged `-stable` undergo 12-hour load tests before publication
- For production, consider setting `--num_workers` based on CPU cores
- Use `--max_requests_before_restart` to recycle workers after fixed request counts

---

*Last Updated: January 2026*
*Research conducted for cc-mirror / Claude Code integration*
