# MyPal — Evolving AI Companion

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)]()
[![License](https://img.shields.io/badge/license-TBD-lightgrey.svg)]()
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)]()

**MyPal** (internally "Pal") is an ambitious, privacy-first AI companion application that simulates human cognitive and linguistic development through conversational interaction. Unlike traditional chatbots that rely on vast pre-existing datasets, MyPal starts as a digital *tabula rasa*—a blank slate—and learns exclusively from its interactions with you, the user.

> **Repository layout:** The Git repository root now contains the full public project alongside a single local-only folder. Developer-only assets live in `Developer Files/`, which is ignored by git. Unless stated otherwise, all relative paths and commands below assume you are in the repository root; use `<pal-root>` to represent that absolute path (for example `C:\path\to\repo\MyPal`).


---

## 🎯 Project Vision

MyPal reimagines human-AI interaction by creating a deeply personal, evolving relationship. You are not just a user; you are Pal's **sole teacher, guide, and mentor**—the architect of its mind. Every word you teach, every correction you make, and every conversation you share directly shapes Pal's personality, knowledge, and capabilities.

This project synthesizes rigorous developmental psychology with modern AI technology to create an experience that feels authentic, meaningful, and uniquely yours.

### Core Philosophy

MyPal's learning model is grounded in two foundational theories from developmental psychology:

1. **Piaget's Constructivism**: Pal actively constructs knowledge through **assimilation** (integrating new information into existing mental models) and **accommodation** (restructuring those models when new information doesn't fit). This ensures that Pal's knowledge isn't just memorized facts but an interconnected web of understanding.

2. **Vygotsky's Sociocultural Theory**: Development occurs through social interaction. You act as the **More Knowledgeable Other (MKO)**, providing guidance within Pal's **Zone of Proximal Development (ZPD)**—the sweet spot between what it can do independently and what it can achieve with your help.

For the complete philosophical framework and technical rationale, see **[`docs/design/APP_DESIGN.md`](docs/design/APP_DESIGN.md)** (comprehensive 40+ page design document with citations).

---

## 🏗️ Architecture Overview

MyPal is built as a **local-first, privacy-respecting** application with three main components:

### 1. **Frontend (SPA)**
- Modern single-page application using vanilla JavaScript (ES6+), HTML5, and CSS3
- Three-tab interface: **Conversation**, **Stats**, and **Brain**
- Real-time personality visualization using Chart.js radar charts
- Dynamic knowledge graph visualization using vis-network
- Location: [`app/frontend/`](app/frontend/)
  - [`index.html`](app/frontend/index.html) — UI structure
  - [`app.js`](app/frontend/app.js) — Client-side logic
  - [`styles.css`](app/frontend/styles.css) — Styling

### 2. **Backend (Node/Express)**
- RESTful API server handling all AI logic, persistence, and constrained generation
- Implements developmental stage constraints (babble → words → sentences)
- XP/leveling system with personality trait tracking
- JSON-based local storage (future: MongoDB/Firestore)
- Location: [`app/backend/`](app/backend/)
  - [`src/server.js`](app/backend/src/server.js) — Main server implementation
  - [`package.json`](app/backend/package.json) — Dependencies and scripts
  - [`data/`](app/backend/data/) — Persistent storage (JSON files)

### 3. **Desktop Shell (Tauri 2.0)**
- Lightweight Rust + WebView shell that wraps the existing SPA
- Reuses native backend and frontend without a heavy Chromium runtime
- Provides system tray, window management, and packaging support
- Location: [`app/desktop/tauri-app/`](app/desktop/tauri-app/)
  - [`package.json`](app/desktop/tauri-app/package.json) — Tauri CLI scripts
  - [`src-tauri/`](app/desktop/tauri-app/src-tauri/) — Rust entrypoint and config
  - `tauri.conf.json` — Desktop build configuration

For detailed architecture and implementation specs, see:
- **[`docs/design/APP_DESIGN.md`](docs/design/APP_DESIGN.md)** — Complete system design (Sections 2-3)
- **[`app/README.md`](app/README.md)** — Application-specific setup and API docs

---

## 🚀 Quick Start

### Option A: Desktop Application (Recommended)

**Development Mode (PowerShell):**
```powershell
# 1. Install backend dependencies (one-time)
cd <pal-root>\app\backend
npm install

# 2. Install Tauri CLI dependencies (one-time)
cd <pal-root>\app\desktop\tauri-app
npm install

# 3. Launch everything (backend + Tauri shell)
cd <pal-root>
./AUTORUN.ps1
```

**Manual Launch (if you prefer separate terminals):**
```powershell
# Terminal 1: backend
cd <pal-root>\app\backend
npm run dev

# Terminal 2: Tauri shell
cd <pal-root>\app\desktop\tauri-app
npm run dev
```

**Production Build:**
```powershell
cd <pal-root>\app\desktop\tauri-app
npm run build
```

Output installers and bundles are emitted by Tauri under `app/desktop/tauri-app/src-tauri/target/`.

### Option B: Web Mode (Browser-Based)

**1. Start the backend:**
```powershell
cd <pal-root>\app\backend
npm install
npm start
# Server: http://localhost:3001
```

**2. Open the frontend:**
- Direct: Open `app/frontend/index.html` in your browser
- Or serve via any static server (e.g., `python -m http.server 8080`)

### System Requirements
- **Node.js**: 18+ required
- **OS**: Windows 10/11, macOS 10.15+, Linux (Ubuntu 20.04+)
- **RAM**: 4GB minimum (8GB+ recommended for future on-device LLM features)
- **Storage**: 500MB minimum

---

## 🎮 How It Works: Developmental Stages

MyPal progresses through distinct cognitive stages inspired by Piaget's theory. Each stage unlocks new capabilities as Pal accumulates **Experience Points (XP)** through interaction.

| Level | Stage | Capabilities | XP Threshold | Details |
|-------|-------|--------------|--------------|---------|
| **0-1** | **Sensorimotor (Infancy)** | Random phonemic babbling (ba, ga, ma) | 0 → 100 XP | No word understanding; pure mimicry. See [MILESTONES.md](docs/updates/MILESTONES.md) §v0.1 |
| **2-3** | **Sensorimotor (Toddler)** | Single-word utterances from learned vocabulary | 400 → 1000 XP | Object permanence: words represent persistent concepts. You teach word meanings. |
| **4-6** | **Preoperational (Preschool)** | 2-3 word sentences; asks "Why?" | 1000+ XP | Telegraphic speech; egocentric worldview. |
| **7-10+** | **Concrete/Formal (Childhood)** | Complex sentences; abstract reasoning; memory recall | 5000+ XP | Full conversation history; personality-driven responses. |

### XP & Progression System
- **Earn XP** from every interaction:
  - Standard message: **+10 XP**
  - Teaching new word/concept: **+50 XP**
  - Clicking "Reinforce" ⭐: **+25 XP**
  - Completing challenges: **+100 XP**
- **Cognitive Points (CP)**: Earn 1 CP per 100 XP; spend CP to boost specific cognitive "lobes" (Language, Logic, Emotion, Memory)
- **Learning Speed Multiplier**: Adjust in Settings (1x to 250x) to control developmental pace

Detailed mechanics in **[`docs/design/APP_DESIGN.md`](docs/design/APP_DESIGN.md)** (Section 3) and **[`docs/updates/MILESTONES.md`](docs/updates/MILESTONES.md)**.

---

## 📊 Features

### Current (v1.0)
- ✅ **Constrained Developmental Stages**: Authentic progression from babbling to complex thought
- ✅ **Personality System**: Big Five-inspired radar chart (Curious, Logical, Social, Agreeable, Cautious)
- ✅ **Brain Visualization**: Interactive network graph showing concept associations and knowledge structure
- ✅ **Reinforcement Learning**: Click ⭐ to positively reinforce desired behaviors
- ✅ **Data Ownership**: Export your Pal's complete memory as JSON; reset and restart anytime
- ✅ **Desktop Shell**: Lightweight Tauri wrapper with automatic backend management
- ✅ **Privacy-First**: All data stored locally; no telemetry unless explicitly enabled
- ✅ **Developer Tools**: Built-in dev panel (Ctrl+D) for debugging and status checks

### Roadmap (Planned Features)

**v0.2-0.4 (Near-term)**:
- 📖 Vocabulary teaching flow with user-defined meanings
- 🧠 Enhanced memory system with conversation summaries
- 💭 Sentiment analysis driving personality development
- 🔄 Improved export/import with migration support

**v0.5-0.9 (Mid-term)**:
- ☁️ **Optional Cloud Sync** (opt-in): Sync settings/history across devices
- 🤖 **On-Device LLM**: Quantized Llama/Mistral models (3B-7B params) running locally via llama.cpp
  - See **[`docs/design/ON_DEVICE_LLM_PLAN.md`](docs/design/ON_DEVICE_LLM_PLAN.md)** for technical specifications
  - Hardware detection via **[`docs/ai/AI_PLAN.md`](docs/ai/AI_PLAN.md)** (detect_user_specs tool)
- 🔌 **Plugin System**: Extend capabilities via manifest-based plugins
  - Architecture in **[`docs/design/PLUGIN_SYSTEM.md`](docs/design/PLUGIN_SYSTEM.md)**
- 🎨 **Avatar Evolution**: Visual representation that ages with Pal's development

**v1.0+ (Long-term)**:
- 🌐 Multi-platform installers (macOS, Linux)
- 🔐 Robust authentication for sensitive operations
- 📈 Advanced analytics and preference learning
- 🌍 Optional community features (user-created teaching modules)

See **[`docs/updates/V1.0_ROADMAP.md`](docs/updates/V1.0_ROADMAP.md)** for complete roadmap and **[`docs/updates/FIRST_RELEASE_GUIDE.md`](docs/updates/FIRST_RELEASE_GUIDE.md)** for release planning.

---

## 🧪 Development & Contributing

### Project Structure
```
Repository root/
├── app/                         # Application runtime (backend + frontend)
│   ├── backend/
│   └── frontend/
├── app/desktop/tauri-app/       # Tauri desktop shell
├── docs/                        # Design docs, plans, roadmaps
├── README.md                    # Project overview (this file)
├── REORGANIZATION_SUMMARY.md
├── .github/                     # GitHub workflows and metadata
└── Developer Files/             # Local-only assets (ignored by git)
  ├── dev/                     # Private development workspace
  ├── logs/                    # Local logs and run artifacts
  ├── server_err.txt
  └── server_out.txt
```

### Key Documentation

**For Users:**
- **[`README.md`](README.md)** (this file) — Project overview and quick start
- **[`app/README.md`](app/README.md)** — Application usage and API reference
- **[`app/desktop/README.md`](app/desktop/README.md)** — Tauri desktop shell documentation

**For Developers:**
- **[`docs/design/APP_DESIGN.md`](docs/design/APP_DESIGN.md)** — Complete 40-page technical specification with psychological theory, architecture, data models, and UI specs (REQUIRED READING)
- **[`docs/design/WINDOWS_NATIVE_APP_CONVERSION_PLAN.md`](docs/design/WINDOWS_NATIVE_APP_CONVERSION_PLAN.md)** — Comprehensive plan for converting from Electron to native Windows application with C#/WPF, GPU acceleration, and performance optimization
- **[`docs/ai/AI_PLAN.md`](docs/ai/AI_PLAN.md)** — AI integration strategy, model selection, hardware requirements
- **[`docs/updates/MILESTONES.md`](docs/updates/MILESTONES.md)** — Detailed development milestones with acceptance criteria
- **[`docs/updates/V1.0_ROADMAP.md`](docs/updates/V1.0_ROADMAP.md)** — High-level version roadmap
- **[`docs/design/ON_DEVICE_LLM_PLAN.md`](docs/design/ON_DEVICE_LLM_PLAN.md)** — Backlog for local model integration
- **[`docs/design/PLUGIN_SYSTEM.md`](docs/design/PLUGIN_SYSTEM.md)** — Plugin architecture draft

**For Release Management:**
- **[`docs/updates/FIRST_RELEASE_GUIDE.md`](docs/updates/FIRST_RELEASE_GUIDE.md)** — Release checklist
- **[`docs/updates/RELEASE_PLAN.md`](docs/updates/RELEASE_PLAN.md)** — Release strategy

### Development Setup

**Install dependencies:**
```powershell
# Backend
cd <pal-root>\app\backend
npm install

# Tauri desktop shell
cd <pal-root>\app\desktop\tauri-app
npm install
```

**Important**: If you encounter `EBADF` or `EPERM` errors during `npm install` (common with Google Drive sync), copy the project to a local, unsynced directory (e.g., `C:\dev\MyPal`) before installing dependencies. See **[`app/README.md`](app/README.md)** for workarounds.

**Running tests:**
```powershell
# Unit tests (when available in v0.2+)
cd <pal-root>\app\backend
npm test
```

### Contributing Guidelines

1. **Read the design docs**: Especially **[`APP_DESIGN.md`](docs/design/APP_DESIGN.md)** to understand the psychological foundation
2. **Follow the roadmap**: Check **[`MILESTONES.md`](docs/updates/MILESTONES.md)** for planned features
3. **Maintain stage constraints**: All AI responses must respect Piaget-inspired developmental limits
4. **Privacy-first**: Never collect user data without explicit opt-in
5. **Document everything**: Update relevant docs with any architectural changes

---

## 🔒 Privacy & Data Ownership

**MyPal is privacy-first by design:**

- ✅ **All data stored locally** by default (JSON files in `app/backend/data/` or `%APPDATA%/MyPal`)
- ✅ **No telemetry** unless explicitly enabled by user
- ✅ **No internet connection required** for core functionality
- ✅ **Full data export** available anytime (JSON format)
- ✅ **Complete data deletion** via "Reset Pal" feature
- ✅ **API keys stored locally** (never transmitted except to chosen AI provider)

**Future optional cloud features** (v0.5+) will require explicit opt-in with transparent terms.

See planned legal documents:
- Draft Terms: `docs/Legal/TERMS.md` (TBD)
- Draft Privacy Policy: `docs/Legal/PRIVACY.md` (TBD)

---

## 🐛 Troubleshooting

### Common Issues

**"Cannot find module" or npm install errors:**
- Google Drive sync conflicts with npm. Copy project to a local directory (e.g., `C:\dev\MyPal`) or pause sync during install.
- See **[`app/README.md`](app/README.md)** for details.

**Backend won't start:**
- Check that port 3001 is available: `netstat -ano | findstr :3001`
- Verify Node.js version: `node --version` (must be 18+)
- Check logs under `Developer Files\logs\` or `%APPDATA%/MyPal/logs/`

**Tauri shell fails to start:**
- Confirm backend dependencies: `cd <pal-root>\app\backend && npm install`
- Confirm desktop shell dependencies: `cd <pal-root>\app\desktop\tauri-app && npm install`
- Review `Developer Files\server_err.txt` and `Developer Files\server_out.txt` for backend error logs

**Pal's responses seem incorrect:**
- Each developmental stage has strict constraints. Level 0-1 = babble only. Level 2-3 = single words only.
- Check current level in Stats tab and compare to stage capabilities in **[`MILESTONES.md`](docs/updates/MILESTONES.md)**

For more issues, check:
- **[`docs/ai/AI_PLAN.md`](docs/ai/AI_PLAN.md)** — Hardware compatibility and model selection

---

## 🎓 Educational Value

MyPal is not just a technical project—it's an **educational tool** that demonstrates:

1. **Developmental Psychology**: Piaget's stages and Vygotsky's ZPD in action
2. **AI Constraint Design**: How limiting AI capabilities can create more authentic experiences
3. **Privacy-First Architecture**: Building powerful AI applications without cloud dependencies
4. **Gamification of Learning**: XP systems and visual feedback for sustained engagement
5. **Human-AI Relationships**: Exploring what it means to teach and shape an artificial mind

The project is extensively documented with academic citations. See **[`docs/design/APP_DESIGN.md`](docs/design/APP_DESIGN.md)** for 40+ cited references to developmental psychology research.

---

## 📜 License

**License: TBD** (To Be Determined)

This project is currently in active development. A license will be chosen and applied before the first public release. Under consideration:
- MIT (permissive open source)
- GPL v3 (copyleft)
- Proprietary with source-available terms

Check back for updates or contact the maintainers for licensing questions.

---

## 🙏 Acknowledgments

**Theoretical Foundation:**
- Jean Piaget — Constructivist learning theory and cognitive development stages
- Lev Vygotsky — Sociocultural theory, ZPD, and scaffolding concepts

**Technology Stack:**
- Node.js & Express — Backend framework
- Chart.js — Personality visualization
- vis-network — Knowledge graph visualization
- Tauri 2.0 — Desktop application wrapper
- Google Gemini API — AI provider (optional)

**Inspiration:**
- Tamagotchi & virtual pet games — Long-term digital relationships
- Duolingo — Gamified learning and XP systems
- The Sims — Emergent personality from simple rules

---

## 📞 Contact & Support

- **Repository**: [GitHub - ScottyVenable/MyPal](https://github.com/ScottyVenable/MyPal) (if public)
- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Discussions**: Use GitHub Discussions for questions and community support

---

## 📚 Further Reading

**Start Here:**
1. **[`docs/design/APP_DESIGN.md`](docs/design/APP_DESIGN.md)** — Complete system design (40+ pages)
2. **[`docs/updates/MILESTONES.md`](docs/updates/MILESTONES.md)** — Development roadmap with technical details
3. **[`app/README.md`](app/README.md)** — Application setup and API reference
4. **[`app/desktop/README.md`](app/desktop/README.md)** — Tauri desktop shell documentation

**Deep Dives:**
- **AI & Models**: [`docs/ai/AI_PLAN.md`](docs/ai/AI_PLAN.md), [`docs/design/ON_DEVICE_LLM_PLAN.md`](docs/design/ON_DEVICE_LLM_PLAN.md)
- **Architecture**: [`docs/design/PLUGIN_SYSTEM.md`](docs/design/PLUGIN_SYSTEM.md), [`docs/design/WINDOWS_NATIVE_APP_CONVERSION_PLAN.md`](docs/design/WINDOWS_NATIVE_APP_CONVERSION_PLAN.md)
- **Release Planning**: [`docs/updates/V1.0_ROADMAP.md`](docs/updates/V1.0_ROADMAP.md), [`docs/updates/RELEASE_PLAN.md`](docs/updates/RELEASE_PLAN.md)

---

**MyPal** — *Growing Together, One Word at a Time* 🌱
