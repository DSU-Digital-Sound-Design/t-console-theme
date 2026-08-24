# Presenter mode is a custom twin-window design, not an extension of Reveal's notes plugin

Reveal's stock speaker view inverts the model we want: its main window is the
audience surface and the popup is a read-only dashboard, so "click the actual
video on the slide to play it for the audience" has nowhere to live. Presenter
mode instead makes the window you open the Presenter Window (the real, fully
clickable deck plus a docked Panel) and spawns the Stage Window as a second
copy of the same deck URL (`?stage=1`), placed fullscreen on the connected
display via the Window Management API and synced over a `BroadcastChannel`
keyed by deck path.

## Considered Options

- Extending the stock notes plugin (`plugin/notes`): rejected — wrong window
  topology, and its `reveal-notes` postMessage namespace and `S` key are left
  untouched so the stock view still works as a fallback.
- Hugo/site-level per-deck presenter pages: rejected — presenting is deck
  behavior, so it lives in this theme and every course site inherits it.

## Consequences

- Presenter tooling is Chromium-only (Window Management API). Other browsers
  degrade to manually placed windows; student-facing decks are unaffected.
- Entering presenter mode is one keypress plus a one-time per-origin
  permission grant — the floor the web platform allows.
