/* Console theme — progressive enhancement.
   Everything here is optional: with JS disabled every week renders open,
   every item is visible, and the pages remain fully readable. */
(function () {
  "use strict";

  var root = document.documentElement;

  /* ------------------------------------------------------------- helpers */

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function localISO(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }

  /* --------------------------------------------- live "today" correction

     Hugo stamps today's date at build time. A published site keeps serving
     that stamp until the next build, so re-derive the markers in the browser
     whenever the real date has moved on. */

  function refreshToday() {
    // params.schedule.today pins the semester to a fixed point for previewing.
    // Respect it rather than snapping back to the real date.
    if (root.hasAttribute("data-date-pinned")) return;

    var iso = localISO(new Date());
    if (iso === root.getAttribute("data-build-date")) return;

    var days = $$(".day[data-iso]");
    if (!days.length) return;

    days.forEach(function (d) {
      d.classList.toggle("is-today", d.getAttribute("data-iso") === iso);
    });

    var weeks = $$(".week[data-start][data-end]");
    var current = null;
    weeks.forEach(function (w) {
      if (current) return;
      if (iso >= w.getAttribute("data-start") && iso <= w.getAttribute("data-end")) current = w;
    });
    if (!current) {
      weeks.some(function (w) {
        if (w.getAttribute("data-start") > iso) { current = w; return true; }
        return false;
      });
    }
    if (!current && weeks.length) current = weeks[weeks.length - 1];

    weeks.forEach(function (w) { w.classList.toggle("is-current", w === current); });
  }

  /* ----------------------------------------------------------- schedule */

  function initSchedule() {
    var sched = $("[data-schedule]");
    if (!sched) return;

    var input = $("#sched-q", sched);
    var chips = $$(".chip", sched);
    var notice = $("#sched-notice", sched);
    var noticeText = $("#sched-notice-text", sched);
    var clearBtn = $("#sched-clear", sched);
    var resultLine = $("#sched-result", sched);
    var weeks = $$(".week", sched);
    var total = parseInt(sched.getAttribute("data-total"), 10) || 0;
    var weekCount = weeks.length;

    var state = { q: "", tag: "all", week: null };
    var manualOpen = {};   // weeks the reader has toggled by hand

    // Cache the searchable text once.
    var items = $$(".item", sched).map(function (el) {
      return {
        el: el,
        tag: el.getAttribute("data-tag") || "",
        text: (el.textContent || "").toLowerCase()
      };
    });

    function readURL() {
      var p = new URLSearchParams(location.search);
      state.q = p.get("q") || "";
      state.tag = p.get("tag") || "all";
      var w = parseInt(p.get("week"), 10);
      state.week = isNaN(w) ? null : w;
    }

    function writeURL() {
      var p = new URLSearchParams();
      if (state.q) p.set("q", state.q);
      if (state.tag !== "all") p.set("tag", state.tag);
      if (state.week) p.set("week", String(state.week));
      var qs = p.toString();
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
    }

    function setOpen(week, open) {
      var head = $(".week__head", week);
      var body = $(".week__body", week);
      if (!head || !body) return;
      head.setAttribute("aria-expanded", open ? "true" : "false");
      body.hidden = !open;
    }

    function apply() {
      var q = state.q.trim().toLowerCase();
      var filtering = !!q || state.tag !== "all" || !!state.week;
      var shown = 0;
      var anyWeek = false;

      items.forEach(function (i) {
        i.el.hidden = !((!q || i.text.indexOf(q) !== -1) &&
                        (state.tag === "all" || i.tag === state.tag));
      });

      weeks.forEach(function (week) {
        var n = parseInt(week.getAttribute("data-week"), 10);
        var weekHit = !state.week || n === state.week;
        var visibleDays = 0;

        $$(".day", week).forEach(function (day) {
          var live = $$(".item", day).filter(function (el) { return !el.hidden; });
          day.hidden = !(live.length && weekHit);
          if (!day.hidden) {
            visibleDays++;
            shown += live.length;
          }
        });

        week.hidden = visibleDays === 0;
        if (!week.hidden) anyWeek = true;

        if (filtering) {
          setOpen(week, true);
        } else {
          setOpen(week, manualOpen[n] !== undefined
            ? manualOpen[n]
            : week.classList.contains("is-current"));
        }
      });

      if (notice) {
        notice.hidden = !state.week;
        if (state.week && noticeText) noticeText.textContent = "Week " + state.week + " only";
      }

      var empty = $("#sched-empty", sched);
      if (empty) empty.hidden = anyWeek;

      if (resultLine) {
        resultLine.textContent = filtering
          ? shown + " of " + total + " items match"
          : total + " items across " + weekCount + " weeks · click a week to expand";
      }
    }

    weeks.forEach(function (week) {
      var head = $(".week__head", week);
      if (!head) return;
      head.addEventListener("click", function () {
        var n = parseInt(week.getAttribute("data-week"), 10);
        var open = head.getAttribute("aria-expanded") !== "true";
        manualOpen[n] = open;
        setOpen(week, open);
      });
    });

    if (input) {
      input.addEventListener("input", function () {
        state.q = input.value;
        apply();
        writeURL();
      });
    }

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        state.tag = chip.getAttribute("data-tag");
        chips.forEach(function (c) {
          c.setAttribute("aria-pressed", c === chip ? "true" : "false");
        });
        apply();
        writeURL();
      });
    });

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        state.week = null;
        apply();
        writeURL();
      });
    }

    readURL();
    if (input) input.value = state.q;
    chips.forEach(function (c) {
      c.setAttribute("aria-pressed", c.getAttribute("data-tag") === state.tag ? "true" : "false");
    });
    apply();

    if (state.week) {
      var target = $('.week[data-week="' + state.week + '"]', sched);
      if (target) target.scrollIntoView({ block: "start" });
    }
  }

  /* ------------------------------------------------------------ palette */

  function initPalette() {
    var box = $("#palette");
    var data = $("#console-index");
    if (!box || !data) return;

    var entries;
    try {
      entries = JSON.parse(data.textContent);
    } catch (e) {
      return;
    }
    entries.forEach(function (e) {
      e._l = (e.label + (e.alt ? " " + e.alt : "")).toLowerCase();
    });

    var field = $("#palette-q", box);
    var list = $("#palette-list", box);
    var results = [];
    var cursor = 0;

    var NO_MATCH = 999;

    function score(entry, q) {
      // "week 1" should land on Week 01, not on Week 10-16.
      if (entry.alt && entry.alt.toLowerCase() === q) return 0;
      var i = entry._l.indexOf(q);
      if (i === -1) return NO_MATCH;
      return i === 0 ? 1 : (entry._l[i - 1] === " " ? 2 : 3);
    }

    function render() {
      list.innerHTML = "";
      results.forEach(function (e, idx) {
        var li = document.createElement("li");
        li.className = "palette__item";
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", idx === cursor ? "true" : "false");
        li.dataset.url = e.url;

        var kind = document.createElement("span");
        kind.className = "palette__kind";
        kind.textContent = e.kind;

        var label = document.createElement("span");
        label.className = "palette__label";
        label.textContent = e.label;

        li.appendChild(kind);
        li.appendChild(label);

        if (e.hint) {
          var hint = document.createElement("span");
          hint.className = "palette__hint";
          hint.textContent = e.hint;
          li.appendChild(hint);
        }

        li.addEventListener("click", function () { go(idx); });
        list.appendChild(li);
      });
    }

    function search(raw) {
      var q = raw.trim().toLowerCase();
      if (!q) {
        results = entries.filter(function (e) {
          return e.kind === "page" || e.kind === "project";
        }).slice(0, 12);
      } else {
        results = entries
          .map(function (e) { return { e: e, s: score(e, q) }; })
          .filter(function (r) { return r.s !== NO_MATCH; })
          .sort(function (a, b) { return a.s - b.s; })
          .slice(0, 12)
          .map(function (r) { return r.e; });
      }
      cursor = 0;
      render();
    }

    function go(idx) {
      var e = results[idx];
      if (e) location.href = e.url;
    }

    function move(delta) {
      if (!results.length) return;
      cursor = (cursor + delta + results.length) % results.length;
      render();
      var sel = $('[aria-selected="true"]', list);
      if (sel) sel.scrollIntoView({ block: "nearest" });
    }

    var lastFocus = null;

    function open() {
      if (!box.hidden) return;
      lastFocus = document.activeElement;
      box.hidden = false;
      field.value = "";
      search("");
      field.focus();
    }

    function close() {
      if (box.hidden) return;
      box.hidden = true;
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    field.addEventListener("input", function () { search(field.value); });

    box.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") { ev.preventDefault(); close(); }
      else if (ev.key === "ArrowDown") { ev.preventDefault(); move(1); }
      else if (ev.key === "ArrowUp") { ev.preventDefault(); move(-1); }
      else if (ev.key === "Enter") { ev.preventDefault(); go(cursor); }
    });

    box.addEventListener("mousedown", function (ev) {
      if (ev.target === box) close();
    });

    document.addEventListener("keydown", function (ev) {
      if (ev.defaultPrevented || !box.hidden) return;
      var t = ev.target;
      var typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      var slash = ev.key === "/" && !typing && !ev.metaKey && !ev.ctrlKey && !ev.altKey;
      var cmdK = ev.key.toLowerCase() === "k" && (ev.metaKey || ev.ctrlKey);
      if (slash || cmdK) { ev.preventDefault(); open(); }
    });

    $$("[data-palette-open]").forEach(function (btn) {
      btn.addEventListener("click", open);
    });
  }

  /* --------------------------------------------------------------- boot */

  function boot() {
    refreshToday();
    initSchedule();
    initPalette();
    root.classList.add("js");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
