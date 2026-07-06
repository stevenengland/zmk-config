---
name: Engineering Chic
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#20201f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353535'
  on-surface: '#e5e2e1'
  on-surface-variant: '#bac9cc'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#849396'
  outline-variant: '#3b494c'
  surface-tint: '#00daf3'
  primary: '#c3f5ff'
  on-primary: '#00363d'
  primary-container: '#00e5ff'
  on-primary-container: '#00626e'
  inverse-primary: '#006875'
  secondary: '#d4bbff'
  on-secondary: '#3f0f81'
  secondary-container: '#572e99'
  on-secondary-container: '#c6a5ff'
  tertiary: '#ffeac0'
  on-tertiary: '#3e2e00'
  tertiary-container: '#fec931'
  on-tertiary-container: '#6f5500'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#9cf0ff'
  primary-fixed-dim: '#00daf3'
  on-primary-fixed: '#001f24'
  on-primary-fixed-variant: '#004f58'
  secondary-fixed: '#ebdcff'
  secondary-fixed-dim: '#d4bbff'
  on-secondary-fixed: '#260058'
  on-secondary-fixed-variant: '#572e99'
  tertiary-fixed: '#ffdf96'
  tertiary-fixed-dim: '#f3bf26'
  on-tertiary-fixed: '#251a00'
  on-tertiary-fixed-variant: '#594400'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353535'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: '1.4'
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.5'
  legend-lg:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.0'
  label-xs:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1.0'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  sidebar-width: 320px
  toolbar-height: 56px
  gutter: 16px
  container-padding: 24px
---

## Brand & Style
The design system is built on the "Engineering Chic" aesthetic—a synthesis of high-performance tool design and modern software aesthetics. It targets keyboard enthusiasts, firmware developers, and ergonomic designers who value precision over decoration.

The visual language is rooted in **Modern Minimalism** with **Industrial accents**. It prioritizes high-density information displays without sacrificing clarity. The emotional response is one of "Technical Mastery"—the interface should feel like a specialized workstation or a high-end IDE. 

Key attributes:
- **Precision:** Strict adherence to grid systems and consistent stroke weights.
- **Utilitarianism:** Every UI element serves a functional purpose; decorative elements are reserved for state communication.
- **Sophistication:** A dark-mode first approach using deep, layered slates rather than pure black to provide a sense of depth and quality.

## Colors
The palette is optimized for long sessions of technical work, reducing eye strain through a refined dark-mode hierarchy.

- **Primary (Cyber Teal):** Reserved for active states, primary actions, and focused keycaps in the illustrator canvas.
- **Secondary (Obsidian Slate):** The foundational neutral used for panels and toolbars.
- **Accents:** Use deep purples and reds sparingly to denote layer shifts or critical warnings, mirroring physical LED indicators on mechanical keyboards.
- **Surface Logic:** Backgrounds use `#0F0F0F`, while floating panels and sidebars use `#1A1A1A` to create clear containment. Borders are strictly defined at `#2D2D2D` to provide structural separation without high-contrast noise.

## Typography
This design system employs a dual-font strategy to distinguish between UI controls and the subject matter (the keyboard).

- **Inter:** Used for all functional UI elements, navigation, and instructional text. It provides a clean, neutral container for the application's complexity.
- **JetBrains Mono:** Used for keycap legends, coordinate data, and hex codes. This creates a direct visual link to the world of coding and hardware firmware.

Hierarchy is maintained through weight and case rather than dramatic scale. Smaller labels use uppercase with increased tracking to mimic industrial labeling.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model designed for a Single Page Application (SPA).

1.  **Sidebar (Fixed):** 320px width on the right for editing properties, layers, and keymap configurations.
2.  **Canvas (Fluid):** The central area for the Keyboard SVG, which scales to fit but maintains a minimum safe margin of 48px from all UI edges.
3.  **Toolbar (Fixed):** A 56px top bar for global actions (Import, Export, Settings).

The spacing system is built on a **4px base unit**. Component internal padding typically uses 8px (2 units) or 12px (3 units), while major section gaps use 24px (6 units) to maintain a sense of precision and airiness.

## Elevation & Depth
In this design system, depth is communicated through **Tonal Layering** and **Subtle Outlines** rather than traditional drop shadows.

- **Level 0 (Canvas):** The lowest layer, using the darkest neutral.
- **Level 1 (Sidebars/Toolbars):** One shade lighter, separated by a 1px solid border.
- **Level 2 (Modals/Popovers):** Surface uses a slightly lighter slate with a soft 12% opacity primary-colored glow (0px 4px 20px) to indicate focus.
- **Keycaps:** Keyboard keys on the canvas should use a 2px "bottom-heavy" border to simulate physical height without using complex skeuomorphism.

## Shapes
The shape language is "Soft-Technical." We avoid aggressive sharp corners to ensure the UI feels modern, but keep radii small to maintain a compact, tool-like feel.

- **Base Radius:** 4px (0.25rem) for input fields, buttons, and panels.
- **Keycap Radius:** 6px to better reflect ergonomic keycaps.
- **Icons:** Use a consistent 1.5px stroke width with slightly rounded joins.

## Components

### Buttons
- **Primary:** Background of Cyber Teal, text in Deep Slate. No border.
- **Secondary/Ghost:** 1px border of Slate-200, transparent background. High-contrast text on hover.
- **Sizes:** All buttons should be 32px or 40px height to maintain a compact tool feel.

### Sidebar Panels (Property Editor)
- Group related settings (e.g., "Key Legend," "Behavior," "Color") into collapsible sections.
- Use a 1px border-bottom for section headers.
- Labels for inputs should be `label-xs` (JetBrains Mono, uppercase).

### Tabs (Layer Navigation)
- Horizontal tabs above the keyboard canvas.
- Active tab indicated by a 2px Cyber Teal bottom border and high-brightness text.
- Inactive tabs use secondary text color.

### Input Fields
- Dark background (darker than the panel).
- 1px border that shifts to Primary color on focus.
- Monospace font for value inputs.

### Keyboard Keycaps (Canvas)
- **Active State:** Solid Primary color background.
- **Hover State:** Substantial lightening of the background or a thick Primary border.
- **Legend:** Centered `legend-lg` typography. Support for "Top-Left" and "Bottom-Right" sub-legends for complex layouts.