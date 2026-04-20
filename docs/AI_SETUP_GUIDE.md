# MyPal AI Integration Setup Guide

## Overview
MyPal now supports multiple AI providers for natural, contextual responses. Choose from:
- **Local Only**: Simple pattern-based responses (no setup required)
- **Ollama**: Local AI models (recommended for privacy + quality)
- **OpenAI**: Cloud-based GPT models
- **Azure OpenAI**: Enterprise-grade GPT models
- **Google Gemini**: Google's AI models

## Your System Specifications
Based on your hardware detection:
- **RAM**: 32GB (Excellent for AI)
- **GPU**: NVIDIA GeForce RTX 4050 Laptop (4GB VRAM)
- **CPU**: Multi-core processor

### Recommended Configuration
**Primary Recommendation**: **Ollama with Llama 3.2 3B (4-bit quantized)**
- Fits perfectly in your 4GB VRAM
- Fast inference (15-30 tokens/sec)
- Excellent quality responses
- 100% private (runs locally)
- No API costs

## Ollama Setup (Recommended)

### 1. Install Ollama

**Windows**:
```powershell
# Download and run installer from:
https://ollama.ai/download/windows

# Or use winget:
winget install Ollama.Ollama
```

**macOS**:
```bash
brew install ollama
```

**Linux**:
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### 2. Download Recommended Models

For your system (32GB RAM, RTX 4050 4GB VRAM), these models are optimized:

**Best Overall** (Recommended):
```bash
ollama pull llama3.2:3b
```
- Size: ~2GB
- VRAM: ~3GB during inference
- Speed: 20-30 tok/s
- Quality: Excellent

**Alternative Options**:

**Phi-3.5 Mini** (Microsoft):
```bash
ollama pull phi3.5:3.8b
```
- Size: ~2.3GB
- VRAM: ~3.5GB during inference
- Speed: 15-25 tok/s
- Quality: Very good, especially for reasoning

**TinyLlama** (Ultra-fast fallback):
```bash
ollama pull tinyllama:1.1b
```
- Size: ~600MB
- VRAM: ~1GB during inference
- Speed: 40-60 tok/s
- Quality: Good for simple conversations

### 3. Start Ollama Service

Ollama runs as a background service by default after installation.

**Verify it's running**:
```bash
ollama list
```

You should see your downloaded models listed.

**Start/Restart Ollama** (if needed):
```bash
# Windows (already runs as service)
# Check in Task Manager: "Ollama" service

# macOS/Linux
ollama serve
```

### 4. Test Your Model

```bash
# Interactive test
ollama run llama3.2:3b

# Ask a question
>>> Hello! How are you?

# Exit with /bye
>>> /bye
```

## MyPal Configuration

### 1. Open MyPal Settings

1. Launch MyPal (run `./AUTORUN.ps1`)
2. Select your profile or create a new one
3. Click the **Settings** tab (gear icon)

### 2. Configure AI Provider

1. In the **AI Provider** section:
   - Select **"Ollama (Local AI - Recommended)"** from the dropdown
2. Click **"🔄 Refresh Models"** button
   - This will detect all installed Ollama models
3. Select your desired model (e.g., `llama3.2:3b`)
4. Click **"Save Settings"**

### 3. Verify Connection

Look for the **status indicator** below the model selector:
- 🟢 **"Healthy"** (green): Ollama is running and ready
- 🟠 **"Unavailable"** (orange): Ollama not running or model not found
- 🔵 **"Loading"** (blue): Checking status...

### 4. Start Chatting!

Go to the **Conversation** tab and start chatting. Your Pal will now use the AI model for natural, contextual responses!

## Cloud AI Providers (Alternative)

### OpenAI Setup

1. Get API key from: https://platform.openai.com/api-keys
2. In MyPal Settings:
   - Select **"OpenAI"**
   - Paste your API key
   - Default model: `gpt-3.5-turbo`
   - Click **"Save Settings"**

**Pricing**: Pay-per-use (~$0.002 per 1K tokens)

### Azure OpenAI Setup

1. Create Azure OpenAI resource: https://portal.azure.com
2. Deploy a model (e.g., `gpt-35-turbo`)
3. Get your endpoint and API key
4. In MyPal Settings:
   - Select **"Azure OpenAI"**
   - Enter endpoint URL
   - Paste API key
   - Enter deployment name as model
   - Click **"Save Settings"**

### Google Gemini Setup

1. Get API key from: https://makersuite.google.com/app/apikey
2. In MyPal Settings:
   - Select **"Google Gemini"**
   - Paste your API key
   - Default model: `gemini-1.5-flash`
   - Click **"Save Settings"**

**Pricing**: Free tier available

## How AI Integration Works

### Developmental Stages

MyPal's AI integration respects Piaget's developmental stages:

**Level 0-1 (Sensorimotor)**: Babbling
- Output: Simple sounds ("ba", "da", "ma")
- Temperature: 1.2 (high randomness)
- Max tokens: 10

**Level 2-3 (Early Preoperational)**: Single words
- Output: One word from vocabulary
- Temperature: 0.9
- Max tokens: 15
- Example: "happy!", "why?", "food"

**Level 4-6 (Preoperational)**: Simple phrases
- Output: 2-4 word phrases
- Temperature: 0.8
- Max tokens: 30
- Example: "me like friend", "why that?", "I feel happy"

**Level 7-10 (Concrete Operational)**: Full sentences
- Output: 1-2 complete sentences
- Temperature: 0.7
- Max tokens: 60
- Example: "I remember when you taught me that! Can you tell me more?"

**Level 11+ (Formal Operational)**: Complex reasoning
- Output: 2-3 sophisticated sentences
- Temperature: 0.6
- Max tokens: 100
- Example: "That's an interesting question. Based on what we discussed yesterday, I think..."

### Fallback Behavior

If the AI provider is unavailable:
1. MyPal automatically falls back to **"Local Only"** mode
2. Uses pattern-based responses (original system)
3. No disruption to your conversation
4. Check logs for error details

## Performance Optimization

### GPU Acceleration (Ollama)

Ollama automatically uses your RTX 4050 when available.

**Verify GPU usage**:
```bash
# Check VRAM usage while chatting
nvidia-smi
```

You should see Ollama using ~3GB VRAM during inference.

### Model Selection Guidelines

**For your system (RTX 4050 4GB)**:
- ✅ **3B models**: Perfect fit, fast inference
- ✅ **Up to 7B (4-bit quantized)**: Possible but slower
- ❌ **13B+ models**: Too large for 4GB VRAM (will use CPU, very slow)

**If GPU memory is full**:
- Close other applications
- Try a smaller model (e.g., `tinyllama:1.1b`)
- Ollama will automatically fall back to CPU if needed

### Speed Expectations

**Llama 3.2 3B on RTX 4050**:
- First token: <1 second
- Generation speed: 20-30 tokens/second
- Total response time (50 tokens): ~2-3 seconds

## Troubleshooting

### Issue: "Ollama unavailable" status

**Solution**:
```bash
# Check if Ollama is running
ollama list

# If not running, start it:
ollama serve

# On Windows, check Task Manager for "Ollama" service
```

### Issue: Model not appearing in dropdown

**Solution**:
```bash
# Verify model is downloaded
ollama list

# If not listed, download it:
ollama pull llama3.2:3b

# Restart MyPal backend
```

### Issue: Slow responses

**Possible causes**:
1. **GPU not being used**: Check `nvidia-smi` during inference
2. **Model too large**: Switch to `llama3.2:3b` or `tinyllama:1.1b`
3. **CPU bottleneck**: Close other applications
4. **First inference**: First response is always slower (model loading)

**Solution**:
```bash
# Test model speed directly
ollama run llama3.2:3b "Hello!"

# Expected: Response in <2 seconds
```

### Issue: Out of memory errors

**Solution**:
1. Close other GPU-intensive applications
2. Use a smaller model:
   ```bash
   ollama pull tinyllama:1.1b
   ```
3. Let Ollama use CPU (slower but works):
   - It will automatically fall back if GPU is full

### Issue: API key not working (cloud providers)

**Solution**:
1. Verify API key is correct (no extra spaces)
2. Check API key has necessary permissions
3. Verify billing is set up (for paid services)
4. Test API key directly:
   ```bash
   # OpenAI
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

## Best Practices

### Privacy
- **Ollama**: 100% private, data never leaves your machine
- **Cloud providers**: Data sent to external servers
- **Recommendation**: Use Ollama for sensitive conversations

### Cost Management
- **Ollama**: Free (one-time download)
- **OpenAI**: ~$0.002 per 1K tokens (~$0.01 per conversation)
- **Gemini**: Free tier generous, then $0.00025 per 1K tokens

### Model Updates
```bash
# Update Ollama models regularly
ollama pull llama3.2:3b

# Check for new models
ollama list
```

### Development vs Production

**Development** (current setup):
- Use Ollama for testing
- Fast iteration
- No API costs

**Production** (if deploying):
- Consider cloud providers for scalability
- Implement rate limiting
- Monitor API usage and costs

## Advanced Configuration

### Custom Ollama Settings

Edit Ollama configuration to optimize for your hardware:

**Location**:
- Windows: `%LOCALAPPDATA%\Ollama\config.json`
- macOS/Linux: `~/.ollama/config.json`

**Example configuration**:
```json
{
  "num_gpu": 1,
  "num_thread": 8,
  "context_length": 2048
}
```

### Multiple Models

You can install multiple models and switch between them:

```bash
# Fast model for simple queries
ollama pull tinyllama:1.1b

# Balanced model (recommended)
ollama pull llama3.2:3b

# Higher quality (slower)
ollama pull mistral:7b
```

Then select the appropriate model in MyPal settings based on your needs.

## Support & Resources

### Official Documentation
- **Ollama**: https://ollama.ai/docs
- **OpenAI**: https://platform.openai.com/docs
- **Azure OpenAI**: https://learn.microsoft.com/en-us/azure/cognitive-services/openai
- **Google Gemini**: https://ai.google.dev/docs

### MyPal Community
- Report issues: GitHub Issues
- Discussions: GitHub Discussions
- Documentation: `/docs` folder

### Performance Monitoring

Check MyPal logs for AI performance metrics:

**Location**: `dev-logs/console.log`

Look for entries like:
```
[AI] Generating response with ollama (temp: 0.7, tokens: 60)
[AI] Response generated successfully
```

---

**Last Updated**: October 24, 2025
**MyPal Version**: 0.3-alpha
**Document Version**: 1.0
