# Prompt for GPT-5-codex: MyPal Avalonia UI Implementation

## Critical References (Upload ALL 3 Files)
1. **`AVALONIA_MIGRATION_GUIDE.md`** - Complete architecture, API reference, migration roadmap
2. **`AVALONIA_DESIGN_SYSTEM.md`** - UI design specifications (colors, typography, components) - **FOLLOW EXACTLY**
3. **`AVALONIA_UI_MOCKUPS.md`** - Pixel-perfect layout mockups for each screen with ASCII diagrams

## Context
You are continuing work on migrating MyPal from an HTML/Electron frontend to a native Avalonia UI desktop application. The backend integration layer is **already complete** (BackendProcessManager, BackendClient, DTOs). Your task is to implement the **user interface layer** (XAML views and ViewModels) with a **cyberpunk/sci-fi dashboard aesthetic** featuring glassmorphism, neon accents, and elegant typography.

## What Already Exists

In `app/desktop/MyPal.Desktop/`:
- ✅ `.csproj` with all necessary packages (Avalonia 11.3.6, CommunityToolkit.Mvvm)
- ✅ `Services/BackendProcessManager.cs` - Auto-starts Node.js backend
- ✅ `Services/BackendClient.cs` - HTTP client with all API endpoints
- ✅ `Models/BackendDtos.cs` - 30+ data models matching backend JSON
- ✅ `ViewModels/ProfileSelectionViewModel.cs` - Profile selection logic
- ✅ `ViewModels/MainWindowViewModel.cs` - App shell coordinator
- ✅ Partial `Views/MainWindow.axaml` - Window chrome (needs content)

**The Node.js backend at `app/backend/` remains unchanged and fully functional.**

## Your Mission: Complete Phase 2A + 2B

### Phase 2A: Core UI Shell (Priority 1)
Build the navigation structure and tab system:

1. **Complete `Views/ProfileSelectionView.axaml`**:
   - Material Design 3 styled profile cards
   - Display: Profile name, level, XP, last played date, message count
   - "Create New Profile" button with + icon
   - Loading indicator while fetching profiles
   - Error state if backend unavailable
   - Click profile card → loads profile and navigates to app shell

2. **Create `Views/AppShellView.axaml`**:
   - Left navigation rail (60px wide, vertical icon + label tabs)
   - Tabs: Chat, Stats, Brain, Settings
   - Main content area that swaps views based on selected tab
   - Top status bar showing profile name + level
   - Bottom status message area (e.g., "Thinking...", "Saving...")

3. **Create `ViewModels/AppShellViewModel.cs`**:
   - Properties: `ProfileMetadata Profile`, `ViewModelBase CurrentView`, `string StatusMessage`
   - Commands: `SelectTabCommand(string tabName)`, `LogoutCommand`
   - Tab switching logic to instantiate ChatViewModel, StatsViewModel, etc.
   - Status message updates (pass callback from MainWindowViewModel)

4. **Create placeholder views** (simple TextBlock with "Coming soon" for now):
   - `Views/StatsView.axaml`
   - `Views/BrainView.axaml`
   - `Views/SettingsView.axaml`

### Phase 2B: Chat Interface (Priority 2)
Implement fully functional chat:

1. **Create `ViewModels/ChatViewModel.cs`**:
   ```csharp
   public partial class ChatViewModel : ViewModelBase
   {
       private readonly BackendClient _backendClient;
       
       [ObservableProperty]
       private ObservableCollection<ChatMessage> _messages = new();
       
       [ObservableProperty]
       private string _inputText = string.Empty;
       
       [ObservableProperty]
       private bool _isTyping;
       
       [RelayCommand]
       private async Task SendMessageAsync(CancellationToken ct)
       {
           if (string.IsNullOrWhiteSpace(InputText)) return;
           
           var userMessage = InputText;
           InputText = string.Empty;
           
           // Add user message to UI immediately
           Messages.Add(new ChatMessage { Role = "user", Text = userMessage, Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() });
           
           IsTyping = true;
           var response = await _backendClient.SendChatAsync(userMessage, ct);
           IsTyping = false;
           
           if (response is not null)
           {
               Messages.Add(new ChatMessage { Role = "assistant", Text = response.Reply, Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() });
           }
       }
       
       public async Task InitializeAsync(CancellationToken ct)
       {
           var chatLog = await _backendClient.GetChatLogAsync(limit: 200, ct);
           if (chatLog?.Messages is not null)
           {
               Messages = new ObservableCollection<ChatMessage>(chatLog.Messages);
           }
       }
   }
   ```

2. **Create `Views/ChatView.axaml`**:
   ```xml
   <UserControl xmlns="https://github.com/avaloniaui"
                xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
                xmlns:vm="using:MyPal.Desktop.ViewModels"
                x:DataType="vm:ChatViewModel"
                x:Class="MyPal.Desktop.Views.ChatView">
     <DockPanel>
       <!-- Bottom: Input area -->
       <Border DockPanel.Dock="Bottom" Padding="16" BorderThickness="0,1,0,0" BorderBrush="#333">
         <Grid ColumnDefinitions="*,Auto">
           <TextBox Grid.Column="0" 
                    Text="{Binding InputText}" 
                    Watermark="Type your message..."
                    AcceptsReturn="False"
                    VerticalAlignment="Center"
                    Margin="0,0,8,0" />
           <Button Grid.Column="1" 
                   Content="Send" 
                   Command="{Binding SendMessageCommand}"
                   IsDefault="True" />
         </Grid>
       </Border>
       
       <!-- Typing indicator (show when IsTyping is true) -->
       <Border DockPanel.Dock="Bottom" 
               Padding="16,8" 
               IsVisible="{Binding IsTyping}"
               Background="#1a1a1a">
         <StackPanel Orientation="Horizontal" Spacing="8">
           <TextBlock Text="💭" FontSize="16" />
           <TextBlock Text="Pal is thinking..." FontStyle="Italic" Opacity="0.7" />
         </StackPanel>
       </Border>
       
       <!-- Main: Scrollable message list -->
       <ScrollViewer>
         <ItemsControl ItemsSource="{Binding Messages}" Padding="16">
           <ItemsControl.ItemTemplate>
             <DataTemplate>
               <Border Margin="0,0,0,16" 
                       Padding="12"
                       CornerRadius="8"
                       Background="{Binding Role, Converter={StaticResource MessageBackgroundConverter}}"
                       HorizontalAlignment="{Binding Role, Converter={StaticResource MessageAlignmentConverter}}">
                 <StackPanel Spacing="4">
                   <TextBlock Text="{Binding Text}" TextWrapping="Wrap" />
                   <TextBlock Text="{Binding Timestamp, Converter={StaticResource TimestampConverter}}" 
                              FontSize="11" 
                              Opacity="0.6" />
                 </StackPanel>
               </Border>
             </DataTemplate>
           </ItemsControl.ItemTemplate>
         </ItemsControl>
       </ScrollViewer>
     </DockPanel>
   </UserControl>
   ```

3. **Add value converters** for message styling:
   - `MessageBackgroundConverter`: User messages = blue, assistant = gray
   - `MessageAlignmentConverter`: User messages = right, assistant = left
   - `TimestampConverter`: Unix timestamp → human-readable time

4. **Wire up auto-scroll**: Use `ScrollViewer` attached property or code-behind to scroll to bottom when new message added

### Critical Requirements

1. **Use existing services** - Don't recreate BackendClient or BackendProcessManager
2. **Follow MVVM strictly** - No business logic in code-behind
3. **Use CommunityToolkit.Mvvm** - `[ObservableProperty]` and `[RelayCommand]` source generators
4. **Material Design 3** - Use Fluent theme colors, proper spacing (8px grid)
5. **Dark theme** - Background #1a1a1a, text #ffffff, accent #7b68ee (purple)
6. **Error handling** - Show user-friendly messages if backend fails
7. **Responsive** - Support 1280x720 minimum, optimize for 1920x1080
8. **Async/await** - All backend calls must be async with CancellationToken
9. **Null safety** - Enable nullable reference types, handle null responses

### Design Guidelines (CRITICAL - Follow Exactly)

**REFERENCE: `AVALONIA_DESIGN_SYSTEM.md` contains complete specifications**

**Colors** (Cyberpunk/Sci-Fi Aesthetic):
- Background: `#0a0e27` (deep space navy) or `#12162e` (dark navy)
- Glass Cards: `#1e2139` @ 40% opacity + 1px `#2e3451` border
- Primary Accent: `#7b68ee` (purple) with gradients to `#a78bfa` (light purple)
- Secondary Accent: `#00d4ff` (cyan) for data/stats
- Alert Accent: `#ff006e` (pink) for critical items
- Text Primary: `#ffffff` (pure white for headings)
- Text Body: `#d4d7f0` (off-white)
- Text Labels: `#8b92c1` (muted purple-gray)
- Glow Effects: `0 8 32 rgba(123, 104, 238, 0.3)` (purple glow)

**Typography** (Elegant & Futuristic):
- Font: Inter (light/thin weights: 100-400)
- Headings: 24-32px, 300 weight, 1px letter-spacing
- Body: 14-16px, 400 weight, 1.6 line-height
- Labels: 11-13px, 500 weight, UPPERCASE, 1px letter-spacing
- Data/Stats: Consolas/JetBrains Mono, 24-48px for large numbers

**Spacing** (Generous Breathing Room):
- Base grid: 8px
- Card padding: 24-32px (spacious)
- Card border radius: 20-24px (large, smooth)
- Section margins: 32-48px
- Component gaps: 16-24px
- Glass card borders: 1-2px

**Layout** (Dashboard Style):
- Navigation rail: 240px expanded (with labels), collapsible to 60px
- Content max: 1440px for ultrawide
- Chat messages: 65% width max
- Profile cards: 320x200px
- Stat cards: 280x180px with radial gradient overlays

**Animations**:
- Hover: Scale 1.02, glow intensify, 200ms ease-out
- Focus: Purple border glow (`#7b68ee`)
- Transitions: 300ms ease-out for page changes
- All animations 60fps smooth

### Testing Checklist

Before considering Phase 2A/2B complete, verify:
- [ ] App launches without errors
- [ ] Backend starts automatically (check logs)
- [ ] Profile selection screen shows existing profiles
- [ ] Can create new profile with valid name
- [ ] Can click profile to load and navigate to app shell
- [ ] Tab navigation works (Chat, Stats, Brain, Settings)
- [ ] Chat view loads last 200 messages on init
- [ ] Can type message and click Send
- [ ] User message appears immediately in chat
- [ ] "Pal is thinking..." shows while waiting for response
- [ ] AI response appears after backend replies
- [ ] Auto-scrolls to bottom on new messages
- [ ] Messages styled correctly (user right/blue, assistant left/gray)
- [ ] Timestamps formatted as human-readable
- [ ] Window can be resized and content reflows properly

### Implementation Order

1. Fix `MainWindow.axaml` to host `MainWindowViewModel.CurrentViewModel` (ContentControl with binding)
2. Complete `ProfileSelectionView.axaml` + wire up to existing `ProfileSelectionViewModel`
3. Create `AppShellView.axaml` + `AppShellViewModel.cs` with tab switching
4. Create `ChatViewModel.cs` with backend integration
5. Create `ChatView.axaml` with message list + input
6. Add value converters for styling
7. Create placeholder views for Stats, Brain, Settings
8. Test end-to-end flow: Launch → Select Profile → Chat → Send Message

### Code Style

```csharp
// Use file-scoped namespaces
namespace MyPal.Desktop.ViewModels;

// Use primary constructors for dependency injection
public partial class ChatViewModel(BackendClient backendClient) : ViewModelBase
{
    private readonly BackendClient _backendClient = backendClient;
    
    // Use source generators
    [ObservableProperty]
    private string _inputText = string.Empty;
    
    // Async commands with cancellation
    [RelayCommand]
    private async Task SendMessageAsync(CancellationToken ct)
    {
        // Implementation
    }
}
```

### Expected Deliverables

At the end of this session, I should have:
1. ✅ Working profile selection screen (styled cards, create/load profiles)
2. ✅ App shell with tab navigation (Chat, Stats, Brain, Settings)
3. ✅ Fully functional chat interface (send/receive messages)
4. ✅ Placeholder views for other tabs
5. ✅ Clean, maintainable MVVM code
6. ✅ Material Design 3 styling throughout
7. ✅ Zero backend changes (Node.js server untouched)

### What NOT to Do

- ❌ Don't modify backend code (`app/backend/`)
- ❌ Don't change existing DTO models (`Models/BackendDtos.cs`)
- ❌ Don't rebuild BackendClient or BackendProcessManager
- ❌ Don't implement 3D visualizations yet (Phase 3)
- ❌ Don't add WebSocket support yet (Phase 3)
- ❌ Don't implement advanced features (single-word mode, mood ring, etc.)
- ❌ Don't create separate stats/brain implementations yet (placeholders only)

Focus exclusively on **profile selection, navigation shell, and chat interface**. Quality over quantity - make these three features polished and functional before moving to Phase 2C.

---

## Additional Context

- **Backend runs on**: `http://localhost:3001`
- **Health endpoint**: `GET /api/health` (returns 200 OK when ready)
- **Profiles endpoint**: `GET /api/profiles` (returns list of profiles)
- **Chat endpoint**: `POST /api/chat` with body `{ "message": "user text" }`
- **Data storage**: JSON files in `dev-data/profiles/[profile-id]/`

The BackendProcessManager automatically:
1. Checks if backend is already running (health check)
2. Starts `node src/server.js` in `app/backend/` if not running
3. Polls health endpoint until responsive (30s timeout)
4. Kills backend process on app shutdown

You can test backend manually:
```bash
cd app/backend
npm start
# Visit http://localhost:3001/api/health
```

---

## Success Criteria

Phase 2A/2B is complete when a user can:
1. Launch the Avalonia app
2. See their existing profiles in a grid
3. Click a profile to load it
4. Navigate between Chat, Stats, Brain, Settings tabs
5. Send a chat message and receive an AI response
6. See the full conversation history

Everything else (stats dashboard, brain visualization, settings panel) will be implemented in Phase 2C (next session).

**Let's build this! Focus on clean, maintainable code that follows Avalonia best practices. The foundation is already solid - now we need the UI layer.**
