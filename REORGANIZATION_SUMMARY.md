# Project Reorganization Summary

**Date**: October 20, 2025

## Overview

The repository now keeps all tracked project assets directly at the root while isolating **developer-only artifacts** in a single ignored folder:

```
Repository root/
├── app/               # Application runtime (backend + frontend)
├── launcher/          # Electron launcher
├── docs/              # Public documentation
├── README.md          # Main project guide
├── REORGANIZATION_SUMMARY.md
└── Developer Files/   # Local-only resources ignored by git
```

- Tracked directories (`app/`, `launcher/`, `docs/`, etc.) now sit directly under the repository root, simplifying relative paths and CI configuration.
- `Developer Files/` continues to hold the local dev workspace (`dev/`), logs, and scratch artifacts that should never leave the machine.

## Detailed Structure

```
app/
├── backend/
└── frontend/

launcher/
├── main.js
├── preload.js
└── package.json

docs/
├── ai/
├── design/
└── updates/

Developer Files/ (ignored)
├── dev/               # Private development workspace
├── logs/              # Local run logs and artifacts
├── server_err.txt
└── server_out.txt
```

## Key Actions

1. **Maintained `Developer Files/`** as the home for all previously ignored assets (`dev/`, `logs/`, `server_*.txt`).
2. **Moved public-facing files to the repository root**, including `app/`, `docs/`, `launcher/`, and the main README.
3. **Updated `.gitignore`** to keep ignoring `Developer Files/` while reflecting root-level data/log paths.
4. **Refreshed documentation** (`README.md`, `app/README.md`, `launcher/README.md`) so instructions reference `<pal-root>` as the repository root.

## Pushed vs Local Files

| Location | Contents | Git Status |
|----------|----------|------------|
| Repository root (tracked) | All source, docs, launchers, READMEs | ✅ Tracked & pushed |
| `Developer Files/` | `dev/`, logs, temp artifacts | 🚫 Ignored locally |

## Update Checklist for Contributors

1. Pull latest changes.
2. Run commands from `<pal-root>` (repository root) when following docs.
3. Keep personal assets inside `Developer Files/`; git will ignore this folder automatically.

## Recommended Git Commands

```powershell
# Stage only public project changes
cd <pal-root>
git add .
git commit -m "Flatten project into root + Developer Files layout"
git push
```

`Developer Files/` stays local, ensuring sensitive or bulky dev artifacts are never pushed to GitHub.
