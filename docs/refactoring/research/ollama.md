# Ollama Setup with LiteLLM Proxy for Anthropic API Compatibility

This guide documents how to use Ollama with LiteLLM proxy to expose local LLMs through an Anthropic-compatible API.

## 1. Ollama Native API Format

Ollama provides two API formats:

### Native Ollama API

The native API runs on `http://localhost:11434` by default and provides:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/generate` | POST | Single-turn text generation |
| `/api/chat` | POST | Multi-turn conversations |
| `/api/tags` | GET | List available local models |
| `/api/pull` | POST | Download models |
| `/api/show` | POST | Show model information |

**Native Generate Request:**
```bash
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.1",
  "prompt": "Why is the sky blue?",
  "stream": false
}'
```

**Native Chat Request:**
```bash
curl http://localhost:11434/api/chat -d '{
  "model": "llama3.1",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ]
}'
```

### OpenAI-Compatible API

Ollama has built-in OpenAI compatibility at `/v1/` path:

| Endpoint | Purpose |
|----------|---------|
| `/v1/chat/completions` | Chat completions (OpenAI format) |
| `/v1/completions` | Text completions |
| `/v1/models` | List models |
| `/v1/embeddings` | Generate embeddings |

**OpenAI-Compatible Request:**
```bash
curl http://localhost:11434/v1/chat/completions -d '{
  "model": "llama3.1",
  "messages": [{"role": "user", "content": "Hello!"}]
}'
```

**Python with OpenAI SDK:**
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:11434/v1/",
    api_key="ollama"  # Required but ignored
)

response = client.chat.completions.create(
    model="llama3.1",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

## 2. Default Ollama Endpoint and Port

| Setting | Default Value |
|---------|---------------|
| Host | `127.0.0.1` |
| Port | `11434` |
| Base URL | `http://localhost:11434` |
| OpenAI-Compatible Base | `http://localhost:11434/v1` |

### Environment Variables

```bash
# Change bind address
export OLLAMA_HOST=0.0.0.0:11434

# Allow all origins (for Docker/remote access)
export OLLAMA_ORIGINS="*"

# Set models directory
export OLLAMA_MODELS=/path/to/models
```

## 3. Step-by-Step Guide: Ollama + LiteLLM -> Anthropic API

### Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Application    │────>│   LiteLLM       │────>│    Ollama       │
│  (Anthropic SDK)│     │   Proxy         │     │    Server       │
│                 │<────│   :4000         │<────│    :11434       │
└─────────────────┘     └─────────────────┘     └─────────────────┘
     Anthropic           Translation Layer         Local LLM
     Messages API                                  (llama3, etc.)
```

### Step 1: Install and Start Ollama

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama server
ollama serve

# Pull a model
ollama pull llama3.1:8b
```

### Step 2: Install LiteLLM

```bash
pip install 'litellm[proxy]'
```

### Step 3: Create LiteLLM Configuration

Create `litellm_config.yaml`:

```yaml
model_list:
  # Map Anthropic model names to Ollama models
  - model_name: claude-3-5-sonnet-20241022
    litellm_params:
      model: ollama_chat/llama3.1:8b
      api_base: http://localhost:11434
    model_info:
      supports_function_calling: true

  - model_name: claude-3-opus-20240229
    litellm_params:
      model: ollama_chat/qwen2.5:32b
      api_base: http://localhost:11434
    model_info:
      supports_function_calling: true

  - model_name: claude-3-haiku-20240307
    litellm_params:
      model: ollama_chat/mistral:7b
      api_base: http://localhost:11434

general_settings:
  master_key: sk-1234  # Optional: require API key
```

### Step 4: Start LiteLLM Proxy

```bash
litellm --config litellm_config.yaml --port 4000
```

### Step 5: Use with Anthropic SDK

```python
from anthropic import Anthropic

client = Anthropic(
    base_url="http://localhost:4000/anthropic",
    api_key="sk-1234"  # LiteLLM proxy key
)

message = client.messages.create(
    model="claude-3-5-sonnet-20241022",  # Maps to llama3.1:8b
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}]
)
print(message.content[0].text)
```

### Alternative: Direct Passthrough

LiteLLM supports Anthropic passthrough at `/anthropic` endpoint:

```python
# Replace https://api.anthropic.com with http://localhost:4000/anthropic
client = Anthropic(
    base_url="http://localhost:4000/anthropic",
    api_key="sk-anything"
)
```

## 4. LiteLLM Configuration for Ollama Backend

### Basic Configuration

```yaml
model_list:
  - model_name: my-local-model
    litellm_params:
      model: ollama_chat/llama3.1
      api_base: http://localhost:11434
```

### Configuration Options

| Parameter | Description | Example |
|-----------|-------------|---------|
| `model` | Ollama model with prefix | `ollama_chat/llama3.1` |
| `api_base` | Ollama server URL | `http://localhost:11434` |
| `keep_alive` | Model memory duration | `"8m"`, `"24h"`, `-1` |
| `num_ctx` | Context window size | `4096`, `8192` |

### Use `ollama_chat` vs `ollama`

- **`ollama_chat/`** - Recommended for chat completions, better response quality
- **`ollama/`** - Basic completion, legacy support

### Advanced Configuration with Options

```yaml
model_list:
  - model_name: claude-3-5-sonnet-20241022
    litellm_params:
      model: ollama_chat/llama3.1:8b
      api_base: http://localhost:11434
      keep_alive: "30m"
    model_info:
      supports_function_calling: true
      supports_vision: false

  - model_name: claude-3-opus-20240229
    litellm_params:
      model: ollama_chat/qwen2.5:72b
      api_base: http://localhost:11434
      stream: true
    model_info:
      supports_function_calling: true

litellm_settings:
  drop_params: true  # Drop unsupported params instead of erroring
  set_verbose: false
```

### Environment Variable Override

```bash
# Override Ollama base URL for all ollama/ models
export OLLAMA_API_BASE=http://ollama-server:11434
```

## 5. Model Mapping Examples

### Recommended Mappings: Ollama -> Anthropic Aliases

```yaml
model_list:
  # Sonnet-class (balanced performance)
  - model_name: claude-3-5-sonnet-20241022
    litellm_params:
      model: ollama_chat/llama3.1:8b
      api_base: http://localhost:11434

  - model_name: claude-3-sonnet-20240229
    litellm_params:
      model: ollama_chat/mistral:7b
      api_base: http://localhost:11434

  # Opus-class (high capability)
  - model_name: claude-3-opus-20240229
    litellm_params:
      model: ollama_chat/llama3.3:70b
      api_base: http://localhost:11434

  - model_name: claude-3-opus-20240229
    litellm_params:
      model: ollama_chat/qwen2.5:72b
      api_base: http://localhost:11434

  # Haiku-class (fast, lightweight)
  - model_name: claude-3-haiku-20240307
    litellm_params:
      model: ollama_chat/phi4:14b
      api_base: http://localhost:11434

  # Coding-focused
  - model_name: claude-3-5-sonnet-20241022
    litellm_params:
      model: ollama_chat/qwen2.5-coder:32b
      api_base: http://localhost:11434
```

### Generic Model Aliases

```yaml
model_list:
  # Allow both specific and generic names
  - model_name: gpt-4
    litellm_params:
      model: ollama_chat/llama3.3:70b
      api_base: http://localhost:11434

  - model_name: gpt-3.5-turbo
    litellm_params:
      model: ollama_chat/llama3.1:8b
      api_base: http://localhost:11434
```

## 6. Common Ollama Models as Claude Alternatives

### Tier 1: High Capability (Opus-class)

| Model | Size | VRAM Needed | Best For |
|-------|------|-------------|----------|
| `llama3.3:70b` | 70B | 40GB+ | General reasoning, analysis |
| `qwen2.5:72b` | 72B | 40GB+ | Multilingual, math |
| `deepseek-r1:70b` | 70B | 40GB+ | Complex reasoning |
| `mixtral:8x22b` | 141B MoE | 48GB+ | High-quality general use |

### Tier 2: Balanced (Sonnet-class)

| Model | Size | VRAM Needed | Best For |
|-------|------|-------------|----------|
| `llama3.1:8b` | 8B | 6-8GB | General purpose |
| `qwen2.5:32b` | 32B | 20GB+ | Coding, reasoning |
| `qwen2.5-coder:32b` | 32B | 20GB+ | Code generation |
| `deepseek-coder:33b` | 33B | 20GB+ | Code tasks |
| `mistral:7b` | 7B | 6GB | Fast, general |

### Tier 3: Lightweight (Haiku-class)

| Model | Size | VRAM Needed | Best For |
|-------|------|-------------|----------|
| `phi4:14b` | 14B | 10GB | Reasoning, compact |
| `llama3.2:3b` | 3B | 4GB | Edge devices |
| `qwen2.5:7b` | 7B | 6GB | Balanced small |
| `gemma2:9b` | 9B | 8GB | Google's compact |

### Recommended Starting Points

```bash
# Best all-around for 8GB VRAM
ollama pull llama3.1:8b

# Best for coding with 24GB VRAM
ollama pull qwen2.5-coder:32b

# Best lightweight option
ollama pull phi4:14b

# Best for reasoning tasks
ollama pull deepseek-r1:32b
```

## 7. Performance Considerations

### VRAM Requirements

| Model Size | Min VRAM | Recommended VRAM |
|------------|----------|------------------|
| 7-8B (Q4) | 6GB | 8GB |
| 13-14B (Q4) | 10GB | 12GB |
| 32-34B (Q4) | 20GB | 24GB |
| 70B (Q4) | 40GB | 48GB |

### Environment Variables for Optimization

```bash
# GPU Settings
export OLLAMA_FLASH_ATTENTION=1       # Enable Flash Attention 2.0 (Ampere+)
export OLLAMA_GPU_OVERHEAD=512        # Reserve GPU memory (MB)
export OLLAMA_CUDA=1                  # Enable CUDA acceleration

# Memory Management
export OLLAMA_MAX_LOADED_MODELS=2     # Limit concurrent models
export OLLAMA_NUM_PARALLEL=4          # Parallel request handling
export OLLAMA_MAX_VRAM=6144           # Max VRAM usage (MB)

# CPU Settings
export OLLAMA_NUM_THREADS=8           # CPU thread count
```

### Context Window Tuning

Context size dramatically affects VRAM usage:

```bash
# Create a custom model with larger context
cat > Modelfile <<EOF
FROM llama3.1:8b
PARAMETER num_ctx 8192
PARAMETER num_batch 512
EOF

ollama create llama3.1-8k -f Modelfile
```

### Performance Tips

1. **Quantization**: Use Q4_K_M quantized models for 75% VRAM reduction
2. **Flash Attention**: Enable for 20-30% speedup on Ampere+ GPUs
3. **Keep Alive**: Set appropriately to avoid model reload latency
4. **Layer Offloading**: Let Ollama auto-manage GPU/CPU split
5. **Batch Size**: Reduce `num_batch` if running out of memory

### Monitoring

```bash
# Monitor GPU usage
watch -n 1 nvidia-smi

# Check Ollama logs
journalctl -u ollama -f

# macOS: Activity Monitor or
sudo powermetrics --samplers gpu_power
```

## 8. Docker Setup Options

### Option A: Docker Compose (Full Stack)

Create `docker-compose.yaml`:

```yaml
version: "3.9"

services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    # GPU support (NVIDIA)
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    restart: unless-stopped

  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    container_name: litellm
    ports:
      - "4000:4000"
    volumes:
      - ./litellm_config.yaml:/app/config.yaml
    environment:
      - OLLAMA_API_BASE=http://ollama:11434
    command: --config /app/config.yaml --port 4000
    depends_on:
      - ollama
    restart: unless-stopped

volumes:
  ollama_data:
```

Create `litellm_config.yaml`:

```yaml
model_list:
  - model_name: claude-3-5-sonnet-20241022
    litellm_params:
      model: ollama_chat/llama3.1:8b
      api_base: http://ollama:11434

  - model_name: claude-3-opus-20240229
    litellm_params:
      model: ollama_chat/qwen2.5:32b
      api_base: http://ollama:11434

  - model_name: claude-3-haiku-20240307
    litellm_params:
      model: ollama_chat/mistral:7b
      api_base: http://ollama:11434

general_settings:
  master_key: sk-your-secret-key
```

Start the stack:

```bash
docker-compose up -d

# Pull models into Ollama container
docker exec -it ollama ollama pull llama3.1:8b
docker exec -it ollama ollama pull mistral:7b
```

### Option B: Docker Compose with Database (Production)

```yaml
version: "3.9"

services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    restart: unless-stopped

  postgres:
    image: postgres:15
    container_name: litellm-db
    environment:
      POSTGRES_USER: litellm
      POSTGRES_PASSWORD: litellm_password
      POSTGRES_DB: litellm
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: litellm-redis
    restart: unless-stopped

  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    container_name: litellm
    ports:
      - "4000:4000"
    volumes:
      - ./litellm_config.yaml:/app/config.yaml
    environment:
      - DATABASE_URL=postgresql://litellm:litellm_password@postgres:5432/litellm
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - OLLAMA_API_BASE=http://ollama:11434
    command: --config /app/config.yaml --port 4000 --num_workers 4
    depends_on:
      - ollama
      - postgres
      - redis
    restart: unless-stopped

volumes:
  ollama_data:
  postgres_data:
```

### Option C: Ollama Only (Docker)

```bash
# CPU only
docker run -d -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama

# With NVIDIA GPU
docker run -d --gpus=all -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama

# Pull models
docker exec -it ollama ollama pull llama3.1:8b
```

### Option D: Using Pre-built LiteLLM Ollama Image

```bash
# LiteLLM provides a combined image
docker pull litellm/ollama

docker run -d \
  -p 4000:4000 \
  -v ./litellm_config.yaml:/app/config.yaml \
  litellm/ollama \
  --config /app/config.yaml
```

### macOS Docker Notes

For macOS with Apple Silicon, GPU acceleration in Docker is limited:

```yaml
# docker-compose.yaml for macOS
services:
  ollama:
    image: ollama/ollama:latest
    platform: linux/arm64
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    # No GPU reservations - uses CPU in Docker on macOS
```

**Recommendation**: On macOS, run Ollama natively for GPU acceleration:

```bash
# Native macOS (recommended)
brew install ollama
ollama serve

# LiteLLM can still run in Docker, connecting to host Ollama
docker run -d \
  -p 4000:4000 \
  -v ./litellm_config.yaml:/app/config.yaml \
  -e OLLAMA_API_BASE=http://host.docker.internal:11434 \
  ghcr.io/berriai/litellm:main-latest \
  --config /app/config.yaml
```

---

## Quick Start Summary

```bash
# 1. Install Ollama
brew install ollama  # or curl installer for Linux

# 2. Start Ollama and pull a model
ollama serve &
ollama pull llama3.1:8b

# 3. Install LiteLLM
pip install 'litellm[proxy]'

# 4. Create config (litellm_config.yaml)
cat > litellm_config.yaml <<EOF
model_list:
  - model_name: claude-3-5-sonnet-20241022
    litellm_params:
      model: ollama_chat/llama3.1:8b
      api_base: http://localhost:11434
EOF

# 5. Start LiteLLM proxy
litellm --config litellm_config.yaml --port 4000

# 6. Test with curl
curl http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

---

## Sources

- [Ollama OpenAI Compatibility](https://docs.ollama.com/api/openai-compatibility)
- [Ollama Blog: OpenAI Compatibility](https://ollama.com/blog/openai-compatibility)
- [LiteLLM Ollama Provider](https://docs.litellm.ai/docs/providers/ollama)
- [LiteLLM Anthropic Provider](https://docs.litellm.ai/docs/providers/anthropic)
- [LiteLLM Anthropic Passthrough](https://docs.litellm.ai/docs/pass_through/anthropic_completion)
- [LiteLLM Proxy Config](https://docs.litellm.ai/docs/proxy/configs)
- [LiteLLM GitHub](https://github.com/BerriAI/litellm)
- [Ollama Docker Compose Example](https://github.com/gmag11/ollama-litellm-dockercompose)
- [Ollama VRAM Guide](https://localllm.in/blog/ollama-vram-requirements-for-local-llms)
- [Ollama Performance Tuning](https://collabnix.com/ollama-performance-tuning-gpu-optimization-techniques-for-production/)
- [Best Ollama Models 2025](https://collabnix.com/best-ollama-models-in-2025-complete-performance-comparison/)
