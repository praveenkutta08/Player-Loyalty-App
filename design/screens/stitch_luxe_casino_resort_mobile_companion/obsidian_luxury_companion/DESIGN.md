---
name: Obsidian Luxury Companion
colors:
  surface: '#121414'
  surface-dim: '#121414'
  surface-bright: '#38393a'
  surface-container-lowest: '#0d0e0f'
  surface-container-low: '#1a1c1c'
  surface-container: '#1e2020'
  surface-container-high: '#282a2b'
  surface-container-highest: '#333535'
  on-surface: '#e2e2e2'
  on-surface-variant: '#c4c7c7'
  inverse-surface: '#e2e2e2'
  inverse-on-surface: '#2f3131'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c9c6c5'
  primary: '#c9c6c5'
  on-primary: '#313030'
  primary-container: '#050505'
  on-primary-container: '#797777'
  inverse-primary: '#5f5e5e'
  secondary: '#c8c6c8'
  on-secondary: '#303032'
  secondary-container: '#474649'
  on-secondary-container: '#b7b4b7'
  tertiary: '#c2c1ff'
  on-tertiary: '#1800a7'
  tertiary-container: '#020026'
  on-tertiary-container: '#6765ef'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c9c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474646'
  secondary-fixed: '#e4e2e4'
  secondary-fixed-dim: '#c8c6c8'
  on-secondary-fixed: '#1b1b1d'
  on-secondary-fixed-variant: '#474649'
  tertiary-fixed: '#e2dfff'
  tertiary-fixed-dim: '#c2c1ff'
  on-tertiary-fixed: '#0c006b'
  on-tertiary-fixed-variant: '#332dbc'
  background: '#121414'
  on-background: '#e2e2e2'
  surface-variant: '#333535'
typography:
  display-lg:
    fontFamily: Playfair Display
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Playfair Display
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 42px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Playfair Display
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 34px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
  utility-mono:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  safe-margin: 24px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  section-gap: 64px
---

## Brand & Style

The brand personality is authoritative yet invisible—a high-end digital concierge that feels like an extension of a physical luxury environment. The target audience consists of high-net-worth individuals and sophisticated travelers who value discretion, architectural beauty, and seamless utility over the flashing lights and sensory overload of traditional casino interfaces.

The design style is a fusion of **Glassmorphism** and **Minimalism**, rooted in an "Obsidian" aesthetic. It moves away from the "Dashboard" trope toward a "Fluid Companion" experience. This is achieved through:
- **Atmospheric Depth:** Using obsidian and slate tones to create a sense of infinite space.
- **Architectural Framing:** Utilizing large-scale, high-contrast photography of resort interiors and gaming floors as the primary visual anchor.
- **Technical Precision:** Ultra-fine borders (0.5pt - 1pt) and monospaced accents to provide a sense of "watchmaker" craftsmanship.
- **Glass Surfaces:** High-refractive index blurs and subtle pearl-tinted specular highlights on interactive surfaces.

## Colors

The palette is strictly controlled to maintain an "after-dark" atmosphere. 

- **Obsidian (#050505):** The foundation of the UI, used for deep backgrounds to make hardware bezels disappear.
- **Deep Slate (#1A1A1C):** Used for elevated surfaces, cards, and containers to create subtle separation from the base.
- **Accent Indigo (#5E5CE6):** A vivid, digital neon used sparingly for primary actions, active states, and high-priority notifications. It provides a modern, "next-gen" electric pulse against the dark base.
- **Metallic Silver & Pearl:** Utilized for typography and ultra-fine borders to simulate the reflection of light on physical luxury goods.

## Typography

The typographic system relies on a high-contrast pairing between the classical elegance of **Playfair Display** and the functional precision of **Inter**.

- **Playfair Display:** Reserved for editorial moments, room names, and "The Reveal"—when a user enters a new section of the resort.
- **Inter:** Handles the heavy lifting of utility, gaming data, and navigation. 
- **The "Utility-Mono" Style:** For currency, balance values, and table numbers, use Inter with tighter tracking or a monospaced variant if available, evoking a premium receipt or a high-end watch face.
- **Text Coloration:** Use `Neutral (E2E2E2)` for primary body text and `Silver (A1A1A6)` for secondary descriptions to maintain visual hierarchy without losing legibility.

## Layout & Spacing

This design system uses a **Fluid Mobile-First Grid** centered on "The Companion Flow." 

- **Generous Margins:** 24px horizontal margins are mandatory to prevent the UI from feeling "crowded," reinforcing the feeling of luxury through whitespace.
- **Rhythmic Stack:** Vertical spacing follows a strict geometric progression (8, 16, 32, 64). Large gaps (64px+) are used to separate major lifestyle categories (Gaming vs. Dining vs. Spa).
- **Asymmetric Balance:** Occasionally break the grid with large-scale imagery that bleeds off one edge of the screen, mimicking the layout of a high-end fashion magazine.
- **Floating Context:** Elements should never feel "locked." Use dynamic padding within cards to ensure content floats within its glass container.

## Elevation & Depth

Depth is conveyed through **Light Refraction** rather than traditional drop shadows.

- **Glassmorphism:** All primary overlays and cards use a backdrop blur (20px - 40px) combined with a semi-transparent fill of `Deep Slate (#1A1A1C)` at 60-80% opacity.
- **Ultra-Fine Outlines:** Instead of shadows, use 0.5px "Ghost Borders" in `Pearl` at 15% opacity on the top and left edges to simulate a light source catching the "rim" of the glass.
- **The Obsidian Void:** The lowest layer is always pure `#050505`. Elevated elements "glow" slightly from within using a very low-spread Indigo inner-shadow (2% opacity) to suggest electronic life.
- **Z-Index Strategy:**
    - Level 0: Background/Photography.
    - Level 1: Content Cards (Glass).
    - Level 2: Floating Action Sheets / Navigation Bar.
    - Level 3: Modal Alerts / Wallet Cards.

## Shapes

The shape language is "Sophisticated Geometric." We use **Rounded (Level 2)** as the standard to ensure the UI feels approachable and modern, avoiding the aggressive sharpness of brutalism or the "bubbly" nature of social apps.

- **Base Corner Radius:** 16px (1rem) for all primary cards and containers.
- **Large Radius:** 24px (1.5rem) for immersive bottom sheets and full-screen image containers.
- **Interactive Elements:** Buttons and input fields mirror the 16px radius to maintain a uniform language.
- **The "Wallet" Exception:** Digital member cards use a consistent 12px radius to mimic the physical dimensions of a credit card.

## Components

- **Floating Action Sheets:** Unlike standard bottom sheets, these should have a 16px margin from the screen bottom, floating as a glass "island" rather than emerging from the edge.
- **Immersive Cards:** Used for Room Booking or Casino Games. These feature a full-bleed architectural background image with a "Playfair" title anchored at the bottom-left, protected by a subtle gradient scrim.
- **Wallet Cards:** Custom-styled components that display the user's loyalty tier. Use a subtle metallic grain texture and the `Accent Indigo` for the chip or balance highlight.
- **Utility Lists:** Rows should be separated by ultra-fine lines (0.5px) that do not span the full width of the screen—stop them 24px from each edge.
- **Buttons:**
    - *Primary:* Solid `Indigo`, white text, high-polish finish.
    - *Secondary:* Glass-fill with a `Pearl` 1px border.
- **Inputs:** Minimalist bottom-border only or fully transparent glass containers. No heavy box styling.
- **Micro-Interactions:** Haptic feedback should be "crisp"—using the Taptic Engine's "Light" tap for every selection to mimic a physical luxury switch.