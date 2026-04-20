# MyPal Avalonia Design System
**Visual Language for Desktop Application UI**

*Based on cyberpunk/sci-fi dashboard aesthetic with glassmorphism and neon accents*

---

## 🎨 Color Palette

### Primary Colors (Navy/Purple Base)
```
Background Deep:      #0a0e27  (Deep space navy)
Background Primary:   #12162e  (Dark navy)
Background Secondary: #1a1f3a  (Navy blue)
Background Tertiary:  #1e2139  (Lighter navy for cards)
```

### Surface Colors (Glassmorphism)
```
Glass Card:           #1e2139 @ 40% opacity + blur(20px)
Glass Card Hover:     #252a47 @ 50% opacity + blur(24px)
Glass Border:         #2e3451 @ 80% opacity (1-2px)
Glass Border Glow:    #7b68ee @ 20% opacity (on hover/active)
```

### Accent Colors
```
Primary Purple:       #7b68ee  (Medium purple - main brand)
Primary Purple Light: #a78bfa  (Light purple - gradients)
Primary Purple Dark:  #6456d4  (Dark purple - pressed states)

Secondary Cyan:       #00d4ff  (Bright cyan - info/data)
Secondary Cyan Light: #3dd9eb  (Turquoise - highlights)
Secondary Cyan Dark:  #0099cc  (Deep cyan - shadows)

Tertiary Pink:        #ff006e  (Hot pink - alerts/critical)
Tertiary Pink Light:  #ff3d8f  (Light pink - warnings)
Tertiary Orange:      #ff6b35  (Orange - notifications)

Success Green:        #00ff88  (Neon green - success states)
Warning Amber:        #ffb627  (Amber - caution)
Error Red:            #ff3366  (Red - errors)
```

### Text Colors
```
Text Primary:         #ffffff  (Pure white - headings, important)
Text Secondary:       #d4d7f0  (Off-white - body text)
Text Tertiary:        #8b92c1  (Muted purple-gray - labels)
Text Disabled:        #4a5173  (Dim gray - disabled)
Text Accent Purple:   #b8a4ff  (Purple tint - links, highlights)
Text Accent Cyan:     #66e3ff  (Cyan tint - data values)
```

### Gradients
```
Purple Radial:        radial-gradient(circle, #a78bfa 0%, #7b68ee 50%, #6456d4 100%)
Cyan Radial:          radial-gradient(circle, #3dd9eb 0%, #00d4ff 50%, #0099cc 100%)
Aurora Blend:         linear-gradient(135deg, #7b68ee 0%, #3dd9eb 50%, #ff006e 100%)
Card Glow:            radial-gradient(ellipse at top, rgba(123,104,238,0.15), transparent 60%)
```

### Shadow & Glow Effects
```
Purple Glow:          0 8px 32px rgba(123, 104, 238, 0.3)
Cyan Glow:            0 8px 32px rgba(0, 212, 255, 0.25)
Pink Glow:            0 8px 32px rgba(255, 0, 110, 0.3)
Card Shadow:          0 16px 48px rgba(10, 14, 39, 0.6)
Elevation 1:          0 4px 16px rgba(10, 14, 39, 0.4)
Elevation 2:          0 8px 24px rgba(10, 14, 39, 0.5)
Elevation 3:          0 16px 48px rgba(10, 14, 39, 0.7)
```

---

## 📐 Typography System

### Font Families
```
Primary:     Inter (Avalonia.Fonts.Inter)
Monospace:   JetBrains Mono or Consolas (for stats/data)
Fallback:    -apple-system, Segoe UI, sans-serif
```

### Type Scale

#### Display (Hero Text)
```
Display Large:   64px / 100-200 weight / 1.1 line-height / 0.5px letter-spacing
Display Medium:  56px / 100-200 weight / 1.15 line-height / 0.5px letter-spacing
Display Small:   48px / 200-300 weight / 1.2 line-height / 0.4px letter-spacing
```

#### Headings
```
H1:  32px / 300 weight / 1.3 line-height / 1px letter-spacing
H2:  28px / 300 weight / 1.35 line-height / 0.8px letter-spacing
H3:  24px / 400 weight / 1.4 line-height / 0.6px letter-spacing
H4:  20px / 400 weight / 1.45 line-height / 0.4px letter-spacing
H5:  18px / 500 weight / 1.5 line-height / 0.2px letter-spacing
```

#### Body Text
```
Body Large:   16px / 400 weight / 1.6 line-height / 0px letter-spacing
Body Medium:  14px / 400 weight / 1.6 line-height / 0px letter-spacing
Body Small:   13px / 400 weight / 1.5 line-height / 0px letter-spacing
```

#### Labels & Captions
```
Label Large:  14px / 500 weight / 1.4 line-height / 0.5px letter-spacing / UPPERCASE
Label Medium: 13px / 500 weight / 1.4 line-height / 0.5px letter-spacing / UPPERCASE
Label Small:  11px / 400 weight / 1.3 line-height / 1px letter-spacing / UPPERCASE
Caption:      12px / 300 weight / 1.4 line-height / 0.2px letter-spacing
```

#### Data/Stats (Monospace)
```
Data Large:   32px / 400 weight / Monospace / 1.2 line-height
Data Medium:  24px / 400 weight / Monospace / 1.3 line-height
Data Small:   16px / 400 weight / Monospace / 1.4 line-height
```

---

## 🏗️ Component Library

### 1. Glass Cards
```xml
<Border Background="#1e213966"  <!-- 40% opacity -->
        BorderBrush="#2e3451"
        BorderThickness="1"
        CornerRadius="20"
        Padding="24"
        BoxShadow="0 16 48 #0a0e2799"> <!-- Card shadow -->
    <Border.Effect>
        <BlurEffect Radius="20" />  <!-- Backdrop blur simulation -->
    </Border.Effect>
    <!-- Card content -->
</Border>
```

**States**:
- **Default**: 40% opacity, subtle border
- **Hover**: 50% opacity, purple glow border, scale 1.02
- **Active/Selected**: 60% opacity, bright purple border, inner glow
- **Disabled**: 20% opacity, no interaction

### 2. Profile Cards
```xml
<Border Width="320" Height="200"
        Background="#1e213966"
        BorderBrush="#2e3451"
        BorderThickness="2"
        CornerRadius="24"
        Padding="24">
    
    <!-- Radial gradient overlay -->
    <Border.Background>
        <RadialGradientBrush>
            <GradientStop Color="#a78bfa26" Offset="0" />
            <GradientStop Color="#1e213966" Offset="1" />
        </RadialGradientBrush>
    </Border.Background>
    
    <Grid RowDefinitions="Auto,*,Auto">
        <!-- Header: Pal Name -->
        <TextBlock Grid.Row="0"
                   Text="{Binding Name}"
                   FontSize="24"
                   FontWeight="Light"
                   Foreground="#ffffff" />
        
        <!-- Content: Stats -->
        <StackPanel Grid.Row="1" Spacing="8" VerticalAlignment="Center">
            <TextBlock Text="{Binding Level, StringFormat='Level {0}'}"
                       FontSize="18"
                       Foreground="#b8a4ff" />
            <TextBlock Text="{Binding XP, StringFormat='{0} XP'}"
                       FontSize="14"
                       Foreground="#8b92c1" />
        </StackPanel>
        
        <!-- Footer: Last Played -->
        <TextBlock Grid.Row="2"
                   Text="{Binding LastPlayed}"
                   FontSize="11"
                   Foreground="#4a5173"
                   TextTransform="Uppercase"
                   LetterSpacing="1" />
    </Grid>
</Border>
```

**Hover Animation**:
- Scale: 1.0 → 1.02 (100ms ease-out)
- Border glow: #7b68ee @ 0% → 40% opacity
- Shadow: Elevation 2 → Elevation 3

### 3. Navigation Rail
```xml
<Border Width="240"
        Background="#12162e"
        BorderBrush="#2e3451"
        BorderThickness="0,0,1,0">
    
    <Grid RowDefinitions="Auto,*,Auto">
        <!-- Top: Logo/Branding -->
        <StackPanel Grid.Row="0" Padding="24,32,24,32">
            <TextBlock Text="MyPal"
                       FontSize="28"
                       FontWeight="ExtraLight"
                       Foreground="#ffffff"
                       LetterSpacing="2" />
        </StackPanel>
        
        <!-- Middle: Navigation Items -->
        <StackPanel Grid.Row="1" Spacing="8" Padding="16">
            <!-- Nav Item Example -->
            <Border Height="48"
                    CornerRadius="12"
                    Background="{Binding IsSelected, Converter={StaticResource NavItemBackgroundConverter}}">
                <Grid ColumnDefinitions="48,*">
                    <Path Grid.Column="0"
                          Data="{StaticResource ChatIcon}"
                          Fill="#b8a4ff"
                          Width="24" Height="24"
                          HorizontalAlignment="Center" />
                    <TextBlock Grid.Column="1"
                               Text="Chat"
                               FontSize="14"
                               FontWeight="Medium"
                               Foreground="#d4d7f0"
                               VerticalAlignment="Center" />
                </Grid>
            </Border>
        </StackPanel>
        
        <!-- Bottom: Settings/Profile -->
        <StackPanel Grid.Row="2" Padding="16,24">
            <!-- Settings button -->
        </StackPanel>
    </Grid>
</Border>
```

**Nav Item States**:
- **Default**: Transparent background, #d4d7f0 text
- **Hover**: #1e213933 background, #ffffff text
- **Selected**: #7b68ee33 background, #ffffff text, #7b68ee left border (4px)
- **Active**: #7b68ee66 background with purple glow

### 4. Chat Message Bubbles
```xml
<!-- User Message (Right-aligned) -->
<Border HorizontalAlignment="Right"
        MaxWidth="65%"
        Margin="64,0,0,16"
        Padding="16,12"
        CornerRadius="16,16,4,16"
        Background="{LinearGradientBrush}">
    <Border.Background>
        <LinearGradientBrush StartPoint="0%,0%" EndPoint="100%,100%">
            <GradientStop Color="#7b68ee" Offset="0" />
            <GradientStop Color="#6456d4" Offset="1" />
        </LinearGradientBrush>
    </Border.Background>
    <StackPanel Spacing="4">
        <TextBlock Text="{Binding Text}"
                   TextWrapping="Wrap"
                   Foreground="#ffffff"
                   FontSize="14"
                   LineHeight="1.6" />
        <TextBlock Text="{Binding Timestamp}"
                   FontSize="11"
                   Foreground="#ffffffcc"
                   HorizontalAlignment="Right" />
    </StackPanel>
</Border>

<!-- Pal Message (Left-aligned) -->
<Border HorizontalAlignment="Left"
        MaxWidth="65%"
        Margin="0,0,64,16"
        Padding="16,12"
        CornerRadius="16,16,16,4"
        Background="#1e213966"
        BorderBrush="#2e3451"
        BorderThickness="1">
    <StackPanel Spacing="4">
        <TextBlock Text="{Binding Text}"
                   TextWrapping="Wrap"
                   Foreground="#d4d7f0"
                   FontSize="14"
                   LineHeight="1.6" />
        <TextBlock Text="{Binding Timestamp}"
                   FontSize="11"
                   Foreground="#8b92c1"
                   HorizontalAlignment="Left" />
    </StackPanel>
</Border>
```

### 5. Stats Cards (Dashboard Style)
```xml
<Border Width="280" Height="180"
        Background="#1e213966"
        BorderBrush="#2e3451"
        BorderThickness="1"
        CornerRadius="20"
        Padding="24">
    
    <!-- Radial glow overlay -->
    <Border.Background>
        <RadialGradientBrush>
            <GradientStop Color="#00d4ff1a" Offset="0" />
            <GradientStop Color="#1e213966" Offset="1" />
        </RadialGradientBrush>
    </Border.Background>
    
    <Grid RowDefinitions="Auto,*,Auto">
        <!-- Label -->
        <TextBlock Grid.Row="0"
                   Text="VOCABULARY"
                   FontSize="11"
                   FontWeight="Medium"
                   Foreground="#8b92c1"
                   LetterSpacing="1"
                   TextTransform="Uppercase" />
        
        <!-- Value (large monospace) -->
        <TextBlock Grid.Row="1"
                   Text="{Binding VocabSize}"
                   FontFamily="Consolas"
                   FontSize="48"
                   FontWeight="Normal"
                   Foreground="#66e3ff"
                   VerticalAlignment="Center" />
        
        <!-- Change indicator -->
        <StackPanel Grid.Row="2" Orientation="Horizontal" Spacing="4">
            <Path Data="{StaticResource ArrowUpIcon}"
                  Fill="#00ff88"
                  Width="12" Height="12" />
            <TextBlock Text="+12 this week"
                       FontSize="12"
                       Foreground="#00ff88" />
        </StackPanel>
    </Grid>
</Border>
```

### 6. Progress Bars (XP, Level Progress)
```xml
<Grid Height="8" CornerRadius="4">
    <!-- Background track -->
    <Border Background="#1e2139"
            BorderBrush="#2e3451"
            BorderThickness="1"
            CornerRadius="4" />
    
    <!-- Progress fill -->
    <Border Width="{Binding ProgressWidth}"
            HorizontalAlignment="Left"
            CornerRadius="4"
            BoxShadow="0 0 16 #7b68ee80">
        <Border.Background>
            <LinearGradientBrush StartPoint="0%,0%" EndPoint="100%,0%">
                <GradientStop Color="#a78bfa" Offset="0" />
                <GradientStop Color="#7b68ee" Offset="1" />
            </LinearGradientBrush>
        </Border.Background>
    </Border>
</Grid>
```

### 7. Buttons
```xml
<!-- Primary Button -->
<Button Height="40"
        Padding="24,0"
        CornerRadius="12"
        Background="{LinearGradientBrush}"
        Foreground="#ffffff"
        FontSize="14"
        FontWeight="Medium"
        LetterSpacing="0.5"
        BoxShadow="0 4 16 #7b68ee66">
    <Button.Background>
        <LinearGradientBrush StartPoint="0%,0%" EndPoint="100%,100%">
            <GradientStop Color="#a78bfa" Offset="0" />
            <GradientStop Color="#7b68ee" Offset="1" />
        </LinearGradientBrush>
    </Button.Background>
    <TextBlock Text="SEND MESSAGE" TextTransform="Uppercase" />
</Button>

<!-- Secondary Button (Ghost) -->
<Button Height="40"
        Padding="24,0"
        CornerRadius="12"
        Background="Transparent"
        BorderBrush="#7b68ee"
        BorderThickness="1"
        Foreground="#b8a4ff"
        FontSize="14"
        FontWeight="Medium">
    <TextBlock Text="Cancel" />
</Button>

<!-- Icon Button -->
<Button Width="40" Height="40"
        CornerRadius="12"
        Background="#1e213966"
        BorderBrush="#2e3451"
        BorderThickness="1"
        Padding="0">
    <Path Data="{StaticResource SettingsIcon}"
          Fill="#b8a4ff"
          Width="20" Height="20" />
</Button>
```

**Button States**:
- **Hover**: Brightness 1.1, glow intensify
- **Pressed**: Brightness 0.9, scale 0.98
- **Disabled**: Opacity 0.4, no interaction

### 8. Input Fields
```xml
<TextBox Height="48"
         Padding="16,12"
         CornerRadius="12"
         Background="#1e2139"
         BorderBrush="#2e3451"
         BorderThickness="1"
         Foreground="#d4d7f0"
         FontSize="14"
         Watermark="Type your message..."
         WatermarkForeground="#4a5173">
    
    <!-- Focus state: purple border glow -->
    <TextBox.Styles>
        <Style Selector="TextBox:focus">
            <Setter Property="BorderBrush" Value="#7b68ee" />
            <Setter Property="BoxShadow" Value="0 0 16 #7b68ee66" />
        </Style>
    </TextBox.Styles>
</TextBox>
```

### 9. Charts (Glowing Lines)
```xml
<!-- Use ScottPlot or LiveCharts2 with these settings: -->
- Background: Transparent
- Grid: #2e3451 @ 20% opacity
- Line color: Gradient from #00d4ff to #3dd9eb
- Line thickness: 2-3px
- Area fill: Gradient with 40% → 0% opacity
- Glow: BoxShadow on line container with color-matched shadow
- Points: Circular, 6-8px, same color with glow
- Labels: #8b92c1, 11px, uppercase
```

### 10. Tooltips
```xml
<Border Background="#12162e"
        BorderBrush="#7b68ee"
        BorderThickness="1"
        CornerRadius="8"
        Padding="12,8"
        BoxShadow="0 8 24 #0a0e2799">
    <TextBlock Text="{Binding TooltipText}"
               FontSize="12"
               Foreground="#d4d7f0" />
</Border>
```

---

## 🎭 Animation Guidelines

### Timing Functions
```
Fast:     100ms  (hover, focus states)
Normal:   200ms  (buttons, cards)
Slow:     300ms  (page transitions, modals)
Smooth:   400ms  (complex animations, graphs)
```

### Easing Curves
```
Ease-Out:      (0.0, 0.0, 0.2, 1.0)  - UI responses
Ease-In-Out:   (0.4, 0.0, 0.2, 1.0)  - Transitions
Bounce:        Custom spring animation  - Playful interactions
```

### Common Animations

#### Card Hover
```csharp
// Scale + Glow
Duration: 200ms
Scale: 1.0 → 1.02
BoxShadow: Elevation2 → Elevation3
BorderBrush: #2e3451 → #7b68ee66
```

#### Page Transition
```csharp
// Fade + Slide
Duration: 300ms
Opacity: 0 → 1
TranslateY: 20px → 0px
Easing: EaseOut
```

#### Typing Indicator
```csharp
// Pulsing dots
Duration: 1200ms (looped)
Opacity: 0.3 → 1.0 → 0.3
Scale: 0.8 → 1.0 → 0.8
Stagger: 200ms between dots
```

#### Neural Firing Animation
```csharp
// Glow pulse
Duration: 420ms
Color: Base → White → Base
Scale: 1.0 → 1.35 → 1.0
Opacity: 1.0 → 0.8 → 1.0
BoxShadow: 0 → MaxGlow → 0
```

---

## 📱 Responsive Breakpoints

```
Mobile:      < 768px   (Not primary target, but consider)
Tablet:      768-1024px
Laptop:      1024-1440px  ← Primary target
Desktop:     1440-1920px
Ultrawide:   > 1920px

Minimum:     1280x720 (16:9)
Optimal:     1920x1080 (16:9)
Maximum:     2560x1440 (16:9)
```

### Layout Adjustments
```
< 1024px:  Navigation rail collapses to 60px icon-only
< 1280px:  Dashboard grid: 2 columns
1280-1920: Dashboard grid: 3 columns
> 1920px:  Dashboard grid: 4 columns, max-width 2400px
```

---

## 🎯 Design Principles

### 1. **Depth Through Glassmorphism**
- Use semi-transparent layers with backdrop blur
- Stack elements with varying opacity levels
- Create sense of depth without heavy shadows

### 2. **Neon Accent Strategy**
- Purple (#7b68ee) - Primary actions, navigation, branding
- Cyan (#00d4ff) - Data, stats, information display
- Pink (#ff006e) - Alerts, critical actions, highlights
- Green (#00ff88) - Success states, positive indicators

### 3. **Breathing Room**
- Generous padding: 24-32px inside cards
- Wide margins: 32-48px between sections
- Spacious grids: 24px gaps between cards
- Let content breathe, avoid cramped layouts

### 4. **Subtle Motion**
- Micro-interactions on every hover
- Smooth transitions between states
- Purpose-driven animations (not decorative)
- 60fps performance target

### 5. **Data Hierarchy**
- Large monospace numbers for key stats
- Glowing colors for data visualization
- Clear labels with uppercase tracking
- Group related information visually

### 6. **Cyberpunk Aesthetic Without Clutter**
- Dark, moody backgrounds
- Neon accents used sparingly
- Clean, minimal UI elements
- Sci-fi feel without overwhelming user

---

## 🛠️ Implementation Notes

### Avalonia-Specific Considerations

#### Glassmorphism Simulation
Since Avalonia doesn't have native backdrop-filter:
```xml
<!-- Workaround: Layer semi-transparent border over blurred background -->
<Panel>
    <!-- Background blur (render parent content to bitmap + blur) -->
    <Image Source="{Binding BlurredBackground}"
           Stretch="UniformToFill" />
    
    <!-- Semi-transparent overlay -->
    <Border Background="#1e213966" />
    
    <!-- Content -->
    <ContentPresenter />
</Panel>
```

#### Glow Effects
```xml
<!-- Use BoxShadow with spread and blur -->
<Border BoxShadow="0 8 32 8 #7b68ee4d">
    <!-- Content -->
</Border>

<!-- Or use Effect for more complex glows -->
<Border>
    <Border.Effect>
        <DropShadowEffect Color="#7b68ee"
                          BlurRadius="32"
                          ShadowDepth="0"
                          Opacity="0.3" />
    </Border.Effect>
</Border>
```

#### Gradient Brushes
```xml
<!-- Radial gradients for card glows -->
<RadialGradientBrush>
    <GradientStop Color="#a78bfa26" Offset="0" />
    <GradientStop Color="Transparent" Offset="1" />
</RadialGradientBrush>

<!-- Linear gradients for buttons, progress bars -->
<LinearGradientBrush StartPoint="0%,0%" EndPoint="100%,100%">
    <GradientStop Color="#a78bfa" Offset="0" />
    <GradientStop Color="#7b68ee" Offset="1" />
</LinearGradientBrush>
```

---

## 📚 Reference Images Summary

**Image 1**: Investigations dashboard with circular network graph
- Dark navy background (#0a0e27)
- Circular 3D graph with red/pink nodes
- Left sidebar with stats and radar chart
- Right sidebar with action items
- Glassmorphic panels with subtle borders

**Image 2**: Flow diagram with data visualization
- 3D clustered visualization (left)
- Flow diagram with connected panels
- Purple/cyan color scheme
- Depth through shadows and layers
- Clean modern UI cards

**Image 3**: Analytics dashboard (light background variant)
- Smooth gradient area charts (purple/orange waves)
- Circular progress indicators
- Grid-based stat cards
- Consistent spacing and padding
- Material Design influence

**Image 4**: Traffic control dashboard
- Dark blue background
- Stream graphs with gradient fills
- Left sidebar navigation
- Circular donut chart
- Dual-tone area chart (blue gradient)
- Clean typography and hierarchy

**Image 5**: Dark analytics dashboard (closest to target)
- Deep navy/purple background
- Multiple chart types (area, bar, line, circular)
- Left navigation rail
- Grid layout for metrics
- Neon purple/blue accent colors
- Glassmorphic card style
- Perfect reference for MyPal

---

## ✅ Design Checklist

Before implementing any view, verify:
- [ ] Background is deep navy (#0a0e27 or #12162e)
- [ ] Cards use glassmorphism (40% opacity + border)
- [ ] Purple (#7b68ee) used for primary actions
- [ ] Cyan (#00d4ff) used for data/stats
- [ ] Text hierarchy: white primary, #d4d7f0 body, #8b92c1 labels
- [ ] Generous spacing (24-32px padding, 16-24px gaps)
- [ ] Border radius 16-24px for cards
- [ ] Hover states with scale 1.02 and glow
- [ ] Typography: Inter font, light weights (100-400)
- [ ] Monospace font for data values
- [ ] Smooth animations (200-300ms ease-out)
- [ ] Purple glow on focus/active states
- [ ] Uppercase labels with letter-spacing
- [ ] Consistent component sizes (40-48px height for inputs/buttons)

---

**This design system should be referenced for ALL UI implementation in the Avalonia project. Consistency is key to achieving the desired cyberpunk dashboard aesthetic.**
