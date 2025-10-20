# Pal (MyPal) Development Milestones

This roadmap translates the App Design Document into concrete deliverables. Each milestone has scope, acceptance criteria, and test notes. Dates are placeholders; adjust as you plan.

## v0.1 "Infancy" (this PR)
- Scope
  - Local dev scaffold: frontend SPA + Node/Express backend.
  - Stage 0–1 behavior: babble-only constraints with JSON schema-like validation.
  - In-memory/JSON file persistence (simple NoSQL-ish collections).
  - XP system, CP derivation (1 CP / 100 XP), level thresholds for 0–3.
  - Endpoints: /api/chat, /api/reinforce, /api/stats, /api/settings, /api/reset, /api/export.
  - Stats: Big Five-inspired radar (Chart.js) fed by simple heuristics.
  - Brain tab: network graph placeholder (vis.js) with mock associations.
- Acceptance
  - Start server, open UI, send message; Pal replies with constrained babble/word.
  - XP increments; reinforce boosts XP; stats update; export returns JSON.
  - Reset clears memory and resets to level 0.

## v0.2 "Toddler"
- Stage 2–3 single-word output from known vocabulary list.
- Teach word flow (prompt, store user definition, associate context).
- Improve reinforcement: concept valence/strength.
- Persist to a proper local db (lowdb or nedb) to simplify concurrency.

## v0.3 "Preschool"
- Two- to three-word telegraphic speech with S-V-O schema check.
- Egocentric persona prompt; occasional "Why?" questions.
- Brain graph: dynamic edges with strength/opacity; lobe coloring.

## v0.4 "Childhood"
- Remove rigid schema; include summarized conversation history.
- Memories collection with summaries and sentiment tags.
- Personality metrics refined.

## v0.5 "Cloud Memory"
- Migrate persistence to MongoDB or Firestore, with per-user isolation.
- Auth (simple email/pass or OAuth).

## v0.6+ Enhancements
- CP spendable boosts by lobe (temporary multipliers).
- Avatar evolution visuals.
- Rate limiting and abuse prevention.

## Leveling & XP (initial thresholds)
- Level 0 -> 1: 100 XP
- Level 1 -> 2: 300 XP (total 400)
- Level 2 -> 3: 600 XP (total 1000)

Note: A global Learning Speed Multiplier applies to all XP; stored in settings.

## Data model (JSON file store)
- vocabulary.json: [{ _id, word, part_of_speech, user_definition, context_learned, associations: [conceptId] }]
- concepts.json: [{ _id, idea, linked_words: [wordId], valence, strength }]
- facts.json: [{ _id, fact_statement, source: "User", confidence_level }]
- memories.json: [{ _id, timestamp, summary, transcript_snippet, concepts_formed: [conceptId], emotional_tone }]
- state.json: { level, xp, cp, settings: { xpMultiplier }, personality: { curious, logical, social, agreeable, cautious } }

## Testing notes
- Manual: send 5–10 messages; ensure XP and radar change; export/import sanity.
- Unit-lite: pure functions for xp/level, persona constraints have tests in later versions.
