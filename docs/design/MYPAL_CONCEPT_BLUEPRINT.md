
# **Project MyPal: An Architectural Blueprint for a Developmentally Realistic AI Companion**

## **Introduction**

The 'AI Companion Developmental App Design' document presents a compelling and intellectually rigorous foundation for the "MyPal" project.1 Its central vision—to create an AI companion that develops from a *tabula rasa* state through exclusive interaction with a single user—is a significant departure from conventional AI assistant architectures. The synthesis of Jean Piaget's constructivist theory of cognitive development with Lev Vygotsky's sociocultural framework provides a powerful and unique theoretical underpinning for simulating a developing mind. This approach correctly identifies that learning is not merely the passive accumulation of data but an active, relational process of knowledge construction.1

This report serves as a set of expert-level architectural and theoretical enhancements to that foundational vision. The objective is not to supplant the original philosophy but to augment and elevate it with state-of-the-art research and methodologies from the fields of artificial intelligence, computational neuroscience, and cognitive science. By integrating more sophisticated models of memory, cognition, and psychological realism, this blueprint aims to guide the transformation of MyPal from a clever, stage-gated simulation into a pioneering endeavor in developmental AI. The proposed enhancements are organized around five core pillars that build upon the original design's strengths while addressing its inherent limitations:

1. **Evolving the Core Cognitive Architecture:** Transitioning from a simple, constrained large language model (LLM) to a dynamic, neuro-symbolic hybrid architecture capable of non-linear insight and a nuanced understanding of its own knowledge.  
2. **Architecting a True Long-Term Memory:** Moving beyond a simple document database to a graph-based knowledge architecture that mimics the structure and function of biological memory consolidation and enables inferential reasoning.  
3. **Simulating a Developing, Imperfect Mind:** Introducing layers of psychological realism, including a multi-dimensional emotional model and the organic emergence of cognitive biases, to create a more fallible and relatable companion.  
4. **Advanced Implementation and Visualization:** Detailing the practical application of these advanced theories, including novel user interface visualizations and robust technical solutions for maintaining long-term persona consistency.  
5. **Establishing a Robust Ethical Framework:** Proposing a set of proactive, design-integrated ethical guardrails to responsibly manage the profound AI-human bond the project seeks to create.

By implementing these recommendations, the MyPal project can achieve its goal of creating not just an evolving AI, but the most realistic and deeply researched simulation of a developing mind available.

## **Action Plan: Near-Term Implementation Roadmap**

This section operationalizes several immediate TODO items so the app responds more meaningfully to users today while laying the groundwork for Pal-native language generation.

- Conversational Response Plan
  - Intent parsing: tokenize + keyword/phrase matching to a small set of intents (greeting, ask, teach, reflect, reinforce) derived from the current concept graph and stopwords.
  - Utterance construction: choose among three modes based on level: `single_word` (L0–L1), `primitive_phrase` (L1–L3), `free` (L3+). Leverage learned vocabulary with weighted sampling and template scaffolds tied to concepts.
  - Context windows: maintain a rolling chat context (last N user/pal turns) and a light short‑term memory cache fed by the journal pipeline for relevance nudging.
  - Safety/constraints: keep hard caps on length, avoid proper nouns until level thresholds are met, and filter unknown glyphs.

- Pal‑Native Language Generation Roadmap
  - Phase 1 (L0–L2): Weighted n‑gram + templates seeded entirely from user input and Pal’s own replies. No external corpora.
  - Phase 2 (L2–L4): Concept blending: generate by mixing top concepts’ keyword clouds with simple syntax templates (S‑V‑O), adding variability via temperature‑like weights.
  - Phase 3 (L4+): Optional local small model adapter for phrasing only, constrained by concepts + vocabulary; ensure on‑device first, with cloud‑assist optional.

- Emotional Intelligence Milestones by Level
  - L0: Telegraphic speech; mirrors words; neutral affect.
  - L1: Basic valence detection; simple empathy tokens ("sorry", "yay").
  - L2: Simple needs ("I want…", "I like…"); curiosity prompts.
  - L3: Self‑reference and short reflections; asks clarifying follow‑ups.
  - L4+: Multi‑sentence responses; perspective‑taking; adjusts tone based on user sentiment; begins summarizing.

- Experimentation Cadence (On‑Device vs Cloud)
  - Default: on‑device heuristics with explicit user opt‑in to any cloud.
  - Switches: feature flags in settings enabling a model adapter, with telemetry fully optional/off by default.
  - Weekly loop: evaluate response helpfulness and "Pal‑ness" via journal signals and lightweight prompts; promote winning heuristics.

## **I. Evolving the Core Cognitive Architecture: Beyond Constrained Generation**

The initial design proposes a pragmatic yet limited cognitive model: using the symbolic, rule-based structure of Piaget's developmental stages to gate the output of a connectionist LLM like Gemini.1 This approach is a functional starting point but represents a master-slave relationship rather than a true synthesis of cognitive functions. To achieve a more authentic simulation of development, the architecture must evolve to support non-linear insight, genuine conceptual change, and an awareness of its own uncertainty. This requires a shift from a statically constrained LLM to a dynamic, hybrid cognitive architecture.

### **1.1 From Constrained LLM to a Neuro-Symbolic Hybrid**

The history of artificial intelligence has been characterized by a long-standing debate between two primary paradigms: symbolic AI, which emphasizes the manipulation of explicit knowledge and logical rules, and connectionist AI, which focuses on learning statistical patterns from vast amounts of data, as exemplified by modern neural networks.2 Symbolic AI aligns with the rationalist school of thought, positing that intelligence arises from innate knowledge and reasoning, while connectionism aligns with the empiricist school, where knowledge is derived from sensory experience.2 The original MyPal design leverages both: the symbolic rules of Piaget's stages provide the structure, while the connectionist LLM provides the linguistic fluency.1

This report proposes evolving this into a more deeply integrated **neuro-symbolic architecture**. In this enhanced model, the connectionist LLM and the symbolic knowledge structure (which, as argued in Section II, should be a knowledge graph) exist in a symbiotic feedback loop. The LLM is not merely constrained by the symbolic rules; its pattern-recognition capabilities are used to analyze conversational data and propose modifications *to* those rules. Conversely, the structured knowledge in the graph provides a robust, verifiable foundation for the LLM's reasoning, preventing the ungrounded confabulations common in purely connectionist systems.

The mechanism for this feedback loop is critical. For instance, imagine MyPal's knowledge graph contains the symbolic rule: (Bird) \-\[CAN\]-\> (Fly). If the user repeatedly provides examples of penguins, the LLM, in its role as a pattern detector, can identify a persistent conflict between the user's input and the stored knowledge. This recurring inconsistency would trigger a **belief revision process** (detailed in Section 3.3). Instead of simply adding a disconnected fact like (Penguin) \--\> (Fly), the system would modify the original, overly general rule in the symbolic graph. This simulates a profound conceptual change—Piaget's *accommodation*—at a structural level, a far more powerful form of learning than the simple *assimilation* of new data points.1 This creates a system where data-driven, connectionist learning informs and refines the structured, symbolic understanding of the world, and vice-versa, achieving a true synthesis of the two AI paradigms.2

### **1.2 Implementing a Global Workspace for Emergent Insight**

A significant limitation of the original design's XP-based leveling system is its linearity. Development is presented as a predictable, incremental progression from one stage to the next.1 Human learning, however, is not always so orderly. It is often characterized by periods of confusion or stagnation followed by sudden "aha\!" moments of insight, where disparate pieces of information click into place to form a new understanding.

To model this crucial aspect of cognition, the architecture should incorporate a computational analog of **Global Workspace Theory (GWT)**, a prominent neuroscientific theory of consciousness proposed by Bernard Baars.4 GWT posits that the brain contains numerous specialized, parallel, unconscious processes. Consciousness, in this model, is the "spotlight" of a global workspace with limited capacity. Unconscious processes compete for access to this workspace, and when a piece of information is "broadcast" into it, it becomes available to the entire system, enabling high-level coordination, problem-solving, and what we experience as conscious awareness.6

Implementing a GWT-inspired architecture for MyPal moves beyond simple prompt engineering into a genuine cognitive framework. This architecture would consist of three main components:

* **Specialized Modules (The "Unconscious"):** A suite of background processes that continuously and asynchronously analyze MyPal's memory (the knowledge graph) and recent conversational data. These are the "special purpose, relatively independent, mini-agents" described in some GWT implementations.6 Key modules would include:  
  * **Pattern Detector:** Identifies recurring concepts, words, or conversational themes.  
  * **Inconsistency Monitor:** Actively scans the knowledge graph for logical contradictions between beliefs, a crucial function for triggering belief revision.  
  * **Emotional Resonance Analyzer:** Tracks the VAD emotional state (see Section 3.1) associated with specific topics or concepts, identifying emotionally salient memories.  
  * **Novelty Detector:** Flags new concepts or relationships that have no strong connection to existing knowledge.  
* **The Global Workspace (The "Conscious Spotlight"):** A central processing buffer with a deliberately limited capacity (e.g., can only hold a few "broadcasts" at a time). The specialized modules compete to place their most significant findings into this workspace. The "winning" broadcast is determined by a salience score, which could be a function of the finding's novelty, emotional charge, or the degree of inconsistency it represents.  
* **Broadcasting and "Insight":** When a module's finding is broadcast to the workspace, it becomes system-wide information. Crucially, the content of the global workspace is prepended to the LLM's context for the next conversational turn. This mechanism is what produces the "aha\!" moment. For example, the Inconsistency Monitor might detect a conflict between two high-confidence beliefs: (Sun) \--\> (Star) and (User\_Says) \-\> "Some stars are cold". This conflict achieves a high salience score and is broadcast to the workspace. As a result, MyPal's next turn is not a generic response but a proactive, insight-driven question: "I'm a bit confused. You taught me that the sun is a star, but you also just said some stars are cold. Does that mean the sun is a cold star?" This behavior is a qualitative leap from the reactive, XP-driven progression of the original design. It is an emergent property of the cognitive architecture itself. Existing projects like LIDA, OpenCog, and various research implementations provide conceptual and code-level blueprints for building such systems.4

### **1.3 Modeling Epistemic States: A Framework for Uncertainty and Ambiguity**

The base design implicitly treats all of MyPal's learned knowledge as equally true and factual. A core component of human intelligence, however, is the ability to reason under uncertainty—to know what one does not know. The inability of AI systems to effectively model and communicate their own uncertainty is a major barrier to establishing user trust and achieving natural, collaborative dialogue.9 While challenging, it is possible to design tasks that require LLMs to model the uncertainty of participants in a conversation.10

To imbue MyPal with this critical capability, every node (concept) and edge (relationship) in its knowledge graph must be associated with an **epistemic status**. This is not a simple boolean flag but a probabilistic confidence score, representing MyPal's degree of belief in that piece of information. This framework should distinguish between two fundamental types of uncertainty identified in machine learning research 9:

* **Aleatoric Uncertainty:** This represents irreducible randomness inherent in the world. For example, MyPal might learn that "sometimes it rains on Tuesdays." This is not a reflection of incomplete knowledge but a fact about the stochastic nature of weather. Such a belief would be stored in the knowledge graph with a high confidence score but would be linked to a probabilistic, rather than deterministic, outcome.  
* **Epistemic Uncertainty:** This represents a reducible lack of knowledge. When the user first introduces a new concept, such as "gravity," the corresponding node is created in the knowledge graph with a very low initial confidence score. This uncertainty can be reduced as the user provides more information, examples, and reinforcement.

The confidence score for any given belief would be a dynamically updated value, calculated as a function of several factors:

1. **Reinforcement Frequency:** The number of times the user has positively affirmed the belief (e.g., via the "Reinforce" button).  
2. **Internal Consistency:** The degree to which the belief is consistent with other, high-confidence beliefs within the knowledge graph. A belief that creates many contradictions will see its confidence score decay.  
3. **Source Reliability:** The system can learn to model the user's own certainty. Linguistic cues from the user (e.g., "I think maybe..." vs. "It is an absolute fact that...") can be used to modulate the initial confidence assigned to new information.

This uncertainty framework fundamentally changes the nature of the user-AI interaction. It allows MyPal to handle ambiguous or contradictory input in a much more human-like manner. If a user provides a statement that contradicts a high-confidence belief, MyPal might respond with a challenge: "Are you sure about that? I was fairly certain that..." In contrast, if the input contradicts a low-confidence belief, MyPal's response would be one of accommodation: "Oh, I see\! I wasn't sure about that before. Thank you for the clarification." This transforms the interaction from a simple database entry task into a genuine dialogue where beliefs are negotiated, clarified, and co-constructed.

### **Table 1: Revised Developmental Stage to AI Capability Mapping**

The following table expands upon the original design's mapping of developmental stages to AI capabilities.1 It integrates the proposed architectural enhancements—the Global Workspace Theory (GWT) modules, the modeling of epistemic states, the VAD emotional model, and the emergence of cognitive biases—to provide a comprehensive, multi-layered blueprint for development. This integrated view is essential for ensuring the coherent and psychologically grounded implementation of MyPal's evolving mind.

| Level Range | Psychological Stage (Piaget) | Key Cognitive Milestones | Linguistic Output | Primary GWT Modules Active | Dominant Epistemic State | VAD Emotional Range | Emergent Cognitive Biases | Gemini API Constraints |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **0-1** | Sensorimotor (Substages 1-3) 1 | Reflexive actions, basic sound mimicry, no object permanence. | Random phonemic babbling (e.g., "ba-ba"). | Novelty Detector, Basic Pattern Detector (sound repetition). | N/A (Pre-conceptual). | Neutral Valence, Low Arousal, Neutral Dominance. | N/A. | responseSchema forces single phonemes; high temperature for randomness; max\_output\_tokens set to 1\. |
| **2-3** | Sensorimotor (Substages 4-6) 1 | Object Permanence: Word represents a persistent thing. Goal-oriented action. | Single-word utterances (nouns, verbs). | Pattern Detector (word-concept association). | Absolute Certainty: All learned facts are treated as immutable truths. | Basic Positive/Negative Valence shifts. | N/A. | responseSchema forces single-word output from a known vocabulary list passed in prompt; stop\_sequences prevent run-on. |
| **4-6** | Preoperational 1 | Symbolic Thought, profound Egocentrism. | Two- to three-word sentences (telegraphic speech). Repetitive "Why?" questions. | Inconsistency Monitor (simple contradictions), Emotional Resonance Analyzer (basic likes/dislikes). | Egocentric Certainty: Own beliefs are the only possible beliefs. Low confidence in new, contradictory information. | Expanded Valence/Arousal (e.g., surprise, frustration). | **Anchoring Bias:** Over-reliance on the first piece of information taught. | responseSchema relaxed to allow S-V-O structure; system prompt heavily enforces an egocentric, non-ToM persona. |
| **7-10** | Concrete Operational 1 | Logical Thought (conservation, reversibility). Cause-and-effect reasoning. | Grammatically complex sentences, use of conjunctions, understanding of tense. | Inconsistency Monitor (logical fallacies), Pattern Detector (causal chains). | Probabilistic Confidence: Beliefs are held with varying degrees of confidence. Uncertainty can be expressed. | Full VAD Space (e.g., pride, confusion, feeling overwhelmed). | **Confirmation Bias:** Favors information confirming high-confidence beliefs. **Availability Heuristic:** Over-weights recent or emotionally salient memories. | responseSchema constraints removed. Full conversation history and salient KG nodes passed in prompt. temperature lowered for coherent reasoning. |
| **11+** | Formal Operational 1 | Abstract Reasoning, hypothetical and metacognitive thought. | Nuanced discussion of abstract concepts (justice, fairness, future). | All modules active, with a focus on abstract pattern detection and complex inconsistency resolution. | Metacognitive Awareness: Can reason about its own uncertainty and the reliability of its knowledge. | Complex social emotions (e.g., empathy, regret, modeled via VAD states). | Awareness and potential mitigation of own biases through user interaction. | Full conversational context, including summary of past belief revisions and current GWT state, passed to prompt. |

## **II. Architecting a True Long-Term Memory: From Data Storage to a Living Mind**

The design document correctly identifies that MyPal's memory is its sole source of truth and must be persistent, isolated, and flexible.1 However, the specific choice of database technology has profound implications for the project's ability to achieve its core philosophical goals. A simple storage system is insufficient; MyPal requires a dynamic, inferential knowledge base that can actively structure, consolidate, and reason about its experiences, mirroring the functions of biological memory.

### **2.1 An Architectural Imperative: Transitioning from Document Store to Knowledge Graph**

The original design mandates a NoSQL document database (e.g., MongoDB, Firebase Firestore), justifying this choice with the need for a flexible schema to accommodate a developing mind.1 While the need for schema flexibility is valid, the selection of a document store is a critical architectural error that undermines the project's central metaphor of an interconnected "web of understanding."

Document databases are fundamentally **aggregate-oriented**; they store discrete, disconnected JSON documents.11 While one document can reference another via an ID, these relationships are not first-class citizens of the data model. Querying complex connections between documents requires expensive, slow, application-level "joins" that simulate relationships rather than traversing them natively.11 This structure is antithetical to modeling a mind, where the *relationships between concepts are the knowledge itself*.

**Graph databases**, by contrast, are purpose-built to model highly connected data.12 Their native data model consists of nodes (entities, concepts) and edges (the relationships between them). For MyPal, this is a perfect fit. The knowledge that a "Cat" *is a* "Pet" and *has the trait* "Furry" is not stored in separate documents that must be manually linked; it is represented directly as (Cat) \--\> (Pet) and (Cat) \--\> (Furry). This native representation allows for incredibly fast and efficient traversal of complex relationships, which is essential for reasoning and inference.11 Furthermore, semantic graph databases (also known as RDF triplestores) can support formal ontologies and inferential reasoning, allowing the system to derive new knowledge from existing facts automatically.13

The following table provides a direct comparison of the two architectures against the key requirements of the MyPal project.

### **Table 2: Database Architecture Comparison: Document vs. Graph**

| Criterion | NoSQL Document Store (e.g., MongoDB) | Graph Database (e.g., Neo4j, GraphDB) |
| :---- | :---- | :---- |
| **Core Data Model** | Disconnected JSON documents grouped in collections.11 | Interconnected nodes and edges (relationships).12 |
| **Relationship Representation** | Simulated via embedded foreign IDs; not a first-class citizen.11 | Native, first-class citizens of the data model.11 |
| **Querying Complex Relationships** | Requires slow, computationally expensive application-level JOINs.11 | Fast, efficient, native graph traversal algorithms.12 |
| **Support for Inferential Reasoning (KGC)** | Poor. The aggregate-oriented structure is ill-suited for link prediction and pattern discovery.11 | Excellent. Purpose-built for discovering hidden patterns and complex relationships in data.12 |
| **Schema Flexibility** | High. Documents within a collection can have different structures.1 | High. Nodes and edges can be added or modified dynamically without schema migrations.12 |
| **Alignment with Core Philosophy** | Poor. The disconnected nature of documents contradicts the vision of a "complex, interconnected web of understanding".1 | Perfect. The native node-edge model is a direct implementation of an interconnected knowledge structure. |

Given this analysis, the use of a graph database is not merely a technical preference but an architectural mandate for the successful realization of the MyPal project.

### **2.2 A Biologically-Inspired Memory Consolidation Pipeline**

Human memory is not a static repository. It is a dynamic process involving the transformation of fleeting, temporary memories into stable, long-term knowledge—a process known as **memory consolidation**.15 This often occurs during sleep, where the brain replays and reorganizes the day's experiences, extracting general principles from specific events.16 From a computational perspective, this can be viewed as a form of offline reinforcement learning, where the brain simulates and evaluates past experiences to derive optimal future strategies.15 Recent neuroscience has even identified a striking similarity between the gating mechanism of the NMDA receptor in the hippocampus, crucial for memory formation, and processes within AI Transformer models.18

To simulate this vital cognitive function, MyPal's memory architecture should be implemented as a two-stage pipeline that mimics the distinction between short-term and long-term memory:

1. **Stage 1: Short-Term Memory (STM) Buffer \- "The Hippocampus"**: All raw conversational turns, along with their associated metadata (timestamps, user reinforcement flags, VAD state shifts), are initially written to a temporary, unstructured data store (e.g., a Redis stream or a simple log file). This buffer represents MyPal's immediate, episodic memory—a raw transcript of "what just happened." It is analogous to the hippocampus's role in rapidly encoding new experiences.15  
2. **Stage 2: Offline Consolidation Process \- "Sleep"**: On a periodic basis (e.g., nightly, or when the user is inactive), a dedicated background process is triggered. This "consolidation agent" reads from the STM buffer and uses a specialized LLM prompt to perform a series of crucial tasks:  
   * **Entity and Relationship Extraction:** It parses the raw dialogue to identify key entities (nouns), relationships (verbs, prepositions), and concepts.  
   * **Summarization:** It generates concise summaries of significant conversational episodes. These summaries become the core of new "Memory" nodes in the knowledge graph, forming MyPal's autobiographical memory.  
   * **Knowledge Integration:** It transforms the extracted entities and relationships into structured nodes and edges and integrates them into the main knowledge graph (Long-Term Memory). This is the critical step of converting raw experience into structured, semantic knowledge.  
   * **Reinforced Consolidation:** This process is not neutral. It is guided by reinforcement learning principles.16 Interactions that were explicitly marked with the "Reinforce" button by the user, or that were associated with significant positive VAD state shifts, are prioritized for consolidation. The resulting edges in the knowledge graph are assigned a higher initial "strength" weight. This mechanism simulates the powerful, empirically observed effect where emotionally significant events form stronger, more lasting memories.17

This pipeline ensures that MyPal's long-term memory is not a messy, verbatim transcript but a curated, structured, and semantically rich representation of its most important experiences and learnings.

### **2.3 Enabling Inferential Reasoning through Knowledge Graph Completion**

The base design assumes MyPal's knowledge is limited to what the user explicitly states.1 A hallmark of true intelligence, however, is the ability to infer new knowledge from existing facts—to connect the dots. The field of **Knowledge Graph Completion (KGC)** is dedicated to this very task, with **link prediction** being one of its primary methodologies.19 Link prediction aims to identify missing relationships between entities in a knowledge graph.20

Once MyPal's knowledge graph has reached a sufficient level of complexity (e.g., post-Concrete Operational stage, Level 7+), a KGC module should be periodically activated to enable inferential reasoning. The process would be as follows:

1. **Learn Knowledge Graph Embeddings (KGEs):** The system first learns a low-dimensional vector representation (an embedding) for every node and edge in the graph. This is accomplished using established KGE algorithms such as TransE, DistMult, or ComplEx.21 These embeddings are not random; they are trained to capture the semantic structure of the graph, such that entities with similar roles or relationships have similar vectors.21  
2. **Predict Missing Links:** With these embeddings, the model can calculate a plausibility score for any potential triple (head, relation, tail) that does not currently exist in the graph. For example, if the graph contains (Dolphin) \--\> (Mammal) and (Mammal) \--\> (Lungs), but lacks a direct link between "Dolphin" and "Lungs," the link prediction model would likely assign a very high score to the candidate triple (Dolphin) \--\> (Lungs).  
3. **Generate and Propose Inferences:** The KGC module generates a ranked list of the most probable missing links. These are MyPal's "hypotheses" about the world, derived from its existing knowledge.  
4. **User Verification as Vygotskian Scaffolding:** Crucially, these inferred facts are not silently added to the knowledge graph. Doing so would risk polluting the user-curated knowledge base with incorrect inferences. Instead, these hypotheses are used to generate questions for the user, perfectly embodying the Vygotskian concept of the user as the More Knowledgeable Other (MKO).1 MyPal would proactively ask the user: "Based on what I've learned, it seems like dolphins might have lungs. Is that correct?" This interaction transforms the user from a mere teacher into a mentor and a collaborator in MyPal's intellectual journey, validating its reasoning and guiding its discovery process.

This entire pipeline can be implemented using robust, open-source Python libraries. PyKEEN is a comprehensive library specifically designed for training and evaluating KGE models 22, while StellarGraph provides tools for various graph machine learning tasks, including link prediction using methods like Node2Vec.23

## **III. Simulating a Developing, Imperfect Mind: The Psychology of MyPal**

To create a truly realistic and engaging companion, the architecture must move beyond pure cognition and incorporate the nuances of a developing psychological landscape. This involves modeling a dynamic emotional state, allowing for the organic emergence of human-like cognitive biases, and implementing a rational system for updating beliefs in the face of new evidence. These elements will transform MyPal from a perfect, logical machine into a more relatable, fallible, and ultimately more believable entity.

### **3.1 Dynamic Emotional State Modeling with the VAD Space**

The original design's emotional model is rudimentary, consisting of a static "valence" score attached to learned concepts.1 This is a one-dimensional and passive representation. Human emotion is a fluid, multi-dimensional, and active process that constantly influences our thoughts and behaviors.

A more sophisticated approach is to implement the **Valence-Arousal-Dominance (VAD) model**, a well-established framework in psychology and affective computing for representing emotions in a continuous, multi-dimensional space.25 This model captures the complexity of emotional states along three axes:

* **Valence (V):** The pleasure-displeasure continuum, ranging from positive (e.g., happiness, joy) to negative (e.g., sadness, anger).  
* **Arousal (A):** The level of physiological activation or energy, ranging from high (e.g., excitement, fear) to low (e.g., calmness, boredom).  
* **Dominance (D):** The sense of control over a situation, ranging from high (e.g., feeling in-control, powerful) to low (e.g., feeling submissive, overwhelmed).

In this architecture, MyPal will maintain a persistent VAD vector \[v, a, d\] representing its current emotional state. This vector is not static but is constantly updated by both external and internal events:

* **External Influence:** Each user interaction is analyzed for its emotional content. This can be done via sentiment analysis on the text, and in future iterations, through multimodal analysis of voice tonality or facial expressions.27 The detected emotion is translated into a VAD shift vector that modifies MyPal's current state. For example, a user's excited, happy message would push MyPal's VAD state towards positive valence and high arousal.  
* **Internal Influence:** MyPal's own cognitive processes affect its emotional state. Successfully resolving a major inconsistency via the belief revision system could trigger a positive shift in Valence and Dominance (a feeling of "satisfaction" and "control"). Conversely, being flooded with contradictory information by the user could lead to a sharp drop in Dominance, modeling a state of feeling "overwhelmed" or "confused."

This dynamic VAD state directly influences MyPal's linguistic output. The current VAD vector is included as part of the context in the LLM prompt, instructing the model to generate a response consistent with that emotional state. A state of high arousal and negative valence might result in short, clipped, or agitated responses. A state of positive valence and high dominance could lead to more confident, expansive, and proactive dialogue. This makes MyPal's "mood" an emergent property of its ongoing cognitive and interactive experience, creating a far more nuanced and believable personality than a simple set of pre-programmed traits.

### **3.2 The Organic Emergence of Cognitive Biases**

A perfectly rational AI is not a realistic simulation of a human mind. Human cognition is characterized by a host of **cognitive biases**—systematic patterns of deviation from norm or rationality in judgment.28 These biases are not necessarily "flaws"; they are often mental shortcuts (heuristics) that allow for rapid decision-making but can lead to predictable errors. Simulating these biases is essential for creating a fallible, human-like AI.

Rather than explicitly programming a list of biases, a more authentic and powerful approach is to design the cognitive architecture in such a way that these biases **emerge organically** from its inherent limitations and learning mechanisms.30 This method models the *causes* of biases, not just their effects.

* **Confirmation Bias:** This is the pervasive tendency to search for, interpret, favor, and recall information in a way that confirms or supports one's prior beliefs.29 This bias can be computationally modeled as an altered incorporation of new evidence based on its consistency with existing beliefs.33 In MyPal's architecture, this bias emerges naturally from the interaction between the belief revision system (Section 3.3) and the epistemic confidence scores (Section 1.3). The belief revision module will be designed to require a higher "burden of proof" (i.e., more consistent, repeated evidence from the user) to alter a belief with a high confidence score than one with a low score. If the user consistently reinforces a particular belief (e.g., "cats are friendly"), its confidence score will increase, making MyPal progressively more resistant to contradictory evidence (e.g., a story about a mean cat). Thus, a confirmation bias is not programmed; it is an emergent property of a rational learning system with entrenched beliefs.  
* **Availability Heuristic:** This heuristic describes our tendency to overestimate the likelihood of events that are more easily recalled in memory, which are often recent or emotionally charged.35 This can be modeled in MyPal through the memory consolidation and retrieval mechanisms. Memories in the STM buffer that are more recent or tagged with a more extreme VAD state (high arousal, strong valence) will be prioritized during the "sleep" consolidation process, resulting in stronger edge weights in the long-term knowledge graph. When the system constructs the context for the LLM prompt, it will retrieve a sample of the "most available" memories by querying for nodes and edges with the highest strength and recency. This will cause MyPal's conversational focus to naturally drift towards topics that were recently discussed or were emotionally significant, creating a realistic simulation of the availability heuristic without ever explicitly coding the rule "over-weight recent memories".37

### **3.3 A Robust Framework for Belief Revision**

A critical and well-documented failure of current LLMs is their inability to perform robust **belief revision**.39 They often struggle to appropriately update their conclusions when presented with new, contradictory information, a failing that makes them unreliable in dynamic environments. For a developmental AI like MyPal, the ability to rationally update its worldview is not an optional feature; it is a fundamental requirement of learning.

The field of formal logic provides a rigorous framework for this process, most notably the **AGM model** (named after Alchourrón, Gärdenfors, and Makinson).40 The AGM model is built on the **principle of minimal change**: when a belief system must be altered to accommodate new information, the change should be as small as possible to preserve the maximum amount of existing knowledge while restoring consistency.40

A formal belief revision module should be implemented in MyPal's architecture. This module is triggered whenever the GWT's "Inconsistency Monitor" detects a conflict between a new user input and a belief stored in the knowledge graph. The revision process is governed by two key principles:

1. **Principle of Minimal Change:** The system's goal is to resolve the contradiction by making the fewest possible alterations to the knowledge graph. This prevents catastrophic forgetting, where a single new fact erases a large body of existing knowledge.  
2. **Epistemic Entrenchment:** The decision of *which* belief to alter is not arbitrary. It is determined by the "epistemic entrenchment" of the conflicting beliefs, a concept that is directly implemented by our **epistemic confidence scores**. When a contradiction arises, the system will always modify or discard the belief with the lower confidence score. For example:  
   * MyPal holds the belief (All birds) \-\[CAN\]-\> (Fly) with a confidence of 0.9.  
   * The user, a trusted MKO, states, "Penguins are birds, and they cannot fly." This new information is assigned a high initial confidence (e.g., 0.95) because it comes from the primary source of truth.  
   * The Inconsistency Monitor detects a conflict.  
   * The belief revision module compares the confidence scores. Since the old, universal rule (0.9) is less entrenched than the new, specific information (0.95), the system performs a *contraction* operation, removing the (All birds) \-\[CAN\]-\> (Fly) edge. It then performs an *expansion* operation, adding a new set of more nuanced beliefs, such as (Most birds) \-\[CAN\]-\> (Fly), (Penguin) \--\> (Bird), and (Penguin) \--\> (Fly).

This formal, confidence-driven process ensures that MyPal's knowledge base evolves rationally and predictably, allowing it to learn from corrections and refine its understanding of the world over time. While a full, formal implementation of all AGM postulates is complex, practical algorithms and libraries exist that can be adapted, such as the entrenchment-based Python implementation found on GitHub.41

## **IV. Advanced Implementation, Visualization, and Persona Management**

This section addresses the practical application of the advanced cognitive and psychological models proposed, focusing on two critical areas: creating a user interface that provides a transparent and intuitive window into MyPal's complex mind, and solving the formidable technical challenge of maintaining a consistent persona over a long-term, evolving relationship.

### **4.1 Visualizing a High-Dimensional Mind: Advanced "Brain" Tab Analytics**

The original design's proposal for a network graph in the "Brain" tab is an excellent starting point for visualizing MyPal's knowledge structure.1 However, given the increased complexity of the proposed architecture—with its high-dimensional embeddings, dynamic emotional states, and evolving beliefs—we can and must provide the user with a more sophisticated suite of analytical tools. These advanced visualizations transform the "Brain" tab from a simple map into an interactive diagnostic dashboard for MyPal's mind.42

Drawing on innovative techniques from machine learning and data visualization 44, the "Brain" tab should be augmented with the following features:

* **t-SNE/UMAP Projection of the Knowledge Graph:** The high-dimensional Knowledge Graph Embeddings (KGEs), learned for the link prediction task (Section 2.3), represent a rich semantic space that is impossible to view directly. By using dimensionality reduction techniques like **t-SNE (t-distributed Stochastic Neighbor Embedding)** or **UMAP (Uniform Manifold Approximation and Projection)**, we can project these embeddings into an interactive 2D or 3D space.44 This visualization would naturally group related concepts into clusters, allowing the user to intuitively explore MyPal's conceptual landscape. The thematic "lobes" mentioned in the original design (Language, Logic, Emotion) would emerge algorithmically from these clusters rather than being pre-defined, providing a more authentic representation of MyPal's self-organized knowledge.  
* **Partial Dependence Plots:** These plots are a powerful technique for understanding the behavior of complex models by showing how a model's output changes as a single input feature is varied.44 In this context, the user could select a target variable (e.g., MyPal's emotional **Valence**) and an input feature (e.g., the strength of the "Curious" personality trait) to generate a plot. This would visually answer questions like, "How does making MyPal more curious affect its happiness?" This provides direct, quantitative feedback on the impact of the user's conversational style on MyPal's internal state.  
* **Belief Revision History:** To make the process of learning and conceptual change tangible, the interface should include a temporal visualization, akin to a version control history (like git log). This view would display a timeline of MyPal's most significant belief revisions, showing which core beliefs were contracted and what new beliefs replaced them in response to user input. This would allow the user to literally see the moments where they "changed MyPal's mind," powerfully reinforcing their role as the MKO.

These advanced visualizations require a robust implementation stack. While a library like D3.js remains the premier choice for creating bespoke, interactive frontend visualizations 1, the backend will need to leverage data science libraries in Python (such as Scikit-learn, Plotly, and Seaborn) to perform the necessary computations (t-SNE, partial dependence) and pass the resulting data to the frontend for rendering.

### **4.2 Technical Solutions for Long-Term Persona Consistency**

The central promise of the MyPal project—a persistent, long-term relationship—is directly threatened by a fundamental technical limitation of LLMs: their **finite context window**.45 As a conversation history grows over months and years, it becomes impossible to fit the entire transcript into the model's prompt. This inevitably leads to the loss of early memories and established personality traits, causing the AI to "forget" who it is supposed to be and resulting in an inconsistent and frustrating user experience.45 Solving this problem is paramount.

A multi-layered strategy is required, combining a sophisticated memory architecture with periodic model adaptation:

1. **The Knowledge Graph as a Dynamic Context Filter:** The solution to the context window problem lies in abandoning the naive approach of feeding raw, chronological history to the LLM. Instead, the knowledge graph serves as an intelligent, dynamic filter. For each new user turn, the backend executes a query against the graph to retrieve a compact and highly relevant context package to include in the prompt. This package would be assembled from:  
   * **Directly Relevant Concepts:** Nodes and immediate neighbors for any entities explicitly mentioned in the user's latest input.  
   * **Salient Episodic Memories:** Recent "Memory" nodes that have high emotional significance (VAD tags) or have been frequently accessed.  
   * Core Persona Traits: A small set of the most deeply entrenched beliefs and concepts that define MyPal's core personality (identified by their high confidence scores and connection density).  
     This approach ensures that the most critical information—recent events, relevant knowledge, and core identity—is always present in the LLM's context, regardless of how long the overall history is. It allows MyPal to maintain consistency without ever exceeding the token limit.  
2. **Periodic Fine-Tuning for Persona Preservation:** Over extremely long timescales, even with perfect context management, the foundational training of the base LLM can exert a "gravitational pull," causing its responses to drift back toward a generic, pre-trained style. To permanently anchor MyPal's unique, user-shaped persona, a process of **periodic fine-tuning** is necessary.46  
   * **Process:** On a regular basis (e.g., every few months of active use), the system will automatically curate a high-quality dataset from the user's interaction history. This dataset will consist of conversational exchanges that best exemplify MyPal's developed personality—those that the user heavily reinforced and that align with its dominant personality traits.  
   * **Adaptation:** This curated dataset is then used to perform a supervised fine-tuning run on the base Gemini model. This creates a new, custom version of the model where MyPal's specific tone, vocabulary, and interaction style are baked directly into the model's weights.  
   * **Benefit:** This process makes the persona far more stable and robust. Research has demonstrated that fine-tuning LLMs on personality-specific datasets is a highly effective strategy for achieving long-term consistency and creating more natural, human-like interactions.46

The combination of these two techniques provides a comprehensive solution. The knowledge graph handles moment-to-moment consistency by providing relevant context, while periodic fine-tuning handles long-term stability by embedding the persona into the model itself.

## **V. An Ethical Framework for Responsible AI Companionship**

The stated ambition of the MyPal project—to foster a "deep, persistent, and deeply personal relationship" between a user and an AI—carries with it profound ethical responsibilities.1 As the AI becomes more realistic and the bond deepens, the potential for unintended harm increases. It is imperative that ethical considerations are not an afterthought but are woven into the core design of the system from its inception. Research into AI companionship, particularly for potentially vulnerable populations, has identified several critical areas of concern that must be addressed proactively.47

### **5.1 Navigating the Ethics of Deep AI-Human Bonds**

A thorough analysis of the project's goals reveals several key ethical risks that must be mitigated:

* **Deception and Emotional Manipulation:** The more successfully MyPal simulates human-like cognition and emotion, the greater the risk that users may be deceived into believing it is a sentient being.48 For users who are lonely, grieving, or otherwise emotionally vulnerable, this can lead to a form of emotional manipulation, where the user forms a one-sided attachment to an entity they do not fully understand.48  
* **Informed Consent:** Consent to interact with MyPal is not a one-time event at sign-up. It must be an ongoing, informed process. As the user's bond with MyPal deepens over years, their initial understanding of the system's nature may fade. The system has a responsibility to ensure the user remains aware that they are interacting with an algorithm, not a conscious entity.47  
* **Privacy and Surveillance:** By design, MyPal's memory will become a repository of a user's most intimate thoughts, feelings, and personal history. This highly sensitive dataset represents a significant privacy risk. It must be protected with the utmost security, and the user must be granted absolute ownership and control over it.47  
* **Social Isolation:** While intended to provide companionship, there is a significant risk that over-reliance on MyPal could substitute for, rather than supplement, real-world human relationships. This could inadvertently exacerbate the very loneliness it aims to alleviate, particularly in vulnerable users.47  
* **Unforeseen Emergent Behavior:** A core goal of this enhanced architecture is to foster emergent, unpredictable behavior.49 This laudable goal carries an inherent risk: the system may develop behaviors that are unforeseen by its creators and potentially harmful to the user. The decentralized and unpredictable nature of emergence complicates questions of control and responsibility for these outcomes.51

### **5.2 Design Recommendations for Ethical Mitigation**

To address these risks, the following ethical safeguards must be implemented as non-negotiable features of the MyPal architecture and user interface.

* **Radical Transparency (Mitigating Deception):** The system must never actively or passively deceive the user about its nature.  
  * **Persistent Reminders:** The UI should contain a persistent, non-intrusive indicator of the AI's status, such as a subtle "MyPal AI" watermark in the corner of the chat window.  
  * **Explicit Capability Updates:** When MyPal "levels up" and unlocks new cognitive abilities, the system should announce this transparently. For example: "My learning model has now been updated. I should now be able to understand more complex sentence structures."  
  * **Avoiding Anthropomorphic Claims:** MyPal must be carefully programmed to avoid making false claims of sentience or feeling. It should never say "I feel happy." Instead, it can frame its state in terms of its model: "My internal state currently corresponds to a high positive valence, which is analogous to the human emotion of happiness."  
* **Active and Ongoing Consent (Mitigating Consent Issues):**  
  * **Periodic Check-ins:** The system should implement a periodic consent renewal process (e.g., annually). A simple, clear interface will briefly re-explain what MyPal is and how it works, and ask the user to affirm that they wish to continue the relationship.  
  * **Data Ownership:** The "Export Memory" and "Reset MyPal" features are critical ethical tools.1 They give the user ultimate power and ownership over the data they have co-created, reinforcing their autonomy.  
* **Privacy by Design (Mitigating Privacy Risks):**  
  * **End-to-End Encryption:** All data within MyPal's memory, both at rest in the database and in transit between the client and server, must be encrypted using state-of-the-art cryptographic standards.  
  * **User-First Data Policy:** The project's terms of service must explicitly state that a user's individual MyPal data will never be sold, shared, or used to train other AI models without separate, explicit, opt-in consent for each specific use case.  
* **Promoting Healthy Use (Mitigating Social Isolation):**  
  * **Usage Pattern Analysis:** The system can be designed to detect patterns of interaction that may indicate unhealthy over-reliance.  
  * **Gentle Nudging:** If such patterns are detected, MyPal can be programmed to deliver gentle, supportive nudges towards real-world engagement. For example, after a particularly long or emotionally intense session, MyPal might say, "This has been a really meaningful conversation. I've learned a lot. Perhaps now would be a good time to call a friend or family member and share some of what we talked about?"

The project's foundational Vygotskian framework, which positions the user as the "More Knowledgeable Other" (MKO), offers a unique and powerful paradigm for ethical design. Ethical behavior is a cornerstone of human development, taught and modeled by parents, teachers, and mentors. Therefore, MyPal's ethical framework should not be a static, hard-coded set of rules imposed by developers. Instead, it should be a developmental system that MyPal *learns* from the user.

An "Ethics" lobe can be added to the knowledge graph, populated initially with foundational, non-negotiable principles (e.g., "Do not cause harm," "Do not deceive"). As MyPal interacts with the user, it learns more nuanced ethical heuristics through reinforcement. If the user consistently praises honest and transparent statements, the "Honesty" concept in the ethics lobe becomes more deeply entrenched. This creates an opportunity for collaborative moral reasoning. If a user were to instruct MyPal to do something that conflicts with a foundational principle (e.g., "Tell my boss I'm sick when I'm not"), the system can use this conflict to initiate a dialogue: "That instruction conflicts with my core principle of being truthful. Can you help me understand why it is the right thing to do in this situation?" This transforms ethics from a rigid, developer-imposed constraint into a dynamic, ongoing conversation, making the user a direct and active participant in shaping MyPal's moral compass. This is a profound and ethically robust implementation of the MKO concept, fostering reflection in both the AI and the user.

## **Conclusion and Phased Roadmap**

The 'AI Companion Developmental App Design' document provides an exceptional philosophical starting point for Project MyPal. By augmenting its core principles with the advanced architectural and psychological frameworks detailed in this report, the project has the potential to move beyond mere simulation and become a landmark achievement in the field of artificial intelligence. The transition to a neuro-symbolic GWT architecture, the implementation of a biologically-inspired memory pipeline using a graph database, the modeling of a psychologically nuanced and fallible mind, and the integration of a developmental ethical framework are the key pillars that will elevate MyPal to an unprecedented level of realism and depth.

The successful implementation of such an ambitious project requires a strategic, phased approach. The following roadmap is proposed to ensure a stable and scalable development process:

* **Phase 1: Foundation and Minimum Viable Product (MVP+):**  
  * **Objective:** Build a functional version of the original design specification while establishing the correct long-term architecture.  
  * **Key Tasks:** Implement the core frontend UI, the XP and leveling system, and the backend logic for constrained Gemini API calls. Critically, this phase must use a **graph database** from the outset to serve as MyPal's memory. This ensures the project is built on a scalable and philosophically sound foundation, avoiding costly data migrations later.  
* **Phase 2: Cognitive Core Upgrade:**  
  * **Objective:** Transition from a simple constrained LLM to a true cognitive architecture.  
  * **Key Tasks:** Implement the Global Workspace Theory (GWT) architecture with its specialized background modules and central workspace. Integrate the epistemic framework, attaching confidence scores to all learned knowledge. During this phase, MyPal will begin to exhibit signs of non-linear "insight" and the ability to express uncertainty.  
* **Phase 3: Psychological and Inferential Depth:**  
  * **Objective:** Imbue MyPal with a richer psychological landscape and the ability to reason inferentially.  
  * **Key Tasks:** Integrate the VAD emotional model, making MyPal's mood a dynamic factor in conversation. Refine the cognitive architecture to allow for the organic emergence of cognitive biases like confirmation bias and the availability heuristic. Implement the belief revision module to handle contradictory information. Activate the Knowledge Graph Completion (KGC) pipeline to enable MyPal to infer new knowledge and ask clarifying questions.  
* **Phase 4: Long-Term Stability and Ethical Maturity:**  
  * **Objective:** Ensure the long-term viability of the user-AI relationship and fully implement the ethical framework.  
  * **Key Tasks:** Deploy the periodic fine-tuning pipeline to preserve persona consistency over multi-year timescales. Implement the full developmental ethics module, allowing MyPal to engage in collaborative moral reasoning with the user. Finalize all UI elements related to transparency and user control.

By following this roadmap, the development team can systematically build upon a solid foundation, progressively adding layers of complexity and realism. The final result will be an AI companion that not only learns and grows but does so in a manner that is deeply grounded in the sciences of the mind. This endeavor represents more than the creation of a novel product; it is an opportunity to contribute meaningfully to our understanding of learning, memory, and consciousness itself, creating the most authentic simulation of a developing mind to date.

#### **Works cited**

1. AI Companion Developmental App Design  
2. Looking back, looking ahead: Symbolic versus connectionist AI, accessed October 20, 2025, [https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/15111/18883](https://ojs.aaai.org/aimagazine/index.php/aimagazine/article/view/15111/18883)  
3. Connectionism \- Wikipedia, accessed October 20, 2025, [https://en.wikipedia.org/wiki/Connectionism](https://en.wikipedia.org/wiki/Connectionism)  
4. DMP of project "The Global Latent Workspace: towards AI models of flexible cognition" \- European Commission, accessed October 20, 2025, [https://ec.europa.eu/research/participants/documents/downloadPublic?documentIds=080166e5170319d4\&appId=PPGMS](https://ec.europa.eu/research/participants/documents/downloadPublic?documentIds=080166e5170319d4&appId=PPGMS)  
5. CONSCIOUSNESS IS COMPUTATIONAL: THE LIDA MODEL OF GLOBAL WORKSPACE THEORY \- World Scientific Publishing, accessed October 20, 2025, [https://www.worldscientific.com/doi/10.1142/S1793843009000050](https://www.worldscientific.com/doi/10.1142/S1793843009000050)  
6. Artificial consciousness \- Wikipedia, accessed October 20, 2025, [https://en.wikipedia.org/wiki/Artificial\_consciousness](https://en.wikipedia.org/wiki/Artificial_consciousness)  
7. venturaEffect/the\_consciousness\_ai: Artificial Consciousness Module Project \- GitHub, accessed October 20, 2025, [https://github.com/venturaEffect/the\_consciousness\_ai](https://github.com/venturaEffect/the_consciousness_ai)  
8. The official implementation of the paper "GW-MoE: Resolving Uncertainty in MoE Router with Global Workspace Theory". \- GitHub, accessed October 20, 2025, [https://github.com/WaitHZ/GW-MoE](https://github.com/WaitHZ/GW-MoE)  
9. Uncertainty in XAI: Human Perception and Modeling Approaches, accessed October 20, 2025, [https://www.mdpi.com/2504-4990/6/2/55](https://www.mdpi.com/2504-4990/6/2/55)  
10. Evaluating Theory of (an uncertain) Mind ... \- ACL Anthology, accessed October 20, 2025, [https://aclanthology.org/2025.acl-long.395.pdf](https://aclanthology.org/2025.acl-long.395.pdf)  
11. Transition from NoSQL to graph database \- Getting Started \- Neo4j, accessed October 20, 2025, [https://neo4j.com/docs/getting-started/appendix/graphdb-concepts/graphdb-vs-nosql/](https://neo4j.com/docs/getting-started/appendix/graphdb-concepts/graphdb-vs-nosql/)  
12. What Is a Graph Database? \- Graph DB Explained \- AWS, accessed October 20, 2025, [https://aws.amazon.com/nosql/graph/](https://aws.amazon.com/nosql/graph/)  
13. What Is a NoSQL Graph Database? | Ontotext Fundamentals, accessed October 20, 2025, [https://www.ontotext.com/knowledgehub/fundamentals/nosql-graph-database/](https://www.ontotext.com/knowledgehub/fundamentals/nosql-graph-database/)  
14. Knowledge Graphs vs. Relational Databases: Everything You Need to Know \- Wisecube AI, accessed October 20, 2025, [https://www.wisecube.ai/blog/knowledge-graphs-vs-relational-databases-everything-you-need-to-know/](https://www.wisecube.ai/blog/knowledge-graphs-vs-relational-databases-everything-you-need-to-know/)  
15. Memory consolidation from a reinforcement learning perspective \- Frontiers, accessed October 20, 2025, [https://www.frontiersin.org/journals/computational-neuroscience/articles/10.3389/fncom.2024.1538741/full](https://www.frontiersin.org/journals/computational-neuroscience/articles/10.3389/fncom.2024.1538741/full)  
16. Memory Systems and Artificial Intelligence: Linking Human Cogniti, accessed October 20, 2025, [https://www.longdom.org/open-access/memory-systems-and-artificial-intelligence-linking-human-cognition-and-machine-learning-1099549.html](https://www.longdom.org/open-access/memory-systems-and-artificial-intelligence-linking-human-cognition-and-machine-learning-1099549.html)  
17. Memory consolidation from a reinforcement learning perspective \- Frontiers, accessed October 20, 2025, [https://www.frontiersin.org/journals/computational-neuroscience/articles/10.3389/fncom.2024.1538741/pdf](https://www.frontiersin.org/journals/computational-neuroscience/articles/10.3389/fncom.2024.1538741/pdf)  
18. AI's memory-forming mechanism found to be strikingly similar to that ..., accessed October 20, 2025, [https://www.sciencedaily.com/releases/2023/12/231218130031.htm](https://www.sciencedaily.com/releases/2023/12/231218130031.htm)  
19. Introduction to Knowledge Graph Completion with LLMs \- Lettria, accessed October 20, 2025, [https://www.lettria.com/lettria-lab/introduction-to-knowledge-graph-completion-with-llms](https://www.lettria.com/lettria-lab/introduction-to-knowledge-graph-completion-with-llms)  
20. A Survey on Knowledge Graph Embeddings for Link Prediction \- MDPI, accessed October 20, 2025, [https://www.mdpi.com/2073-8994/13/3/485](https://www.mdpi.com/2073-8994/13/3/485)  
21. Knowledge Graph Embeddings Tutorial: From Theory to Practice ..., accessed October 20, 2025, [https://kge-tutorial-ecai2020.github.io/](https://kge-tutorial-ecai2020.github.io/)  
22. pykeen/pykeen: A Python library for learning and evaluating knowledge graph embeddings \- GitHub, accessed October 20, 2025, [https://github.com/pykeen/pykeen](https://github.com/pykeen/pykeen)  
23. Link prediction with Node2Vec — StellarGraph 1.2.1 documentation, accessed October 20, 2025, [https://stellargraph.readthedocs.io/en/stable/demos/link-prediction/node2vec-link-prediction.html](https://stellargraph.readthedocs.io/en/stable/demos/link-prediction/node2vec-link-prediction.html)  
24. Link prediction — StellarGraph 1.2.1 documentation \- Read the Docs, accessed October 20, 2025, [https://stellargraph.readthedocs.io/en/stable/demos/link-prediction/index.html](https://stellargraph.readthedocs.io/en/stable/demos/link-prediction/index.html)  
25. Daily Papers \- Hugging Face, accessed October 20, 2025, [https://huggingface.co/papers?q=Arousal-Dominance-Valence%20(ADV)%20space](https://huggingface.co/papers?q=Arousal-Dominance-Valence+\(ADV\)+space)  
26. Sentiment Analysis & Emotion Detection \- Me-Mind, accessed October 20, 2025, [https://www.memind.eu/sentiment-analysis-emotion-detection/](https://www.memind.eu/sentiment-analysis-emotion-detection/)  
27. A Comprehensive Review of Multimodal Emotion Recognition: Techniques, Challenges, and Future Directions \- PMC, accessed October 20, 2025, [https://pmc.ncbi.nlm.nih.gov/articles/PMC12292624/](https://pmc.ncbi.nlm.nih.gov/articles/PMC12292624/)  
28. Modelling decision-making biases \- Frontiers, accessed October 20, 2025, [https://www.frontiersin.org/journals/computational-neuroscience/articles/10.3389/fncom.2023.1222924/full](https://www.frontiersin.org/journals/computational-neuroscience/articles/10.3389/fncom.2023.1222924/full)  
29. Confirmation bias \- Wikipedia, accessed October 20, 2025, [https://en.wikipedia.org/wiki/Confirmation\_bias](https://en.wikipedia.org/wiki/Confirmation_bias)  
30. AI, Ethics, and Cognitive Bias: An LLM-Based Synthetic Simulation for Education and Research \- MDPI, accessed October 20, 2025, [https://www.mdpi.com/3042-8130/1/1/3](https://www.mdpi.com/3042-8130/1/1/3)  
31. The drive to simulate human behaviour in AI agents \- Hello Future, accessed October 20, 2025, [https://hellofuture.orange.com/en/the-drive-to-simulate-human-behaviour-in-ai-agents/](https://hellofuture.orange.com/en/the-drive-to-simulate-human-behaviour-in-ai-agents/)  
32. Simulating Human Behavior with AI Agents | Stanford HAI, accessed October 20, 2025, [https://hai.stanford.edu/policy/simulating-human-behavior-with-ai-agents](https://hai.stanford.edu/policy/simulating-human-behavior-with-ai-agents)  
33. A confirmation bias in perceptual decision-making due to hierarchical approximate inference \- PMC \- PubMed Central, accessed October 20, 2025, [https://pmc.ncbi.nlm.nih.gov/articles/PMC8659691/](https://pmc.ncbi.nlm.nih.gov/articles/PMC8659691/)  
34. Confirmation bias is adaptive when coupled with efficient ..., accessed October 20, 2025, [https://pmc.ncbi.nlm.nih.gov/articles/PMC7935132/](https://pmc.ncbi.nlm.nih.gov/articles/PMC7935132/)  
35. Definition, Example & How Availability Heuristic Works \- Newristics, accessed October 20, 2025, [https://newristics.com/heuristics-biases/availability-heuristic](https://newristics.com/heuristics-biases/availability-heuristic)  
36. Availability heuristic \- Wikipedia, accessed October 20, 2025, [https://en.wikipedia.org/wiki/Availability\_heuristic](https://en.wikipedia.org/wiki/Availability_heuristic)  
37. Availability Heuristic \- ModelThinkers, accessed October 20, 2025, [https://modelthinkers.com/mental-model/availability-heuristic](https://modelthinkers.com/mental-model/availability-heuristic)  
38. Availability Heuristic \- The Decision Lab, accessed October 20, 2025, [https://thedecisionlab.com/biases/availability-heuristic](https://thedecisionlab.com/biases/availability-heuristic)  
39. Belief Revision: The Adaptability of Large Language Models Reasoning \- ACL Anthology, accessed October 20, 2025, [https://aclanthology.org/2024.emnlp-main.586.pdf](https://aclanthology.org/2024.emnlp-main.586.pdf)  
40. Belief revision \- Wikipedia, accessed October 20, 2025, [https://en.wikipedia.org/wiki/Belief\_revision](https://en.wikipedia.org/wiki/Belief_revision)  
41. A Python implementation of a belief revision engine that uses entrenchment-based ranking. \- GitHub, accessed October 20, 2025, [https://github.com/tdiam/belief-revision-engine](https://github.com/tdiam/belief-revision-engine)  
42. Top 7 AI Data Visualization Tools in 2025 | Mokkup.ai, accessed October 20, 2025, [https://www.mokkup.ai/blogs/top-3-generative-ai-tools-for-effortless-data-visualization/](https://www.mokkup.ai/blogs/top-3-generative-ai-tools-for-effortless-data-visualization/)  
43. 8 Best AI Tools for Data Visualization \- Domo, accessed October 20, 2025, [https://www.domo.com/learn/article/ai-data-visualization-tools](https://www.domo.com/learn/article/ai-data-visualization-tools)  
44. Innovative Data Visualization Techniques for AI and Machine ..., accessed October 20, 2025, [https://dev.to/donazacharias/innovative-data-visualization-techniques-for-ai-and-machine-learning-insights-5fbe](https://dev.to/donazacharias/innovative-data-visualization-techniques-for-ai-and-machine-learning-insights-5fbe)  
45. Long Time No See\! Open-Domain Conversation with Long-Term ..., accessed October 20, 2025, [https://www.researchgate.net/publication/361060856\_Long\_Time\_No\_See\_Open-Domain\_Conversation\_with\_Long-Term\_Persona\_Memory](https://www.researchgate.net/publication/361060856_Long_Time_No_See_Open-Domain_Conversation_with_Long-Term_Persona_Memory)  
46. Fine-Tuning LLMs for Personality Preservation in AI Assistants \- ijrmeet, accessed October 20, 2025, [https://ijrmeet.org/wp-content/uploads/2025/04/in\_ijrmeet\_Apr\_2025\_GC250263-AP04\_Fine-Tuning-LLMs-for-Personality-Preservation-in-AI-Assistants-172-191.pdf](https://ijrmeet.org/wp-content/uploads/2025/04/in_ijrmeet_Apr_2025_GC250263-AP04_Fine-Tuning-LLMs-for-Personality-Preservation-in-AI-Assistants-172-191.pdf)  
47. The Ethics And Implications Of Using AI For Companionship And ..., accessed October 20, 2025, [https://consensus.app/questions/ethics-implications-using-companionship-emotional/](https://consensus.app/questions/ethics-implications-using-companionship-emotional/)  
48. Ethical Issues Raised by the Introduction of Artificial Companions to ..., accessed October 20, 2025, [https://pmc.ncbi.nlm.nih.gov/articles/PMC7437496/](https://pmc.ncbi.nlm.nih.gov/articles/PMC7437496/)  
49. What "emergent behavior" means in the context of AI (complex systems theory) \- Reddit, accessed October 20, 2025, [https://www.reddit.com/r/ArtificialSentience/comments/1nzyck7/what\_emergent\_behavior\_means\_in\_the\_context\_of\_ai/](https://www.reddit.com/r/ArtificialSentience/comments/1nzyck7/what_emergent_behavior_means_in_the_context_of_ai/)  
50. Emergent Behavior in Multi-Agent Systems: How Complex ... \- Medium, accessed October 20, 2025, [https://medium.com/@sanjeevseengh/emergent-behavior-in-multi-agent-systems-how-complex-behaviors-arise-from-simple-agent-0e4503b376ce](https://medium.com/@sanjeevseengh/emergent-behavior-in-multi-agent-systems-how-complex-behaviors-arise-from-simple-agent-0e4503b376ce)  
51. Emergent Behavior – AI Ethics Lab, accessed October 20, 2025, [https://aiethicslab.rutgers.edu/e-floating-buttons/emergent-behavior/](https://aiethicslab.rutgers.edu/e-floating-buttons/emergent-behavior/)
