# YouTube embeds are upgraded at runtime, not migrated to a shortcode

Deck authors paste raw YouTube `<iframe>` embeds into markdown (the sites set
`goldmark.renderer.unsafe = true` for exactly this). Those iframes lack
`enablejsapi=1`, so no script can command them. Presenter mode rewrites them
in the browser at load time — adding `enablejsapi` and an element id,
preserving existing params like `?start=` — instead of introducing a
`{{</* youtube */>}}` shortcode and migrating dozens of content files.

This is why there is no YouTube shortcode in the theme: pasted embeds are the
supported authoring path, past decks work retroactively, and future decks need
no new authoring rule. If YouTube's embed URL shape changes, the rewrite lives
in one place (`static/presenter-mode.js`).
