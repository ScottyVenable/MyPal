# Style Design
This document outlines the design ideas and principles behind the style of the MyPal application. The goal is to create a user-friendly, engaging, and visually appealing experience that aligns with the app's purpose of fostering interaction with an AI companion.

## Design Principles

1. **Simplicity**: The interface should be clean and uncluttered, allowing users to focus on their interactions with the AI.
2. **Consistency**: Visual elements, such as colors, fonts, and button styles, should be consistent throughout the app to create a cohesive experience.
3. **Accessibility**: The design should consider users with different abilities, ensuring that the app is usable for everyone.
4. **Feedback**: The app should provide clear feedback for user actions, helping them understand the results of their interactions.

## UI Framework

### Ursa Theme for Avalonia
MyPal leverages the **Ursa.Avalonia** theme library to provide a modern, professional UI experience. Ursa offers:
- Rich set of pre-built controls and themes
- Consistent design language across the application
- Enhanced user experience with polished animations and transitions
- Support for light/dark theme switching
- Professional-grade components optimized for desktop applications

**Integration**: 
- Repository: [Ursa.Avalonia](https://github.com/irihitech/Ursa.Avalonia)
- Used as the base theme layer with custom MyPal-specific styling overlays
- Provides foundation controls while maintaining brand identity through color customization

### Avalonia.Microcharts for Data Visualization
MyPal integrates **Avalonia.Microcharts** for lightweight, elegant statistical displays that complement the Ursa theme:
- Lightweight charting library specifically designed for Avalonia applications
- Clean, minimal chart designs that align with modern UI principles
- Perfect for displaying AI companion statistics and interaction metrics
- Seamless integration with Ursa's theming system and MyPal's color palette
- Responsive charts that adapt to different window sizes and themes

**Integration**:
- Repository: [Avalonia.Microcharts](https://github.com/AvaloniaCommunity/Avalonia.Microcharts)
- Used in the Stats tab for conversation metrics, mood tracking, and development progress
- Custom styling to match MyPal's soft blue/green color scheme
- Provides foundation for real-time data visualization without heavy dependencies

## Color Palette

The color palette for MyPal is designed to evoke a sense of calm and trust, integrated with Ursa's theming system. The primary colors are soft blues and greens, with accent colors for interactive elements.

- **Primary Colors**: Soft Blue (#A4D7E1), Soft Green (#B2E0B2)
- **Accent Colors**: Bright Yellow (#F6EB61), Coral (#FF6F61)
- **Theme Integration**: Colors are applied through Ursa's theme resource system for consistent application across all controls and Microcharts visualizations

## Typography

The typography should be modern and easy to read, utilizing Ursa's typography system while maintaining MyPal's character. The following fonts are recommended:

- **Headings**: 'Rounded Elegance', 30pt (applied through Ursa's heading styles)
- **Body Text**: 'Roboto Regular', 16pt (mapped to Ursa's body text styles)
- **Captions**: 'Roboto Light', 12pt (using Ursa's caption styles)

## UI Components

Ursa provides a comprehensive set of components that are customized for MyPal:

1. **Buttons**: Leveraging Ursa's button styles with MyPal color theming - rounded corners, subtle shadows, and consistent color scheme
2. **Input Fields**: Using Ursa's text input controls with custom styling - clear labels, ample padding, and enhanced focus states
3. **Cards**: Ursa's card components with MyPal theming - elevated surfaces with shadows, containing images and text
4. **Navigation**: Ursa's navigation controls adapted for MyPal's three-tab interface (Chat, Stats, Brain)
5. **Data Visualization**: Custom integration of Avalonia.Microcharts within Ursa's container components for lightweight, elegant statistical displays

## Iconography

Icons utilize Ursa's icon system combined with MyPal-specific iconography:

- **Base Icon System**: Ursa's built-in icon library for common UI elements
- **Custom Icons**: Material Icons and Font Awesome for MyPal-specific features
- **Consistency**: All icons follow Ursa's sizing and styling guidelines for visual coherence

## Theme Customization

MyPal extends Ursa's theming capabilities:
- Custom resource dictionaries defining MyPal-specific colors and styles
- Dark/light mode support through Ursa's theme switching with Microcharts theme adaptation
- Responsive design elements that adapt to different window sizes
- Custom animations and transitions that complement Ursa's base animations

## Conclusion

The style design for MyPal aims to create a welcoming and engaging environment for users to interact with their AI companion. By combining Ursa.Avalonia's professional UI framework with Avalonia.Microcharts' elegant data visualization and MyPal's unique design principles and color palette, we ensure a consistent, polished, and enjoyable experience across the desktop application. The Ursa foundation provides reliability and modern UX patterns while Microcharts delivers lightweight statistical visualization, both allowing for brand-specific customization that maintains MyPal's distinct character.