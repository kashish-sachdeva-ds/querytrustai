# QueryTrust AI Design Rulebook

This file is the visual source of truth for every frontend page. Its rules are mandatory. Implement the tokens in `frontend/src/design-system.css`; do not approximate them with Tailwind defaults, arbitrary hex values, or one-off component styles.

## 1. Color contract

The product uses a Warm Editorial Light system. International Orange is the only product accent. `--qt-danger` is reserved for actual destructive/error semantics and is not a second brand accent.

| CSS variable | Hex | Exact HSL | Required use |
|---|---|---|---|
| `--qt-canvas` | `#FAF8F5` | `hsl(36.0 33.3% 97.1%)` | Application canvas only |
| `--qt-surface` | `#FFFFFF` | `hsl(0 0% 100%)` | Elevated content surfaces |
| `--qt-surface-muted` | `#F5F2ED` | `hsl(37.5 28.6% 94.5%)` | Hover fills, tracks, quiet grouping |
| `--qt-ink` | `#191817` | `hsl(30.0 4.2% 9.4%)` | Headings, primary values, strongest text |
| `--qt-text` | `#4F4A45` | `hsl(30.0 6.8% 29.0%)` | Body copy and standard data text |
| `--qt-muted` | `#766F68` | `hsl(30.0 6.3% 43.5%)` | Supporting copy, labels, timestamps |
| `--qt-border` | `#E6E4E0` | `hsl(40.0 10.7% 89.0%)` | Default structural border/divider |
| `--qt-border-strong` | `#D7D2CA` | `hsl(36.9 14.0% 81.8%)` | Hovered neutral control border only |
| `--qt-accent` | `#FF4F00` | `hsl(18.6 100% 50%)` | Primary action, active marker, selected state, data emphasis |
| `--qt-accent-hover` | `#DF4500` | `hsl(18.6 100% 43.7%)` | Hovered primary action or data emphasis |
| `--qt-accent-soft` | `#FFF0E8` | `hsl(20.9 100% 95.5%)` | Accent icon well only |
| `--qt-danger` | `#A7382C` | `hsl(5.9 58.3% 41.4%)` | Error/destructive state only |
| `--qt-danger-soft` | `#FFF1EE` | `hsl(10.6 100% 96.7%)` | Error/destructive background only |

Compatibility aliases must remain exact:

```css
--bg-primary: var(--qt-canvas);
--bg-secondary: #25221F; /* hsl(30.0 8.8% 13.3%) — persistent sidebar only */
--bg-surface: var(--qt-surface);
--bg-surface-hover: var(--qt-surface-muted);
--bg-card: var(--qt-surface);
--border-subtle: var(--qt-border);
--border-focus: var(--qt-accent);
--text-primary: var(--qt-ink);
--text-secondary: var(--qt-text);
--text-muted: var(--qt-muted);
--accent-primary: var(--qt-accent);
--accent-primary-hover: var(--qt-accent-hover);
```

## 2. Typography contract

Load only these families:

```css
--font-display: 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif;
--font-sans: 'Manrope', ui-sans-serif, system-ui, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, monospace;
```

- `Plus Jakarta Sans` is for page titles, panel titles, and primary metrics. Use `letter-spacing: -0.04em` to `-0.075em`; never use it for dense table data.
- `Manrope` is for all body/UI text. Use `1.6`–`1.65` line-height for explanatory copy.
- `JetBrains Mono` is mandatory for identifiers, timestamps, labels, shortcut keys, and numeric data. Apply `font-variant-numeric: tabular-nums` to numeric values and timestamps.
- Use a three-tier hierarchy: page heading `clamp(2rem, 3vw, 2.7rem)` / `1.05`; panel heading `1.1rem` / `1.2`; mono label `0.68rem` with `0.12em` tracking and uppercase. Body text starts at `0.8rem`; labels must never visually compete with their heading.
- Primary text is `--qt-ink`; standard text is `--qt-text`; secondary text is `--qt-muted`. Never use pure black.

## 3. Geometry, spacing, and layout

Use this radius scale exactly:

| Element | Radius |
|---|---:|
| Outer surface/panel | `12px` (`--qt-radius-outer`) |
| Inner popover/card | `8px` (`--qt-radius-inner`) |
| Button, input, badge | `6px` (`--qt-radius-control`) |
| Shortcut key | `3px` |
| Pill shape | Forbidden except a status dot or a true avatar |

Use this established spacing rhythm, with the following required page values:

- Main content: `padding: 2.5rem clamp(1.25rem, 3.75vw, 3.75rem) 3.75rem`; mobile: `1.4rem 1.1rem 2.5rem`.
- Major page sections: `1.875rem` gap. View-local sections: `1.6rem`. Grids: `1.25rem`.
- Standard panel padding: `1.45rem`. Feature/lead panel padding: `1.875rem`. Never reduce a desktop content panel below `1.25rem`.
- Panel title divider: `1rem` padding below. Dense list gap: `0.88rem` minimum. Summary list gap: `1.05rem`.
- Rows: table cells use `0.88rem 0.45rem`; compact controls use at least `.78rem .95rem`.
- At `720px` and below, collapse grids to one column, preserve structural dividers, and do not hide required actions.

## 4. Surface, border, and depth rules

- Panels use `background: var(--qt-surface)`, `border: 1px solid var(--qt-border)`, `border-radius: 12px`, and only `inset 0 1px 0 rgba(255,255,255,.9)` as a top-edge highlight.
- Use full-bleed `1px solid var(--qt-border)` lines to separate sections, rows, and adjacent summary modules. When two modules are a single conceptual group, give their parent one surface and divide children with a border; do not create two cards.
- Header background is `rgba(250,248,245,.92)` with the same white `.9` inset highlight. This opacity is fixed.
- Primary controls use `--qt-accent` with an internal `inset 0 1px 0 rgba(255,255,255,.2)` highlight. The brand mark alone may use `rgba(255,255,255,.18)`.
- Do not use drop shadows for routine hierarchy. The only permitted floating exception is a user menu: `0 8px 24px rgba(25,24,23,.08)`.
- Canvas grain is fixed at `opacity: .03`, `pointer-events: none`, and must never become a decorative hero texture.

## 5. Composition rules

- Prefer an asymmetric bento, split pane, editorial table, or shared divided surface. Do not produce a row of three equal metric cards.
- Make the most important live metric the largest visual object. Supporting metrics may sit in smaller panels; all dashboard values must come from the API, never hard-coded placeholders.
- A surface is justified only when it groups a task, contains a control, or establishes a distinct hierarchy. Use a divider line for sequential information inside the same task.
- Static information is not clickable. Do not add decorative card hover lifts to static metrics. Reserve hover movement for rows that reveal more readable state, and keep it to `translateX(3px)`.
- Persistent navigation is charcoal: sidebar `#25221F` / `hsl(30.0 8.8% 13.3%)`, structural line `#39342F` / `hsl(30.0 9.6% 20.4%)`, and active marker `--qt-accent`.

## 6. Interaction and accessibility rules

- Every interactive control must have `:focus-visible { outline: 2px solid var(--qt-accent); outline-offset: 2px; }`.
- Buttons use `150ms cubic-bezier(.22, 1, .36, 1)` transitions and `:active { transform: scale(.98); }` unless disabled.
- Primary button hover is `--qt-accent-hover`. Disabled primary controls use `#BCB4AB` / `hsl(31.8 11.3% 70.4%)`, `opacity: .78`, and `cursor: wait` only when an operation is in progress.
- Tables and interactive summary rows use `--qt-surface-muted` on hover. Do not use hover shadows or color shifts unrelated to meaning.
- Every remote-data view must implement loading, empty, success, and recoverable error states. Loading skeletons must match final layout geometry and include `role="status"`, `aria-live="polite"`, and visually hidden status text.
- Respect `prefers-reduced-motion: reduce` by reducing all animation and transition durations to `.01ms` and disabling smooth scrolling.
- Use lucide-react SVG icons at a crisp stroke weight. Never use emoji as a UI icon.

## 7. Explicit bans

- No purple, indigo, blue, cyan, or multicolor startup gradients. No neon glow blobs.
- No generic three-card metric row, centered-icon marketing cards, or empty “dashboard” whitespace.
- No `Inter`, `Roboto`, Arial, or browser-default typography as the primary application face.
- No `shadow-lg`, `shadow-xl`, blurred floating cards, or muddy black shadows.
- No full-pills for ordinary buttons, inputs, tags, or navigation.
- No raw emojis in product UI.
- No arbitrary one-off spacing, radii, colors, opacity, fonts, or shadows that contradict this file.
- No fake chart values, fake result rows, “Lorem ipsum,” or placeholder users. Preserve the project’s synthetic-data labels and its backend-enforced read-only analytics constraints.

## 8. Implementation checklist for every new page

1. Import and use `frontend/src/design-system.css`; use the variables above rather than local values.
2. Start with one clear page heading, a concise muted explanation, and a full-width structural divider.
3. Build a responsive asymmetric composition. Remove any card that can become a divider-separated section.
4. Add keyboard focus, hover, active, disabled, loading, empty, error, and success states before declaring the page complete.
5. Verify the production build and inspect the page at desktop and mobile widths. Update `docs/BUILD_STATUS.md` with only observed verification results.
