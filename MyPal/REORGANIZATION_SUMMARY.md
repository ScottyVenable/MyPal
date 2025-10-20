# Project Reorganization Summary

**Date**: October 20, 2025

## Overview

The repository now has a two-folder layout that cleanly separates **public project assets** from **developer-only artifacts**:

```
Repository root/
├── MyPal/             # Project folder tracked in git and pushed to GitHub
└── Developer Files/   # Local-only resources ignored by git
```

- `MyPal/` contains the full application (backend, frontend, launcher), public documentation, and project-level README files.
- `Developer Files/` holds the local dev workspace (`dev/`), logs, and scratch artifacts that should never leave the machine.

## Detailed Structure

```
MyPal/
├── app/               # Backend + frontend
├── launcher/          # Electron launcher
├── docs/              # Design docs, plans, roadmaps
├── README.md          # Main project guide
└── REORGANIZATION_SUMMARY.md

Developer Files/ (ignored)
├── dev/               # Private development workspace
├── logs/              # Local run logs and artifacts
├── server_err.txt
└── server_out.txt
```

## Key Actions

1. **Created `Developer Files/`** and moved all previously ignored assets (`dev/`, `logs/`, `server_*.txt`) into it.
2. **Collected all public-facing files inside `MyPal/`**, including `app/`, `docs/`, `launcher/`, and the main README.
3. **Updated `.gitignore`** to ignore the entire `Developer Files/` tree and to reflect the new `MyPal/` paths for generated data.
4. **Refreshed documentation** (`README.md`, `app/README.md`, `launcher/README.md`) so instructions reference the new `<pal-root>` convention.

## Pushed vs Local Files

| Location | Contents | Git Status |
|----------|----------|------------|
| `MyPal/` | All source, docs, launchers, READMEs | ✅ Tracked & pushed |
| `Developer Files/` | `dev/`, logs, temp artifacts | 🚫 Ignored locally |

## Update Checklist for Contributors

1. Pull latest changes.
2. Run commands from within `MyPal/` (or use `<pal-root>` placeholder as documented).
3. Keep personal assets inside `Developer Files/`; git will ignore this folder automatically.

## Recommended Git Commands

```powershell
# Stage only public project changes
cd <repo-root>\MyPal
git add .
git commit -m "Restructure repository into MyPal/ + Developer Files/ layout"
git push
```

`Developer Files/` stays local, ensuring sensitive or bulky dev artifacts are never pushed to GitHub.
