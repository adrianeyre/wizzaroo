---
version: 1
slug: "src-client-family-device-home-page-tsx"
primary_target: "src/client/family-device/home-page.tsx"
related_targets:
  ["src/client/theme.css", "src/client/parent/parent-page.tsx", "README.md"]
---

# Surface: Wizzaroo's HTML UI (home page first)

Scope: every HTML surface (home, sign-in, Parent/Teacher/Admin pages, Settings, footer pages, in-game menus, panels and HUD chrome) plus the README. Not the 3D world's rendering. Home page mode: Persuade. Adult dashboards: Operate. Footer pages and README: Read.
Audience: Children first (Years 1-6 on a Family Device), then Parents deciding to sign in.
Action: Get started as a Parent; for a Child, play.
Proof: the real six Islands, their Regions per Subject, and real screenshots. No invented claims.

## Direction contract

THESIS: Every screen is a sheet of the explorer's map. Wizzaroo is a world of six Islands, so the UI is drawn and keyed like real land: grid squares, a map key, contour lines and a folded sheet with an orange cover band. It refuses the ed-tech default of dark navy, gradient text and rows of rounded cards.

OWN-WORLD: Map paper is pale sea-blue in light (deep night-chart navy-teal in dark), land tint panels in pale green, an orange cover band (#f27a1a family) for the header and primary actions, magenta for map labels and focus, contour brown for keylines. Barlow Condensed in uppercase for map lettering and headings; Andika (a primer face for beginning readers) for body. Square corners, 2px ink keylines, grid ticks with references (A-H, 1-8) along edges, map-key symbols as icons. Depth comes from map layers, never soft shadows.

STORY: A Child sees their Islands as a real map they can enter. A Parent understands, from the key, that every Subject is a Region on every Island, sees it is private and offline, and signs in.

FIRST VIEWPORT: Desktop: an orange cover band across the top with WIZZAROO set big in condensed capitals and the sheet title "Explorer Map · Years 1 to 6". Under it, the map sheet fills the viewport: on the left a set-text panel (headline, lead, Get started as a Parent, See how it works); on the right the HeroStage map picture inside a gridded frame with A-H/1-8 references on its edges. Phone: band, headline, action, then the map.

FORM: Island Explorer Map, the assigned grounded candidate 3 of 7 in resonance order. seed:8b3b235a437aae5a

Raises: controls keep honest physical states (leather shelf); sections as clearings inside one continuous coastline keyline (secession); one strict grid with references is the composition (ASCII); progress as grid squares inked in, empty squares invite a first mark (drum machine); depth from map layers, not shadows (multiplane).

Signature interaction: grid references light up along the frame edges as the pointer or focus moves over a panel; motion is a single unfold of the sheet on load (clip-path from the crease), reduced to none under prefers-reduced-motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Amended at the user's request after the first build: the cover band (header, the home page's main action and closing band, the README banner) is printed in the chosen theme's colour, a deeper shade of it in dark mode, instead of a fixed orange.
