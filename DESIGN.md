---
name: Wizzaroo
description: Every HTML screen is a sheet of the explorer's map of six Islands.
colors:
  cover: "#1b5ea6"
  cover-strong: "#144a85"
  cover-night: "#375972"
  cover-strong-night: "#466e8d"
  on-cover: "#ffffff"
  on-cover-night: "#f4f8fa"
  map-magenta: "#b8166f"
  map-magenta-night: "#f27ab9"
  keyline-ink: "#22323d"
  keyline-ink-night: "#7ea3b2"
  woodland-green: "#2f7d32"
  sea-paper: "#e4f1f6"
  sea-paper-night: "#08161d"
  land-paper: "#fcfdf8"
  land-paper-night: "#11252e"
  muted-land: "#eef4e4"
  border-wash: "#b9cdd6"
  ink-foreground: "#14212b"
  ink-foreground-night: "#e8f1f4"
  ink-hover: "#24384a"
  cover-control-hover: "#d8e4eb"
  muted-ink: "#3b505d"
  input-border: "#5a7382"
  on-primary: "#ffffff"
  on-primary-night: "#071318"
  theme-sky: "#1b5ea6"
  theme-sky-hover: "#144a85"
  theme-sky-night: "#7bb9ec"
  theme-grape: "#6a3d9f"
  theme-forest: "#2b7a30"
  theme-sunset: "#b2430a"
  theme-berry: "#ad176a"
  theme-lagoon: "#0d6c66"
  error-red: "#b3261e"
  success-green: "#21712a"
  star-amber: "#f59e0b"
typography:
  display:
    fontFamily: "Barlow Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 1.6rem + 2.8vw, 4.125rem)"
    fontWeight: 800
    lineHeight: 0.95
    letterSpacing: "-0.005em"
  headline:
    fontFamily: "Barlow Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(2.125rem, 1.7rem + 1.8vw, 2.75rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.005em"
  title:
    fontFamily: "Barlow Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "0.005em"
  title-small:
    fontFamily: "Barlow Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 700
    lineHeight: 1.1
  body:
    fontFamily: "Andika, ui-rounded, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
  body-strong:
    fontFamily: "Andika, ui-rounded, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1.55
  map-lettering:
    fontFamily: "Barlow Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.08em"
  grid-reference:
    fontFamily: "Barlow Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.08em"
  label-lettering:
    fontFamily: "Barlow Condensed, Arial Narrow, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 700
    letterSpacing: "0.01em"
rounded:
  small: "3px"
  medium: "4px"
  large: "6px"
  round: "3px"
  circle: "50%"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.5rem"
  "6": "2rem"
  map-square: "4rem"
components:
  button-primary:
    backgroundColor: "{colors.theme-sky}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.small}"
    padding: "0 1.5rem"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.theme-sky-hover}"
  button-secondary:
    backgroundColor: "{colors.land-paper}"
    textColor: "{colors.theme-sky}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.small}"
    padding: "0 1.5rem"
    height: "48px"
  button-secondary-hover:
    backgroundColor: "{colors.muted-land}"
  button-cover:
    backgroundColor: "{colors.cover}"
    textColor: "{colors.on-cover}"
    typography: "{typography.label-lettering}"
    rounded: "{rounded.small}"
    padding: "0 1.5rem"
    height: "52px"
  button-cover-hover:
    backgroundColor: "{colors.cover-strong}"
  button-ink:
    backgroundColor: "{colors.ink-foreground}"
    textColor: "{colors.land-paper}"
    typography: "{typography.label-lettering}"
    rounded: "{rounded.small}"
    padding: "0 1.5rem"
    height: "52px"
  button-ink-hover:
    backgroundColor: "{colors.ink-hover}"
    textColor: "#ffffff"
  button-sheet:
    backgroundColor: "{colors.land-paper}"
    textColor: "{colors.ink-foreground}"
    typography: "{typography.label-lettering}"
    rounded: "{rounded.small}"
    padding: "0 1.5rem"
    height: "52px"
  button-sheet-hover:
    backgroundColor: "{colors.muted-land}"
  region-chip:
    backgroundColor: "{colors.land-paper}"
    textColor: "{colors.ink-foreground}"
    rounded: "{rounded.small}"
    padding: "0 0.75rem 0 0.5rem"
    height: "44px"
  region-chip-active:
    backgroundColor: "{colors.theme-sky}"
    textColor: "{colors.on-primary}"
  input:
    backgroundColor: "{colors.land-paper}"
    textColor: "{colors.ink-foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.small}"
    padding: "0 0.75rem"
    height: "48px"
  panel:
    backgroundColor: "{colors.land-paper}"
    textColor: "{colors.ink-foreground}"
    rounded: "{rounded.small}"
    padding: "1.5rem"
  cover-band:
    backgroundColor: "{colors.cover}"
    textColor: "{colors.on-cover}"
    typography: "{typography.map-lettering}"
    padding: "0.5rem 1rem"
  cover-control:
    backgroundColor: "{colors.land-paper}"
    textColor: "{colors.ink-foreground}"
    rounded: "{rounded.small}"
    height: "44px"
  cover-control-hover:
    backgroundColor: "{colors.cover-control-hover}"
    textColor: "{colors.ink-foreground}"
  cover-control-current:
    backgroundColor: "{colors.ink-foreground}"
    textColor: "{colors.land-paper}"
  sidebar-link:
    backgroundColor: "transparent"
    textColor: "{colors.ink-foreground}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.medium}"
    padding: "0 0.75rem"
    height: "44px"
  sidebar-link-current:
    backgroundColor: "{colors.theme-sky}"
    textColor: "{colors.on-primary}"
---

# Design System: Wizzaroo

## Overview

**Creative North Star: "The Island Explorer Map"**

Every HTML screen is a sheet of the explorer's map: the home page, signing in, the Parent, Teacher and Admin pages, Settings, and the menus, panels and bars over the game. The page is the sea, ruled into 4rem grid squares. Panels are land, printed inside a 2px ink keyline with small square corners. The header is the sheet's cover band, printed in the chosen theme's ink. Map lettering and headings are condensed; body text is set in a primer face for children still learning to read.

The world refuses the ed-tech default of dark navy, gradient text and rows of rounded cards. Depth comes from the map's printed layers (sea, land, keyline), not from soft shadows, glass or gradients. Colour is functional, as on a real map: the user's theme colour prints the cover and the main way in and inks links, buttons and chosen states; magenta marks routes, labels and focus.

The system ships in light and dark ("sea-blue paper" by day, "night chart" in navy-teal by night) and in six theme printings. The product's default colour mode is Dark; that is a product setting and this system leaves it unchanged. The 3D world and the in-Game boards' own art are out of scope: they keep their own look, and Baloo 2 and Nunito remain bundled only for canvas lettering in the 3D world.

**Key Characteristics:**

- Sea ground ruled into map squares; land panels inside 2px keylines.
- A cover band in the theme's ink for the header, the closing call and the primary home action.
- Magenta for map labels, routes, lit grid references and every focus ring.
- Barlow Condensed for map lettering and headings, Andika for reading.
- Square corners (3px), never pills; true circles only where a symbol is round.
- Flat print: no ambient shadows on panels, cards or buttons.

## Colors

A printed map's inks: pale sea and land papers, one ink keyline, magenta overprint, and a theme ink that changes with the printing and also prints the cover.

### Primary

- **Cover** (cover, cover-strong; night cover-night, cover-strong-night): the sheet's cover band, printed in the chosen theme's ink. Fills the site header, the parent sidebar crest, the home page's main action and closing call, the "every Island" map-key symbol, and the Mission celebration's "One more go" button. In the build it is `--colour-cover`: the theme ink by day, and by night `color-mix(in oklab, theme 45%, #08161d)`, a deep shade of the theme ink. Hover deepens to Cover Strong (the theme hover by day, a 58% mix by night). The frontmatter values are the default Sky printing. Text on it is On-Cover (`--colour-on-cover`): on-primary by day (white on Sky), near-white #f4f8fa by night. Text selection is a 45% wash of it.
- **Theme Ink** (theme-sky by default, then theme-grape, theme-forest, theme-sunset, theme-berry, theme-lagoon): the user's chosen printing. Inks links, generic buttons, chosen and current states (active Region chip, current sidebar section, pressed Island chip), checkbox accents and chart bars. Each theme has a light and a night value and a deeper hover value.

### Secondary

- **Map Magenta** (map-magenta; night map-magenta-night): the overprint. Focus rings (3px outline), the caret, the lit grid reference under the pointer, the dashed footpath under "adventure" and between the How-it-works waypoints, and footer link underlines on hover.

### Tertiary

- **Woodland Green** (woodland-green): land tint on the island index squares (mixed 14% into land paper), a checkerboard of wooded squares.
- **Star Amber** (star-amber): Stars and rewards only; it is the game's currency colour, not a UI accent.

### Neutral

- **Sea Paper** (sea-paper; night sea-paper-night): the page ground. In the build it is `color-mix(in oklab, theme 9%, #e4f1f6)` by day and `color-mix(in oklab, theme 12%, #08161d)` by night, ruled with a 1px grid line every map square.
- **Land Paper** (land-paper; night land-paper-night): panels, sections, forms, the footer, the sidebar, the map sheet. Mixed 2% (night 8%) towards the theme.
- **Muted Land** (muted-land): fieldsets, secondary hover, tab wells. Mixed 6% (night 12%) towards the theme.
- **Border Wash** (border-wash): ruled rows inside a panel (map-key rows, fieldset edges). Mixed 22% towards the theme.
- **Keyline Ink** (keyline-ink; night keyline-ink-night): every 2px panel outline, the header and footer rules, the sheet face, secondary button borders.
- **Ink Foreground** / **Muted Ink**: body text and secondary text (grid references, leads, notes).
- **Input Border** (input-border): 2px field outlines.
- **Error Red** / **Success Green**: form feedback, each with a soft tint for its panel.

### Named Rules

**The Six Printings Rule.** The six themes are six printings of one map. A theme changes only the theme ink and a few percent of tint in sea, land, muted and border; the cover follows the theme ink, while magenta and keyline ink never change with the theme.

**The Chosen-Is-Theme, Focus-Is-Magenta Rule.** Chosen, current and pressed states take the user's theme colour. Focus is always a 3px magenta outline. Never swap them.

**The Theme Cover Rule.** The cover is printed in the chosen theme's ink: the header band, the main way in, and the closing call. Text on it is always `--colour-on-cover`. Controls that sit on the band (Menu, Settings) stay light paper #fcfdf8 with ink #14212b, so they read on every printing.

## Typography

**Display Font:** Barlow Condensed (with Arial Narrow, system-ui)
**Body Font:** Andika (with ui-rounded, system-ui)

**Character:** Condensed survey lettering for places, headings and big controls, set against a primer typeface with single-storey a and g so a Year 1 Child can still read the page.

### Hierarchy

- **Display** (800, clamp 2.75 to 4.125rem, line-height 0.95): the home hero heading only; the closing call uses the same face at clamp 2.25 to 3.75rem.
- **Headline** (700, clamp 2.125 to 2.75rem, 1.1): page `h1`.
- **Title** (700, 1.625rem, 1.1): section `h2`.
- **Title Small** (700, 1.3125rem, 1.1): `h3`, map-key entries (1.375rem), legends (1.125rem).
- **Body** (400, 1.0625rem, 1.55): all reading text; leads up to 1.1875rem and around 36rem wide.
- **Map Lettering** (800, 2.125rem, 0.08em, uppercase): the WIZZAROO title in the cover band.
- **Grid Reference** (700, 0.875rem, 0.08em): A to H and Year numbers around the sheet; the sheet title beneath it is uppercase at 0.9375rem.
- **Label Lettering** (700, 1.1875rem, 0.01em): play-bar tabs, form submits and home actions; Region chips at 1.0625rem.

### Named Rules

**The Sentence-Case Rule.** Headings are sentence case, for early readers. Uppercase is reserved for map lettering: the cover-band title, the sheet title, Island Years, map-key Region names and Region chip subject tags.

**The Reading-Face-In-Buttons Rule.** Generic buttons and small text inside controls stay in Andika (700). Condensed lettering goes only on play-bar tabs, form submits, home actions and Region chips, the controls that name places and actions in big type.

## Layout

The sea is a fixed grid: the body background is ruled every map square (4rem) with 1px lines in a faint theme-blue wash. Content pages are a single column, at most 40rem wide, with 2rem top padding, 1rem sides and a 1.5rem gap between panels. Panels pad at 1.5rem with a 1rem internal gap.

The home page sits inside a map sheet: a land frame whose margin carries grid references A to H across the top and bottom and Years 1 to 6 down both sides, a keylined face ruled into those columns and rows, and an uppercase sheet title at its foot. Under 40rem the side references hide and the top and bottom shrink to 1.25rem. The hero is one column, splitting 0.9fr / 1.1fr at 60rem. Section headings sit at the left like a map's own titling, never centred over a grid. Feature insets run one, two (40rem) then three (64rem) columns, with wide insets spanning.

Adult pages add a 17rem sticky sidebar at 60rem and above. The site header is sticky at the top; the footer is sticky at the foot, and becomes static on phones on home and adult pages. Spacing steps are 0.25, 0.5, 0.75, 1, 1.5 and 2rem; fluid gaps use clamp between 1.5 and 3rem.

The Picture Password screen (`.menu form:has(> fieldset .picture-grid)`) fits one screen. In landscape at 48rem and wider the greeting and buttons sit in a column (0.8fr) beside the picture grid (1.2fr), and the panel is centred vertically between the header and footer within 60rem. Picture tiles scale with viewport height: `min-height: clamp(52px, 9dvh, 88px)`, with their pictures at `clamp(2rem, 5dvh, 3rem)`.

## Elevation & Depth

Flat print. Depth comes from the map's layers: land on sea, keylines around land, the cover band over the sheet. The card, hero, ground and button shadow tokens are all `none`. Only things that genuinely float over the sheet keep a short drop: an open menu, and the small play-bar controls over the 3D world. Pressing a button moves it down 1px rather than changing a shadow.

### Shadow Vocabulary

- **Menu drop** (`0 6px 14px -8px` of ink at 45%, black 70% at night): an open menu over the sheet.
- **Play control** (`0 1px 2px` of ink at 16%, black 45% at night): Island and Region chips and zoom controls floating over the 3D world.
- **Satellite ring** (`0 0 0 4px` land paper): a land-coloured halo that separates a small symbol from what is behind it.

### Named Rules

**The Printed-Layer Rule.** A panel lifts off the sea by being land inside a keyline, not by a shadow. If a new surface needs separation, give it land paper and a 2px keyline.

## Shapes

Square map symbols. Every panel, field, button and chip has the small corner (3px); even "pill" controls use it, since the round-corner token is also 3px. Sidebar links use 4px. True circles (`50%`) are kept for symbols that are round on a map: How-it-works waypoints and portraits. Lines are 2px keylines for outlines and 1px for ruled rows inside a panel. Paths and routes are dashed magenta (4px dashed between waypoints, a 0.07em dashed underline on a word). Progress meters are cut into squares by a mask: 0.625rem filled, 0.125rem gap, square ends, so progress is marked off square by square like a route.

## Components

### Buttons

- **Shape:** small square corner (3px), 48px tall (52px for home actions), 1.5rem side padding.
- **Primary (submit):** theme ink fill, on-primary text, Andika 700; form submits switch to condensed label lettering.
- **Secondary (`type="button"`):** land paper with a 2px keyline and theme-ink text; hover shifts the border to theme ink and the fill to muted land.
- **Cover action:** the main way in on the home page; cover fill with a keyline border and on-cover text, condensed 1.3125rem lettering; hover to cover strong.
- **Sheet action:** land paper, keyline border, foreground ink; the companion to the cover action.
- **Ink action:** the way in on the closing band; ink #14212b fill and border with paper #fcfdf8 text; hover to #24384a with white text. It holds on every printing because it never takes the theme.
- **One more go:** the Mission celebration's replay button; cover fill, on-cover border and text, condensed 1.25rem.
- **Hover / Focus / Press:** colour shifts over 150ms ease-out; press is a 1px drop over 200ms; focus is a 3px magenta outline offset 3px. Disabled is 50% opacity.

### Chips

- **Region chip:** the map's own place labels over the 3D world. Land paper, 1px keyline border, condensed 1.0625rem lettering, theme-ink line icon, and an uppercase subject tag in a theme-ink box. Hover gives a theme-ink border; pressed fills with theme ink and inverts the tag. Locked chips go muted. Press scales to 0.96.
- **Island chip:** the same land-and-keyline body in condensed 800; pressed fills with theme ink.

### Cards / Containers

- **Corner Style:** 3px.
- **Background:** land paper on the sea.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 2px keyline ink.
- **Internal Padding:** 1.5rem; nested sections and forms drop their frame.

### Inputs / Fields

- **Style:** 48px tall, 2px input-border outline, 3px corner, land paper fill, Andika 400.
- **Focus:** border turns theme ink with a 3px magenta outline offset 1px; hover darkens the border to muted ink.
- **Checkboxes and radios:** 1.5rem, theme-ink accent, in a 44px-tall row.

### Navigation

- **Site header (cover band):** sticky, cover fill in the theme's ink, 2px keyline rule beneath, the WIZZAROO title in uppercase map lettering in on-cover, and Menu and Settings controls in light paper #fcfdf8 with ink #14212b text and on-cover borders. Their hover is a 16% theme tint on paper; pressed (open menu) or current (Settings page) is ink #14212b with paper text. Focus rings inside the band are on-cover.
- **Play bar:** solid land with a keyline rule; tabs in condensed lettering inside a muted well; the current tab is land paper inked in the theme colour.
- **Parent sidebar:** 17rem land column with a keyline on its right; 44px links in Andika 700; hover is muted land; the current section ("the square you are in") is filled with theme ink.
- **Site footer:** sticky land strip with a keyline rule on top, condensed 0.9375rem links in muted ink; hover gives a 2px magenta underline.

### Map Sheet (signature)

A keylined land frame holding a gridded face. Its margin carries grid references (condensed, 0.08em tracking, muted ink); the reference for the square under the pointer lights in magenta with white text. The sheet title runs uppercase beneath. On the home page the sheet arrives folded: a 900ms unfold and a 1100ms crease fade on an expo ease-out, skipped under reduced motion. That unfold is the one authored entrance.

### Map Key

Subjects as a legend: ruled rows (1px border wash) inside one keylined panel, each led by a 2.75rem square symbol in the subject's colour with a 2px keyline and a white line icon, then a condensed name, an uppercase Region label and a muted line of Andika.

## Do's and Don'ts

### Do:

- **Do** put every new panel on land paper inside a 2px keyline with a 3px corner.
- **Do** ink chosen, current and pressed states in the user's theme colour, and focus in a 3px magenta outline.
- **Do** set headings in sentence case Barlow Condensed, and keep uppercase for map lettering.
- **Do** keep reading text and generic button labels in Andika.
- **Do** draw progress as squares (0.625rem squares, 0.125rem gaps) and routes as dashed magenta.
- **Do** print the cover in the chosen theme's ink and give every theme the same magenta and keyline ink; only the theme ink, the cover and tints change.

### Don't:

- **Don't** use dark navy as a fixed brand ground, gradient text, or rows of rounded cards.
- **Don't** give panels, cards or buttons soft ambient shadows; separation is land on sea inside a keyline.
- **Don't** hard-code a fixed cover colour or its text; use `--colour-cover` and `--colour-on-cover`, and keep band controls on light paper with ink text.
- **Don't** use full pill radii on controls; the round token is 3px.
- **Don't** use Baloo 2 or Nunito in HTML; they are for canvas lettering in the 3D world only.
- **Don't** restyle the 3D world or the in-Game boards' own art with these tokens.
