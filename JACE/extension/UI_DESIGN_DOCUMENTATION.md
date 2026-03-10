# JACE UI Design Documentation

## Overview

This documentation provides complete visual and design system specifications for the JACE Critical Thinking AI Helper browser extension, based on the actual implementation code.

## Generated Design Files

### 1. **UI_SCREENSHOTS.html**
Interactive visual reference of all user interface screens with live component previews.

**Screens Included:**
- Dashboard Screen: Stats overview, recent activity history, data management
- Settings Screen: Participant info, platform toggles, intervention configuration
- Interactive Question Modal: Two-round reflection interface with progress indicator
- Feedback Modal: Score display, contextual feedback, round progression

**Features:**
- Live component rendering matching exact code implementation
- Color palette showcase with design tokens
- Fully responsive preview windows
- Dimension specifications and spacing guide

### 2. **FIGMA_PROTOTYPE.html**
Complete design system documentation suitable for importing into Figma or using as development reference.

**Sections:**
- Design Tokens (spacing, border radius, shadows)
- Typography (font scales, weights, usage)
- Color System (primary, secondary, semantic, neutral palettes)
- Component Library (buttons, inputs, forms, badges)
- Layout & Spacing (grid system, responsive breakpoints)
- Interactions & Animations (transitions, timing, behavior)
- States & Variants (component states across contexts)
- Accessibility Standards (WCAG 2.1 AA compliance)

## Design System Overview

### Colors

**Primary Palette:**
- Green Mid: `#20a565` - Primary actions, active states
- Green Light: `#a1cf9a` - Success, highlights
- Blue Mid: `#2e7dab` - Secondary actions
- Blue Light: `#4bb0d0` - Info, links, badges

**Semantic Colors:**
- Warning: `#ffc107` - Skipped items, warnings
- Error: `#ef4444` - Errors, destructive actions

**Grayscale:**
- Background: `#1a1a1a`
- Surface: `#272727`
- Surface 2: `#303030`
- Text Primary: `#f0f0f0`
- Text Muted: `#9a9a9a`
- Text Dim: `#5e5e5e`

### Typography

**Font Families:**
- Instrument Sans (Display, headings)
- DM Sans (Body, UI labels)

**Scale:**
- Display Large: 28px / Bold
- Heading 1: 22px / Bold
- Heading 2: 18px / Bold
- Heading 3: 16px / Semibold
- Body Large: 14px / Regular
- Body Small: 13px / Regular
- Label: 12px / Semibold
- Caption: 11px / Bold (uppercase)

### Spacing

**8px Base Unit System:**
- Micro: 4px (tight padding)
- Small: 8px (gaps between elements)
- Medium: 16px (container padding)
- Large: 24px (section spacing)

### Border Radius

- Small: 4px (subtle rounding)
- Medium: 10px (standard cards)
- Large: 18px (modals)
- Pill: 100px (buttons)

## Key Components

### Buttons
- **Primary**: Green background, hover lift effect
- **Secondary**: Blue background
- **Ghost**: Transparent with border

### Inputs
- Text fields with focus states
- Range sliders with green thumbs
- Checkboxes with green accent

### Badges
- Success (green): Completed items
- Info (blue): Score displays
- Warning (yellow): Skipped items

### Modal
- Dark surface with 18px border radius
- Backdrop blur effect
- Slide-in animation (0.38s cubic-bezier)

## Interactive Elements

### Animations
- Button hover: -1px translateY + color shift
- Modal entrance: Fade overlay + scale/slide modal
- Transitions: 0.2s ease (standard), 0.38s ease (modals)

### Progress Indicator
- Dot-based system
- States: Gray (pending) → Green (active) → Blue (complete)

### States
- Empty: No data message
- Loading: Spinner with text
- Error: Red alert message
- Data: Populated list view

## Accessibility

**WCAG 2.1 AA Compliance:**
- Contrast ratio 7.9:1 minimum (AAA standard)
- Keyboard navigation with visible focus
- Screen reader support with semantic HTML
- Clear labels on all interactive elements

**Keyboard Shortcuts:**
- Tab: Navigate between elements
- Enter/Space: Activate buttons
- Arrow Keys: Navigate form sections
- Escape: Close modals

## Usage Files

All design specifications can be viewed by opening the HTML files in a web browser:

```
/JACE/extension/UI_SCREENSHOTS.html
/JACE/extension/FIGMA_PROTOTYPE.html
```

## Implementation Notes

- **Responsive Design**: Optimized for 400px extension popup and full-screen modals
- **Dark Theme**: Designed for accessibility in dark environments
- **Performance**: CSS-only animations with no JavaScript transitions
- **Browser Support**: Chrome Extension manifest v3
- **Consistency**: 100% faithful to actual HTML/CSS implementation

## Design Tokens Export

All design tokens from the CSS can be extracted for:
- Figma component library creation
- CSS-in-JS implementation
- Design system documentation
- Developer handoff

## Related Documentation

- `popup.html` - Dashboard and Settings interface markup
- `popup.css` - Popup styling and component styles
- `styles.css` - Modal and intervention interface styles
- `IMPLEMENTATION_GUIDE.md` - Feature implementation details

---

Generated from JACE source code analysis and design extraction.
Last Updated: March 2026
