# Exporting from Figma for this project

The build needs three things in this `design/` folder:
1. `tokens.json`  — colors, typography, spacing, radii, shadows
2. `screens/`     — PNGs of key screens (layout reference)
3. `logo/`        — logo, app icon, splash

You do NOT need edit access or the Figma MCP for any of this — it's all built-in export.

---

## 1) Design tokens -> tokens.json
Pick whichever is easiest:

**Option A — plugin (best if the file uses Figma Variables/Styles):**
- In Figma: `Menu -> Plugins -> Find more plugins` and install a free exporter:
  "Tokens Studio for Figma", or "Design Tokens" (by Lukas Oppermann), or
  "Variables to JSON".
- Run it -> Export -> JSON. Save the result here as `tokens.json`.

**Option B — manual (small files):**
- Open the file. Right panel -> "Local variables" (or the Styles list).
- Copy the hex colors, font names/sizes, spacing and radius values into
  `tokens.template.json`, then rename it to `tokens.json`.

**Option C — fastest (let me derive them):**
- Skip tokens for now. Just export the screens + logo (below) and tell me your
  primary brand color(s). I'll derive a starter `tokens.json` from the screenshots
  and your brand, and you refine.

## 2) Screens -> screens/
- Select the frame(s) you want (Shift-click to pick several).
- Right panel -> "Export" section -> `+` -> choose **PNG**, set **2x** -> **Export**.
- Save into `design/screens/` with clear names, e.g. `mobile-home.png`,
  `mobile-offers.png`, `admin-offers.png`, `admin-geofence-editor.png`.
- Quick alternative: main `Menu -> File -> Export frames to PDF` for one reference PDF.

## 3) Logo & app assets -> logo/
- Select the logo -> Export -> **SVG** (and a PNG). Save as `logo/logo.svg` / `logo/logo.png`.
- App icon: export a **1024x1024 PNG** as `logo/icon.png`.
- Splash art (if any): export `logo/splash.png`.

---

## Tips
- Right-click a frame -> **"Copy link to selection"** gives a node-specific URL. If you
  later get **edit** access, send me that link and I'll pull tokens/screens directly via
  the Figma MCP (no manual export).
- Turn on **Dev Mode** (top-right toggle) to quickly inspect/copy exact color, spacing,
  and font values.
- Keep token **names** stable — the same names flow into the admin (Tailwind theme),
  the mobile theme, and the per-tenant **manifest**.

## What to send back
Commit these files (or just share `tokens.json` + the screens). I'll wire them into the
design system and the tenant manifest exactly as playbook prompts **P3.1** and **P4.1** describe.
