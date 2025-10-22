# Quick TODO
Add these to the main todo list when available.

## Bugs - COMPLETED v0.2.1-alpha ✅
- ~~Neurons in the Neural Activity Monitor still populate on New Pals~~ - FIXED: Profile-specific neural.json isolation
- ~~Fix the "Save Changes" button in the Settings menu not working~~ - FIXED: Profile-specific settings persistence
- ~~Cannot open a Pal from the main menu after exiting an active Pal session~~ - FIXED: Card visibility on profile switch
- ~~upon entering the journal menu, thoughts do not automatically load until switching tabs~~ - FIXED: Auto-load thoughts tab
- ~~Graphs across the application are not rendering~~ - FIXED: Empty state handling for charts
- ~~Stop words (like "Are") and actions (like "*Blink*") becoming topics~~ - FIXED: Comprehensive stop words filter (100+ words)
- ~~Neural regeneration pulling data from other profiles~~ - FIXED: Profile validation with logging
- ~~Chat timeout after 30 seconds~~ - FIXED: Increased to 60 seconds

## Bugs - In Progress 🔧
- Knowledge graph showing "Nodes: 0 | Links: 0" when data exists - DEBUGGING: Added comprehensive logging

## UI and UX - Completed ✅
- ~~Reintroduce the web physics effects for draggable elements in the Knowledge Base graph view~~ - FIXED: Interactive physics restored with gentle forces

## UI and UX - Todo
- Upon creating a new Pal, have a welcome message or tutorial pop up to guide new users through initial steps. Animations or tooltips could enhance user engagement.
- Custom cursor styles.
- Implement an option to disable physics for performance reasons in Knowledge Base graph.
- Optimize the Knowledge Base UI design for better usability and aesthetics.
- Optimize the program for 1920x1080 resolution screens or similar aspect ratios.
- Stats window needs a redesign for better clarity and usability on desktop platforms with aspect ratios like 16:9.
- Allow the option to "pin" the chat windows so they stay on top of other windows.
- Fix dragging of chat window pop out. Upon moving the window, it jumps below the mouse cursor.

- Hovering over a Brain Region text in the "Neural Network" section should highlight the corresponding area in the "Neural Activity Monitor" graph and give a brief description of its function in a tooltip.
- Create a "Help" tab at the top to consolidate all help-related resources, FAQs, and tutorials for easy access. There should be sections for education on psychology, neurology, and developmental concepts used in MyPal.
- 


## Features
- Complete categorization in the journal feature for Thoughts, Ideas, Personality, People, and Interests.
- Enhance "single_word" mode to be only when there are words available to be used. If no words are available, it should default to "expression mode".

- Implement an "expression mode" where the Pal communicates using a combination of facial expressions, body language, and simple sounds or gestures instead of words. This mode would be useful for non-verbal communication or when the Pal is in a playful or emotional state. Example: 
  - Facial Expressions: *smiles*, *frowns*, *raises eyebrows*, *pouts*, etc.
  - Body Language: *nods*, *shakes head*, *shrugs shoulders*, etc.  
  - Sounds/Gestures: *giggles*, *sighs*, *claps hands*, *waves*, etc.
This needs to be integrated with the existing communication modes and should be selectable by the user. We need to determine, do all Pals have hands? What form does the Pal take? Humanoid? Animal-like? Robot-like?
- Implement a "mood ring" feature that visually represents the Pal's current emotional state using colors or icons. This could be displayed next to the Pal's name or avatar and would change dynamically based on the Pal's interactions and experiences. Can also be displayed in the Brain menu next to Emotion.
- Develop a system when certain features unlock like emotions, facial expressions, and body language as the Pal "develops" over time or reaches certain milestones. This could be tied to the Pal's age, experiences, or achievements within the app?