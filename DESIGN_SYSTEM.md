# ProjectFlow Design System

## Identity

ProjectFlow uses a calm enterprise workspace canvas, a deep ink sidebar, and indigo as its primary action color. Plus Jakarta Sans carries interface text; JetBrains Mono is reserved for keyboard hints and compact technical values. Lucide React supplies consistent outline icons.

## Tokens

Tokens are defined in `frontend/src/App.css` and selected with the root `data-theme` attribute.

| Role | Light | Dark |
| --- | --- | --- |
| Brand | `#6366f1` | `#818cf8` |
| Canvas | `#f8fafc` | `#090d16` |
| Surface | `#ffffff` | `#111827` |
| Primary text | `#0f172a` | `#f8fafc` |
| Secondary text | `#475569` | `#cbd5e1` |
| Border | `#e2e8f0` | `#1f293d` |
| Success | `#10b981` | `#10b981` |
| Warning | `#f59e0b` | `#f59e0b` |
| Error | `#ef4444` | `#ef4444` |
| Information | `#3b82f6` | `#3b82f6` |

Spacing is based on 4px increments with 8px as the common step. Radius tokens range from 4px to fully rounded. Fast and normal transitions use 150ms and 250ms. Focus rings use the brand color; reduced-motion preferences disable animation. The shell uses a 260px expanded and 72px collapsed navigation rail and a 1440px content maximum.

## Components and patterns

Reusable styles cover buttons, fields, badges, metric cards, content panels, task rows, Kanban columns, calendar cells, drawers/dialogs, notification inbox, command palette, and activity records. Keep new components on the existing token and class system rather than adding one-off colors or spacing.
