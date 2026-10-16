# design.md — Design System

> HOW the app looks and behaves. Do not introduce new colors, fonts, or styles outside this file.

## 1. Design philosophy
- Calm, trustworthy, civic. Water theme: teal and aqua on light backgrounds.
- Information first: the map and issue status must be understood in one glance.
- Mobile-first, large touch targets, clear status colors with text labels.
- Flat surfaces, thin borders, minimal shadows.

## 2. Color palette
| Token | Hex | Use |
|---|---|---|
| `brand` | `#0E7490` | Primary buttons, navbar, links |
| `brand-dark` | `#155E75` | Hover and active |
| `brand-light` | `#CFFAFE` | Subtle highlights, selected rows |
| `brand-aqua` | `#06B6D4` | Accent, secondary CTA |
| `surface` | `#F0F9FF` | Page background |
| `card` | `#FFFFFF` | Cards, modals, inputs |
| `border` | `#CBD5E1` | Borders, dividers |
| `ink` | `#0F172A` | Main text |
| `ink-muted` | `#64748B` | Secondary text |
| `status-reported` | `#EF4444` | Reported |
| `status-verified` | `#F59E0B` | Verified |
| `status-progress` | `#3B82F6` | In progress |
| `status-resolved` | `#10B981` | Resolved |
| `status-rejected` | `#64748B` | Rejected |

### Status badge pairs (background / text)
| Status | Background | Text |
|---|---|---|
| Reported | `#FEE2E2` | `#991B1B` |
| Verified | `#FEF3C7` | `#92400E` |
| In progress | `#DBEAFE` | `#1E40AF` |
| Resolved | `#D1FAE5` | `#065F46` |
| Rejected | `#E2E8F0` | `#334155` |
| Hotspot | `#FEE2E2` | `#991B1B` |

### Tailwind v4 tokens (`app/globals.css`)
```css
@theme {
  --color-brand: #0E7490;
  --color-brand-dark: #155E75;
  --color-brand-light: #CFFAFE;
  --color-brand-aqua: #06B6D4;
  --color-surface: #F0F9FF;
  --color-ink: #0F172A;
  --color-ink-muted: #64748B;
  --color-status-reported: #EF4444;
  --color-status-verified: #F59E0B;
  --color-status-progress: #3B82F6;
  --color-status-resolved: #10B981;
  --color-status-rejected: #64748B;
}
```

## 3. Typography
- Font family: Inter (via `next/font/google`), fallback `system-ui, sans-serif`.
- Headings weight 600, body weight 400, labels 500.

| Use | Size | Weight |
|---|---|---|
| Page title (h1) | 28 px (mobile 24) | 600 |
| Section title (h2) | 20 px | 600 |
| Card title (h3) | 16 px | 600 |
| Body | 16 px | 400 |
| Small / meta | 13 to 14 px | 400 |
Line height 1.5 for body, 1.25 for headings.

## 4. Spacing system
4 px base: 4, 8, 12, 16, 24, 32, 48. Page padding 16 px mobile, 24 px desktop. Max content width 1200 px.

## 5. Radius and shadow
- Radius: inputs and buttons 8 px, cards 12 px, badges full (pill).
- Shadow: none by default; `shadow-sm` only on modals and dropdowns.
- Borders: 1 px `border` color.

## 6. Components
| Component | Rules |
|---|---|
| Button | Primary: `brand` bg, white text. Secondary: white bg, `brand` text, border. Danger: red. Height 40 px (44 px on mobile). Max one primary button per view section. |
| Card | White, 1 px border, 12 px radius, padding 16. |
| Input / Select / Textarea | White bg, 1 px border, 8 px radius, label above, helper text below, error text red with icon. Focus ring 2 px `brand-aqua`. |
| Form | Single column on mobile, labels always visible, submit at bottom, inline validation. |
| Navbar | `brand` bg, white text, logo left, links center/right, user menu right; collapses to a menu on mobile. |
| Sidebar (admin) | Optional, white, 240 px on desktop; becomes tabs on mobile. |
| Table | Header `brand-light` bg, row border, hover `surface`; becomes stacked cards on mobile. |
| Modal | Centered, max 480 px, overlay `rgba(15,23,42,0.5)`, close button and Esc. |
| Badge | Pill, 12 px text, 500 weight, uses status pairs above, always shows text label. |
| Icons | Lucide (outline), 16 to 20 px, inherit text color. |

## 7. Map design
- Tiles: OpenStreetMap default.
- Issue pin: circle marker colored by status, 12 px, white 2 px stroke.
- Hotspot: translucent red circle (radius = cluster radius) with count label.
- Selected pin: 16 px with `brand` ring.
- Legend always visible (collapsible on mobile).
- Default center: Nagpur (21.1458, 79.0882), zoom 12.

## 8. States
| State | Design |
|---|---|
| Loading | Skeleton blocks for lists, spinner for buttons and map |
| Empty | Icon, one-line message, one action (for example "Report an issue") |
| Error | Red-tinted card with message and "Try again" button |
| Hover | Buttons darken to `brand-dark`; cards get `border-strong` |
| Focus | Visible 2 px ring on all interactive elements |
| Disabled | 50% opacity, not-allowed cursor, tooltip explaining why when relevant |

## 9. Animation
- Duration 150 to 200 ms, ease-out, for hover, modal open, toast.
- No decorative or looping animation.
- Respect `prefers-reduced-motion`.

## 10. Responsive breakpoints
| Name | Width | Layout |
|---|---|---|
| default | under 640 px | Single column, map above list, bottom action button |
| `sm` | 640 px | Two-column stat cards |
| `md` | 768 px | Map and list side by side |
| `lg` | 1024 px | Full dashboard grid |
| `xl` | 1280 px | Max-width container centered |

## 11. Mobile rules
- Touch targets at least 44 px.
- Report button fixed at bottom right on the home screen.
- Map height 50 vh on mobile with list below.
- Tables convert to cards.
- No hover-only interactions.

## 12. Content style
- English UI text, sentence case, short labels.
- Buttons start with a verb: "Report issue", "Update status".
- Errors: what happened and what to do next.

## 13. Change log
| Date | Change | Reason |
|---|---|---|
| (initial) | Palette and tokens defined | Project start |
