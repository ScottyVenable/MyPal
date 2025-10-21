# Brain Tab Overview

The **Brain** tab visualizes how Pal internalizes conversations and forms lightweight memories. It couples a co-occurrence graph with a rolling memory journal so you can track how the companion is learning at a glance.

---

## Graph Panel
- **Nodes** represent the most frequent words and concepts heard recently. Node size increases with usage frequency.
- **Links** connect words that tend to appear in the same messages, indicating conceptual proximity.
- **Color & Highlighting** help you spot fresh interactions—recently updated nodes stand out when selected.
- Use the **Refresh Graph** button to rebuild the visualization from the latest chat history and memory data.

### Reading the Summary
The toolbar displays counts for:
1. **Nodes** – active vocabulary terms in the graph.
2. **Links** – relationships between the terms.
3. **Memories** – total memories Pal has recorded.

---

## Insights Sidebar
The right-hand column supplements the visual graph with explanatory context:
- **How to read this graph** gives quick tips so new users understand what the visualization conveys.
- The **Recent Memories** list shows Pal's latest impressions, including:
  - Timestamp of the interaction
  - Detected sentiment (positive, neutral, or negative)
  - User and Pal utterances captured in the memory
  - Extracted keywords for quick scanning

---

## Behind the Scenes
1. Every time you chat, the backend tokenizes user and Pal messages, learning vocabulary frequency and co-occurrence.
2. The same interaction is stored as a structured memory with basic sentiment analysis and keyword extraction.
3. The graph aggregates up to the latest 300 chat turns, while the memory log keeps a rolling window (max 500 entries).

These artifacts are saved locally under `app/backend/data/` (or the development mirrors `dev-data/` created by `autorun.ps1`).

---

## Why It Matters
- **Transparency**: See exactly what the system is prioritizing as it learns.
- **Debugging**: Quickly inspect whether new vocabulary or concepts “stick.”
- **Design**: Provides a foundation for future features like memory search, reinforcement, or concept editing.

As the companion matures, this tab will expand with richer analytics (timeline filters, clustering, and manual memory management). For now, it captures the early learning loop in a digestible format.
