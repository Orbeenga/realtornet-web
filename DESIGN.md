---
name: RealtorNet
colors:
  background: '#ffffff'
  foreground: '#0a0a0a'
  card: '#ffffff'
  card-foreground: '#0a0a0a'
  popover: '#ffffff'
  popover-foreground: '#0a0a0a'
  primary: '#171717'
  primary-foreground: '#fafafa'
  secondary: '#f5f5f5'
  secondary-foreground: '#171717'
  muted: '#f5f5f5'
  muted-foreground: '#737373'
  accent: '#f5f5f5'
  accent-foreground: '#171717'
  destructive: '#e7000b'
  destructive-foreground: '#ffffff'
  border: '#e5e5e5'
  input: '#e5e5e5'
  ring: '#a1a1a1'
  success: '#16a34a'
  success-foreground: '#ffffff'
  warning: '#d97706'
  warning-foreground: '#ffffff'
  info: '#2563eb'
  info-foreground: '#ffffff'
  surface: '#fafafa'
  surface-foreground: '#171717'
  on-surface: '#0a0a0a'
  on-surface-variant: '#737373'
  outline: '#a1a1a1'
  outline-variant: '#e5e5e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  body-bold:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: '0'
  label-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: '0'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.375rem
  DEFAULT: 0.625rem
  md: 0.5rem
  lg: 0.625rem
  xl: 0.875rem
  2xl: 1.125rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

# Design System: RealtorNet
**Project ID:** realtornet-web

## 1. Visual Theme & Atmosphere

RealtorNet presents a clean, trustworthy, and professionally restrained marketplace aesthetic tuned for the Nigerian property sector. The interface reads as modern and credible rather than flashy — plenty of white space, a near-monochrome palette, and crisp typography let property imagery and listing data take center stage.

The overall mood is **airy, orderly, and approachable**. Light backgrounds dominate, with dark type providing strong readability. Color is used sparingly and purposefully: blue for navigation and discovery, emerald for positive owner/agent actions, red only for favorites and destructive states. The dark mode flips to deep charcoal surfaces while preserving the same accent logic, ensuring the app feels comfortable to browse during evening property searches.

## 2. Color Palette & Roles

### Primary Foundation
- **Pure White (#ffffff)** — Primary canvas, card surfaces, popovers, and modals.
- **Off-White (#fafafa)** — Subtle page backgrounds and secondary surfaces.
- **Soft Gray (#f5f5f5)** — Muted fills for secondary buttons, badges, hover states, and section separators.
- **Light Gray (#e5e5e5)** — Hairline borders, input borders, and dividers.

### Typography & Text Hierarchy
- **Near-Black (#0a0a0a)** — Primary headings and body text on light surfaces.
- **Charcoal (#171717)** — Shadcn primary button fill and high-emphasis UI chrome.
- **Medium Gray (#737373)** — Secondary text, placeholders, captions, and meta information.
- **Warm Gray (#a1a1a1)** — Focus rings, outlines, and disabled accents.

### Accent & Interactive
- **Signal Blue (#2563eb)** — Primary links, price highlights, "See all" actions, and focused states.
- **Trust Emerald (#16a34a)** — Positive CTAs such as "Apply as Agency" and success badges.
- **Vivid Red (#e7000b)** — Destructive actions, form errors, and the favorited-heart state.
- **Soft Red (#ff6467)** — Dark-mode destructive surface accent.

### Functional States
- **Success Green (#16a34a)** — Available/published status badges.
- **Amber Warning (#d97706)** — Pending or cautionary statuses.
- **Danger Red (#e7000b)** — Sold, revoked, or error states.
- **Outline Gray** — Neutral tags such as listing type chips.

## 3. Typography Rules

### Font Families
- **Inter** — Primary sans-serif for every UI element. It is neutral, highly legible at small sizes, and works equally well for marketing headlines and dense dashboard tables.
- **Geist Mono** — Reserved for monospace contexts such as code, IDs, or data-heavy tabular figures.

### Hierarchy & Weights
- **Display / H1:** 48px, font-weight 700, tight letter-spacing (-0.02em), used for hero headlines and page titles.
- **H2 / Section Headline:** 24px, font-weight 600, letter-spacing -0.01em, used for "Featured Properties" and section headers.
- **H3 / Card Title:** 16-18px, font-weight 600, tight leading, used for property titles and card headings.
- **Body:** 16px, font-weight 400, line-height 24px, used for descriptions and long-form content.
- **Label / Caption:** 12-14px, font-weight 500, used for badges, meta lines, and form labels.
- **Uppercase Labels:** 12px, font-weight 700, letter-spacing 0.05em, used sparingly for micro-section labels.

### Spacing Principles
- Body text uses a relaxed 1.5 line-height for readability.
- Headlines use tight line-heights to feel crisp and modern.
- Micro-labels are spaced generously with letter-spacing to avoid feeling cramped.

## 4. Component Stylings

### Buttons
- **Primary:** Solid charcoal (#171717) fill with off-white text, rounded-lg corners, height ~32px (h-8), subtle transition on hover.
- **Secondary:** Soft gray (#f5f5f5) fill with charcoal text, same rounded shape.
- **Outline:** White/transparent fill with light gray border, darkens on hover.
- **Ghost:** Transparent with a muted hover background, used for icon-only or low-priority actions.
- **Destructive:** Transparent fill with vivid red text and a subtle red hover wash.
- **Sizes:** xs, sm, default, lg with matching height and padding scale; icon variants are square.

### Cards & Containers
- **Standard Card:** White background, rounded-xl corners, 1px light gray border, subtle shadow-sm, overflow-hidden for full-bleed media.
- **Hoverable Card:** Cursor pointer with a slightly deeper shadow on hover (`hover:shadow-md`).
- **Card Header / Footer:** Light top/bottom borders with generous padding (px-5 py-4); footer uses a soft gray wash.
- **Hero Card / Promo Panels:** Rounded-2xl to rounded-[2rem], often with gradient fills (sky-50 to blue-100) and ring accents.

### Navigation
- **Top Navbar:** Sticky, white background, bottom hairline border, max-width 7xl centered container, h-16 height.
- **Nav Links:** Rounded-lg pills, gray text, active state uses soft gray background with dark text.
- **Mobile Menu:** Slide-in drawer from the left, white background, shadow-2xl, full-height overlay with a black/40 scrim.
- **Account Dropdown:** Rounded-xl floating panel with border and shadow, user info in a bordered header.

### Inputs & Forms
- **Text Inputs:** Rounded-md corners, light border, focus-visible ring in the ring color; error state switches border and ring to vivid red.
- **Labels:** 14px medium weight in medium gray.
- **Hints / Errors:** 12px text, gray for hints and red for errors.
- **Selects & Comboboxes:** Follow the same border and radius language, often wrapped in popover panels.

### Domain-Specific Components

#### Property Card
- 4:3 image aspect ratio with full-bleed top image.
- Floating favorite heart button in the top-right corner: white/semi-transparent when inactive, vivid red when saved.
- Bottom-left status and listing-type badges overlaid on the image.
- Title, price (in Signal Blue), agency/owner line, location pin, and bedroom/bathroom/sqm meta in the body.

#### Status Badge
- Pill-shaped chips with semantic backgrounds: green for success, amber for warning, red for danger, gray outline for neutral tags.

#### Hero Search Section
- Full-width dark gradient (`from-slate-800 to-slate-950`) with a black/55 overlay.
- Large white headline and subtext, rounded pill filters for Buy/Rent/Lease, and a prominent search bar at the bottom.

## 5. Layout Principles

### Grid & Structure
- **Max Content Width:** 1280px (`max-w-7xl`) centered with auto margins.
- **Page Padding:** 16px mobile, 24px tablet, 32px desktop (`px-4 sm:px-6 lg:px-8`).
- **Primary Grid:** 1-column on mobile, 2-column on tablet, 3-column on desktop for property and agency listings (`grid-cols-1 md:grid-cols-2 md:grid-cols-3`).
- **Dashboard Grids:** Often 2-column promo panels or stacked form sections.

### Whitespace Strategy
- Base unit is 4px, scaled through Tailwind spacing.
- Section vertical rhythm is generous: `py-12` between major page sections.
- Card internal padding is `px-5 py-4` to `p-6` depending on density.
- Gap between grid cards is typically 20px (`gap-5`).

### Alignment & Visual Balance
- Marketing pages center-align hero text over left-aligned content sections.
- Listing and account pages are consistently left-aligned with a centered max-width container.
- Footer uses a 2-to-4 column grid with consistent column gaps.

### Responsive Behavior & Touch
- Mobile-first breakpoints: sm (640px), md (768px), lg (1024px).
- Touch targets aim for at least 44px; nav buttons and favorite hearts are sized for thumbs.
- Complex filters collapse into sheets or drawers on smaller screens.
- Tables and admin lists reflow into cards or stack vertically on mobile.

## 6. Design System Notes for Stitch Generation

### Language to Use
- Describe the aesthetic as **clean marketplace, high trust, spacious, and photo-forward**.
- Use words like "crisp," "airy," "professional," and "restrained" rather than "bold" or "playful."
- Favor rounded rectangles over sharp edges; reserve pills for filters, badges, and avatars.

### Color References
- Backgrounds: White (#ffffff), Off-White (#fafafa), Soft Gray (#f5f5f5).
- Text: Near-Black (#0a0a0a), Charcoal (#171717), Medium Gray (#737373).
- Accents: Signal Blue (#2563eb), Trust Emerald (#16a34a), Vivid Red (#e7000b).
- Borders & separators: Light Gray (#e5e5e5).

### Component Prompts
- **Primary Button:** "A rounded-lg charcoal button with white text and a subtle hover darken."
- **Property Card:** "A white rounded-xl card with a 4:3 full-bleed image, floating heart favorite button, bottom-left status badges, title, blue price, agency line, location pin, and meta row."
- **Hero Section:** "A full-width dark slate gradient hero with large white headline, translucent pill filters, and a centered search bar at the bottom."
- **Status Badge:** "A small pill badge with semantic color backgrounds — green for success, amber for warning, red for danger, gray outline for neutral."

### Incremental Iteration
- Keep imagery dominant; avoid heavy shadows or borders that compete with listing photos.
- When adding new accent colors, test against the near-monochrome base first — the system tolerates only one or two strong accent hues per screen.
- Maintain the 4px spacing rhythm and the 16/24/32px page-padding escalation across breakpoints.
- Preserve dark-mode parity: every light-surface color should have a dark-surface counterpart in charcoal/grayscale.
