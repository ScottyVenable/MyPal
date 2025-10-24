# MyPal Avalonia Migration - Quick Start Guide

**For feeding to GPT-5-codex to continue UI implementation**

---

## 📦 What to Upload

Upload these **3 files** to GPT-5-codex:

1. **`AVALONIA_MIGRATION_GUIDE.md`** (729 lines)
   - Complete architecture and API reference
   - Feature-by-feature migration plan
   - Backend endpoints and data models
   - Phase breakdown and success criteria

2. **`AVALONIA_DESIGN_SYSTEM.md`** (640+ lines)
   - Complete color palette (navy/purple/cyan theme)
   - Typography system (Inter font, light weights)
   - Component library with XAML examples
   - Animation specifications
   - Glassmorphism card styles
   - Cyberpunk/sci-fi aesthetic guidelines

3. **`AVALONIA_UI_MOCKUPS.md`** (470+ lines)
   - ASCII mockups of every screen
   - Exact pixel measurements and spacing
   - Component placement diagrams
   - Layout responsive behavior
   - Animation timing specifications

---

## 💬 Prompt to Send

```
I need you to implement Phase 2A and 2B from the GPT5_CODEX_PROMPT.md file. Use the three uploaded reference documents for complete specifications:

1. AVALONIA_MIGRATION_GUIDE.md - Architecture and API reference
2. AVALONIA_DESIGN_SYSTEM.md - Visual design system (colors, typography, components)
3. AVALONIA_UI_MOCKUPS.md - Exact layout specifications for each screen

Your task is to build a cyberpunk/sci-fi dashboard aesthetic with:
- Deep navy background (#0a0e27)
- Glassmorphism cards (40% opacity, backdrop blur effect)
- Purple (#7b68ee) and cyan (#00d4ff) neon accents
- Elegant thin typography (Inter font, 100-400 weight)
- Generous spacing (24-32px padding)
- Smooth animations (200-300ms ease-out)

Implementation Priority:
1. Complete ProfileSelectionView.axaml - Glass profile cards (320x200px) with radial purple glow
2. Create AppShellView.axaml - 240px nav rail + content area
3. Create AppShellViewModel.cs - Tab switching logic
4. Create ChatViewModel.cs - Message handling with backend integration
5. Create ChatView.axaml - Bubble messages, input field, typing indicator
6. Add value converters - Message styling (colors, alignment, timestamps)
7. Create placeholder views - StatsView, BrainView, SettingsView (simple "Coming soon" for now)

The backend integration is COMPLETE (BackendClient, BackendProcessManager, DTOs). Do NOT modify any backend code. Focus exclusively on the XAML UI layer with proper MVVM pattern using CommunityToolkit.Mvvm.

Key Design Elements:
- Profile cards: 320x200px with glassmorphism, hover scale 1.02 with purple glow
- Nav rail: 240px wide, icons + labels, selected item gets #7b68ee33 background
- Chat bubbles: User (right, purple gradient), Pal (left, glass card), max 65% width
- Input area: 48px height, purple button on right, focus purple glow
- Typing indicator: 💭 with pulsing animation, #8b92c1 text
- All cards: Border radius 20-24px, 1px #2e3451 border, #1e2139 @ 40% background

Follow the EXACT specifications in AVALONIA_DESIGN_SYSTEM.md for colors, typography, and spacing. Reference AVALONIA_UI_MOCKUPS.md for precise component placement.

Test checklist before completion:
✓ App launches and backend starts automatically
✓ Profile selection shows cards in grid
✓ Can create new profile with name
✓ Can click profile to load and navigate to app shell
✓ Tab navigation works (Chat, Stats, Brain, Settings)
✓ Chat loads last 200 messages
✓ Can send message and receive AI response
✓ Typing indicator shows while waiting
✓ Messages styled correctly (user purple/right, pal glass/left)
✓ Auto-scrolls to bottom on new message

Start with ProfileSelectionView.axaml. Make it pixel-perfect with the cyberpunk aesthetic. Let's build this!
```

---

## 🎨 Design References (Images Provided)

You showed 5 reference images representing the desired aesthetic:

1. **Investigations Dashboard** - Dark navy, circular network graph, glassmorphic panels
2. **Flow Diagram** - 3D visualization, purple/cyan colors, depth through layers
3. **Analytics Dashboard** - Smooth gradient charts, clean spacing, material design
4. **Traffic Control** - Dark blue, stream graphs, circular charts, elegant UI
5. **Dark Analytics Dashboard** - **CLOSEST TO TARGET** - Deep navy/purple, glass cards, neon accents, grid layout

**Key Takeaways from References**:
- Deep navy/black backgrounds (#0a0e27, #12162e)
- Semi-transparent cards with subtle borders (glassmorphism)
- Purple/cyan/pink neon accent colors
- Radial gradient glows on cards
- Large, thin typography
- Generous spacing and breathing room
- Smooth gradient charts with glowing lines
- Circular progress indicators with gradients
- Dashboard grid layouts with consistent card sizes

---

## 📊 Current Project Status

### ✅ Completed (Phase 1)
- .NET 8.0 Avalonia 11.3.6 project setup
- BackendProcessManager (auto-starts Node.js backend)
- BackendClient (HTTP wrapper for all API endpoints)
- 30+ DTO models (ProfileListResponse, ChatResponse, etc.)
- ProfileSelectionViewModel, MainWindowViewModel (partial)

### 🔧 In Progress (Phase 2A + 2B)
- ProfileSelectionView.axaml (needs glassmorphism styling)
- AppShellView.axaml (navigation rail + content area)
- AppShellViewModel.cs (tab switching logic)
- ChatViewModel.cs + ChatView.axaml (full chat interface)
- Value converters for message styling

### ⏸️ Next Session (Phase 2C)
- StatsView with dashboard cards and charts
- BrainView with concept/region lists
- SettingsView with form sections

### ⏸️ Future (Phase 3)
- 3D knowledge graph (SkiaSharp/OpenTK)
- 3D neural network with firing animations
- WebSocket real-time events

---

## 🎯 Success Metrics

**Phase 2A+2B complete when:**
- User can launch Avalonia app
- Backend starts automatically (no manual steps)
- Profile selection shows beautiful glass cards
- Navigation rail works with tab switching
- Chat interface is fully functional (send/receive)
- Typing indicator shows during AI response
- Messages styled correctly with timestamps
- Auto-scrolls to new messages
- Everything follows cyberpunk aesthetic perfectly

**Definition of "Pixel Perfect"**:
- Colors match AVALONIA_DESIGN_SYSTEM.md exactly
- Spacing follows 8px grid (24-32px padding)
- Border radius 20-24px on all cards
- Typography uses Inter font with light weights
- Hover effects include scale 1.02 + glow
- All animations smooth at 60fps

---

## 🚫 Critical Don'ts

**DO NOT**:
- ❌ Modify any backend code (`app/backend/`)
- ❌ Change existing DTOs (`Models/BackendDtos.cs`)
- ❌ Rebuild BackendClient or BackendProcessManager
- ❌ Implement 3D visualizations yet (Phase 3)
- ❌ Add WebSocket support yet (Phase 3)
- ❌ Implement advanced features (single-word mode, mood ring, etc.)
- ❌ Deviate from design system colors/typography
- ❌ Use heavy shadows instead of glows
- ❌ Make navigation rail less than 240px expanded
- ❌ Use bold fonts for headings (use light/thin weights)

**DO**:
- ✅ Follow AVALONIA_DESIGN_SYSTEM.md exactly
- ✅ Reference AVALONIA_UI_MOCKUPS.md for layouts
- ✅ Use CommunityToolkit.Mvvm source generators
- ✅ Implement proper async/await with CancellationToken
- ✅ Add hover effects and animations
- ✅ Test with existing backend (no changes needed)
- ✅ Make glassmorphic cards with 40% opacity
- ✅ Use purple (#7b68ee) and cyan (#00d4ff) accents
- ✅ Implement generous spacing (24-32px)
- ✅ Use thin/light font weights (100-400)

---

## 🔧 Technical Stack Reminder

- **Framework**: Avalonia UI 11.3.6
- **Runtime**: .NET 8.0
- **MVVM**: CommunityToolkit.Mvvm 8.2.1
- **Backend**: Node.js/Express (unchanged, auto-started)
- **Data**: JSON files in `dev-data/profiles/`
- **Fonts**: Inter (Avalonia.Fonts.Inter)
- **Theme**: Custom dark theme (not default Fluent)

---

## 📝 File Structure Reference

```
app/desktop/MyPal.Desktop/
├── App.axaml.cs ✅ (entry point)
├── Program.cs ✅ (main)
├── Models/
│   └── BackendDtos.cs ✅ (30+ models)
├── Services/
│   ├── BackendClient.cs ✅ (HTTP client)
│   └── BackendProcessManager.cs ✅ (Node.js lifecycle)
├── ViewModels/
│   ├── ViewModelBase.cs ✅
│   ├── ProfileSelectionViewModel.cs ✅
│   ├── MainWindowViewModel.cs ✅
│   ├── AppShellViewModel.cs 🔧 (needs creation)
│   └── ChatViewModel.cs 🔧 (needs creation)
└── Views/
    ├── MainWindow.axaml 🔧 (needs content)
    ├── ProfileSelectionView.axaml 🔧 (needs styling)
    ├── AppShellView.axaml ❌ (needs creation)
    ├── ChatView.axaml ❌ (needs creation)
    ├── StatsView.axaml ❌ (placeholder)
    ├── BrainView.axaml ❌ (placeholder)
    └── SettingsView.axaml ❌ (placeholder)
```

---

## 🎬 Expected Deliverables

After GPT-5-codex completes Phase 2A+2B, you should have:

1. **ProfileSelectionView.axaml** - Beautiful glass cards with hover effects
2. **AppShellView.axaml** - Navigation rail with Chat/Stats/Brain/Settings tabs
3. **AppShellViewModel.cs** - Tab switching and navigation logic
4. **ChatViewModel.cs** - Message collection, send command, typing indicator
5. **ChatView.axaml** - Message bubbles, input field, auto-scroll
6. **Value Converters** - MessageBackgroundConverter, MessageAlignmentConverter, TimestampConverter
7. **Placeholder Views** - Simple TextBlock "Coming soon" for Stats/Brain/Settings

**Total Lines of Code**: ~800-1000 lines of XAML + ~400-600 lines of C#

**Estimated Implementation Time**: 5-7 hours of focused work

---

## ⏱️ Token Budget Management

With 200k tokens available:
- **Upload files**: ~60k tokens (3 reference documents)
- **Prompt**: ~2k tokens
- **Available for implementation**: ~138k tokens
- **Expected usage**: 80-120k tokens for Phase 2A+2B

**This should fit comfortably within your 200k budget.**

---

## 🎉 Next Steps

1. Open GPT-5-codex session
2. Upload 3 reference files (AVALONIA_MIGRATION_GUIDE.md, AVALONIA_DESIGN_SYSTEM.md, AVALONIA_UI_MOCKUPS.md)
3. Send the prompt above (copy-paste from "Prompt to Send" section)
4. Let it work through ProfileSelectionView → AppShell → Chat
5. Test the output: `cd app/desktop/MyPal.Desktop && dotnet run`
6. Verify all checklist items pass
7. Commit the working implementation
8. Schedule Phase 2C for Stats/Brain/Settings views

---

**You're ready to go! The foundation is solid, the design is clearly specified, and the scope is realistic. GPT-5-codex has everything it needs to build a beautiful cyberpunk desktop UI for MyPal.** 🚀
