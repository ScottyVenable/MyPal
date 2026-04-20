# MyPal AI Quick Start

## Your System
- **RAM**: 32GB ✅
- **GPU**: RTX 4050 4GB VRAM ✅
- **Recommended Model**: Llama 3.2 3B (4-bit)

## 60-Second Setup

### 1. Install Ollama
```powershell
# Download from: https://ollama.ai/download/windows
# Or:
winget install Ollama.Ollama
```

### 2. Download Model (Recommended)
```powershell
ollama pull llama3.2:3b
```

### 3. Verify
```powershell
ollama list
# Should show: llama3.2:3b
```

### 4. Configure MyPal
1. Open MyPal Settings tab
2. AI Provider → Select "Ollama"
3. Click 🔄 Refresh Models
4. Select `llama3.2:3b`
5. Save Settings
6. Look for 🟢 "Healthy" status

## Done! Start Chatting!

Your Pal will now use AI for natural responses while respecting developmental stages.

---

## Alternative Models

**Faster** (if llama3.2 is slow):
```powershell
ollama pull tinyllama:1.1b
```

**Better Quality** (if you have time):
```powershell
ollama pull phi3.5:3.8b
```

## Troubleshooting

**Ollama not found?**
```powershell
ollama serve
```

**Status shows unavailable?**
- Check Task Manager for "Ollama" process
- Restart MyPal backend

**Too slow?**
- Try `tinyllama:1.1b` instead
- Close other applications

## Toggle Back to Local Mode

In Settings → AI Provider → Select "Local Only"

No AI model required, uses simple pattern matching.

---

For detailed documentation: `docs/AI_SETUP_GUIDE.md`
