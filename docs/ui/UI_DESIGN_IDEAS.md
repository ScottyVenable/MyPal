# UI Design Ideas
This document outlines the design ideas and principles behind the user interface (UI) of the MyPal application. The goal is to create an intuitive, engaging, and visually appealing experience that enhances user interaction with their AI companion.


### Internal References:
- See [Style Design](STYLE_DESIGN_IDEA.md) for complementary style guidelines.

### External References:
- [Material Design Guidelines](https://material.io/design)
- [Google Fonts](https://fonts.google.com/)
- [Phosphor Icons](https://phosphoricons.com/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Microsoft Fluent Design System](https://www.microsoft.com/design/fluent/)


## Menus
This section describes the design ideas for the various menus within the MyPal application.

### Brain Menu

#### Neural Activity Visualization

A dynamic, real-time visualization of neural activity that provides users with insights into their AI companion's thought processes. Neurons will light up and connect as the AI processes information, creating an engaging and educational experience. The more active the AI, the more vibrant and complex the visualization becomes.

Neurons are represented as glowing nodes, with connections illustrated as animated lines. The color intensity and animation speed reflect the level of activity, allowing users to intuitively grasp their AI's cognitive state. See the design of the brain graph canvas.

#### Recent Memories
A scrollable list of recent memories, each represented by a card that includes a brief description, timestamp, and associated tags. Users can click on a memory card to replace the brain visualization with detailed information about that memory, including its context and significance. The user can then view more details, edit tags, or delete the memory. The design emphasizes clarity and ease of navigation, with a focus on helping users quickly find and manage their AI's memories. When a memory is in focus, the user has the option to "Return to Language Development" to go back to the main brain visualization.

✅ COMPLETED: Changed "Concepts" tab to "Knowledge Base" tab in the Brain Menu. See Feature [FEAT-007] in TODO v0.2.md

### Enhanced Neural Activity Visualization

A revolutionary real-time neural network visualization has been implemented that brings MyPal's cognitive processes to life:

#### Key Features Implemented:
- **Live Neuron Firing**: Real-time visualization of individual neurons firing as Pal processes thoughts
- **Brain Regions**: Seven anatomically-inspired regions (Sensory Input, Language Center, Association Cortex, Frontal Lobe, Amygdala, Memory Systems, Motor Output)
- **Interactive Exploration**: Click neurons to view details, trigger manual firing with CP cost
- **Neural Growth**: Watch new neurons grow when Pal levels up with celebratory animations
- **CP-Powered Triggering**: Spend Cognition Points to manually trigger neurons (2 CP) or entire regions (5 CP)
- **Real-time Activity Feed**: Recent neural events displayed in sidebar

#### Technical Implementation:
- WebSocket-based real-time communication between backend neural network and frontend visualization
- SVG-based interactive brain visualization with hover effects and click handlers
- Secure WebSocket connections (wss://) for HTTPS deployments
- Responsive design that adapts to different screen sizes
- Comprehensive neural event system with firing patterns, growth events, and manual triggers
