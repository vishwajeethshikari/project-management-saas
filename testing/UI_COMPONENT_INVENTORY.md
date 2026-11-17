# PROJECTFLOW UI Component Inventory
**System:** ProjectFlow SaaS Design System  
**Framework:** React 19 + Vanilla CSS Tokens + Lucide Icons  

---

## 1. Core Component Matrix

| Component | Category | Role & Capabilities | Responsive Breakpoints |
|---|---|---|---|
| **AppShell** | Layout | Root grid shell with collapsible sidebar & persistent topbar | Desktop, Tablet, Mobile overlay |
| **Sidebar** | Layout | Organization & workspace selector, navigation links, quick action, user profile | Collapses to icon rail on mobile |
| **Topbar** | Navigation | Breadcrumb navigation, ⌘K search trigger, theme switcher, notifications, timer badge | Stacks on small viewports |
| **CommandPalette** | Navigation / Action | Modal overlay (Ctrl+K / ⌘K) for quick navigation, search across projects/tasks | Responsive centered dialog |
| **AuthScreen** | Authentication | Split-screen login & register with product showcase, password toggle, validation | Stacks vertically on tablet/mobile |
| **OverviewCard** | Data Display | Stat metric card with icon, percentage change, and subtle glow | Fluid grid 1-4 columns |
| **ProjectCard** | Domain | Project card with progress bar, manager avatar, member roster, status pill | Grid / List view toggle |
| **KanbanBoard** | Interactive | Drag-and-drop columns (To Do, In Progress, In Review, Completed) with quick-status dropdowns | Horizontal scroll on mobile |
| **TaskRow** | Domain | Interactive task item with priority badge, status selector, quick actions (Comments, Files, Time) | Wraps on small screens |
| **CalendarGrid** | Visualization | Month / Week / Day view with color-coded start/due dates, click-to-reschedule modal | Responsive grid |
| **TimelineGantt** | Visualization | Horizontal Gantt chart with milestones, zoom controls (2w/1m/2m), grouping | Horizontal touch scroll |
| **WorkloadTable** | Analytics | Team capacity breakdown with tasks, overdue count, estimates, and tracked hours | Horizontally scrollable table |
| **TimeTrackerWidget** | Productivity | Global active timer pill with live elapsed time, quick stop & manual entry | Sticky in header & task row |
| **NotificationCenter** | Communication | Drawer with unread badges, mark-as-read, delete, and notification preferences | Popover / drawer |
| **ModalBackdrop & Dialog** | Feedback | Accessible modal with focus trap, backdrop blur, Escape listener | Fluid max-width dialog |
| **PriorityPill** | UI Primitive | Low (Slate), Medium (Blue), High (Amber), Critical (Rose) semantic pill | Inline |
| **StatusBadge** | UI Primitive | Todo, In Progress, In Review, Completed rounded badges | Inline |
| **Avatar / AvatarGroup** | UI Primitive | Initials-based avatar with deterministic color hashing | Stacked with overlap |
| **FilterToolbar** | Form / Control | Unified search box + status filter + project filter + view mode switchers | Flex wrap |

---

## 2. Accessibility & State Coverage

Every component provides:
- `:hover` and `:active` styling with smooth transitions.
- `:focus-visible` with a high-contrast 2px indigo outline.
- `aria-*` attributes (e.g. `aria-label`, `aria-expanded`, `aria-modal`, `role="dialog"`).
- Keyboard alternatives for pointer-heavy features (e.g. native select for drag-and-drop Kanban, keyboard-navigable command palette).
