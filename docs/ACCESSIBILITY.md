# Accessibility Audit — Phase 6: Accessibility Excellence

WCAG 2.1 AA audit and patch pass over the shared component library
(`src/components/ui/`, `src/components/shared/`, and the other
non-page-specific components directly under `src/components/`). Individual
page files under `src/app/` were out of scope for this pass.

Scope covered: color contrast, focus visibility, ARIA correctness on
custom widgets, keyboard operability, and `prefers-reduced-motion` support.

---

## 1. Color contrast (`src/app/globals.css`)

Checked every text/background and icon/background pairing built from the
CSS custom properties in `:root` and `:root[data-theme="light"]` against
WCAG AA (4.5:1 normal text, 3:1 large text / UI components), using the
actual composited backgrounds components use (including translucent
`*-bg` badge tints, not just the raw page background).

### Dark theme (default)

Only one failure: `--text-faint` (`#66666f`) measured **3.26–3.52:1**
against `--bg` / `--surface-solid` / `--surface-elevated` — below the
4.5:1 required for normal text. It's used at small sizes (`text-xs`,
`0.65rem`, `0.7rem`) throughout `NotificationBell`, `Toast`, `Modal`,
`Sidebar`, `Topbar`, and `ImageUpload`, so the large-text exception
doesn't apply.

- **Fix:** lightened `--text-faint` to `#7e7e88` → now **4.72–4.98:1**
  against all three surfaces.

Everything else in dark theme (`--text`, `--text-muted`, and all six
accent/status colors used as text or icon fills) already passed with
comfortable margin — no change needed.

### Light theme (`:root[data-theme="light"]`)

This is where the real problems were. The accent/status palette was
tuned for the dark surface and was never re-checked against the light
theme's near-white background, so several colors used as *text* or
*icon fills* were badly under contrast — down to **1.56:1** in one case:

| Variable | Original | vs light `--bg` | vs light `--surface-solid` |
|---|---|---|---|
| `--text-faint` | `#8a8a94` | 3.20:1 | 3.42:1 |
| `--accent-amber` | `#ffb020` | 1.71:1 | 1.83:1 |
| `--success` | `#34d399` | 1.80:1 | 1.92:1 |
| `--warning` | `#fbbf24` | 1.56:1 | 1.67:1 |
| `--danger` | `#fb7185` | 2.52:1 | 2.69:1 |
| `--info` | `#60a5fa` | 2.38:1 | 2.54:1 |
| `--accent-violet` | `#8b6bff` | 3.48:1 | 3.72:1 |

Real usages affected: `Badge` tone text (`success`/`warning`/`danger`/
`info`/`violet` variants), `Button`'s `danger` variant text, `StatCard`'s
trend indicator text, and the `StatCard`/`NotificationBell` icon fills
that use `--accent-amber`.

**Fix — added light-theme overrides**, each verified against the actual
composited badge background (e.g. `--success` text on the 12%-opacity
`--success-bg` tint over white), not just the flat page background:

| Variable | New (light theme) | vs `--bg` | vs composited badge bg |
|---|---|---|---|
| `--text-faint` | `#6f6f7a` | 4.64:1 | 4.96:1 |
| `--accent-amber` | `#ba7800` | 3.40:1 (UI/icon use only — see below) | 3.34:1 |
| `--success` | `#1a7655` | 5.21:1 | 5.14:1 |
| `--warning` | `#866202` | 5.22:1 | 5.23:1 |
| `--danger` | `#d10623` | 5.22:1 | 4.98:1 |
| `--info` | `#0763d6` | 5.22:1 | 5.03:1 |

**`--accent-violet` was deliberately left unchanged.** It also feeds
`--accent-gradient` (used as the `Button` `primary` background and the
`Logo`/topbar avatar chip, all with black text on top). Darkening
`--accent-violet` enough to pass 4.5:1 as standalone text would have
dropped the gradient's black-text contrast from a comfortable 5.6:1
down to ~4.2:1 at the gradient's start stop — trading a rarely-used
badge variant's contrast for a regression on the most prominent button
in the app. Its own icon/UI-component uses (Sidebar active icon, Toast
info icon, StatCard icon) already clear 3:1 (3.48–3.72:1) unchanged.

Instead, added a second, purpose-built token:

- **`--accent-violet-deep`** — previously defined (`#6d4dfa`) but unused
  anywhere in the codebase. Repurposed as the accessible-contrast
  stand-in for violet-as-text, decoupled from the gradient:
  - Dark theme: `#987cff` (lightened, since dark surfaces need a
    *brighter* color for contrast) — 5.02–5.57:1 against the actual
    translucent violet badge background.
  - Light theme: `#6439ff` (darkened) — 5.01–5.50:1 against the same.
  - `Badge`'s `violet` tone now reads `text-[var(--accent-violet-deep)]`
    instead of `text-[var(--accent-violet)]` — the only component
    change required by the contrast pass.

`--accent-amber`'s new value only needed to clear the 3:1 UI-component
threshold (it's never used as text — only as an icon fill and inside
`--accent-gradient`), which kept the compromise with the gradient's
black-text contrast minimal (still 5.77:1 at the gradient's end stop,
vs. 11.48:1 originally).

**No values were hardcoded into components** — every fix is a CSS
custom-property value (or, for `Badge`'s violet variant, a swap to an
already-existing token).

---

## 2. Focus management

Audited every `button`, `a`, and `input`/custom-trigger element in
`src/components/ui/`, `src/components/shared/`, and the rest of
`src/components/`. **None had any explicit `:focus-visible` styling** —
grepping the whole tree for `outline`, `focus:`, or `focus-visible`
returned zero matches before this pass. Nothing was actively stripping
the browser default outline, but nothing was replacing it with a
design-consistent style either, so focus visibility was inconsistent
across browsers and didn't match the design system.

**Fix:** applied the existing (previously unused) `.accent-ring`
utility from `globals.css` (`outline: 2px solid var(--accent-violet);
outline-offset: 2px`) to every interactive element that lacked one:

- `Button` (all variants)
- `Modal`'s close button
- `Toast`'s dismiss button
- `NotificationBell`'s trigger button
- `ThemeToggle`'s trigger button
- `Sidebar`'s section-disclosure buttons and `NavLink`s
- `Topbar`'s mobile menu button
- `AdminShell`'s mobile-drawer close button
- `StatCard`'s optional `Link` wrapper
- `ImageUpload`'s drop-zone (now also a real interactive control, see
  §4) and its remove-image button

`Badge` and `Card` were left untouched — neither renders an interactive
element.

---

## 3. ARIA — custom widgets

**Icon-only buttons:** already had `aria-label`s in every case checked
(`NotificationBell`, `ThemeToggle`, `Topbar`'s mobile menu button,
`AdminShell`'s drawer-close button, `Modal`'s close button, `Toast`'s
dismiss button, `ImageUpload`'s remove-image button) — no gaps found
here.

**`Modal`** (`src/components/ui/Modal.tsx`) — had `role="dialog"` and
`aria-modal="true"` already, but was missing everything else a real
dialog needs:
- No `aria-labelledby` tying the dialog to its visible title →
  **added**, via a generated id (`useId`) on the `<h3>`.
- No focus trap — Tab could move focus to page content behind the
  modal → **added**, a manual Tab/Shift+Tab cycle over the dialog's
  focusable descendants.
- No initial focus placed inside the dialog on open (focus stayed on
  whatever triggered it, behind the overlay) → **added**, focuses the
  first focusable descendant (falling back to the dialog itself) when
  `open` becomes `true`.
- No Escape-to-close → **added**, a `keydown` listener while open.
- No focus restoration to the trigger element on close → **added**,
  captures `document.activeElement` on open and refocuses it on the
  effect's cleanup.

**`NotificationBell`** (`src/components/shared/NotificationBell.tsx`) —
a custom dropdown with a real, and previously **unfixable**, keyboard
trap: it could be opened with Enter/Space (real `<button>` trigger),
but the only way to close it was clicking the full-screen invisible
overlay — a keyboard user who opened it had no way to close it at all.
- Added `aria-haspopup="true"` and `aria-expanded={open}` to the
  trigger button.
- Added `role="region" aria-label="Notifications"` to the panel.
- Added an Escape key handler that closes the panel and returns focus
  to the trigger button.
- The overlay-click handler now also returns focus to the trigger.

**`Sidebar`** (`src/components/Sidebar.tsx`) — the collapsible nav
section headers are disclosure buttons but never exposed their
open/closed state → **added `aria-expanded={open}`** to each section
toggle button.

**`AdminShell`**'s mobile nav drawer (`src/components/AdminShell.tsx`)
— functions as a modal drawer (backdrop, traps the page behind it
visually) but had no ARIA semantics or keyboard handling at all.
Brought it in line with the same pattern as `Modal`: `role="dialog"`,
`aria-modal="true"`, `aria-label="Navigation menu"`, a Tab-cycle focus
trap scoped to the drawer, initial focus on open, Escape-to-close, and
focus restoration to the hamburger button on close.

No redundant ARIA was added anywhere — e.g. `Sidebar`'s `NavLink`s
render as real `<a>` elements via `next/link` and didn't need a `role`;
`BrandIcon` SVGs already carry `aria-hidden="true"` correctly since
they're always paired with visible link text elsewhere.

---

## 4. Keyboard navigation

**`ImageUpload`** (`src/components/public/ImageUpload.tsx`) — the
confirmed real bug the audit was looking for: the drop-zone was a plain
`<div>` with `onClick`/`onDragOver`/`onDrop` handlers and nothing else.
It had no `tabIndex`, no `role`, and no key handling, so it was
completely unreachable and unusable from the keyboard — a hard 2.1.1
(Keyboard) failure, not just a styling gap.

- **Fix:** added `role="button"`, `tabIndex={0}`, `aria-label={label}`,
  and an `onKeyDown` handler that activates the file picker on `Enter`
  or `Space` (matching native `<button>` behavior), plus the
  `.accent-ring` focus style from §2. Drag-and-drop still works
  unchanged for mouse/pointer users.

Everything else checked (`Button`, `Modal`, `Toast`, `NotificationBell`,
`ThemeToggle`, `Sidebar`, `Topbar`, `StatCard`'s optional link) already
used real `<button>`/`<a>` elements, so Tab/Enter/Space already worked —
those only needed the ARIA/focus-trap/focus-visible fixes described
above. `TiltCard`'s mouse-tied tilt effect is purely decorative (no
`onClick`, no semantic role of its own); it doesn't gate access to
anything, so it didn't need a keyboard equivalent — only a
reduced-motion equivalent (§5).

---

## 5. `prefers-reduced-motion`

No existing handling was found anywhere in `src/components/` — no
`MotionProvider`, no `useReducedMotion()` calls, and no
`prefers-reduced-motion` media query in `globals.css` prior to this
pass.

**Added a CSS-level safety net** in `globals.css` — a
`@media (prefers-reduced-motion: reduce)` block that collapses ordinary
CSS `transition`/`animation` durations app-wide (this catches plain
Tailwind `transition-colors`/`transition-opacity` hover states, the
Sidebar chevron rotation, etc.). This does **not** cover framer-motion,
which drives its animations via JS/WAAPI rather than CSS
`transition`/`animation` properties, so every framer-motion-driven
component listed below was also updated individually with
`useReducedMotion()`:

- **`Modal`** — entrance/exit now becomes a plain opacity fade with no
  transform or spring when reduced motion is preferred.
- **`Toast`** — same: opacity-only, no spring/scale/translate.
- **`StatCard`** — the icon scale-in becomes opacity-only; the
  `CountUp` number spring now jumps straight to the final value instead
  of animating up from zero.
- **`ThemeToggle`** — the sun/moon icon swap becomes a plain fade
  instead of a rotate+scale.
- **`NotificationBell`** — the dropdown panel's entrance/exit becomes
  opacity-only.
- **`Sidebar`** — the section-collapse animation becomes opacity-only
  (no height animation); the active-nav-item pill's `layoutId` spring
  transition is set to zero duration.
- **`AdminShell`** — the mobile drawer's slide-in becomes a plain fade
  instead of an x-axis spring slide; the backdrop fade's transition is
  zeroed too.
- **`StaggerGroup`/`StaggerItem`** (`src/components/motion/Stagger.tsx`)
  — the shared stagger-in primitive used to animate card grids across
  the app now renders children with an instant opacity fade and no
  stagger delay when reduced motion is preferred.
- **`ImageUpload`** — the remove-image button's hover fade duration is
  zeroed.
- **`TiltCard`** — the continuous mouse-tied 3D tilt (`rotateX`/
  `rotateY`) is disabled outright (locked to `0`) when reduced motion
  is preferred; this was the single most likely component to trigger
  vestibular discomfort, since it's a continuous, pointer-driven
  rotation rather than a one-off transition.

---

## Verification

- `npx tsc --noEmit` — clean.
- `npx eslint .` — clean.
- `npx next build` — succeeds.

## Files touched

`src/app/globals.css`, `src/components/AdminShell.tsx`,
`src/components/Sidebar.tsx`, `src/components/Topbar.tsx`,
`src/components/motion/Stagger.tsx`,
`src/components/public/ImageUpload.tsx`,
`src/components/public/TiltCard.tsx`,
`src/components/shared/NotificationBell.tsx`,
`src/components/shared/ThemeToggle.tsx`, `src/components/ui/Badge.tsx`,
`src/components/ui/Button.tsx`, `src/components/ui/Modal.tsx`,
`src/components/ui/StatCard.tsx`, `src/components/ui/Toast.tsx`.

No page files under `src/app/` were modified, and nothing under
`src/app/staff/`, `src/app/vendors/[id]/`, `src/app/audit-log/`,
`src/app/website/`, or any server-action file was touched.
