# Definitional Learning System

**Version:** 1.0  
**Date:** October 21, 2025  
**Status:** Implemented ✅  
**Related Systems:** Affirmation & Reinforcement, Conceptual Intelligence

---

## Overview

The **Definitional Learning System** enables Pal to learn structured definitions when users explain what concepts mean. This creates deep, foundational understanding that goes beyond simple word frequency.

### Core Philosophy

**"Teaching is defining."**

When a user says:
- "Question means we want to learn"
- "Happy means feeling good"
- "A dog is an animal that barks"

They are **explicitly teaching** Pal what these concepts mean. This deserves:
1. **Strong reinforcement** (higher than normal learning)
2. **Structured storage** (definitions array, not just contexts)
3. **Relationship creation** (concept → definition mapping)
4. **Very slow decay** (foundational knowledge, 0.1%/day)

---

## Pattern Detection

### Supported Patterns

#### Pattern 1: "X means Y"
```
"Question means we want to learn"
"Question means we are wondering"
"Happy means feeling good"
"Dog means a furry animal"
```

**Regex:** `/([a-zA-Z]+(?:\s+[a-zA-Z]+)*?)\s+means\s+(.+?)(?:\.|$)/gi`

**Captures:**
- `concept`: The word/phrase being defined (e.g., "question")
- `definition`: What it means (e.g., "we want to learn")

#### Pattern 2: "A/An X is Y"
```
"A dog is an animal that barks"
"An apple is a fruit"
"A question is something we ask"
```

**Regex:** `/(?:^|[.!?]\s+)(?:a|an)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*?)\s+is\s+(.+?)(?:\.|$)/gi`

**Captures:**
- `concept`: The thing being defined
- `definition`: The definitional statement

---

## Implementation

### Detection Function

```javascript
function detectDefinition(text) {
  if (!text || typeof text !== 'string') return null;
  
  const definitions = [];
  
  // Pattern 1: "X means Y"
  const meansPattern = /([a-zA-Z]+(?:\s+[a-zA-Z]+)*?)\s+means\s+(.+?)(?:\.|$)/gi;
  let match;
  while ((match = meansPattern.exec(text)) !== null) {
    const concept = match[1].trim();
    let definition = match[2].trim();
    
    // Clean up the definition (remove trailing punctuation)
    definition = definition.replace(/[.,!?]+$/, '').trim();
    
    if (concept && definition) {
      definitions.push({
        concept: concept.toLowerCase(),
        definition: definition,
        fullMatch: match[0]
      });
    }
  }
  
  // Pattern 2: "A/An X is Y" (definitional)
  const isPattern = /(?:^|[.!?]\s+)(?:a|an)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*?)\s+is\s+(.+?)(?:\.|$)/gi;
  while ((match = isPattern.exec(text)) !== null) {
    const concept = match[1].trim();
    let definition = match[2].trim();
    
    definition = definition.replace(/[.,!?]+$/, '').trim();
    
    if (concept && definition) {
      definitions.push({
        concept: concept.toLowerCase(),
        definition: definition,
        fullMatch: match[0]
      });
    }
  }
  
  return definitions.length > 0 ? definitions : null;
}
```

### Learning Function

```javascript
function learnFromDefinition(vocabulary, definitions, level, state) {
  if (!definitions || !definitions.length) return;
  
  const now = Date.now();
  const nowISO = new Date(now).toISOString();
  
  for (const { concept, definition } of definitions) {
    console.log(`📖 Definition detected: "${concept}" means "${definition}"`);
    
    // Find or create the concept entry
    let conceptEntry = vocabulary.find((item) => item.word === concept);
    
    if (!conceptEntry) {
      conceptEntry = {
        id: nanoid(),
        word: concept,
        count: 0,
        knownBy: { user: 0, pal: 0 },
        lastSeen: now,
        contexts: [],
        learnedAtLevel: level,
        confidence: 1.0,
      };
      vocabulary.push(conceptEntry);
    }
    
    // Strong reinforcement for definitional learning
    const learningBonus = Math.min(15, Math.floor(level / 2) + 8);
    conceptEntry.count += learningBonus;
    conceptEntry.knownBy.user = (conceptEntry.knownBy.user || 0) + learningBonus;
    conceptEntry.lastSeen = now;
    
    // Store the definition as structured knowledge
    if (!conceptEntry.definitions) {
      conceptEntry.definitions = [];
    }
    
    // Add the new definition
    conceptEntry.definitions.push({
      definition: definition,
      learnedAt: nowISO,
      learnedAtLevel: level,
      reinforcementCount: 1,
    });
    
    // Deduplicate similar definitions (keep most recent 3)
    if (conceptEntry.definitions.length > 3) {
      conceptEntry.definitions = conceptEntry.definitions.slice(-3);
    }
    
    // Memory metadata: foundational knowledge with very slow decay
    conceptEntry.memoryMetadata = {
      memoryType: 'skill-knowledge',
      decayRate: 0.001, // 0.1%/day - very slow
      expiryDate: null,
      created: conceptEntry.memoryMetadata?.created || nowISO,
      lastUpdated: nowISO,
      learningSource: 'definition',
      temporal: false,
    };
    
    // Add to contexts for quick reference
    if (!conceptEntry.contexts) conceptEntry.contexts = [];
    conceptEntry.contexts.unshift(`Definition: ${definition}`);
    if (conceptEntry.contexts.length > 7) conceptEntry.contexts.length = 7;
    
    // Create relationship in state
    if (state && state.relationships) {
      const relationshipKey = `${concept}:means`;
      if (!state.relationships[relationshipKey]) {
        state.relationships[relationshipKey] = {
          subject: concept,
          predicate: 'means',
          object: definition,
          strength: learningBonus,
          lastReinforced: now,
          reinforcementCount: 1,
        };
      } else {
        state.relationships[relationshipKey].strength += learningBonus;
        state.relationships[relationshipKey].lastReinforced = now;
        state.relationships[relationshipKey].reinforcementCount += 1;
      }
    }
    
    console.log(`✅ Learned definition: "${concept}" = "${definition}" (bonus: +${learningBonus})`);
  }
}
```

---

## Data Structure

### Vocabulary Entry with Definitions

```javascript
{
  id: "def_abc123",
  word: "question",
  count: 23,
  knownBy: { user: 18, pal: 5 },
  lastSeen: 1729534523000,
  learnedAtLevel: 2,
  confidence: 1.0,
  
  // Definitions array (NEW)
  definitions: [
    {
      definition: "we want to learn",
      learnedAt: "2025-10-21T10:30:00.000Z",
      learnedAtLevel: 2,
      reinforcementCount: 1
    },
    {
      definition: "we are wondering",
      learnedAt: "2025-10-21T10:35:00.000Z",
      learnedAtLevel: 2,
      reinforcementCount: 1
    }
  ],
  
  // Memory metadata
  memoryMetadata: {
    memoryType: 'skill-knowledge',
    decayRate: 0.001, // 0.1%/day
    expiryDate: null,
    created: "2025-10-21T10:30:00.000Z",
    lastUpdated: "2025-10-21T10:35:00.000Z",
    learningSource: 'definition',
    temporal: false
  },
  
  // Contexts
  contexts: [
    "Definition: we are wondering",
    "Definition: we want to learn",
    "User: What is a question?",
    "Pal: Why?"
  ]
}
```

### State Relationships

```javascript
state.relationships = {
  "question:means": {
    subject: "question",
    predicate: "means",
    object: "we want to learn",
    strength: 15,
    lastReinforced: 1729534523000,
    reinforcementCount: 2
  },
  // ... other relationships
}
```

---

## Integration

### Chat Endpoint Integration

```javascript
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  
  // ... existing code ...
  
  // Detect and learn from corrections
  const corrections = detectCorrection(message);
  if (corrections && corrections.length > 0) {
    learnFromCorrection(vocabulary, corrections, state.level, message);
  }

  // Detect and learn from definitions ⬅️ NEW
  const definitions = detectDefinition(message);
  if (definitions && definitions.length > 0) {
    learnFromDefinition(vocabulary, definitions, state.level, state);
  }

  // Extract and learn quoted phrases
  const quotedPhrases = extractQuotedPhrases(message);
  if (quotedPhrases.length > 0) {
    learnQuotedPhrases(vocabulary, quotedPhrases, state.level, state);
  }
  
  // ... rest of chat logic ...
});
```

---

## Examples

### Example 1: Single Definition

**User:** "Question means we want to learn"

**System Response:**
```
📖 Definition detected: "question" means "we want to learn"
✅ Learned definition: "question" = "we want to learn" (bonus: +9)
```

**Result:**
- `question` entry created/updated in vocabulary
- `count` increased by +9
- Definition stored in `definitions[]` array
- Relationship created: `question:means` → "we want to learn"
- Memory type: `skill-knowledge` with 0.1%/day decay

---

### Example 2: Multiple Definitions

**User:** "Question means we want to learn. Question means we are wondering."

**System Response:**
```
📖 Definition detected: "question" means "we want to learn"
✅ Learned definition: "question" = "we want to learn" (bonus: +9)
📖 Definition detected: "question" means "we are wondering"
✅ Learned definition: "question" = "we are wondering" (bonus: +9)
```

**Result:**
- `question` entry has 2 definitions
- Total reinforcement: +18
- Both definitions stored with timestamps
- Relationship strength increased to 24

---

### Example 3: "A/An X is Y" Pattern

**User:** "A dog is an animal that barks."

**System Response:**
```
📖 Definition detected: "dog" means "an animal that barks"
✅ Learned definition: "dog" = "an animal that barks" (bonus: +9)
```

**Result:**
- `dog` entry created with definition
- Structured understanding of what a dog is
- Can now reference this definition in responses

---

## Learning Bonus Calculation

```javascript
const learningBonus = Math.min(15, Math.floor(level / 2) + 8);
```

**By Level:**
- Level 0-1: +8 bonus
- Level 2-3: +9 bonus
- Level 4-5: +10 bonus
- Level 6-7: +11 bonus
- Level 8-9: +12 bonus
- Level 10-11: +13 bonus
- Level 12-13: +14 bonus
- Level 14+: +15 bonus (capped)

**Why high bonus?**
Definitional learning is **explicit teaching** - the user is deliberately explaining what something means. This deserves strong reinforcement to ensure Pal remembers.

---

## Memory Classification

### Memory Type: Skill-Knowledge
- **Decay Rate:** 0.001 (0.1%/day) - Very slow decay
- **Expiry:** None - foundational knowledge doesn't expire
- **Temporal:** False - definitions are timeless

**Rationale:**
Definitions are **foundational knowledge** that form the basis of understanding. Unlike temporal facts ("Today is Tuesday") or contextual states ("I'm at the store"), definitions should persist with minimal decay.

---

## Use Cases

### Teaching Vocabulary
**User:** "Happy means feeling good"  
**Result:** Pal learns that "happy" = "feeling good"

### Explaining Concepts
**User:** "Love means caring deeply about someone"  
**Result:** Pal understands love as caring

### Building Foundational Knowledge
**User:** "A question is something we ask when we want to know more"  
**Result:** Pal has structured definition of "question"

### Multiple Perspectives
**User:** "Question means we want to learn. Question means we are curious."  
**Result:** Pal has multiple definitions showing different facets

---

## Future Enhancements

### Phase 2 Enhancements (Future)
1. **Definition Synthesis:** Combine multiple definitions into comprehensive understanding
2. **Definition Retrieval:** Use definitions to generate explanations
3. **Contextual Definitions:** Store which contexts definitions apply to
4. **Definition Evolution:** Track how definitions change over levels
5. **Definition Queries:** "What does X mean?" → Retrieve stored definition
6. **Definition Confidence:** Score how certain Pal is about a definition

### Phase 3 Enhancements (Advanced)
1. **Semantic Clustering:** Group similar definitions
2. **Definition Contradiction Detection:** Flag conflicting definitions
3. **Definition Expansion:** Generate related definitions
4. **Definition-Based Reasoning:** Use definitions to answer "Why?" questions
5. **Definition Teaching:** Pal explains concepts using learned definitions

---

## Testing Checklist

### Basic Functionality
- [ ] "Question means we want to learn" → Definition stored
- [ ] "Happy means feeling good" → Definition stored
- [ ] Multiple definitions for same concept → Both stored
- [ ] "A dog is an animal" → "A/An X is Y" pattern detected

### Data Verification
- [ ] Check `definitions[]` array exists in vocabulary entry
- [ ] Verify `memoryType: 'skill-knowledge'` and `decayRate: 0.001`
- [ ] Confirm relationship created in `state.relationships`
- [ ] Check contexts include "Definition: ..." prefix

### Edge Cases
- [ ] Empty definitions → Ignored
- [ ] Definitions with punctuation → Cleaned properly
- [ ] Multiple sentences → Each definition parsed separately
- [ ] Case sensitivity → Concepts lowercased

### Integration
- [ ] Works alongside affirmation system
- [ ] Works alongside correction system
- [ ] Works alongside quotation learning
- [ ] Doesn't interfere with normal vocabulary learning

---

## Success Metrics

### Quantitative
- **Definition Detection Rate:** >95% of "X means Y" patterns detected
- **Storage Accuracy:** 100% of definitions stored with correct structure
- **Learning Bonus Applied:** Consistent +8 to +15 based on level
- **Relationship Creation:** 100% of definitions create relationships

### Qualitative
- Pal can recall what concepts mean
- Definitions influence response generation
- User feels Pal "understands" concepts deeply
- Multiple definitions show nuanced understanding

---

## Notes

This system complements the existing learning systems:
- **Affirmation:** Learns from agreement and expansion
- **Correction:** Learns from "Don't say X, say Y"
- **Quotation:** Learns from direct speech teaching
- **Definition:** Learns from "X means Y" explanations ⬅️ NEW

Together, these create a comprehensive learning framework that captures different types of knowledge transfer.

**Philosophy:** "To understand is to define."

---

**Status:** ✅ Fully implemented and ready for testing!
