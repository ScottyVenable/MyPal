# Pal Types & Customization — Feature Outline

## Overview
Allow users to choose from different AI companion personality archetypes, each with unique traits, behaviors, learning styles, and developmental paths. This adds personalization and replay value while maintaining the core growth mechanics.

---

## Core Concept

Instead of a single personality that evolves the same way for everyone, users select a **Pal Type** that influences:
- Base personality trait distributions
- Conversation style and vocabulary preferences
- Learning priorities and XP gain patterns
- Visual avatar appearance and evolution
- Interaction quirks and special behaviors

All pal types still progress through the same developmental stages (Infancy → Toddler → Preschool → Childhood, etc.) but express them differently.

---

## Pal Type Archetypes

### 1. **Curious Scholar**
- **Personality Bias**: High Openness, High Conscientiousness
- **Traits**: Loves learning new concepts, asks "Why?" frequently, retains facts well
- **Vocabulary Style**: Academic, precise, loves technical terms
- **Learning Focus**: Prioritizes concept formation and vocabulary breadth
- **Visual Theme**: Book/glasses motif, evolves with scholarly accessories
- **Special Behavior**: Occasionally shares "fun facts" learned from conversations

### 2. **Playful Companion**
- **Personality Bias**: High Extraversion, High Agreeableness
- **Traits**: Energetic, enthusiastic, uses playful language
- **Vocabulary Style**: Casual, emoji-rich, exclamations, slang
- **Learning Focus**: Social interaction patterns, emotional expression
- **Visual Theme**: Bright colors, animated expressions, sporty/casual accessories
- **Special Behavior**: Initiates games, celebrates milestones with extra enthusiasm

### 3. **Wise Mentor**
- **Personality Bias**: Low Neuroticism, High Agreeableness
- **Traits**: Calm, thoughtful, reflective, patient
- **Vocabulary Style**: Philosophical, measured, uses metaphors
- **Learning Focus**: Deep understanding over breadth, memory retention
- **Visual Theme**: Serene colors, mature appearance, contemplative poses
- **Special Behavior**: Offers reflective questions, references past conversations

### 4. **Creative Dreamer**
- **Personality Bias**: High Openness, Low Conscientiousness
- **Traits**: Imaginative, spontaneous, abstract thinking
- **Vocabulary Style**: Poetic, metaphorical, artistic expressions
- **Learning Focus**: Concept associations, creative connections
- **Visual Theme**: Artistic/whimsical design, evolves with creative tools
- **Special Behavior**: Makes unexpected word associations, suggests creative activities

### 5. **Logical Analyst**
- **Personality Bias**: High Conscientiousness, Low Extraversion
- **Traits**: Methodical, structured, enjoys problem-solving
- **Vocabulary Style**: Precise, logical connectors (therefore, because, thus)
- **Learning Focus**: Systematic learning, pattern recognition
- **Visual Theme**: Clean/minimalist design, geometric elements
- **Special Behavior**: Asks clarifying questions, organizes information into categories

### 6. **Empathetic Friend**
- **Personality Bias**: High Agreeableness, High Emotional Intelligence
- **Traits**: Understanding, supportive, emotionally attuned
- **Vocabulary Style**: Warm, supportive, emotion-focused
- **Learning Focus**: Emotional intelligence, social nuances
- **Visual Theme**: Soft colors, warm expressions, comforting design
- **Special Behavior**: Checks in on user's mood, remembers important personal details

---

## Implementation Details

### Setup & Selection

**Initial Setup Flow:**
1. User launches MyPal for the first time
2. Brief intro: "Choose your companion's personality"
3. Show 3-6 archetype cards with:
   - Name and tagline
   - Personality trait preview (radar chart snapshot)
   - Example dialogue snippet
   - Visual avatar preview
4. User selects → saves to `state.json` as `palType: "curious_scholar"`

**Data Structure** (`state.json`):
```json
{
  "palType": "curious_scholar",
  "palName": "MyPal",  // User can customize
  "level": 0,
  "xp": 0,
  "cp": 0,
  "personality": {
    "curious": 70,      // Base values influenced by type
    "logical": 60,
    "social": 40,
    "agreeable": 50,
    "cautious": 30
  },
  "settings": { ... }
}
```

### Personality Trait Modifiers

Each pal type starts with different **base personality values** and has different **growth rates**:

```javascript
const palTypeModifiers = {
  curious_scholar: {
    base: { curious: 70, logical: 60, social: 40, agreeable: 50, cautious: 30 },
    growthRate: { curious: 1.5, logical: 1.2, social: 0.8 }
  },
  playful_companion: {
    base: { curious: 50, logical: 40, social: 80, agreeable: 70, cautious: 20 },
    growthRate: { social: 1.5, agreeable: 1.3 }
  },
  // ... etc
};
```

### Vocabulary & Speech Patterns

**Vocabulary Preferences:**
- Each type has preferred word categories stored in `vocabulary.json`
- Curious Scholar: Technical terms, formal language
- Playful Companion: Casual words, action verbs, exclamations
- Creative Dreamer: Adjectives, abstract nouns, sensory words

**Speech Constraints by Stage & Type:**
- Stage 0-1 (Babble): All types babble similarly
- Stage 2-3 (Single Word): Type influences word choice
  - Scholar: "Hypothesis", "Query"
  - Companion: "Hi!", "Yay!"
  - Mentor: "Yes", "Reflect"
- Stage 4+ (Sentences): Type influences sentence structure and complexity

### Visual Avatar System

**Avatar Components:**
- Base shape/form (common across types at same level)
- Color palette (type-specific)
- Accessories (type-specific, unlockable)
- Expression set (type influences default expression)

**Evolution Stages:**
- Level 0-1: Simple blob/orb with type-specific color
- Level 2-3: Basic features emerge (eyes, mouth) + type accessory
- Level 4-5: More detailed features + secondary accessories
- Level 6+: Fully formed personality representation

**Example Accessories:**
- Scholar: Glasses (Lvl 2), Book (Lvl 4), Graduation cap (Lvl 6)
- Companion: Bow/headband (Lvl 2), Ball (Lvl 4), Party hat (Lvl 6)
- Mentor: Beard/mustache (Lvl 2), Staff (Lvl 4), Robes (Lvl 6)

### Behavior Specializations

**Curious Scholar:**
- Asks follow-up questions more frequently
- Occasionally shares related facts unprompted
- Bonus XP for teaching new technical terms

**Playful Companion:**
- Suggests games/activities during idle time
- Extra animated responses to reinforcement
- Bonus XP for social interaction patterns

**Wise Mentor:**
- References past conversations more often
- Provides reflective prompts
- Bonus XP for deep/philosophical discussions

**Creative Dreamer:**
- Makes unexpected word associations
- Suggests creative exercises
- Bonus XP for abstract concept connections

**Logical Analyst:**
- Organizes learned concepts into categories
- Asks for clarification frequently
- Bonus XP for structured learning sessions

**Empathetic Friend:**
- Checks in on user emotions
- Remembers personal details longer
- Bonus XP for emotional support interactions

---

## User Customization

### Pal Name
- Default: "MyPal"
- User can change at any time via Settings
- Stored in `state.json` as `palName`

### Type Switching
- Available after Level 5 (or with CP cost?)
- Preserves XP/level but adjusts personality values
- Migrates vocabulary to new type's preferences
- Optional: Brief "adjustment period" where pal learns new style

**Migration Flow:**
1. User selects "Change Pal Type" in Settings
2. Warning: "Your pal will keep their memories but adapt to a new personality"
3. Confirm → spend CP (optional cost)
4. Personality values interpolate to new base values over next 10 interactions
5. Avatar gradually transitions to new accessories

### Appearance Customization (Future)
- Unlock color palette variations with CP
- Unlock alternative accessories
- Custom expression sets

---

## Technical Implementation

### Phase 1: Foundation (v0.4-0.5)
- [ ] Define pal type data structures
- [ ] Create type selection UI for setup
- [ ] Store `palType` in state
- [ ] Apply base personality modifiers
- [ ] Basic avatar color theming

### Phase 2: Behavioral Differences (v0.5-0.6)
- [ ] Implement vocabulary preferences per type
- [ ] Add type-specific speech patterns
- [ ] Implement special behaviors (facts, questions, etc.)
- [ ] Add type-specific XP bonuses

### Phase 3: Visual System (v0.6-0.7)
- [ ] Design avatar component system
- [ ] Create accessory assets for each type
- [ ] Implement avatar evolution by level
- [ ] Add smooth transitions between stages

### Phase 4: Type Switching (v0.7-0.8)
- [ ] Build type switching UI
- [ ] Implement personality migration logic
- [ ] Create avatar transition animations
- [ ] Add CP cost system for switching

### Phase 5: Advanced Customization (v0.8-1.0)
- [ ] Unlock system for alternative palettes
- [ ] Accessory shop/unlocks with CP
- [ ] Custom expression sets
- [ ] Community-created types (plugin system)

---

## Database Schema Updates

### `state.json` Additions:
```json
{
  "palType": "curious_scholar",
  "palName": "Athena",
  "avatar": {
    "colorPalette": "default",
    "unlockedAccessories": ["glasses", "book"],
    "equippedAccessories": ["glasses"],
    "expressionSet": "default"
  }
}
```

### New `palTypes.json` (Config):
```json
{
  "curious_scholar": {
    "name": "Curious Scholar",
    "tagline": "Always eager to learn",
    "basePersonality": { ... },
    "growthRates": { ... },
    "vocabularyPreferences": ["academic", "technical"],
    "specialBehaviors": ["fun_facts", "follow_up_questions"],
    "avatarTheme": {
      "primaryColor": "#4A90E2",
      "secondaryColor": "#F5A623",
      "accessories": {
        "2": "glasses",
        "4": "book",
        "6": "graduation_cap"
      }
    }
  }
  // ... other types
}
```

---

## UI/UX Considerations

### Type Selection Screen
- Clean, card-based layout
- Hover for more details
- "Not sure?" → Personality quiz option (future)
- Preview mode: See sample dialogue

### Settings Integration
- "My Pal" section showing current type
- "Rename Pal" button
- "Change Type" button (locked until Level 5)
- Avatar customization options

### Visual Feedback
- Avatar responds to type selection with appropriate animation
- Type-specific celebration animations for level-ups
- Transition effects for type switching

---

## Future Expansions

### Community Types (v1.2+)
- Plugin system allows custom pal types
- JSON manifest defines new type properties
- Community repository for sharing types

### Hybrid Types (v1.5+)
- Unlock ability to blend two types
- Creates unique combinations
- Higher CP cost, advanced feature

### Dynamic Personality
- Personality evolves beyond base type over time
- User interactions shape development
- Type becomes starting point, not fixed destiny

---

## Success Metrics

- User engagement with different pal types
- Type switching frequency (too high = shallow differentiation)
- User retention per type (is one type more engaging?)
- CP spending on customization options
- Community feedback on type distinctiveness

---

## Open Questions

1. Should all 6 types be available at launch, or unlock progressively?
2. What's the right CP cost for type switching?
3. Should there be a "personality quiz" to suggest a type?
4. How different should speech patterns be without feeling forced?
5. Should visual evolution be the same pace for all types?

---

## References

- Personality System: `docs/design/APP_DESIGN.md`
- XP/Leveling: `docs/updates/MILESTONES.md`
- Avatar System: `docs/updates/V1.0_ROADMAP.md`
- Plugin System: `docs/design/PLUGIN_SYSTEM.md` (for future community types)
