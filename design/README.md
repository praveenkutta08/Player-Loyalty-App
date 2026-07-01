# design/ — drop your design file here

Claude Code will read this folder to build the admin + mobile design systems and the tenant
default theme. Provide **one** of:

**Option A — Figma link (preferred if you have the Figma MCP / Dev Mode):**
- Put the file URL in `design/FIGMA.md`. In Claude Code, use the Figma MCP to pull frames,
  variables (design tokens), and component specs, then implement them.

**Option B — Exported assets + tokens:**
- `design/tokens.json` — colors, typography, spacing, radii, shadows (Style-Dictionary/DTCG shape is fine).
- `design/screens/` — PNG/SVG exports of key screens (admin + mobile).
- `design/logo/` — logos, app icon, splash.

## How it maps
- Tokens → Tailwind theme (admin) and the mobile `theme/` tokens, **and** the shape of the
  per-tenant **manifest** (so tenants can override tokens in the CMS).
- Screens → component structure and layout.
- Keep token **names** consistent across admin, mobile, and the manifest schema.
