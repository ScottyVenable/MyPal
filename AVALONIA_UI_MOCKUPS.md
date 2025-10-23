# MyPal Avalonia UI Mockups & Layout Specifications

**Visual reference for implementing each screen with exact component placement**

---

## 🎯 Profile Selection Screen

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                          MyPal                              │  ← 64px, thin weight, 2px letter-spacing
│                    Select Your Pal                          │  ← 28px, light weight
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │              │  │              │  │              │     │
│  │   Profile 1  │  │   Profile 2  │  │   Profile 3  │     │  ← Glass cards 320x200px
│  │              │  │              │  │              │     │    Purple radial glow overlay
│  │   Level 5    │  │   Level 12   │  │   Level 3    │     │    Border radius 24px
│  │   450 XP     │  │   2,340 XP   │  │   120 XP     │     │
│  │              │  │              │  │              │     │
│  │ Last played  │  │ Last played  │  │ Last played  │     │
│  │  2 hours ago │  │  5 mins ago  │  │ yesterday    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  ┌──────────────┐                                          │
│  │      +       │  ← "Create New Profile" button          │
│  │  Create New  │     Dashed border, cyan accent           │
│  │   Profile    │     320x200px, hover glow effect        │
│  └──────────────┘                                          │
│                                                             │
│                    [Loading indicator here if fetching]     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

COLORS:
- Background: #0a0e27 (deep navy)
- Profile cards: #1e2139 @ 40% with #2e3451 border
- Card glow: Radial gradient #a78bfa26 at center
- Profile name: #ffffff, 24px
- Level/XP: #b8a4ff (purple tint), 18px / 14px
- Last played: #4a5173 (dim gray), 11px uppercase
- Create button: Dashed #00d4ff border, hover solid with cyan glow

INTERACTIONS:
- Hover card: Scale 1.02, glow #7b68ee66, 200ms
- Click card: Load profile → fade out → navigate to app shell
- Create button: Click → modal dialog for name input
```

---

## 🎯 Main Application Shell

```
┌──────────┬──────────────────────────────────────────────────┐
│          │                                                  │
│  MyPal   │           [Current View Content]                 │  ← Content area fills remaining space
│          │                                                  │
│  ─────   │  Profile: Charlie | Level 5                      │  ← Top status bar
│          │                                                  │
│  💬 Chat │  ┌─────────────────────────────────────────┐    │
│          │  │                                         │    │
│  📊 Stats│  │                                         │    │
│          │  │      Dynamic content based on tab       │    │
│  🧠 Brain│  │                                         │    │
│          │  │                                         │    │
│  ⚙ Set.. │  └─────────────────────────────────────────┘    │
│          │                                                  │
│  ─────   │                                                  │
│          │  Status: Thinking... | Saving...                 │  ← Bottom status message
│  👤 User │                                                  │
│  Profile │                                                  │
│          │                                                  │
└──────────┴──────────────────────────────────────────────────┘
    240px         Remaining width (max 1440px centered)

NAVIGATION RAIL (Left):
- Width: 240px expanded, 60px collapsed
- Background: #12162e
- Border right: 1px #2e3451
- Logo top: "MyPal" 28px, extra-light, 32px top padding
- Nav items: 48px height, 12px radius, 8px spacing
  * Default: Transparent, #d4d7f0 text
  * Hover: #1e213933 background
  * Selected: #7b68ee33 background + 4px left border #7b68ee
- Icons: 24px, #b8a4ff color
- Profile button bottom: 24px padding

CONTENT AREA:
- Max width: 1440px, centered
- Padding: 32px
- Background: Inherits #0a0e27

STATUS BARS:
- Top: Profile name | Level, 48px height, #1e213966 background
- Bottom: Status messages, 40px height, #12162e background
```

---

## 🎯 Chat View (Detailed Layout)

```
┌─────────────────────────────────────────────────────────────┐
│  Chat with Charlie                                          │  ← 32px heading
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ┌───────────────────────────────────────┐           │   │
│  │ │ Hi! How are you today?                │  ←User    │   │  ← Right-aligned
│  │ │ 2:34 PM                                │           │   │    Purple gradient
│  │ └───────────────────────────────────────┘           │   │    Radius 16,16,4,16
│  │                                                      │   │    Max 65% width
│  │           ┌───────────────────────────────────────┐ │   │
│  │   Pal→    │ I'm doing well! Learning new words    │ │   │  ← Left-aligned
│  │           │ every day. 😊                         │ │   │    Glass card style
│  │           │ 2:34 PM                                │ │   │    Radius 16,16,16,4
│  │           └───────────────────────────────────────┘ │   │
│  │                                                      │   │
│  │ ┌───────────────────────────────────────┐           │   │
│  │ │ That's great! Tell me about your day  │  ←User    │   │
│  │ │ 2:35 PM                                │           │   │
│  │ └───────────────────────────────────────┘           │   │
│  │                                                      │   │
│  │           💭 Pal is thinking...           ←Typing   │   │  ← Typing indicator
│  │                                                      │   │    Faded, animated
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┬────────┐      │
│  │ Type your message...                    │  SEND  │      │  ← Input area
│  └─────────────────────────────────────────┴────────┘      │    48px height
└─────────────────────────────────────────────────────────────┘    Purple button

MESSAGE BUBBLES:
User (Right):
- Background: Linear gradient #7b68ee → #6456d4
- Text: #ffffff, 14px, 1.6 line-height
- Timestamp: #ffffffcc, 11px, right-aligned
- Margin: 64px left, 16px bottom
- Border radius: 16px (top-left, top-right, bottom-right), 4px (bottom-left)

Pal (Left):
- Background: #1e2139 @ 40% opacity
- Border: 1px #2e3451
- Text: #d4d7f0, 14px, 1.6 line-height
- Timestamp: #8b92c1, 11px, left-aligned
- Margin: 64px right, 16px bottom
- Border radius: 16px (top-left, top-right, bottom-left), 4px (bottom-right)

TYPING INDICATOR:
- Background: #1e213933
- Text: #8b92c1, italic
- Icon: 💭 with pulse animation
- Height: 40px, padding 12px
- Appears above input, fades in/out

INPUT AREA:
- Height: 48px + 16px padding = 64px total
- TextBox: #1e2139 background, #2e3451 border
- Focus: #7b68ee border with glow
- Button: Purple gradient, 120px width, uppercase text
- Border top: 1px #2e3451 separator
```

---

## 🎯 Stats Dashboard (Grid Layout)

```
┌─────────────────────────────────────────────────────────────┐
│  Statistics                                                 │
│                                                             │
│  ┌────────────────────────────────────────────┐            │
│  │                  Level 5                   │            │  ← Hero card
│  │         ────────────────────                │            │    Full width
│  │        |████████░░░░░░░░░|                 │            │    XP progress
│  │         450 / 600 XP to Level 6             │            │    Height: 120px
│  │      Cognition Points: 127                  │            │
│  └────────────────────────────────────────────┘            │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ VOCABULARY  │  │  MEMORIES   │  │  MESSAGES   │        │  ← Stat cards
│  │             │  │             │  │             │        │    280x180px each
│  │    2,456    │  │     342     │  │    1,847    │        │    Cyan glow
│  │             │  │             │  │             │        │    Monospace numbers
│  │  +12 week   │  │   +8 week   │  │  +45 week   │        │    Green indicator
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   JOURNAL   │  │  CONCEPTS   │  │   NEURONS   │        │
│  │   ENTRIES   │  │             │  │             │        │
│  │     156     │  │     89      │  │    5,432    │        │
│  │             │  │             │  │             │        │
│  │  +3 week    │  │   +1 week   │  │  +234 week  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌────────────────────────────────────────────┐            │
│  │         XP Gain Over Time                  │            │  ← Chart card
│  │  [Smooth area chart with purple gradient] │            │    Full width
│  │                                            │            │    Height: 240px
│  └────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘

HERO CARD (Level/XP):
- Background: #1e2139 @ 40% with radial purple glow
- Border: 1px #2e3451, radius 24px
- Padding: 32px
- Level text: 48px, thin weight, #ffffff
- Progress bar: 8px height, purple gradient fill with glow
- XP text: 16px, #d4d7f0
- CP text: 14px, #b8a4ff

STAT CARDS:
- Size: 280x180px
- Background: #1e2139 @ 40% with radial cyan glow (#00d4ff1a)
- Border: 1px #2e3451, radius 20px
- Padding: 24px
- Label: 11px uppercase, #8b92c1, 1px letter-spacing
- Value: 48px, Consolas/monospace, #66e3ff (cyan)
- Change: 12px, #00ff88 (green) with up arrow icon

CHART CARD:
- Background: #1e2139 @ 40%
- Chart background: Transparent
- Line: Gradient #a78bfa → #7b68ee, 3px width
- Area fill: Gradient 40% → 0% opacity
- Grid: #2e3451 @ 20%
- Points: 8px circles with glow
- Labels: 11px, #8b92c1
```

---

## 🎯 Brain View (Split Pane)

```
┌─────────────────────────────┬───────────────────────────────┐
│  Knowledge Graph            │  Neural Network               │
│                             │                               │
│  Search: [________🔍]       │  🧠 Brain Regions             │
│                             │                               │
│  ┌───────────────────────┐  │  ┌─────────────────────────┐ │
│  │ Concept: Programming  │  │  │ Frontal Cortex          │ │
│  │ Category: Skills      │  │  │ Activity: ████░░ 67%    │ │
│  │ Mentions: 45          │  │  │ Neurons: 1,234          │ │
│  │ Importance: High      │  │  │ Level 3 Development     │ │
│  │ Sentiment: Positive   │  │  └─────────────────────────┘ │
│  └───────────────────────┘  │                               │
│                             │  ┌─────────────────────────┐ │
│  ┌───────────────────────┐  │  │ Hippocampus             │ │
│  │ Concept: Music        │  │  │ Activity: ██████░ 82%   │ │
│  │ Category: Interests   │  │  │ Neurons: 2,847          │ │
│  │ Mentions: 78          │  │  │ Level 5 Development     │ │
│  │ Importance: Medium    │  │  └─────────────────────────┘ │
│  │ Sentiment: Joy        │  │                               │
│  └───────────────────────┘  │  ┌─────────────────────────┐ │
│                             │  │ Temporal Lobe           │ │
│  ┌───────────────────────┐  │  │ Activity: ███░░░░ 43%   │ │
│  │ Concept: Family       │  │  │ Neurons: 956            │ │
│  │ Category: People      │  │  │ Level 2 Development     │ │
│  │ Mentions: 123         │  │  └─────────────────────────┘ │
│  │ Importance: High      │  │                               │
│  │ Sentiment: Love       │  │  [More regions...]           │
│  └───────────────────────┘  │                               │
│                             │                               │
│  [More concepts...]         │  Metrics:                     │
│                             │  Total Neurons: 8,432         │
│                             │  Synapses: 24,567             │
│                             │  Avg Activation: 61%          │
└─────────────────────────────┴───────────────────────────────┘
        50% width                       50% width

CONCEPT CARDS (Left):
- Background: #1e2139 @ 40%
- Border: 1px #2e3451, radius 16px
- Padding: 20px, margin 12px
- Name: 18px, #ffffff
- Category: 13px uppercase, #b8a4ff
- Stats: 14px, #d4d7f0
- Importance badge: Rounded, purple/cyan/pink based on level
- Sentiment: Emoji + text, 12px

REGION CARDS (Right):
- Background: #1e2139 @ 40%
- Border: 1px #2e3451, radius 16px
- Padding: 20px, margin 12px
- Region name: 18px, #ffffff
- Activity bar: Purple gradient, 8px height, rounded
- Stats: 14px, #d4d7f0, monospace for numbers
- Level badge: Cyan accent

SEARCH BAR:
- Height: 40px
- Background: #1e2139
- Border: 1px #2e3451, focus purple glow
- Icon: #8b92c1, right-aligned
- Margin bottom: 24px
```

---

## 🎯 Settings Panel

```
┌─────────────────────────────────────────────────────────────┐
│  Settings                                                   │
│                                                             │
│  ┌────────────────────────────────────────────┐            │
│  │  Profile Information                       │            │
│  │                                            │            │
│  │  Name: Charlie                             │            │  ← Read-only info
│  │  Created: October 15, 2025                 │            │
│  │  Profile ID: 6b831c82ce0ffb14              │            │
│  │                                            │            │
│  └────────────────────────────────────────────┘            │
│                                                             │
│  ┌────────────────────────────────────────────┐            │
│  │  Learning & Experience                     │            │
│  │                                            │            │
│  │  XP Multiplier                             │            │
│  │  [█████████░] 1.5x                         │            │  ← Slider
│  │  (Range: 0.5x - 3.0x)                      │            │
│  │                                            │            │
│  └────────────────────────────────────────────┘            │
│                                                             │
│  ┌────────────────────────────────────────────┐            │
│  │  AI Configuration                          │            │
│  │                                            │            │
│  │  API Provider                              │            │
│  │  ┌──────────────────────────────────────┐  │            │
│  │  │ OpenAI                          ▼    │  │            │  ← Dropdown
│  │  └──────────────────────────────────────┘  │            │
│  │                                            │            │
│  │  API Key: ••••••••••••••••••••abcd         │            │  ← Masked input
│  │                                            │            │
│  └────────────────────────────────────────────┘            │
│                                                             │
│  ┌────────────────────────────────────────────┐            │
│  │  Privacy & Data                            │            │
│  │                                            │            │
│  │  ☑ Enable Telemetry                       │            │  ← Checkboxes
│  │  ☐ Auto-save Conversations                │            │
│  │  ☑ Store Memories Locally                 │            │
│  │                                            │            │
│  └────────────────────────────────────────────┘            │
│                                                             │
│  [────── SAVE CHANGES ──────]  [Cancel]                    │  ← Action buttons
│                                                             │
└─────────────────────────────────────────────────────────────┘

SECTION CARDS:
- Background: #1e2139 @ 40%
- Border: 1px #2e3451, radius 20px
- Padding: 24px, margin bottom 24px
- Section title: 20px, #ffffff, margin bottom 16px

FORM ELEMENTS:
- Labels: 13px uppercase, #8b92c1, margin bottom 8px
- Text inputs: 40px height, #1e2139 background, focus purple glow
- Dropdowns: Same as inputs, chevron icon #b8a4ff
- Sliders: 8px track, purple gradient thumb with glow
- Checkboxes: 20px, purple fill when checked, rounded 4px

BUTTONS:
- Save: Purple gradient, 48px height, full width
- Cancel: Ghost style (transparent, purple border), 48px height
- Spacing: 16px between buttons
```

---

## 🎬 Animation Specifications

### Profile Card Hover
```
Initial: scale(1), boxShadow: Elevation2
Hover: scale(1.02), boxShadow: Elevation3 + purple glow
Duration: 200ms ease-out
```

### Tab Navigation Transition
```
Old view: Fade opacity 1 → 0, translate Y 0 → -20px (200ms)
New view: Fade opacity 0 → 1, translate Y 20px → 0 (300ms, 100ms delay)
Easing: ease-out
```

### Typing Indicator
```
3 dots, staggered animation
Each dot: opacity 0.3 → 1.0 → 0.3 (1200ms loop)
Stagger: 200ms delay between dots
Scale: 0.8 → 1.0 → 0.8 synchronized with opacity
```

### Message Send
```
Input text clears immediately
User message: Slide in from right, fade in (200ms)
Typing indicator: Fade in after 100ms delay
Pal message: Replace typing indicator, slide in from left (200ms)
Auto-scroll: Smooth scroll to bottom (300ms)
```

### Neural Firing (Future Phase 3)
```
Neuron flash: Color #d4d7f0 → #ffffff → #d4d7f0 (420ms)
Scale: 1.0 → 1.35 → 1.0 (420ms)
Glow: boxShadow 0 → maxGlow → 0 (420ms)
Easing: ease-in-out
```

---

## 📱 Responsive Behavior

### Window Sizes

**1280x720 (Minimum)**:
- Nav rail: 240px expanded
- Content: 1040px - 32px padding = 1008px usable
- Stats grid: 2 columns (280px cards + 24px gap)
- Chat max width: 65% = 655px

**1920x1080 (Optimal)**:
- Nav rail: 240px expanded
- Content: 1440px max (centered), 32px padding = 1376px usable
- Stats grid: 3-4 columns depending on card count
- Chat max width: 65% = 895px

**2560x1440 (Ultrawide)**:
- Nav rail: 240px expanded
- Content: 1440px max (centered with side margins)
- Stats grid: 4 columns
- Chat max width: 65% = 895px (same as 1080p for readability)

### Collapsible Navigation
```
> 1280px: Nav rail 240px (labels visible)
< 1280px: Nav rail 60px (icons only, labels on hover)
Toggle: Smooth width transition 300ms ease-out
```

---

## ✅ Implementation Priority

**Phase 2A** (This Session):
1. ✅ ProfileSelectionView - Styled cards with glassmorphism
2. ✅ AppShellView - Navigation rail + content area
3. ✅ AppShellViewModel - Tab switching logic

**Phase 2B** (This Session):
4. ✅ ChatViewModel - Message handling
5. ✅ ChatView - Message bubbles, input, typing indicator

**Phase 2C** (Next Session):
6. ⏸ StatsView - Dashboard with cards and charts
7. ⏸ BrainView - Split pane concept/region lists
8. ⏸ SettingsView - Form with sections

**Phase 3** (Future):
9. ⏸ 3D Knowledge Graph (SkiaSharp/OpenTK)
10. ⏸ 3D Neural Network with firing animations
11. ⏸ WebSocket real-time events

---

**These mockups provide exact pixel-perfect specifications for implementation. Reference AVALONIA_DESIGN_SYSTEM.md for complete color codes, typography, and component styles.**
