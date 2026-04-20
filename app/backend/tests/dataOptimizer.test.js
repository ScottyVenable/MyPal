import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import DataOptimizer from '../src/dataOptimizer.js';

describe('DataOptimizer', () => {
  describe('Vocabulary optimization', () => {
    test('removes duplicate contexts and creates reference system', () => {
      const vocabulary = [
        {
          id: 'v1',
          word: 'hello',
          count: 2,
          knownBy: { user: 1, pal: 1 },
          lastSeen: 1000,
          contexts: ['Hello world', 'Hello there']
        },
        {
          id: 'v2',
          word: 'world',
          count: 1,
          knownBy: { user: 1, pal: 0 },
          lastSeen: 1000,
          contexts: ['Hello world'] // Duplicate context
        }
      ];

      const result = DataOptimizer.optimizeVocabulary(vocabulary);

      assert.equal(result.vocabulary.length, 2, 'Should have 2 vocabulary entries');
      assert.equal(result.contexts.length, 2, 'Should have 2 unique contexts');
      
      // Check that contexts are replaced with IDs
      assert.ok(result.vocabulary[0].contexts[0].startsWith('ctx_'), 'Context should be ID reference');
      assert.ok(result.vocabulary[1].contexts[0].startsWith('ctx_'), 'Context should be ID reference');
      
      // Verify duplicate context shares same ID
      const helloWorldId = result.contexts.find(c => c.text === 'Hello world')?.id;
      assert.ok(helloWorldId, 'Should find Hello world context');
      assert.equal(result.vocabulary[1].contexts[0], helloWorldId, 'Duplicate context should use same ID');
    });

    test('restores vocabulary with full context text', () => {
      const vocabulary = [
        {
          id: 'v1',
          word: 'hello',
          count: 1,
          knownBy: { user: 1, pal: 0 },
          lastSeen: 1000,
          contexts: ['Hello world', 'Hello there']
        }
      ];

      const optimized = DataOptimizer.optimizeVocabulary(vocabulary);
      const restored = DataOptimizer.restoreVocabulary(optimized.vocabulary, optimized.contexts);

      assert.deepEqual(restored[0].contexts, vocabulary[0].contexts, 'Restored contexts should match original');
    });

    test('calculates space savings correctly', () => {
      const vocabulary = [
        {
          id: 'v1',
          word: 'hello',
          count: 10,
          knownBy: { user: 5, pal: 5 },
          lastSeen: 1000,
          contexts: Array(10).fill('This is a repeated context string that takes up space')
        }
      ];

      const optimized = DataOptimizer.optimizeVocabulary(vocabulary);
      const savings = DataOptimizer.calculateSavings(vocabulary, optimized.vocabulary);

      assert.ok(savings.savings > 0, 'Should show savings');
      assert.ok(parseFloat(savings.percent) > 0, 'Should have positive percent saved');
    });
  });

  describe('Memory optimization', () => {
    test('references chat log entries instead of duplicating text', () => {
      const chatLog = [
        { id: 'c1', role: 'user', text: 'Hello there', ts: 1000 },
        { id: 'c2', role: 'pal', text: 'Hi!', ts: 1001 }
      ];

      const memories = [
        {
          id: 'm1',
          ts: 1000,
          userText: 'Hello there',
          palText: 'Hi!',
          summary: 'Greeting exchange',
          sentiment: 'positive',
          keywords: ['hello', 'hi'],
          xp: { gained: 10, total: 10, level: 0 },
          importance: {
            score: 5,
            level: 'medium',
            shouldRemember: true,
            reasons: ['First interaction'],
            tags: ['greeting']
          },
          tags: ['greeting'], // Duplicate
          subjectiveNarrative: 'Nice greeting'
        }
      ];

      const optimized = DataOptimizer.optimizeMemories(memories, chatLog);

      assert.equal(optimized[0].chatRef.userMsgId, 'c1', 'Should reference user message');
      assert.equal(optimized[0].chatRef.palMsgId, 'c2', 'Should reference pal message');
      assert.equal(optimized[0].userText, undefined, 'Should not store user text');
      assert.equal(optimized[0].palText, undefined, 'Should not store pal text');
      assert.equal(optimized[0].tags, undefined, 'Should remove duplicate tags');
    });

    test('restores memories with full text from chat log', () => {
      const chatLog = [
        { id: 'c1', role: 'user', text: 'Hello there', ts: 1000 },
        { id: 'c2', role: 'pal', text: 'Hi!', ts: 1001 }
      ];

      const memories = [
        {
          id: 'm1',
          ts: 1000,
          userText: 'Hello there',
          palText: 'Hi!',
          summary: 'Greeting',
          sentiment: 'positive',
          keywords: ['hello'],
          xp: { gained: 10, total: 10, level: 0 },
          importance: {
            score: 5,
            level: 'medium',
            shouldRemember: true,
            reasons: [],
            tags: ['greeting']
          },
          subjectiveNarrative: 'Nice'
        }
      ];

      const optimized = DataOptimizer.optimizeMemories(memories, chatLog);
      const restored = DataOptimizer.restoreMemories(optimized, chatLog);

      assert.equal(restored[0].userText, 'Hello there', 'Should restore user text');
      assert.equal(restored[0].palText, 'Hi!', 'Should restore pal text');
      assert.deepEqual(restored[0].tags, ['greeting'], 'Should restore tags');
    });

    test('preserves original memory when no chat reference found', () => {
      const chatLog = [];
      const memories = [
        {
          id: 'm1',
          ts: 1000,
          userText: 'Hello',
          palText: 'Hi',
          summary: 'Greeting',
          sentiment: 'positive',
          keywords: [],
          xp: {},
          importance: { tags: [] }
        }
      ];

      const optimized = DataOptimizer.optimizeMemories(memories, chatLog);

      assert.equal(optimized[0].userText, 'Hello', 'Should preserve original when no chat ref found');
    });
  });

  describe('Profile optimization', () => {
    test('optimizes entire profile data structure', () => {
      const profileData = {
        vocabulary: [
          {
            id: 'v1',
            word: 'hello',
            count: 1,
            knownBy: { user: 1, pal: 0 },
            lastSeen: 1000,
            contexts: ['Hello world', 'Hello there']
          }
        ],
        memories: [
          {
            id: 'm1',
            ts: 1000,
            userText: 'Hello',
            palText: 'Hi',
            summary: 'Greeting',
            sentiment: 'positive',
            keywords: ['hello'],
            xp: { gained: 10, total: 10, level: 0 },
            importance: {
              score: 5,
              level: 'medium',
              shouldRemember: true,
              reasons: [],
              tags: ['greeting']
            },
            tags: ['greeting']
          }
        ],
        chatLog: [
          { id: 'c1', role: 'user', text: 'Hello', ts: 1000 },
          { id: 'c2', role: 'pal', text: 'Hi', ts: 1001 }
        ]
      };

      const result = DataOptimizer.optimizeProfile(profileData);

      assert.ok(result.vocabulary, 'Should have optimized vocabulary');
      assert.ok(result.vocabularyContexts, 'Should have vocabulary contexts');
      assert.ok(result.memories, 'Should have optimized memories');
      assert.ok(result.vocabularySavings, 'Should report vocabulary savings');
      assert.ok(result.memoriesSavings, 'Should report memories savings');
    });

    test('restores complete profile data', () => {
      const profileData = {
        vocabulary: [
          {
            id: 'v1',
            word: 'test',
            count: 1,
            knownBy: { user: 1, pal: 0 },
            lastSeen: 1000,
            contexts: ['Test context']
          }
        ],
        memories: [
          {
            id: 'm1',
            ts: 1000,
            userText: 'Test',
            palText: 'Response',
            summary: 'Test',
            sentiment: 'neutral',
            keywords: ['test'],
            xp: {},
            importance: { tags: [] }
          }
        ],
        chatLog: [
          { id: 'c1', role: 'user', text: 'Test', ts: 1000 },
          { id: 'c2', role: 'pal', text: 'Response', ts: 1001 }
        ]
      };

      const optimized = DataOptimizer.optimizeProfile(profileData);
      const optimizedWithChatLog = {
        ...optimized,
        chatLog: profileData.chatLog
      };
      const restored = DataOptimizer.restoreProfile(optimizedWithChatLog);

      assert.ok(restored.vocabulary, 'Should restore vocabulary');
      assert.ok(restored.memories, 'Should restore memories');
      assert.equal(restored.vocabulary[0].contexts[0], 'Test context', 'Should restore context text');
    });
  });
});
