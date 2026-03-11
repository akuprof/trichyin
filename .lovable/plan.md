
Goal
- Rebuild and clone the uploaded “trichyinsight” app UI inside this Lovable project, using the ZIP as the source of truth for structure, styling, copy, and brand direction.

Plan
1) Source extraction and audit
- Read all accessible files from the uploaded ZIP (pages, components, assets, config, CSS, fonts).
- Build an inventory:
  - Route map (all pages/screens)
  - Reusable UI blocks (header, hero, cards, footer, etc.)
  - Design tokens (colors, typography, spacing, radii, shadows)
  - Asset list (logo, icons, images)
- If the ZIP cannot be parsed directly in-platform, fallback is to request extracted source files (or key screenshots/assets) and proceed immediately from those.

2) App shell alignment in this project
- Replace the current blank homepage with the cloned primary screen.
- Expand routing in `src/App.tsx` to match the source app page structure.
- Keep project conventions (React + TS + Tailwind + shadcn UI) and reuse existing UI primitives where possible.

3) Design system recreation (brand inferred from ZIP)
- Implement source-matched visual tokens in the Tailwind/theme layer (colors, text scales, spacing rhythm, border radius).
- Recreate layout scaffolding (container widths, section spacing, breakpoints).
- Add shared components for repeated blocks to keep the clone maintainable.

4) Page-by-page UI clone
- Build pages in priority order:
  1. Landing/home page
  2. Secondary content pages
  3. Utility/footer/legal/contact pages (if present)
- Match copy, hierarchy, imagery placement, and interactive affordances from source UI.
- Ensure responsive behavior at common breakpoints (mobile/tablet/desktop).

5) Asset and polish pass
- Import/organize all images/icons/fonts into project assets.
- Tune spacing, hover/focus states, transitions, and typography to reduce visual delta.
- Verify no dead routes and no missing assets.

6) Validation and handoff
- Compare cloned pages against source references and resolve high-visibility mismatches.
- Final sweep for console cleanliness and TypeScript health.
- Deliver a concise checklist of what matches exactly and what remains approximate (if any source limitations exist).

Technical details
- Files expected to change:
  - `src/pages/Index.tsx` (replace fallback UI)
  - `src/App.tsx` (route structure)
  - new page/component files under `src/pages` and `src/components`
  - theme/style files (`src/index.css`, possibly `tailwind.config.ts`) for design token parity
- Implementation conventions:
  - Strong typing for props/components
  - Reuse existing shadcn components before custom rebuilding
  - Keep components modular to support future feature additions
- Constraint noted:
  - ZIP archives are binary and may not be directly explorable as source code in this environment; if direct extraction is blocked, I will proceed with the same plan using extracted files/screens you provide, without changing scope.

Deliverable definition (for this phase)
- “UI clone first” is complete when:
  - All core routes/screens from source are represented
  - Visual style is consistently matched across pages
  - Responsive layout works across mobile/tablet/desktop
  - No major missing assets or broken navigation
