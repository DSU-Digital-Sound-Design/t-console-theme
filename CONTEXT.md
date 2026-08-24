# Console Theme

Shared theme for DSU Digital Sound Design course sites: course pages plus the
Reveal.js lecture-deck layer, including single-computer presenting.

## Language

### Presenting

**Presenter Window**:
The deck the instructor opens on their laptop. It drives everything; every
other presenting surface obeys it.
_Avoid_: speaker view, control window, preview

**Stage Window**:
The audience-facing copy of the deck on the connected display. It obeys the
Presenter Window and is never interacted with directly.
_Avoid_: display window, audience window, projector window

**Present**:
The action (key `P`) that turns a deck into a Presenter Window and spawns the
Stage Window on the connected display.

**Stage Popup**:
A link target opened as a window on the stage display, on top of the Stage
Window. Closing it never disturbs the deck underneath.
_Avoid_: new tab, link window

**Stage-routed media**:
Media whose playback happens in the Stage Window while its controls live in
the Presenter Window. Video is slide-bound (pauses when its slide is left);
audio persists until explicitly stopped.

**Panel**:
The dock in the Presenter Window holding notes, timer, clock, media
transport, and the stage status light.
_Avoid_: sidebar, HUD

### Decks

**Deck**:
A lecture rendered as a single-page Reveal.js presentation via the `Reveal`
output format.
_Avoid_: slideshow, presentation page

**Notes**:
Per-slide instructor prompts authored with the `note` shortcode, shown only
in the Panel (or Reveal's stock speaker view).
_Avoid_: speaker notes, annotations
