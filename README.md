# Console

A Hugo theme for course websites, built from the "Console" design variation:
terminal-descended, monospace, dark, dense. One accent colour repaints the whole
site, so the same theme can carry every course you teach.

![Console](https://img.shields.io/badge/hugo-%E2%89%A5%200.146-blue)

## What it gives you

- **Home** — course code, "next up" cards derived from the schedule, about text,
  a facts table.
- **Schedule** — the whole semester written as one Markdown file, rendered as
  collapsible weeks with instant text filtering, tag chips (slides / projects /
  due / labs / no class), per-week deep links, and automatic `THIS WEEK` /
  `TODAY` markers. Week numbers and date ranges derive from the dates.
- **Projects** — an index plus a detail page with steps, deliverables, and a
  rubric.
- **Syllabus** — plain Markdown; `##` headings become the accent section labels.
- **Resources** — grouped links.
- **`/` command palette** — jump to any week, project, lecture, or page.

Everything works without JavaScript. With JS off, every week renders expanded and
every page is fully readable; JS only adds filtering, collapsing, and the palette.

## Quick start

```bash
hugo new site my-course && cd my-course
git init
git submodule add https://github.com/tatecarson/t-console-theme themes/t-console-theme
```

Then set `theme = "t-console-theme"` in your config and copy `exampleSite/` as a
starting point:

```bash
cp -r themes/t-console-theme/exampleSite/{hugo.toml,content,data} .
```

The schedule lives in `content/schedule.md` and the resource links in
`data/resources.yaml`; everything else is config.

To run the bundled example site directly from a clone of this repo:

```bash
hugo server --source exampleSite
```

The example site is a port of the Fall 2025 DAD 222 course site — a real
semester's schedule, six project briefs with their rubric tables, syllabus, and
resources — so it exercises the theme against content that actually exists rather
than filler. Lecture slide decks stay on the original site and are linked out to.

## Configuration

```toml
[params]
  accent = "#b6ff5c"        # the one knob that repaints everything
  description = "Shown on the front page when content/_index.md is empty."

  [params.course]
    code = "DAD 222"
    title = "Audio Production I"
    term = "Fall 2025"
    meeting = "MWF 10:00–10:50"
    instructor = "Prof. Name"
    final = "Friday, December 12 · 8:00–10:00 AM"

  [params.schedule]
    start = "2025-08-25"    # Monday of week 1; weeks derive from this
    today = "2025-10-08"    # optional: pin "today" while previewing
    filterPlaceholder = 'filter — try "reaper" or "due"'

  [[params.facts]]          # the front-page "details" table
    key = "Meets"
    value = "MWF 10:00–10:50"

  [[params.rubric]]         # default rubric for every project
    key = "Technical execution"
    weight = "40%"
    detail = "Clean edits, no clipping, sensible gain staging."
```

Accents that read well on the dark background: `#b6ff5c` (green), `#6ec1ff`
(blue), `#c58cff` (violet), `#ff8a5c` (orange), `#5fe0b0` (teal).

Navigation comes from the `main` menu:

```toml
[[menus.main]]
  name = "schedule"
  pageRef = "/schedule"
  weight = 10
```

## Content

### Schedule — `content/schedule.md`

The whole semester is one Markdown file. A `##` heading starts a class day; each
bullet under it is one schedule item.

```markdown
---
title: "Schedule"
layout: schedule
---

Any prose here, before the first day, renders above the filter.

## 10/6
- [slides] Dynamics — ReaComp, ReaXComp, ReaLimit, ReaGate

## 10/8
- Bring headphones
- [slides] Time-based effects — delay, chorus, flanger
- [due] [Project 3](/projects/in-class-mixing-assignment/) by midnight
```

**Dates.** `10/6` is enough — the year comes from `params.schedule.start` and the
weekday is computed, so the page shows `Mon 10/6`. `10/6/2025` and `2025-10-06`
also work if you prefer to be explicit. Trailing text after the date is ignored,
so `## 10/6 — studio day` parses fine.

**Detail.** Indent a bullet to hang notes off the item above it:

```markdown
## 9/17
- **Move to the studio**
  - Studio tour
  - Book your time in the studio to record your projects
- [slides] Reaper recording
```

A `###` heading inside a day renders as an untagged item, which is useful for
splitting a long class into sections.

Only `##` / `###` headings and bullets are read. Any other non-blank line inside
a day is skipped with a build warning, so nothing disappears silently — watch the
Hugo output when you paste content in from elsewhere.

**Tags.** `[slides]`, `[project]`, `[due]`, `[lab]`, `[off]` by default. Each gets
its own colour and its own filter chip. Untagged items are fine — most days have
a few.

Replace the whole vocabulary in config for a course that thinks in other terms:

```toml
[[params.schedule.tags]]
  id    = "reading"      # what you type: [reading] Chapter 4
  label = "Readings"     # the filter chip
  color = "#c58cff"
[[params.schedule.tags]]
  id    = "screening"
  label = "Screenings"
  color = "#6ec1ff"
[[params.schedule.tags]]
  id    = "off"
  label = "No class"
  color = "#7d8a7a"
  skip  = true           # "nothing happens" — kept out of the Coming up card
```

Setting this replaces the defaults rather than adding to them, so list every tag
you want. A bracketed word that isn't a configured tag would otherwise render as
literal text, so the build warns about it by name.

**Item text is inline Markdown**, so links, `code`, and emphasis all work. A
bullet that starts with a Markdown link is not mistaken for a tag.

**Weeks are derived.** Set the Monday of week 1 and stop thinking about it:

```toml
[params.schedule]
  start = "2025-08-25"
```

Week numbers, the `Oct 6–10` ranges, `THIS WEEK`, the week filter, and the
palette entries all fall out of the dates you already typed. A week with no class
at all simply doesn't appear, and the weeks after it keep their correct numbers.

If `start` is omitted the earliest date in the file is used instead, which puts
the week boundaries on that weekday.

### Projects — `content/projects/*.md`

```yaml
---
title: "Satirical PSA"
number: "02"
weight: 2
week: 4
assigned: "2025-09-15"
due: "2025-10-01"
summary: "One line for the projects index."
tools: ["REAPER", "Studio A"]
steps: ["…", "…"]
deliverables: ["…", "…"]
rubric:            # omit to inherit params.rubric; `false` to show none
  - key: "…"
    weight: "40%"
    detail: "…"
---

The brief goes in the body.
```

`steps`, `deliverables`, and `rubric` render as the theme's own blocks. If your
project pages already spell all of that out in prose — as the bundled example
site's do — leave them out and set `rubric: false`; the body carries everything.
Headings, ordered lists, blockquotes, and tables are all styled, and wide rubric
tables scroll inside their column rather than stretching the page.

`hugo new content projects/my-project.md --kind projects` scaffolds one.

### Resources — `data/resources.yaml`

```yaml
groups:
  - group: Software
    items:
      - name: REAPER
        url: "https://www.reaper.fm/"
        desc: "Primary DAW for the course."
```

### Syllabus and other pages

Any page without a `layout` renders as prose in a narrow column, with `##`
headings styled as accent section labels. That is all the syllabus needs.

## How "today" works

Hugo stamps the build date into the page and marks the current week, the current
day, and the "next up" cards from it. In the browser, a small script re-derives
the `THIS WEEK` and `TODAY` markers from the real date, so those stay correct
between builds — but the "next up" cards reflect the last build. Rebuild on a
schedule (a nightly CI job, say) if you want them always current.

Setting `params.schedule.today` pins the whole thing to a fixed date and disables
the client-side correction. That is for previewing, not production.

## Renaming the sections

Nothing is keyed to the folder names `schedule/` and `projects/`. The schedule is
whichever page carries `layout: schedule`, so renaming it to `content/calendar.md`
just works. For projects, tell Hugo the section's type and let it cascade:

```yaml
# content/assignments/_index.md
---
title: "Assignments"
type: projects
cascade:
  type: projects
---
```

The index, the detail layout, the sticky sidebar nav, and the palette all follow.

## Customising

- **Accent** — `params.accent`.
- **Typeface** — `params.fonts.url` and `params.fonts.family`. Set
  `url = ""` to skip the webfont request altogether for a self-hosted or offline
  build, then either add your own `@font-face` in `extra-head.html` or leave
  `family` on the system monospace stack.
- **Resource data file** — `params.resourcesData`, default `"resources"`.
- **Anything in `<head>`** — create `layouts/_partials/extra-head.html` in your
  site.
- **Colours and metrics** — every value is a custom property at the top of
  `assets/css/console.css`. Copy the file into your site's `assets/css/` to
  override it wholesale, or set the properties you want in `extra-head.html`.

The theme ships a `hugo.toml` of its own with these defaults; anything in your
site config wins over it.

## Requirements

Hugo **0.146 or newer** (the theme uses the current `layouts/` lookup with
`_partials/`). The extended edition is not required.

## Licence

MIT. See [LICENSE](LICENSE).
