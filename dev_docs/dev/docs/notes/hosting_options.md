# Hosting Options: Website-Embedded vs Downloadable App

Summary
- Downloadable local app is the default path for privacy and performance.
- Website-embedded version is possible for demo docs but limited by browser sandboxes and model size.

Downloadable App (Pros)
- Full local storage and filesystem access; better privacy controls.
- Can bundle local model/runtime in future for offline use.
- Better performance and richer OS integrations.

Downloadable App (Cons)
- Requires installers and updates per OS (Windows/macOS/Linux).
- Larger downloads; distribution overhead.

Website-Embedded (Pros)
- Instant access; easy to share and update.
- Great for documentation and non-critical demos.

Website-Embedded (Cons)
- Limited access to system resources; persistence and model sizes constrained.
- Reliance on remote API for LLM features; weaker privacy by default.
- Harder to guarantee low latency.

Recommendation
- Use GitHub Pages for the website + docs and a lightweight demo (no sensitive data).
- Distribute the real app as downloads with clear installers and a local-first experience.
