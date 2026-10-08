
Plan 1


here is our Next.js + SQLite + Prisma application, I would design this as a site-wide Design System / Theme Builder, rather than simply storing a few theme colors. That gives you an Elementor-like foundation that can later support page builder, templates, white-labeling, multi-tenant branding, and per-component overrides.

1. Target architecture

The system should have five layers:

┌─────────────────────────────────────────────────────────────┐
│                    THEME CUSTOMIZER                         │
│                                                             │
│  Brand Kit | Colors | Typography | Buttons | Forms | Cards │
│  Header    | Footer | Navigation | Layout | Components    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 DESIGN TOKEN ENGINE                         │
│                                                             │
│  Global Tokens                                               │
│  ├── Colors                                                  │
│  ├── Typography                                              │
│  ├── Spacing                                                 │
│  ├── Radius                                                  │
│  ├── Shadows                                                 │
│  ├── Borders                                                 │
│  ├── Breakpoints                                             │
│  └── Component tokens                                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                 Override / Cascade
                           │
        ┌──────────────────┼───────────────────┐
        ▼                  ▼                   ▼
     GLOBAL             SECTION             COMPONENT
     website            specific            specific
        │                  │                   │
        └──────────────────┼───────────────────┘
                           ▼
                    CSS VARIABLES
                           │
                           ▼
                  Next.js Application

The key principle is:

> Never hard-code theme values into individual React components.



Everything should ultimately resolve through design tokens → CSS variables.


---

2. Elementor-like customization hierarchy

I recommend supporting this hierarchy from day one:

System Defaults
      ↓
Tenant / Workspace Theme
      ↓
Site Theme
      ↓
Page Theme Override
      ↓
Section Override
      ↓
Component Override
      ↓
Instance Override

For example:

Global primary color
#2563EB

Page override
#7C3AED

Section override
#059669

Button instance override
#DC2626

The button should receive the final resolved value without knowing where it came from.


---

3. Global theme settings

Your main Theme Customizer should have:

Appearance
├── Theme
├── Brand Kit
├── Colors
├── Typography
├── Buttons
├── Forms
├── Cards
├── Containers
├── Header
├── Footer
├── Navigation
├── Icons
├── Images
├── Spacing
├── Borders
├── Shadows
├── Responsive
└── Advanced CSS


---

4. Brand Kit

Create a dedicated Brand Kit instead of mixing branding with arbitrary theme values.

Brand identity

Brand Name
Tagline
Logo
Logo Light
Logo Dark
Favicon
App Icon
OG Image
Watermark

Brand colors

Primary
Secondary
Accent
Success
Warning
Danger
Info
Neutral

Brand typography

Heading Font
Body Font
UI Font
Monospace Font

Brand assets

Logo
Alternative Logo
Symbol
Favicon
Email Logo
Invoice Logo
Social Media Logo

This becomes especially useful for your SaaS/white-label architecture.


---

5. Color system

Don't store only:

{
  "primary": "#2563eb"
}

Instead create a complete semantic color system.

Primitive colors

Blue
├── 50
├── 100
├── 200
├── 300
├── 400
├── 500
├── 600
├── 700
├── 800
└── 900

Same for:

Gray
Red
Orange
Yellow
Green
Teal
Cyan
Sky
Indigo
Violet
Purple
Pink

Then semantic tokens:

Primary
Primary Foreground

Secondary
Secondary Foreground

Accent
Accent Foreground

Background
Foreground

Card
Card Foreground

Muted
Muted Foreground

Border
Input

Ring

Success
Warning
Danger
Info

Example:

--color-primary: 221 83% 53%;
--color-primary-foreground: 0 0% 100%;

--color-background: 0 0% 100%;
--color-foreground: 222 47% 11%;

--color-muted: 210 40% 96%;
--color-muted-foreground: 215 16% 47%;

Using CSS variables makes dynamic theme switching much easier.


---

6. Theme palette presets

The user should be able to choose:

Theme Presets

○ Default Blue
○ Indigo
○ Purple
○ Emerald
○ Rose
○ Orange
○ Monochrome
○ Custom

But don't merely change primary.

A preset should define:

{
  "primary": "...",
  "secondary": "...",
  "accent": "...",
  "success": "...",
  "warning": "...",
  "danger": "...",
  "background": "...",
  "foreground": "...",
  "muted": "...",
  "border": "..."
}


---

7. Light / Dark / System themes

Support:

Appearance

○ Light
○ Dark
○ System

And preferably:

Light Theme
Dark Theme
High Contrast

Your tokens become:

:root {
  --color-background: ...;
  --color-foreground: ...;
}

.dark {
  --color-background: ...;
  --color-foreground: ...;
}


---

8. Typography system

This should be much more extensive than selecting one font.

Font families

Heading
Body
UI
Code

Allow:

System
Inter
Roboto
Poppins
Montserrat
Open Sans
DM Sans
Plus Jakarta Sans
Custom

For custom fonts:

Upload .woff
Upload .woff2
Upload .ttf

Store metadata rather than embedding font files in SQLite.

For example:

font-family
font-weight
font-style
font-display
source URL / storage key


---

9. Typography scale

Create semantic typography tokens:

Display
H1
H2
H3
H4
H5
H6

Body Large
Body
Body Small

Caption
Label
Button
Overline
Code

Each should have:

Font family
Font size
Font weight
Line height
Letter spacing
Text transform

Example:

{
  "heading1": {
    "fontSize": "3rem",
    "lineHeight": "1.1",
    "fontWeight": 700,
    "letterSpacing": "-0.02em"
  }
}


---

10. Responsive typography

This is important for an Elementor-like system.

Allow:

Desktop
Tablet
Mobile

Example:

H1

Desktop: 48px
Tablet: 40px
Mobile: 32px

Internally:

{
  "desktop": {},
  "tablet": {},
  "mobile": {}
}


---

11. Spacing system

Create global spacing tokens:

0
1
2
3
4
5
6
8
10
12
16
20
24
32
40
48
64
80
96
128

Then semantic values:

Section Padding
Container Padding
Card Padding
Grid Gap
Column Gap
Row Gap
Element Gap


---

12. Container system

Elementor-style global container settings:

Container

Max Width
├── Desktop
├── Tablet
└── Mobile

Width
Padding
Margin
Gap

Content Width
Boxed / Full Width

Example:

Max Width: 1280px
Horizontal Padding: 24px


---

13. Border system

Global:

Border Width
Border Style
Border Color

Radius:

None
XS
SM
MD
LG
XL
2XL
Full
Custom

Example:

--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;


---

14. Shadow system

Provide:

None
XS
SM
MD
LG
XL
2XL
Custom

Example:

Card Shadow
Dropdown Shadow
Modal Shadow
Popover Shadow
Button Shadow


---

15. Button customization

This deserves its own section.

Buttons
├── Primary
├── Secondary
├── Outline
├── Ghost
├── Destructive
└── Link

For each:

Background
Text Color
Border
Border Width
Radius
Padding
Font
Font Weight
Height
Shadow
Hover
Focus
Active
Disabled

Responsive:

Desktop
Tablet
Mobile

States:

Default
Hover
Focus
Active
Disabled
Loading


---

16. Form customization

Global form system:

Input
Textarea
Select
Checkbox
Radio
Switch
Slider
Date Picker
File Upload

Each:

Height
Radius
Border
Background
Text
Placeholder
Focus Ring
Error
Success
Disabled


---

17. Card system

Define:

Card
├── Default
├── Elevated
├── Outlined
├── Flat
└── Interactive

Properties:

Background
Border
Radius
Padding
Shadow
Hover


---

18. Header customization

Elementor-style:

Header
├── Layout
├── Logo
├── Navigation
├── CTA
├── Search
├── User Menu
└── Mobile Menu

Settings:

Header Width
Header Height
Background
Text Color
Border
Shadow
Sticky
Transparent
Overlay


---

19. Footer customization

Footer
├── Layout
├── Columns
├── Logo
├── Navigation
├── Social Links
├── Newsletter
├── Copyright
└── Legal Links


---

20. Partial customization

This is one of the most important requirements you mentioned.

You should support:

Global
Page
Section
Component
Instance

Example:

Global Theme
   ↓
Primary = Blue

Landing Page
   ↓
Primary = Purple

Pricing Section
   ↓
Primary = Green

Pricing Button
   ↓
Primary = Orange

This is essentially a theme cascade engine.


---

21. Don't duplicate the entire theme

Avoid storing a complete theme JSON for every section.

Bad:

SectionTheme {
  colors: 20 values
  typography: 30 values
  spacing: 40 values
}

Instead:

ThemeOverride

scope = SECTION
scopeId = section_123

token = color.primary
value = #7C3AED

This makes overrides extremely lightweight.


---

22. Token override model

Conceptually:

ThemeToken
-------------------------
id
themeId
category
name
value
type
mode
breakpoint

Override:

ThemeOverride
-------------------------
id
themeId
scopeType
scopeId
token
value
important

For example:

GLOBAL
color.primary
#2563EB

Then:

SECTION: hero-123
color.primary
#7C3AED

Then:

COMPONENT: button-123
color.primary
#EF4444


---

23. Token resolution engine

Your Next.js runtime should resolve:

instance
 ↓
component override
 ↓
section override
 ↓
page override
 ↓
site theme
 ↓
brand kit
 ↓
system default

Pseudo-code:

resolveToken({
  token: "color.primary",
  pageId,
  sectionId,
  componentId,
  instanceId
})

Result:

{
  value: "#7C3AED",
  source: "section",
  scopeId: "section_123"
}


---

24. SQLite + Prisma data model

I would create the following domain.

Workspace
Site
Theme
BrandKit

ThemeColor
ThemeFont
ThemeTypography
ThemeSpacing
ThemeRadius
ThemeShadow
ThemeBreakpoint
ThemeToken

ThemeOverride

ThemePreset

ThemeAsset

Page
PageSection
PageComponent

ComponentStyle
ComponentStyleOverride


---

25. Core Prisma schema

A simplified foundation:

enum ThemeScope {
  GLOBAL
  SITE
  PAGE
  SECTION
  COMPONENT
  INSTANCE
}

enum ThemeMode {
  LIGHT
  DARK
}

enum TokenType {
  COLOR
  FONT
  FONT_SIZE
  FONT_WEIGHT
  SPACING
  RADIUS
  SHADOW
  BORDER
  NUMBER
  STRING
  BOOLEAN
}

model Theme {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String?

  isActive    Boolean  @default(false)
  isDefault   Boolean  @default(false)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  brandKit    BrandKit?
  tokens      ThemeToken[]
  overrides   ThemeOverride[]
  presets     ThemePreset[]
}

model BrandKit {
  id          String   @id @default(cuid())
  themeId     String   @unique

  brandName   String?
  tagline     String?

  logo        String?
  logoDark    String?
  logoLight   String?
  favicon     String?
  appIcon     String?
  ogImage     String?

  theme       Theme    @relation(fields: [themeId], references: [id], onDelete: Cascade)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ThemeToken {
  id          String    @id @default(cuid())

  themeId     String
  key         String
  value       String
  type        TokenType
  mode        ThemeMode @default(LIGHT)

  breakpoint  String?

  theme       Theme     @relation(fields: [themeId], references: [id], onDelete: Cascade)

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([themeId, key, mode, breakpoint])
  @@index([themeId])
  @@index([key])
}

model ThemeOverride {
  id          String      @id @default(cuid())

  themeId     String

  scope       ThemeScope
  scopeId     String

  tokenKey    String
  value       String

  mode        ThemeMode   @default(LIGHT)
  breakpoint  String?

  important   Boolean     @default(false)

  theme       Theme         @relation(fields: [themeId], references: [id], onDelete: Cascade)

  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@unique([
    themeId,
    scope,
    scopeId,
    tokenKey,
    mode,
    breakpoint
  ])

  @@index([themeId, scope, scopeId])
  @@index([tokenKey])
}


---

26. Font database

Add:

model ThemeFont {
  id          String   @id @default(cuid())

  themeId     String
  family      String
  source      String?
  sourceType  String?

  weights     String
  styles      String

  isVariable  Boolean  @default(false)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  theme       Theme    @relation(fields: [themeId], references: [id], onDelete: Cascade)

  @@index([themeId])
}

You can later connect this to your existing asset/storage subsystem.


---

27. Theme presets

Presets should be first-class entities.

model ThemePreset {
  id          String   @id @default(cuid())

  themeId     String?
  name        String
  slug        String   @unique

  preview     String?
  config      Json

  isSystem    Boolean  @default(false)
  isActive    Boolean  @default(true)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  theme       Theme?   @relation(fields: [themeId], references: [id], onDelete: Cascade)
}

For SQLite, Prisma Json support depends on the SQLite/Prisma setup/version you're using; if you want maximum portability, store normalized token records or JSON text explicitly.


---

28. Next.js architecture

I'd structure it like:

src/
├── app/
│   ├── admin/
│   │   └── appearance/
│   │       ├── theme/
│   │       ├── brand/
│   │       ├── colors/
│   │       ├── typography/
│   │       ├── buttons/
│   │       ├── forms/
│   │       └── layout/
│   │
│   └── site/
│
├── components/
│   ├── theme/
│   │   ├── ThemeProvider.tsx
│   │   ├── ThemePreview.tsx
│   │   ├── ThemeCustomizer.tsx
│   │   ├── ColorPicker.tsx
│   │   ├── FontSelector.tsx
│   │   ├── TypographyEditor.tsx
│   │   ├── TokenEditor.tsx
│   │   └── OverrideEditor.tsx
│   │
│   ├── builder/
│   │   ├── PageBuilder.tsx
│   │   ├── SectionBuilder.tsx
│   │   └── ComponentBuilder.tsx
│
├── lib/
│   ├── theme/
│   │   ├── resolver.ts
│   │   ├── tokens.ts
│   │   ├── css-generator.ts
│   │   ├── presets.ts
│   │   ├── typography.ts
│   │   ├── colors.ts
│   │   └── overrides.ts
│   │
│   └── prisma.ts
│
├── server/
│   └── theme/
│       ├── theme.service.ts
│       ├── brand.service.ts
│       ├── token.service.ts
│       └── override.service.ts
│
└── styles/
    ├── globals.css
    └── tokens.css


---

29. ThemeProvider

At runtime:

<ThemeProvider
  theme={theme}
  pageId={pageId}
>
  <Application />
</ThemeProvider>

The provider generates:

:root {
  --color-primary: #2563eb;
  --color-secondary: #64748b;
  --font-body: "Inter";
  --font-heading: "Poppins";
  --radius-md: 8px;
}


---

30. CSS variable strategy

I strongly recommend semantic variables:

--theme-primary
--theme-primary-foreground

--theme-secondary
--theme-secondary-foreground

--theme-background
--theme-foreground

--theme-card
--theme-card-foreground

--theme-border
--theme-input
--theme-ring

--theme-font-body
--theme-font-heading

--theme-radius-sm
--theme-radius-md
--theme-radius-lg

--theme-container-width
--theme-section-gap

Components then use:

background: var(--theme-primary);
color: var(--theme-primary-foreground);

rather than:

background: #2563eb;


---

31. Tailwind integration

Since you're using Tailwind + shadcn + Mantine, don't make Tailwind the source of truth.

Use:

Database
   ↓
Theme Resolver
   ↓
CSS Variables
   ↓
Tailwind / shadcn / Mantine

For example:

:root {
  --primary: 221 83% 53%;
  --primary-foreground: 0 0% 100%;
}

Then shadcn components can consume those variables.

Your custom components can consume the same token layer.


---

32. Mantine integration

For Mantine, create a generated theme:

const mantineTheme = createTheme({
  primaryColor: "brand",
  colors: {
    brand: generateBrandPalette(theme)
  },
  fontFamily: theme.font.body,
  headings: {
    fontFamily: theme.font.heading
  },
  radius: {
    sm: theme.radius.sm,
    md: theme.radius.md,
    lg: theme.radius.lg
  }
});

Then:

<MantineProvider theme={mantineTheme}>

This gives you one design system across both custom UI and Mantine.


---

33. Elementor-like UI

The admin interface should have:

┌───────────────────────────────────────────────────────────┐
│ Appearance > Theme Builder                                │
├───────────────┬───────────────────────────────┬───────────┤
│               │                               │           │
│ Settings      │        LIVE PREVIEW           │ Tokens    │
│               │                               │           │
│ Brand Kit     │       ┌──────────────┐        │ Primary   │
│ Colors        │       │              │        │ Secondary │
│ Typography    │       │    Website   │        │ Accent    │
│ Buttons       │       │              │        │           │
│ Forms         │       └──────────────┘        │           │
│ Layout        │                               │           │
│ Header        │                               │           │
│ Footer        │                               │           │
│               │                               │           │
└───────────────┴───────────────────────────────┴───────────┘


---

34. Context-sensitive customization

When editing a section:

Section Settings

Style
├── Background
├── Typography
├── Spacing
├── Border
├── Shadow
└── Advanced

Every setting should offer:

[ Global ▼ ]

with:

Global
Page
Section
Custom

This is the critical Elementor-like behavior.


---

35. "Use Global" mechanism

For example:

Button Color

● Global
○ Custom

If:

Global

then:

var(--theme-primary)

If:

Custom

then:

#FF5722

This avoids unnecessary overrides.


---

36. Reset override

Every setting should support:

Reset to Global

When clicked:

DELETE ThemeOverride

rather than saving:

value = globalValue

This is important.


---

37. Theme inheritance

For a page:

Page
 ↓
inherits Site Theme

A section:

Section
 ↓
inherits Page Theme

A component:

Component
 ↓
inherits Section Theme

An instance:

Instance
 ↓
inherits Component Theme

Only explicit differences are stored.


---

38. Theme versioning

For a production SaaS, I recommend:

Theme
 ├── Draft
 ├── Published
 └── Previous Versions

Example:

Theme v1
Theme v2
Theme v3
Theme v4 ← current

Allow:

Save Draft
Preview
Publish
Rollback
Duplicate

This becomes extremely valuable when users accidentally change global styling.


---

39. Theme publishing

Use:

DRAFT
 ↓
VALIDATE
 ↓
PREVIEW
 ↓
PUBLISH
 ↓
ACTIVE

Never directly modify the live theme for every UI interaction.

Instead:

Draft Theme
      ↓
Preview
      ↓
Publish
      ↓
Live Theme


---

40. Undo / redo

For Elementor-like UX, eventually support:

Ctrl + Z
Ctrl + Shift + Z

Store theme changes as operations:

SET_TOKEN
REMOVE_TOKEN
SET_OVERRIDE
REMOVE_OVERRIDE

Then you can implement history.


---

41. Theme export/import

Provide:

Export Theme

as:

{
  "version": 1,
  "brand": {},
  "colors": {},
  "typography": {},
  "spacing": {},
  "components": {}
}

And:

Import Theme

This is extremely useful for your SaaS.

You could eventually have:

Theme Marketplace

where customers can install themes.


---

42. Multi-tenant architecture

For your application, I would make:

Organization
    ↓
Workspace
    ↓
Site
    ↓
Theme
    ↓
Brand Kit

This allows:

Company A
 ├── Website A
 ├── Website B
 └── Theme A

Company B
 ├── Website C
 └── Theme B

The theme must always be tenant-scoped.


---

43. Security

Never allow arbitrary CSS/JS to execute directly.

For advanced CSS:

Custom CSS

sanitize it and restrict where it is injected.

For theme values, validate:

HEX
RGB
HSL
OKLCH
CSS variable
URL
Font family
numeric values

Don't allow arbitrary JavaScript through theme configuration.


---

44. Performance

Don't query SQLite for every component.

Instead:

SQLite
 ↓
Theme Repository
 ↓
Theme Resolver
 ↓
In-memory cache
 ↓
CSS variables

For SSR:

GET theme
 ↓
generate CSS
 ↓
inject <style>

For client-side customization:

update CSS variables

without re-rendering the whole application.


---

45. Preview architecture

The best experience is:

Customizer
     │
     ├── Draft Theme
     │
     ▼
Preview Renderer
     │
     ▼
CSS Variables
     │
     ▼
Live Website

When the user changes:

Primary Color

the preview immediately does:

document.documentElement.style
  .setProperty("--theme-primary", color);

No page reload.


---

46. Recommended feature roadmap

Phase 1 — Design Token Foundation

Implement:

Theme
Brand Kit
Colors
Typography
Spacing
Radius
Shadow
CSS Variables

Phase 2 — Global Components

Buttons
Forms
Cards
Tables
Badges
Alerts
Navigation
Header
Footer

Phase 3 — Override Engine

Implement:

Global
Page
Section
Component
Instance

plus:

Inheritance
Reset
Resolve
Preview

Phase 4 — Theme Builder

Build:

Left Settings Panel
Live Preview
Right Token Inspector
Color Picker
Font Picker
Typography Editor
Responsive Controls

Phase 5 — Theme Lifecycle

Add:

Draft
Preview
Publish
Version
Rollback
Duplicate
Import
Export

Phase 6 — Advanced Builder

Then add:

Page Builder
Sections
Containers
Widgets
Global Widgets
Templates
Theme Templates
Dynamic Data
Responsive visibility
Custom CSS


---

47. Recommended final architecture

For your particular application, I would make the foundation:

┌──────────────────────┐
                 │      SQLite          │
                 │       Prisma         │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │    Theme Service     │
                 └──────────┬───────────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
          Brand Kit       Tokens       Overrides
              │             │             │
              └─────────────┼─────────────┘
                            ▼
                  ┌─────────────────┐
                  │ Theme Resolver  │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ CSS Variables   │
                  └────────┬────────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
        Tailwind         shadcn         Mantine
            │              │              │
            └──────────────┼──────────────┘
                           ▼
                   Next.js UI

Most important design decision

I would not build this as an Elementor clone internally. Build a token-driven theme engine first and make the Elementor-like UI sit on top of it.

That gives you:

Brand Kit → Global Theme → Semantic Tokens → Cascade/Overrides → CSS Variables → Tailwind/shadcn/Mantine → Components → Page Builder

and it will scale much better when you later add your ecommerce + POS + billing + inventory + subscriptions + marketplace + SaaS multi-tenant modules. The same theme engine can style all of them consistently.



Plan 2

font customization should be a much deeper subsystem than what I outlined. For an Elementor-like builder, I would make Typography & Font Management a first-class module, not just headingFont and bodyFont.

Complete Font Customization Architecture

FONT & TYPOGRAPHY
│
├── Font Library
│   ├── Google Fonts
│   ├── System Fonts
│   ├── Custom Fonts
│   ├── Uploaded Fonts
│   └── Variable Fonts
│
├── Font Families
│   ├── Heading
│   ├── Body
│   ├── UI
│   ├── Navigation
│   ├── Button
│   ├── Caption
│   └── Code
│
├── Font Weights
│   ├── 100 Thin
│   ├── 200 Extra Light
│   ├── 300 Light
│   ├── 400 Regular
│   ├── 500 Medium
│   ├── 600 Semi Bold
│   ├── 700 Bold
│   ├── 800 Extra Bold
│   └── 900 Black
│
├── Typography Presets
│   ├── Display
│   ├── H1
│   ├── H2
│   ├── H3
│   ├── H4
│   ├── H5
│   ├── H6
│   ├── Body
│   ├── Body Small
│   ├── Label
│   ├── Caption
│   ├── Button
│   └── Overline
│
└── Responsive Typography
    ├── Desktop
    ├── Tablet
    └── Mobile

1. Font-family customization

Allow users to define separate fonts for:

Role	Example

Primary	Inter
Heading	Poppins
Body	Inter
UI	DM Sans
Navigation	Inter
Button	Inter
Code	JetBrains Mono


And importantly:

Font Family
Fallback Font 1
Fallback Font 2
Generic Family

Example:

font-family:
  "Poppins",
  "Inter",
  system-ui,
  sans-serif;


---

2. Font source management

Support:

Google Fonts
System Fonts
Custom URL
Uploaded Font
Self-hosted Font

For uploaded fonts:

.woff2
.woff
.ttf
.otf

Prefer WOFF2 for production web delivery.

Store:

FontFamily
FontFile
Weight
Style
Stretch
UnicodeRange
VariableAxes
StorageKey


---

3. Font style

Every typography preset should support:

Normal
Italic
Oblique

and:

Font Style
Font Weight
Font Stretch


---

4. Variable fonts

This is important for a modern builder.

Support axes such as:

wght
wdth
slnt
opsz
GRAD

For example:

Inter Variable

Weight: 100 → 900
Width: 75 → 125
Optical Size: 14 → 32

UI:

Weight
[────────●──────]
400

Width
[──────●────────]
100

Optical Size
[────●──────────]
16


---

5. Typography preset editor

Your UI should look approximately like:

Typography
────────────────────────

Heading 1

Font Family
[Poppins                 ▼]

Weight
[700                     ▼]

Size
Desktop    48 px
Tablet     40 px
Mobile     32 px

Line Height
Desktop    1.10
Tablet     1.15
Mobile     1.20

Letter Spacing
-0.02em

Transform
[None ▼]

Decoration
[None ▼]


---

6. Complete typography properties

Each typography token should potentially support:

font-family
font-size
font-weight
font-style
font-stretch
line-height
letter-spacing
text-transform
text-decoration
text-decoration-thickness
text-decoration-style
text-underline-offset
word-spacing

Also support:

text-rendering
font-feature-settings
font-variation-settings
font-optical-sizing

for advanced users.


---

7. Responsive font settings

Don't only support desktop/tablet/mobile font size.

Every property can potentially have responsive values:

{
  "desktop": {
    "fontSize": "48px",
    "lineHeight": "1.1"
  },
  "tablet": {
    "fontSize": "40px",
    "lineHeight": "1.15"
  },
  "mobile": {
    "fontSize": "32px",
    "lineHeight": "1.2"
  }
}


---

8. Fluid typography

I strongly recommend supporting fluid typography.

Instead of:

Desktop: 48px
Mobile: 32px

allow:

Min: 32px
Max: 48px

and generate:

font-size: clamp(2rem, 4vw, 3rem);

UI:

Fluid Typography

☑ Enable

Minimum
32px

Maximum
48px

Viewport scaling
4vw


---

9. Global typography presets

Create:

Global Typography

with:

Display
H1
H2
H3
H4
H5
H6

Body Large
Body
Body Small

Lead
Caption
Label
Button
Navigation
Overline
Code
Quote

Then components reference:

typography.heading1
typography.body
typography.button

rather than having their own hard-coded font configuration.


---

10. Font pairing

Add a useful feature:

Font Pairing

Example:

Heading: Poppins
Body: Inter

or:

Heading: Playfair Display
Body: Source Sans 3

Presets:

Modern
Corporate
Editorial
Minimal
Luxury
Startup
Ecommerce
Portfolio
Education
Healthcare
Finance


---

11. Font loading strategy

For performance, your database should know which weights are actually used.

Example:

Inter

400
500
600
700

Don't load:

100
200
300
800
900

unless the theme actually uses them.

Generate:

@font-face {
  font-family: "Inter";
  src: url("/fonts/inter-400.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}


---

12. Font database design

Add dedicated models rather than putting everything into ThemeToken.

model FontFamily {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique

  category    String?
  source      String?
  provider    String?

  isSystem    Boolean  @default(false)
  isGoogle    Boolean  @default(false)
  isCustom    Boolean  @default(false)
  isVariable  Boolean  @default(false)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  files       FontFile[]
  themes      ThemeFont[]
}

model FontFile {
  id          String   @id @default(cuid())

  fontFamilyId String
  fileUrl      String
  format       String

  weight      Int?
  style       String?
  stretch     String?

  unicodeRange String?

  fontFamily  FontFamily @relation(
    fields: [fontFamilyId],
    references: [id],
    onDelete: Cascade
  )

  createdAt   DateTime @default(now())

  @@index([fontFamilyId])
}

model ThemeFont {
  id          String @id @default(cuid())

  themeId     String
  fontFamilyId String

  role        String
  fallback    String?

  theme       Theme @relation(
    fields: [themeId],
    references: [id],
    onDelete: Cascade
  )

  fontFamily  FontFamily @relation(
    fields: [fontFamilyId],
    references: [id],
    onDelete: Cascade
  )

  @@unique([themeId, role])
  @@index([themeId])
}


---

13. Typography model

I would also create:

model TypographyPreset {
  id          String   @id @default(cuid())

  themeId     String
  name        String
  slug        String

  fontFamily  String?
  fontSize    String?
  fontWeight  Int?
  fontStyle   String?
  lineHeight  String?
  letterSpacing String?

  textTransform String?
  textDecoration String?

  desktopConfig String?
  tabletConfig  String?
  mobileConfig  String?

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([themeId, slug])
  @@index([themeId])
}

For a more flexible system, I'd eventually normalize the responsive configuration into token records instead of storing large JSON blobs.


---

14. Font override hierarchy

Fonts should obey the same cascade:

System Default
      ↓
Brand Kit
      ↓
Global Theme
      ↓
Page
      ↓
Section
      ↓
Component
      ↓
Instance

Example:

Global Heading Font
Poppins

        ↓

Blog Page
Heading Font
Merriweather

        ↓

Article Section
Heading Font
Playfair Display

        ↓

Specific Heading
Inter


---

15. Font customization in individual components

Every component should expose:

Typography
────────────────────

☑ Use Global Typography

Preset
[Heading 2 ▼]

OR

☐ Custom

Font Family
Weight
Size
Line Height
Letter Spacing
...

When Use Global Typography is enabled:

font: var(--typography-h2);

When custom is selected:

font-family: var(--component-font-family);


---

16. Font management screen

I would create a dedicated:

Appearance
  └── Fonts

screen:

┌─────────────────────────────────────────────────────────┐
│ Fonts                                    + Add Font     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Inter                                                   │
│ Aa Bb Cc Dd Ee                                          │
│ 400 500 600 700                                        │
│                                                         │
│ Poppins                                                 │
│ Aa Bb Cc Dd Ee                                          │
│ 300 400 500 600 700 800                                │
│                                                         │
│ + Upload Custom Font                                    │
└─────────────────────────────────────────────────────────┘


---

17. Font preview

The user should be able to enter:

The quick brown fox jumps over the lazy dog.

Then preview it using the selected font.

Also useful:

Aa
ABCDEFGHIJKLMNOPQRSTUVWXYZ
abcdefghijklmnopqrstuvwxyz
0123456789


---

18. Font fallback and system stack

Provide:

Fallback

Primary:
Poppins

Fallback:
Inter

Fallback:
system-ui

Generic:
sans-serif

Generate:

font-family:
"Poppins",
"Inter",
system-ui,
sans-serif;


---

19. Font performance controls

Add:

Font Loading

Preload
☑

Font Display
swap

Subset
☑ Latin
☑ Latin Extended
☐ Devanagari
☐ Cyrillic
☐ Arabic

For your India-focused applications, Devanagari support is particularly useful if you later offer Hindi/regional-language interfaces.


---

20. Font + brand kit relationship

Your final structure should therefore be:

Brand Kit
│
├── Logo
├── Colors
│
└── Typography
    │
    ├── Primary Font
    ├── Heading Font
    ├── Body Font
    ├── UI Font
    └── Code Font

Then:

Theme
│
├── Color Tokens
├── Typography Tokens
├── Spacing Tokens
├── Radius Tokens
├── Shadow Tokens
├── Border Tokens
└── Component Tokens

And:

Typography Token
       ↓
Font Family
       ↓
Font File
       ↓
Weight
       ↓
Size
       ↓
Line Height
       ↓
Letter Spacing
       ↓
Responsive Values
       ↓
CSS Variable

So the corrected architecture is:

THEME BUILDER
                      │
       ┌──────────────┼───────────────┐
       │              │               │
   BRAND KIT       COLORS        TYPOGRAPHY
       │              │               │
   Logo/Assets    Semantic       Font Library
                  Tokens          │
                              Font Families
                                  │
                              Font Weights
                                  │
                             Variable Fonts
                                  │
                         Typography Presets
                                  │
                         Responsive Typography
                                  │
                           Fluid Typography
       │              │               │
       └──────────────┼───────────────┘
                      ▼
                DESIGN TOKENS
                      ▼
              CASCADE / OVERRIDES
                      ▼
             CSS VARIABLE ENGINE
                      ▼
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
     Tailwind       shadcn        Mantine
        └─────────────┼─────────────┘
                      ▼
                 NEXT.JS UI

This is the level of font system I'd recommend if the goal is genuinely Elementor-like customization, rather than a basic admin theme settings page.
