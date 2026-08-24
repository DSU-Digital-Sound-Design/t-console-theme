/*
  Presenter mode — single-computer presenting for t-console decks.

  The window you open is the Presenter Window: the real, clickable deck plus
  a docked Panel (notes, timer, clock, media transport, stage status).
  Pressing P spawns the Stage Window — the same deck URL with ?stage=1 —
  fullscreen on the connected display via the Window Management API, synced
  over a BroadcastChannel keyed by deck path. See docs/adr/0001.

  Media routing:
  - YouTube iframes and <video> play in the Stage Window (the audience needs
    the picture); the Presenter gets a click-shield and transport controls.
    YouTube embeds are upgraded in place on the stage (docs/adr/0002).
  - <audio> elements and links to audio files play in the *Presenter*
    window: both windows share one machine and one output device, so the
    room hears the same either way — and the presenter's click carries the
    user activation that Chrome's autoplay policy demands, which a
    message-commanded stage window lacks. The stage shows a visual overlay
    for audio links so the audience sees what's playing.
  - Leaving a slide pauses its video; audio keeps playing until stopped.

  Inert unless invoked: without ?stage=1 or a P keypress, this file only
  installs one keydown listener.
*/
(function () {
  'use strict';

  if (typeof Reveal === 'undefined' || typeof BroadcastChannel === 'undefined') return;

  var IS_STAGE = new URLSearchParams(location.search).get('stage') === '1';
  var channel = new BroadcastChannel('t-console-presenter:' + location.pathname);
  var AUDIO_LINK = /\.(mp3|wav|ogg|oga|m4a|aac|flac)(\?.*)?$/i;
  var YT_EMBED = /(youtube(-nocookie)?\.com)\/embed\//;

  function send(msg) { channel.postMessage(msg); }

  function fmtTime(s) {
    if (!isFinite(s) || s < 0) s = 0;
    var m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  /* Media elements get ids from DOM order; both windows render the same
     DOM, so ids agree across the channel without any handshake. */
  var mediaEls = [];
  function collectMedia() {
    mediaEls = [];
    var els = document.querySelectorAll('.reveal .slides iframe, .reveal .slides video, .reveal .slides audio');
    Array.prototype.forEach.call(els, function (el) {
      var kind = null;
      if (el.tagName === 'IFRAME') {
        if (YT_EMBED.test(el.getAttribute('src') || '')) kind = 'yt';
      } else {
        kind = el.tagName === 'VIDEO' ? 'video' : 'audio';
      }
      if (kind) mediaEls.push({ id: 'pm-m' + mediaEls.length, el: el, kind: kind });
    });
    return mediaEls;
  }
  function mediaById(id) {
    for (var i = 0; i < mediaEls.length; i++) if (mediaEls[i].id === id) return mediaEls[i];
    return null;
  }
  function mediaTitle(m) {
    var src = m.el.currentSrc || m.el.src || m.el.getAttribute('src') || '';
    if (m.kind === 'yt') {
      var t = m.el.getAttribute('title');
      if (t && t !== 'YouTube video player') return t;
      var match = src.match(/\/embed\/([^?]+)/);
      return 'YouTube · ' + (match ? match[1] : '');
    }
    try { return decodeURIComponent(src.split('/').pop().split('?')[0]) || m.kind; }
    catch (e) { return m.kind; }
  }

  function whenRevealReady(fn) {
    if (Reveal.isReady()) fn(); else Reveal.on('ready', fn);
  }

  /* ======================== STAGE WINDOW ======================== */

  if (IS_STAGE) {
    whenRevealReady(function () { stageBoot(); });
    return;
  }

  function stageBoot() {
    document.body.classList.add('pm-stage');
    Reveal.configure({ controls: false, progress: false, slideNumber: false });

    // P is a toggle here too: a stage page is nearly indistinguishable from
    // the plain deck, so if this tab became the stage by accident (a popup
    // blocker or embedded browser turning window.open into a same-tab
    // navigation), P must lead back out instead of going dead.
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'p' && e.key !== 'P') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
      location.href = location.pathname + location.hash;
    });

    collectMedia();
    var ytPlayers = {};   // id -> YT.Player
    var activeId = null;  // the media the presenter last commanded

    // Upgrade pasted YouTube embeds so the IFrame API can command them.
    var hasYT = false;
    mediaEls.forEach(function (m) {
      if (m.kind !== 'yt') return;
      hasYT = true;
      var url = new URL(m.el.src, location.href);
      url.searchParams.set('enablejsapi', '1');
      url.searchParams.set('origin', location.origin);
      m.el.src = url.toString();
      m.el.id = m.id;
    });
    if (hasYT) {
      window.onYouTubeIframeAPIReady = function () {
        mediaEls.forEach(function (m) {
          if (m.kind === 'yt') ytPlayers[m.id] = new YT.Player(m.id);
        });
      };
      var tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    function ytState(id) {
      var p = ytPlayers[id];
      if (!p || typeof p.getPlayerState !== 'function') return null;
      return p;
    }
    function isPlaying(m) {
      if (m.kind === 'yt') { var p = ytState(m.id); return !!p && p.getPlayerState() === 1; }
      return !m.el.paused && !m.el.ended;
    }
    function pauseMedia(m) {
      if (m.kind === 'yt') { var p = ytState(m.id); if (p) p.pauseVideo(); }
      else m.el.pause();
    }
    function playMedia(m) {
      var fs = document.fullscreenElement;
      if (fs && fs !== m.el && mediaEls.some(function (o) { return o.el === fs; })) document.exitFullscreen();
      mediaEls.forEach(function (o) { if (o.id !== m.id && isPlaying(o)) pauseMedia(o); });
      if (m.kind === 'yt') {
        var p = ytState(m.id);
        if (p) {
          p.playVideo();
          setTimeout(function () {
            var st = p.getPlayerState();
            if (st !== 1 && st !== 3) send({ t: 'autoplay-blocked' });
          }, 1500);
        }
      } else {
        var res = m.el.play();
        if (res && res.catch) res.catch(function () { send({ t: 'autoplay-blocked' }); });
      }
    }
    function seekMedia(m, time) {
      if (m.kind === 'yt') { var p = ytState(m.id); if (p) p.seekTo(time, true); }
      else m.el.currentTime = time;
    }

    // Report the active media's clock to the presenter's transport.
    setInterval(function () {
      if (!activeId) return;
      var m = mediaById(activeId);
      if (!m) return;
      var time = 0, dur = 0;
      if (m.kind === 'yt') {
        var p = ytState(m.id);
        if (!p) return;
        time = p.getCurrentTime() || 0;
        dur = p.getDuration() || 0;
      } else {
        time = m.el.currentTime || 0;
        dur = m.el.duration || 0;
      }
      send({ t: 'media-time', id: m.id, time: time, duration: dur, playing: isPlaying(m) });
    }, 500);

    // Q18c: leaving a slide pauses its video; audio rides on.
    Reveal.on('slidechanged', function () {
      exitMediaFullscreen();
      mediaEls.forEach(function (m) {
        if ((m.kind === 'yt' || m.kind === 'video') && isPlaying(m)) {
          pauseMedia(m);
          if (m.id === activeId) send({ t: 'media-time', id: m.id, time: 0, duration: 0, playing: false });
        }
      });
    });

    // Audio-link overlay: purely visual — sound plays in the presenter.
    var overlay = document.createElement('div');
    overlay.className = 'pm-audio-overlay';
    overlay.hidden = true;
    overlay.innerHTML = '<div class="pm-ao-badge">AUDIO</div><div class="pm-ao-title"></div><div class="pm-ao-bar"><div class="pm-ao-fill"></div></div><div class="pm-ao-time"></div>';
    document.body.appendChild(overlay);

    channel.onmessage = function (e) {
      var msg = e.data || {};
      if (msg.t === 'state') {
        Reveal.setState(msg.state);
      } else if (msg.t === 'media') {
        var m = mediaById(msg.id);
        if (!m) return;
        activeId = msg.id;
        if (msg.cmd === 'play') playMedia(m);
        else if (msg.cmd === 'pause') pauseMedia(m);
        else if (msg.cmd === 'seek') seekMedia(m, msg.time);
      } else if (msg.t === 'overlay') {
        if (msg.cmd === 'hide') { overlay.hidden = true; return; }
        overlay.hidden = false;
        overlay.querySelector('.pm-ao-title').textContent = msg.title || '';
        overlay.querySelector('.pm-ao-time').textContent = fmtTime(msg.time) + ' / ' + fmtTime(msg.duration);
        overlay.querySelector('.pm-ao-fill').style.width = (msg.duration ? (100 * msg.time / msg.duration) : 0) + '%';
        overlay.classList.toggle('pm-ao-paused', !msg.playing);
      } else if (msg.t === 'bye') {
        window.close();
      }
    };

    // Fullscreen must be requested from inside this window, with a user
    // activation. The presenter's click reaches us via Capability
    // Delegation (postMessage {delegate:'fullscreen'}), not the
    // BroadcastChannel, because only window.postMessage can carry it.
    window.addEventListener('message', function (e) {
      if (e.origin !== location.origin || !e.data) return;
      if (e.data.pm === 'stage-fullscreen') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
          return;
        }
        document.documentElement.requestFullscreen({ navigationUI: 'hide' })
          .catch(function () { send({ t: 'fs-failed' }); });
      } else if (e.data.pm === 'media-fullscreen') {
        // Fullscreen the video's own element: the top layer escapes
        // Reveal's slide transform, so it fills the display.
        var m = mediaById(e.data.id);
        if (!m) return;
        if (document.fullscreenElement === m.el) {
          document.exitFullscreen();
          return;
        }
        m.el.requestFullscreen()
          .catch(function () { send({ t: 'media-fs-failed' }); });
      }
    });

    function exitMediaFullscreen() {
      var fs = document.fullscreenElement;
      if (fs && mediaEls.some(function (m) { return m.el === fs; })) document.exitFullscreen();
    }

    send({ t: 'stage-ready' });
  }

  /* ====================== PRESENTER WINDOW ====================== */

  var active = false;
  var stageWin = null, popupWin = null, stageScreen = null;
  var panel = null, shields = [];
  var timers = [];
  var timerStart = 0;
  var seekDragging = false;
  var fsRelaunch = false;
  // What the transport is pointed at:
  //   scope 'stage' = commanded over the channel (yt, video)
  //   scope 'local' = an <audio> element played right here
  //   scope 'overlay' = an audio link played right here, mirrored on stage
  var activeMedia = null;
  var overlayAudio = null;

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'p' && e.key !== 'P') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    e.preventDefault();
    if (active) deactivate(); else whenRevealReady(activate);
  });

  function stageURL() {
    return location.pathname + '?stage=1' + location.hash;
  }

  // Presenter belongs on the laptop panel, stage on the connected display —
  // without dragging. isInternal marks the built-in screen; moveTo() may
  // relocate this window cross-screen once window-management is granted,
  // but Chrome silently ignores it when the deck shares a browser window
  // with other tabs, so verify and hint instead of assuming.
  function placeWindows(details) {
    var screens = details.screens;
    var internal = null, primary = null;
    screens.forEach(function (s) {
      if (s.isInternal && !internal) internal = s;
      if (s.isPrimary && !primary) primary = s;
    });
    var home = internal || primary || details.currentScreen;
    stageScreen = null;
    screens.forEach(function (s) {
      if (s === home) return;
      if (!stageScreen || (!s.isInternal && stageScreen.isInternal)) stageScreen = s;
    });
    if (details.currentScreen !== home) {
      window.moveTo(home.availLeft, home.availTop);
      window.resizeTo(home.availWidth, home.availHeight);
      setTimeout(function () {
        if (details.currentScreen !== home) {
          hint('Couldn’t move this window — it shares a Chrome window with other tabs. Give the deck its own window, or drag it to your laptop screen.');
        }
      }, 600);
    }
  }

  function screenFeatures(s) {
    return 'left=' + s.availLeft + ',top=' + s.availTop +
      ',width=' + s.availWidth + ',height=' + s.availHeight;
  }

  function openStage() {
    var feats = 'popup,width=1280,height=720';
    if (stageScreen) feats = 'popup,fullscreen,' + screenFeatures(stageScreen);
    stageWin = window.open(stageURL(), 'pm-stage', feats);
    if (!stageWin) hint('Stage window was blocked — press P to exit and P again to retry.');
  }

  function activate() {
    active = true;
    collectMedia();
    buildPanel();
    document.body.classList.add('pm-presenter');
    Reveal.layout();
    timerStart = Date.now();

    // One keypress = one transient user activation. Resolve the screen
    // layout (may prompt for the window-management permission on first
    // use), then open the stage while the activation is still fresh.
    if (window.getScreenDetails) {
      window.getScreenDetails().then(function (details) {
        placeWindows(details);
        if (!stageScreen) hint('One screen — stage opens windowed; drag it if a display appears.');
        openStage();
      }, function () {
        hint('Window-management permission denied — stage opens windowed.');
        openStage();
      });
    } else {
      hint('No Window Management API — stage opens windowed; drag it to the display.');
      openStage();
    }

    Reveal.on('slidechanged', onSlideChanged);
    ['fragmentshown', 'fragmenthidden'].forEach(function (ev) {
      Reveal.on(ev, broadcastState);
    });
    document.addEventListener('click', interceptClicks, true);
    window.addEventListener('resize', layoutShields);
    window.addEventListener('pagehide', shutdownStage);

    timers.push(setInterval(tick, 1000));
    timers.push(setInterval(overlayTick, 500));

    channel.onmessage = function (e) {
      var msg = e.data || {};
      if (msg.t === 'stage-ready') {
        broadcastState();
        setLight(true);
      } else if (msg.t === 'media-time') {
        if (activeMedia && activeMedia.scope === 'stage' && activeMedia.id === msg.id) {
          activeMedia.time = msg.time;
          activeMedia.duration = msg.duration;
          activeMedia.playing = msg.playing;
          renderTransport();
        }
      } else if (msg.t === 'autoplay-blocked') {
        hint('Stage audio blocked by Chrome — click once anywhere in the stage window, then press play again.');
      } else if (msg.t === 'fs-failed') {
        fsRelaunch = true;
        hint('Fullscreen was blocked — click Stage fullscreen again to relaunch the stage in fullscreen.');
      } else if (msg.t === 'media-fs-failed') {
        hint('Video fullscreen was blocked — click once anywhere in the stage window, then try again.');
      }
    };

    updateNotes();
    layoutShields();
    tick();
  }

  function deactivate() {
    active = false;
    shutdownStage();
    stopAllLocal();
    timers.forEach(clearInterval);
    timers = [];
    document.removeEventListener('click', interceptClicks, true);
    window.removeEventListener('resize', layoutShields);
    window.removeEventListener('pagehide', shutdownStage);
    Reveal.off('slidechanged', onSlideChanged);
    ['fragmentshown', 'fragmenthidden'].forEach(function (ev) {
      Reveal.off(ev, broadcastState);
    });
    clearShields();
    if (panel) { panel.remove(); panel = null; }
    document.body.classList.remove('pm-presenter');
    activeMedia = null;
    Reveal.layout();
  }

  function shutdownStage() {
    if (popupWin && !popupWin.closed) popupWin.close();
    popupWin = null;
    if (stageWin && !stageWin.closed) { send({ t: 'bye' }); stageWin.close(); }
    stageWin = null;
  }

  function stopAllLocal() {
    if (overlayAudio) { overlayAudio.pause(); overlayAudio = null; send({ t: 'overlay', cmd: 'hide' }); }
    mediaEls.forEach(function (m) {
      if (m.kind === 'audio') m.el.pause();
    });
  }

  function broadcastState() {
    send({ t: 'state', state: Reveal.getState() });
  }

  function onSlideChanged() {
    broadcastState();
    updateNotes();
    // Slide transitions animate for ~400ms; place shields after they settle.
    setTimeout(layoutShields, 500);
    // Stage pauses its own video on slide change; mirror that in the transport.
    if (activeMedia && activeMedia.scope === 'stage') {
      activeMedia.playing = false;
      renderTransport();
    }
  }

  /* ---------------------------- panel ---------------------------- */

  function buildPanel() {
    panel = document.createElement('aside');
    panel.className = 'pm-panel';
    panel.innerHTML =
      '<div class="pm-head">' +
      '  <span class="pm-light" title="stage status"></span>' +
      '  <span class="pm-label">STAGE</span>' +
      '  <span class="pm-clock"></span>' +
      '  <button class="pm-timer" title="Click to reset">0:00</button>' +
      '</div>' +
      '<div class="pm-transport" hidden>' +
      '  <div class="pm-tr-title"></div>' +
      '  <div class="pm-tr-row">' +
      '    <button class="pm-tr-toggle">&#9654;</button>' +
      '    <input class="pm-tr-seek" type="range" min="0" max="1" step="0.1" value="0">' +
      '    <button class="pm-tr-fs" title="Fullscreen on stage" hidden>&#x26F6;</button>' +
      '    <button class="pm-tr-stop" title="Stop">&#9632;</button>' +
      '  </div>' +
      '  <div class="pm-tr-time"></div>' +
      '</div>' +
      '<div class="pm-stage-row">' +
      '  <button class="pm-stage-fs">&#x26F6; Stage fullscreen</button>' +
      '</div>' +
      '<div class="pm-popup-row" hidden>' +
      '  <button class="pm-popup-close">Close stage popup</button>' +
      '</div>' +
      '<div class="pm-hint" hidden></div>' +
      '<div class="pm-notes-label">NOTES</div>' +
      '<div class="pm-notes"></div>';
    document.body.appendChild(panel);

    panel.querySelector('.pm-timer').addEventListener('click', function () {
      timerStart = Date.now();
      tick();
    });
    panel.querySelector('.pm-tr-toggle').addEventListener('click', function () {
      if (!activeMedia) return;
      transportCommand(activeMedia.playing ? 'pause' : 'play');
    });
    panel.querySelector('.pm-tr-stop').addEventListener('click', function () {
      transportCommand('stop');
    });
    var seek = panel.querySelector('.pm-tr-seek');
    seek.addEventListener('pointerdown', function () { seekDragging = true; });
    seek.addEventListener('change', function () {
      seekDragging = false;
      transportCommand('seek', parseFloat(seek.value));
    });
    panel.querySelector('.pm-popup-close').addEventListener('click', closePopup);
    panel.querySelector('.pm-stage-fs').addEventListener('click', fullscreenStage);
    panel.querySelector('.pm-tr-fs').addEventListener('click', mediaFullscreen);
  }

  // Toggle fullscreen on the active video's element in the Stage Window —
  // the projector may be out of cursor reach, so this lives in the panel.
  // Same Capability Delegation handoff as fullscreenStage.
  function mediaFullscreen() {
    if (!activeMedia || activeMedia.scope !== 'stage') return;
    if (!stageWin || stageWin.closed) {
      hint('No stage window — press P twice to relaunch presenter mode.');
      return;
    }
    try {
      stageWin.postMessage({ pm: 'media-fullscreen', id: activeMedia.id }, { targetOrigin: location.origin, delegate: 'fullscreen' });
    } catch (e) {
      stageWin.postMessage({ pm: 'media-fullscreen', id: activeMedia.id }, location.origin);
    }
  }

  // Toggle the stage's fullscreen from here. The click's user activation is
  // handed to the stage via Capability Delegation so it can call
  // requestFullscreen itself — no reload, playback keeps running. If the
  // browser refuses (fs-failed comes back), the next click relaunches the
  // stage window with the fullscreen window feature instead.
  function fullscreenStage() {
    if (!stageWin || stageWin.closed) {
      hint('No stage window — press P twice to relaunch presenter mode.');
      return;
    }
    if (fsRelaunch) {
      fsRelaunch = false;
      stageWin.close();
      openStage();
      return;
    }
    try {
      stageWin.postMessage({ pm: 'stage-fullscreen' }, { targetOrigin: location.origin, delegate: 'fullscreen' });
    } catch (e) {
      // Older syntax path: no delegation support — let the stage try anyway;
      // its failure reply arms the relaunch fallback.
      stageWin.postMessage({ pm: 'stage-fullscreen' }, location.origin);
    }
  }

  function setLight(on) {
    if (!panel) return;
    panel.querySelector('.pm-light').classList.toggle('pm-live', !!on);
  }

  function hint(text) {
    if (!panel) return;
    var el = panel.querySelector('.pm-hint');
    el.textContent = text;
    el.hidden = false;
    clearTimeout(hint._t);
    hint._t = setTimeout(function () { el.hidden = true; }, 8000);
  }

  function tick() {
    if (!panel) return;
    var now = new Date();
    panel.querySelector('.pm-clock').textContent =
      now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
    panel.querySelector('.pm-timer').textContent =
      fmtTime((Date.now() - timerStart) / 1000);
    setLight(stageWin && !stageWin.closed);
    if (panel.querySelector('.pm-popup-row')) {
      panel.querySelector('.pm-popup-row').hidden = !(popupWin && !popupWin.closed);
    }
  }

  function updateNotes() {
    if (!panel) return;
    var slide = Reveal.getCurrentSlide();
    var notes = slide && slide.querySelector('aside.notes');
    panel.querySelector('.pm-notes').innerHTML =
      notes ? notes.innerHTML : '<span class="pm-no-notes">No notes for this slide.</span>';
  }

  function renderTransport() {
    if (!panel) return;
    var tr = panel.querySelector('.pm-transport');
    if (!activeMedia) { tr.hidden = true; return; }
    tr.hidden = false;
    panel.querySelector('.pm-tr-fs').hidden = activeMedia.scope !== 'stage';
    panel.querySelector('.pm-tr-title').textContent = activeMedia.title;
    panel.querySelector('.pm-tr-toggle').innerHTML = activeMedia.playing ? '&#10074;&#10074;' : '&#9654;';
    panel.querySelector('.pm-tr-time').textContent =
      fmtTime(activeMedia.time) + ' / ' + fmtTime(activeMedia.duration);
    var seek = panel.querySelector('.pm-tr-seek');
    seek.max = activeMedia.duration || 1;
    if (!seekDragging) seek.value = activeMedia.time || 0;
    updateShieldStates();
  }

  /* -------------------------- transport -------------------------- */

  function transportCommand(cmd, value) {
    if (!activeMedia) return;
    if (activeMedia.scope === 'stage') {
      if (cmd === 'stop') {
        send({ t: 'media', id: activeMedia.id, cmd: 'pause' });
        activeMedia = null;
      } else {
        send({ t: 'media', id: activeMedia.id, cmd: cmd, time: value });
        if (cmd === 'play' || cmd === 'pause') activeMedia.playing = cmd === 'play';
      }
    } else {
      var el = activeMedia.scope === 'overlay' ? overlayAudio : mediaById(activeMedia.id).el;
      if (!el) { activeMedia = null; renderTransport(); return; }
      if (cmd === 'play') el.play();
      else if (cmd === 'pause') el.pause();
      else if (cmd === 'seek') el.currentTime = value;
      else if (cmd === 'stop') {
        el.pause();
        if (activeMedia.scope === 'overlay') { overlayAudio = null; send({ t: 'overlay', cmd: 'hide' }); }
        activeMedia = null;
      }
      if (activeMedia) activeMedia.playing = !el.paused;
    }
    renderTransport();
  }

  // Local (presenter-side) playback clock for <audio> and overlay audio.
  function overlayTick() {
    if (!activeMedia || activeMedia.scope === 'stage') return;
    var el = activeMedia.scope === 'overlay' ? overlayAudio : (mediaById(activeMedia.id) || {}).el;
    if (!el) return;
    activeMedia.time = el.currentTime || 0;
    activeMedia.duration = el.duration || 0;
    activeMedia.playing = !el.paused && !el.ended;
    renderTransport();
    if (activeMedia.scope === 'overlay') {
      send({
        t: 'overlay', title: activeMedia.title, time: activeMedia.time,
        duration: activeMedia.duration, playing: activeMedia.playing
      });
    }
  }

  function startStageMedia(m) {
    stopAllLocal();
    activeMedia = { scope: 'stage', id: m.id, title: mediaTitle(m), time: 0, duration: 0, playing: true };
    send({ t: 'media', id: m.id, cmd: 'play' });
    renderTransport();
  }

  function startLocalAudio(m) {
    if (activeMedia && activeMedia.scope === 'stage') send({ t: 'media', id: activeMedia.id, cmd: 'pause' });
    if (overlayAudio) { overlayAudio.pause(); overlayAudio = null; send({ t: 'overlay', cmd: 'hide' }); }
    mediaEls.forEach(function (o) { if (o.kind === 'audio' && o.id !== m.id) o.el.pause(); });
    m.el.play();
    activeMedia = { scope: 'local', id: m.id, title: mediaTitle(m), time: 0, duration: 0, playing: true };
    renderTransport();
  }

  function startOverlayAudio(url, title) {
    stopAllLocal();
    if (activeMedia && activeMedia.scope === 'stage') send({ t: 'media', id: activeMedia.id, cmd: 'pause' });
    overlayAudio = new Audio(url);
    overlayAudio.play();
    activeMedia = { scope: 'overlay', id: null, title: title || url, time: 0, duration: 0, playing: true };
    renderTransport();
  }

  /* ----------------------- click routing ------------------------ */

  function interceptClicks(e) {
    if (!active) return;
    if (e.target.closest('.pm-panel')) return;
    var a = e.target.closest('a[href]');
    if (!a || !a.closest('.reveal .slides')) return;
    e.preventDefault();
    e.stopPropagation();
    if (AUDIO_LINK.test(a.href)) startOverlayAudio(a.href, a.textContent.trim());
    else openStagePopup(a.href);
  }

  function openStagePopup(url) {
    closePopup();
    var feats = 'popup,width=1200,height=800';
    if (stageScreen) feats = 'popup,fullscreen,' + screenFeatures(stageScreen);
    popupWin = window.open(url, 'pm-popup', feats);
    tick();
  }

  function closePopup() {
    if (popupWin && !popupWin.closed) popupWin.close();
    popupWin = null;
    tick();
  }

  /* ------------------------ click-shields ------------------------ */

  // Clicks inside a cross-origin iframe never reach this document, so every
  // media element on the current slide gets a shield overlay: clicking it
  // routes playback instead of playing locally.
  function clearShields() {
    shields.forEach(function (s) { s.remove(); });
    shields = [];
  }

  function layoutShields() {
    clearShields();
    if (!active) return;
    var slide = Reveal.getCurrentSlide();
    if (!slide) return;
    mediaEls.forEach(function (m) {
      if (!slide.contains(m.el)) return;
      var rect = m.el.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) return;
      var s = document.createElement('div');
      s.className = 'pm-shield';
      s.style.left = rect.left + 'px';
      s.style.top = rect.top + 'px';
      s.style.width = rect.width + 'px';
      s.style.height = rect.height + 'px';
      s.dataset.mediaId = m.id;
      s.innerHTML = '<span class="pm-shield-label"></span>';
      s.addEventListener('click', function (e) {
        e.stopPropagation();
        onShieldClick(m);
      });
      document.body.appendChild(s);
      shields.push(s);
    });
    updateShieldStates();
  }

  function onShieldClick(m) {
    var isActive = activeMedia && activeMedia.id === m.id;
    if (isActive) {
      transportCommand(activeMedia.playing ? 'pause' : 'play');
      return;
    }
    if (m.kind === 'audio') startLocalAudio(m);
    else startStageMedia(m);
  }

  function updateShieldStates() {
    shields.forEach(function (s) {
      var m = mediaById(s.dataset.mediaId);
      var isActive = activeMedia && activeMedia.id === s.dataset.mediaId;
      var where = m && m.kind === 'audio' ? '' : ' on stage';
      var label = s.querySelector('.pm-shield-label');
      if (isActive && activeMedia.playing) {
        s.classList.add('pm-shield-playing');
        label.textContent = '❚❚ Playing' + where + ' — click to pause';
      } else if (isActive) {
        s.classList.remove('pm-shield-playing');
        label.textContent = '▶ Paused — click to resume';
      } else {
        s.classList.remove('pm-shield-playing');
        label.textContent = '▶ Play' + where;
      }
    });
  }
})();
