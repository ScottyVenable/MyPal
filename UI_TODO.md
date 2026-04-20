# MyPal AI — UI Improvement Roadmap

Structured list of UI/UX improvements for the MyPal AI mobile application, organized by priority. Based on analysis of current screen implementations and reference designs.

---

## Critical

These must be addressed before any public release.

- [ ] **Add splash screen** with app branding, animated logo, and model loading state *(ref: App launch sequence)*
- [ ] **Implement error boundary screens** for crash recovery with "Retry" / "Report" actions *(ref: all screens)*
- [ ] **Add network connectivity indicator** in the header bar across all screens — show offline badge when the local LM server is unreachable *(ref: ChatScreen header, StatsScreen header)*

---

## High Priority

Core UX improvements that significantly impact daily usage.

- [ ] **Add haptic feedback** on send button press and tab switches for tactile confirmation *(ref: ChatScreen send button, Tab bar)*
- [ ] **Implement pull-to-refresh** on Stats and Brain screens to manually trigger data reload *(ref: StatsScreen stat cards, BrainScreen neural visualization)*
- [ ] **Add message delivery indicators** in chat — show sent/delivered/read status icons on each message bubble *(ref: ChatScreen message list)*
- [ ] **Implement swipe-to-delete** on chat messages with confirmation prompt *(ref: ChatScreen message list)*
- [ ] **Add smooth page transitions** between tabs — cross-fade or slide animation instead of instant swap *(ref: Tab bar navigation)*
- [ ] **Create onboarding flow** for first-time users explaining the AI companion concept, cognitive stages, and how to interact *(ref: App first launch)*

---

## Enhancement

Feature-level improvements that add significant value.

- [ ] **Improve typing animation** — use three dots bouncing (lottie or CSS) instead of simple opacity fade *(ref: ChatScreen typing indicator)*
- [ ] **Implement message reactions** — long-press to pin important messages or add emoji reactions *(ref: ChatScreen message bubbles)*
- [ ] **Add brain region tap-to-zoom** with detailed neuron view showing individual memory nodes *(ref: BrainScreen neural visualization)*
- [ ] **Create animated neural pathway visualization** — show signals traveling along connections when the AI processes input *(ref: BrainScreen neural graph)*
- [ ] **Add particle effects on level-up events** — celebratory visual feedback when the AI evolves to a new cognitive stage *(ref: StatsScreen evolution display)*
- [ ] **Implement dark/light theme toggle** — currently dark only; add system-aware theme switching *(ref: Settings / all screens)*
- [ ] **Add landscape orientation support** for Brain screen to give the neural visualization more room *(ref: BrainScreen neural graph)*
- [ ] **Create memory timeline view** — a chronological browser for the AI's memories with search and filter *(ref: BrainScreen memory section)*
- [ ] **Add voice input support** for chat — microphone button with speech-to-text integration *(ref: ChatScreen input bar)*

---

## Polish

Fine-tuning details that elevate the overall quality and feel.

- [ ] **Refine card shadows** using the purple glow effect from the reference design — soft `#7B2FBE20` outer glow *(ref: StatsScreen stat cards)*
- [ ] **Add subtle gradient overlays on cards** — dark purple (`#1A1A3E`) to transparent top-to-bottom *(ref: StatsScreen stat cards, BrainScreen region cards)*
- [ ] **Implement smooth number animations** on stat counters — count-up effect when values change *(ref: StatsScreen stat values)*
- [ ] **Add loading skeleton screens** instead of blank states — shimmer placeholders matching card layouts *(ref: ChatScreen empty state, StatsScreen loading)*
- [ ] **Refine tab bar** with subtle glow on the active tab indicator — match the purple accent color *(ref: Tab bar active state)*
- [ ] **Add subtle parallax effect** on Brain screen SVG when scrolling for depth perception *(ref: BrainScreen background)*
- [ ] **Implement custom splash/loading animation** — animated brain/neural network forming the MyPal logo *(ref: Splash screen)*
- [ ] **Add micro-interactions on evolution stage transitions** — smooth morph between stage icons with particle trail *(ref: StatsScreen evolution stage)*
- [ ] **Fine-tune spacing and typography scale** for consistency — audit all screens against 4px/8px grid system *(ref: all screens)*
- [ ] **Add subtle background pattern/texture** matching the reference design — faint grid or neural mesh overlay on dark backgrounds *(ref: ChatScreen background, BrainScreen background)*

---

## Screen Reference Key

| Reference Tag | Description |
|---|---|
| `ChatScreen empty state` | Chat tab with no messages — shows welcome prompt |
| `ChatScreen message list` | Chat tab with conversation history |
| `ChatScreen typing indicator` | Animated indicator when AI is generating a response |
| `ChatScreen send button` | Message input area with send action |
| `ChatScreen input bar` | Full input area including text field and action buttons |
| `ChatScreen header` | Top navigation bar on the chat screen |
| `StatsScreen stat cards` | Cards displaying AI cognitive metrics |
| `StatsScreen stat values` | Numeric values within stat cards |
| `StatsScreen evolution display` | Current evolution/cognitive stage visualization |
| `StatsScreen evolution stage` | Stage indicator with progress |
| `StatsScreen loading` | Stats screen during data fetch |
| `BrainScreen neural visualization` | Interactive neural network graph |
| `BrainScreen neural graph` | Full brain visualization area |
| `BrainScreen region cards` | Cards for different brain regions |
| `BrainScreen memory section` | Memory display area within brain tab |
| `BrainScreen background` | Background layer of the brain screen |
| `Tab bar` | Bottom navigation tab bar |
| `Tab bar navigation` | Navigation transitions between tabs |
| `Tab bar active state` | Currently selected tab indicator |
| `App launch sequence` | Startup flow from cold launch |
| `App first launch` | First-time user experience |
| `Splash screen` | Initial loading screen |
| `Settings` | Application settings screen |
