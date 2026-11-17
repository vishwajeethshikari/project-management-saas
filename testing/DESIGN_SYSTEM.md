# PROJECTFLOW Design System Specification
**Version:** 2.0 (Enterprise SaaS Edition)  
**Brand Identity:** Intelligent, Productive, Professional, Organized, Collaborative, Modern

---

## 1. Design Philosophy & Visual Identity

PROJECTFLOW is engineered for modern high-velocity product teams, managers, and executives. The visual architecture combines **Linear's intentional minimalism**, **Asana's structural clarity**, and **Vercel's precision typography**.

### Brand Personality
- **Intelligent**: Context-aware information density without visual noise.
- **Productive**: Keyboard-first navigation (⌘K/Ctrl+K command palette), instantaneous feedback, fluid drag-and-drop.
- **Professional**: Balanced neutral surfaces with vibrant electric indigo and cyan accents.
- **Accessible**: WCAG 2.2 AA compliant contrast, discernible focus rings, screen-reader friendly ARIA attributes.

---

## 2. Color System & Semantic Tokens

### 2.1 Brand & Accent Tokens
| Token | Light Theme | Dark Theme | Purpose |
|---|---|---|---|
| `--color-brand-primary` | `#6366F1` (Indigo 500) | `#818CF8` (Indigo 400) | Primary actions, key focal points, active states |
| `--color-brand-hover` | `#4F46E5` (Indigo 600) | `#6366F1` (Indigo 500) | Hover state for primary buttons |
| `--color-brand-subtle` | `rgba(99, 102, 241, 0.08)` | `rgba(129, 140, 248, 0.14)` | Active row highlight, soft badges, pills |
| `--color-brand-glow` | `rgba(99, 102, 241, 0.25)` | `rgba(129, 140, 248, 0.35)` | Elevation glow, active focus halo |
| `--color-accent-cyan` | `#0EA5E9` (Sky 500) | `#38BDF8` (Sky 400) | Secondary highlight, timer active, milestones |
| `--color-accent-violet` | `#8B5CF6` (Violet 500) | `#A78BFA` (Violet 400) | Analytics trends, team metrics |

### 2.2 Neutral & Surface Hierarchy
| Token | Light Theme | Dark Theme | Purpose |
|---|---|---|---|
| `--bg-canvas` | `#F8FAFC` (Slate 50) | `#0B0F19` (Deep Navy Slate) | Base background canvas |
| `--bg-surface` | `#FFFFFF` (Pure White) | `#111827` (Gray 900) | Cards, panels, modals |
| `--bg-surface-elevated`| `#FFFFFF` | `#1F2937` (Gray 800) | Drawers, dropdowns, command palette |
| `--bg-sidebar` | `#0F172A` (Slate 900) | `#080C14` (Near Black) | Navigation rail / sidebar |
| `--bg-subtle` | `#F1F5F9` (Slate 100) | `#1A2234` | Hover states, table headers, tags |
| `--border-subtle` | `#E2E8F0` (Slate 200) | `#1F293D` | Card borders, dividers, inputs |
| `--border-strong` | `#CBD5E1` (Slate 300) | `#374151` | Focused borders, active tabs |

### 2.3 Semantic & Status Colors
| State | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| **Success** | `#10B981` / `rgba(16,185,129,0.1)` | `#34D399` / `rgba(52,211,153,0.15)` | Completed tasks, on-track health, timers |
| **Warning / In Review** | `#F59E0B` / `rgba(245,158,11,0.1)` | `#FBBF24` / `rgba(251,191,36,0.15)` | In-review tasks, at-risk deadlines |
| **Danger / Overdue** | `#EF4444` / `rgba(239,68,68,0.1)` | `#F87171` / `rgba(248,113,113,0.15)` | Overdue tasks, critical priority, delete |
| **In Progress / Info** | `#3B82F6` / `rgba(59,130,246,0.1)` | `#60A5FA` / `rgba(96,165,250,0.15)` | In progress status, informational alerts |

---

## 3. Typography Scale

Font Family: `Inter`, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.

| Level | Size | Weight | Line Height | Tracking | Purpose |
|---|---|---|---|---|---|
| **Display** | 30px (1.875rem) | 700 (Bold) | 1.2 | -0.025em | Main workspace welcome headings |
| **H1** | 24px (1.5rem) | 700 (Bold) | 1.25 | -0.02em | Section titles, Dashboard view headers |
| **H2** | 18px (1.125rem) | 600 (Semibold) | 1.3 | -0.015em | Panel headings, modal titles |
| **H3** | 15px (0.9375rem) | 600 (Semibold) | 1.4 | -0.01em | Card titles, column headers |
| **Body** | 14px (0.875rem) | 400 (Regular) | 1.5 | 0 | Standard interface text, task titles |
| **Body Medium**| 14px (0.875rem) | 500 (Medium) | 1.5 | 0 | Form inputs, button labels, table cells |
| **Small** | 12px (0.75rem) | 500 (Medium) | 1.4 | +0.01em | Metadata, timestamps, badge labels |
| **Micro / Eyebrow**| 11px (0.6875rem) | 700 (Bold) | 1.3 | +0.06em | Category labels, section tags (uppercase) |

---

## 4. Spacing System (8px Grid)

Base unit: `4px` / `8px` increments:
- `space-1`: `4px`
- `space-2`: `8px`
- `space-3`: `12px`
- `space-4`: `16px`
- `space-5`: `20px`
- `space-6`: `24px`
- `space-8`: `32px`
- `space-10`: `40px`
- `space-12`: `48px`

---

## 5. Elevation & Shadow Tokens

- `shadow-xs`: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
- `shadow-sm`: `0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)`
- `shadow-md`: `0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.06)`
- `shadow-lg`: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.08)`
- `shadow-xl`: `0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)`
- `shadow-glow`: `0 0 20px rgba(99, 102, 241, 0.25)`

---

## 6. Border Radius Tokens

- `radius-sm`: `6px` (badges, tags, small inputs)
- `radius-md`: `8px` (buttons, text inputs, dropdown items)
- `radius-lg`: `12px` (cards, modal containers, panels)
- `radius-xl`: `16px` (elevated dialogs, command palette)
- `radius-full`: `9999px` (avatars, priority pills, status dots)

---

## 7. Motion & Transitions

- Durations: `150ms` (snappy hover), `200ms` (dropdowns/drawers), `300ms` (modals).
- Timing Curve: `cubic-bezier(0.16, 1, 0.3, 1)` (fluid natural easing).
- Reduced Motion: Fully supports `@media (prefers-reduced-motion: reduce)` disabling non-essential transitions.
