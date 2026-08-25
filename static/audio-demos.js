/*
  Audio demos — embedded Web Audio widgets for t-console decks.

  Decks drop in {{< audio-demo type="sine|adsr|harmonics|phase" >}} and this
  file builds the widget in place. Widgets render immediately (Reveal keeps
  every slide in the DOM); audio starts only on the widget's own button press,
  which doubles as the user gesture Chrome's autoplay policy requires.

  Presenter mode note: presenter-mode.js routes <audio>/<video> elements
  between the presenter and stage windows, but these widgets use Web Audio
  (AudioContext), which sits outside that routing — sound plays in whichever
  window's button was clicked. Run demos from the stage window. Auto-stop on
  slide change works in both windows because the synced stage fires its own
  slidechanged events.

  Classroom safety: one shared AudioContext feeds a fixed master gain into a
  hard limiter; only one demo is audible at a time; any slide change stops
  the running demo.
*/
(function () {
  'use strict';

  var mounts = document.querySelectorAll('.audio-demo');
  if (!mounts.length) return;
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;

  /* ---- shared audio graph ------------------------------------------------ */

  var ctx = null;
  var masterGain = null;

  function ensureCtx() {
    if (!ctx) {
      ctx = new AC();
      var limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.25;
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.5;
      masterGain.connect(limiter);
      limiter.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* One audible demo at a time. */
  var activeDemo = null;
  function stopActive() {
    if (activeDemo) {
      var d = activeDemo;
      activeDemo = null;
      d.stop();
    }
    /* Reveal marks past slides aria-hidden; a still-focused widget button
       there trips assistive-tech warnings. */
    var f = document.activeElement;
    if (f && f.closest && f.closest('.audio-demo')) f.blur();
  }
  function setActive(demo) {
    if (activeDemo !== demo) stopActive();
    activeDemo = demo;
  }

  function hookReveal() {
    if (typeof Reveal !== 'undefined' && Reveal.on) {
      Reveal.on('slidechanged', stopActive);
      Reveal.on('overviewshown', stopActive);
    }
  }
  window.addEventListener('pagehide', stopActive);

  /* Fade a gain out over ~30 ms (no clicks), then run cleanup. */
  function fadeOut(gainNode, cleanup) {
    var t = ctx.currentTime;
    gainNode.gain.cancelScheduledValues(t);
    gainNode.gain.setValueAtTime(gainNode.gain.value, t);
    gainNode.gain.linearRampToValueAtTime(0, t + 0.03);
    setTimeout(cleanup, 60);
  }

  /* ---- DOM helpers ------------------------------------------------------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  /* label | range | readout row. fmt maps slider value -> readout text. */
  function sliderRow(parent, label, min, max, step, value, fmt, oninput) {
    var row = el('div', 'audio-demo__row');
    row.appendChild(el('label', 'audio-demo__label', label));
    var input = el('input');
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = value;
    var readout = el('span', 'audio-demo__readout', fmt(value));
    input.addEventListener('input', function () {
      var v = parseFloat(input.value);
      readout.textContent = fmt(v);
      if (oninput) oninput(v);
    });
    row.appendChild(input);
    row.appendChild(readout);
    parent.appendChild(row);
    return input;
  }

  function button(parent, label, onclick) {
    var b = el('button', 'audio-demo__btn', label);
    b.type = 'button';
    b.addEventListener('click', onclick);
    parent.appendChild(b);
    return b;
  }

  function makeCanvas(parent, compact) {
    var c = el('canvas', 'audio-demo__scope');
    c.width = 600;
    c.height = compact ? 72 : 120;
    parent.appendChild(c);
    return c;
  }

  function accentColor() {
    var v = getComputedStyle(document.documentElement).getPropertyValue('--a');
    return (v && v.trim()) || '#6ec1ff';
  }

  /* Draw a normalized (-1..1) sample array as a scope trace. */
  function drawTrace(canvas, samples) {
    var g = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    g.clearRect(0, 0, w, h);
    g.strokeStyle = 'rgba(109, 120, 106, 0.5)'; /* --fg-mute */
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(0, h / 2);
    g.lineTo(w, h / 2);
    g.stroke();
    g.strokeStyle = accentColor();
    g.lineWidth = 2;
    g.beginPath();
    for (var i = 0; i < samples.length; i++) {
      var x = (i / (samples.length - 1)) * w;
      var s = Math.max(-1, Math.min(1, samples[i]));
      var y = h / 2 - s * (h / 2 - 4);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }

  /* Fill n samples from fn(t), t in 0..1. */
  function computeWave(n, fn) {
    var s = new Float32Array(n);
    for (var i = 0; i < n; i++) s[i] = fn(i / (n - 1));
    return s;
  }

  /* Live oscilloscope off an AnalyserNode, with a rising-zero-crossing
     trigger so the trace holds still. `scale` boosts the drawn (not heard)
     level so the volume-limited signal still fills the canvas. Returns a
     stop function. */
  function scopeLoop(analyser, canvas, scale) {
    var buf = new Float32Array(analyser.fftSize);
    var view = new Float32Array(analyser.fftSize / 2);
    var running = true;
    scale = scale || 1;
    function frame() {
      if (!running) return;
      analyser.getFloatTimeDomainData(buf);
      var start = 0;
      var half = view.length;
      for (var i = 1; i < half; i++) {
        if (buf[i - 1] <= 0 && buf[i] > 0) { start = i; break; }
      }
      for (var j = 0; j < half; j++) view[j] = buf[start + j] * scale;
      drawTrace(canvas, view);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    return function () { running = false; };
  }

  /* Widget shell: scope canvas on top, controls, then action row. */
  function shell(mount, compact) {
    mount.textContent = '';
    var canvas = makeCanvas(mount, compact);
    var controls = el('div', 'audio-demo__controls');
    var actions = el('div', 'audio-demo__actions');
    mount.appendChild(controls);
    mount.appendChild(actions);
    return { canvas: canvas, controls: controls, actions: actions };
  }

  function caption(mount, text) {
    mount.appendChild(el('p', 'audio-demo__caption', text));
  }

  var AMP_MAX = 0.4; /* hard cap on any demo's linear gain */

  /* ---- sine playground --------------------------------------------------- */

  function buildSine(mount, opts) {
    var ui = shell(mount, opts.compact);
    var freq = opts.freq;
    var amp = 0.25;
    var phaseDeg = 0;
    var osc = null;
    var gain = null;
    var stopScope = null;

    function fmtFreq(v) {
      var f = sliderToFreq(v);
      return f.toFixed(0) + ' Hz · T = ' + (1000 / f).toFixed(2) + ' ms';
    }
    function sliderToFreq(v) { return 55 * Math.pow(880 / 55, v); }

    function drawStatic() {
      var cycles = 1 + 6 * (Math.log(freq / 55) / Math.log(880 / 55));
      var ph = (phaseDeg / 180) * Math.PI;
      drawTrace(ui.canvas, computeWave(300, function (t) {
        return (amp / AMP_MAX) * Math.sin(2 * Math.PI * cycles * t + ph);
      }));
    }

    var freqSlider = sliderRow(ui.controls, 'freq', 0, 1, 0.001,
      Math.log(freq / 55) / Math.log(880 / 55), fmtFreq, function (v) {
        freq = sliderToFreq(v);
        if (osc) osc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.01);
        if (!osc) drawStatic();
      });
    sliderRow(ui.controls, 'amp', 0, 1, 0.01, amp / AMP_MAX, function (v) {
      return Math.round(v * 100) + '%';
    }, function (v) {
      amp = v * AMP_MAX;
      if (gain) gain.gain.setTargetAtTime(amp, ctx.currentTime, 0.01);
      if (!osc) drawStatic();
    });
    sliderRow(ui.controls, 'phase', 0, 360, 1, 0, function (v) {
      return v + '°';
    }, function (v) {
      phaseDeg = v;
      drawStatic(); /* phase of a lone sine is drawn, not heard */
    });

    var demo = { stop: stop };
    function stop() {
      powerBtn.classList.remove('is-active');
      powerBtn.textContent = '▶ play';
      if (stopScope) { stopScope(); stopScope = null; }
      if (osc) {
        var o = osc, g = gain;
        osc = null; gain = null;
        fadeOut(g, function () { o.stop(); o.disconnect(); g.disconnect(); });
      }
      drawStatic();
    }
    function start() {
      ensureCtx();
      setActive(demo);
      osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain = ctx.createGain();
      gain.gain.value = amp;
      var analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      osc.connect(gain);
      gain.connect(analyser);
      gain.connect(masterGain);
      osc.start();
      stopScope = scopeLoop(analyser, ui.canvas, 1 / AMP_MAX);
      powerBtn.classList.add('is-active');
      powerBtn.textContent = '■ stop';
    }
    var powerBtn = button(ui.actions, '▶ play', function () {
      if (osc) { stop(); if (activeDemo === demo) activeDemo = null; }
      else start();
    });
    caption(mount, 'The phase slider moves the drawing only — a lone sine’s phase is inaudible.');
    drawStatic();
    void freqSlider;
  }

  /* ---- ADSR envelope designer -------------------------------------------- */

  function buildAdsr(mount, opts) {
    var ui = shell(mount, opts.compact);
    var A = 0.05, D = 0.2, S = 0.5, R = 0.4;
    var HOLD = 0.5; /* sustain hold on a one-shot trigger */
    var PEAK = 0.35;
    var voice = null; /* { osc, gain, t0 } */
    var raf = null;

    function totalTime() { return A + D + HOLD + R; }

    /* Envelope outline is always the computed shape; a playhead sweeps it
       during a trigger. */
    function drawEnv(playT) {
      var c = ui.canvas;
      var g = c.getContext('2d');
      var w = c.width, h = c.height;
      var pad = 6;
      var T = totalTime();
      function px(t) { return pad + (t / T) * (w - 2 * pad); }
      function py(level) { return h - pad - level * (h - 2 * pad); }
      g.clearRect(0, 0, w, h);
      g.strokeStyle = accentColor();
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(px(0), py(0));
      g.lineTo(px(A), py(1));
      g.lineTo(px(A + D), py(S));
      g.lineTo(px(A + D + HOLD), py(S));
      g.lineTo(px(T), py(0));
      g.stroke();
      g.fillStyle = 'rgba(109, 120, 106, 0.9)';
      g.font = '11px monospace';
      g.fillText('A', px(A / 2) - 3, h - 1);
      g.fillText('D', px(A + D / 2) - 3, h - 1);
      g.fillText('S', px(A + D + HOLD / 2) - 3, h - 1);
      g.fillText('R', px(A + D + HOLD + R / 2) - 3, h - 1);
      if (playT != null && playT <= T) {
        g.strokeStyle = 'rgba(228, 235, 225, 0.8)'; /* --fg-bright */
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(px(playT), pad);
        g.lineTo(px(playT), h - pad);
        g.stroke();
      }
    }

    function fmtSec(v) { return (v * 1000).toFixed(0) + ' ms'; }
    sliderRow(ui.controls, 'attack', 0.001, 1, 0.001, A, fmtSec, function (v) { A = v; drawEnv(null); });
    sliderRow(ui.controls, 'decay', 0.001, 1, 0.001, D, fmtSec, function (v) { D = v; drawEnv(null); });
    sliderRow(ui.controls, 'sustain', 0, 1, 0.01, S, function (v) {
      return Math.round(v * 100) + '%';
    }, function (v) { S = v; drawEnv(null); });
    sliderRow(ui.controls, 'release', 0.001, 2, 0.001, R, fmtSec, function (v) { R = v; drawEnv(null); });

    var demo = { stop: stop };
    function stop() {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      if (voice) {
        var v = voice;
        voice = null;
        fadeOut(v.gain, function () { try { v.osc.stop(); } catch (e) {} v.osc.disconnect(); v.gain.disconnect(); });
      }
      drawEnv(null);
    }
    button(ui.actions, '◉ trigger', function () {
      ensureCtx();
      setActive(demo);
      if (voice) stop(); /* retrigger */
      setActive(demo);
      var osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = opts.freq;
      var gain = ctx.createGain();
      var t = ctx.currentTime;
      var T = totalTime();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(PEAK, t + A);
      gain.gain.linearRampToValueAtTime(S * PEAK, t + A + D);
      gain.gain.setValueAtTime(S * PEAK, t + A + D + HOLD);
      gain.gain.linearRampToValueAtTime(0, t + T);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(t);
      osc.stop(t + T + 0.05);
      voice = { osc: osc, gain: gain };
      var t0 = performance.now();
      function sweep() {
        var elapsed = (performance.now() - t0) / 1000;
        if (elapsed > T) { raf = null; voice = null; drawEnv(null); return; }
        drawEnv(elapsed);
        raf = requestAnimationFrame(sweep);
      }
      raf = requestAnimationFrame(sweep);
    });
    caption(mount, 'Short attack = pluck; long attack = pad. Same pitch, different instrument.');
    drawEnv(null);
  }

  /* ---- harmonics / timbre builder ----------------------------------------- */

  function buildHarmonics(mount, opts) {
    var ui = shell(mount, opts.compact);
    var N = 8;
    var levels = [1, 0, 0, 0, 0, 0, 0, 0];
    var osc = null;
    var gain = null;
    var stopScope = null;
    var sliders = [];

    function applyWave() {
      if (!osc) return;
      var real = new Float32Array(N + 1);
      var imag = new Float32Array(N + 1);
      for (var n = 1; n <= N; n++) imag[n] = levels[n - 1];
      osc.setPeriodicWave(ctx.createPeriodicWave(real, imag));
    }

    function drawStatic() {
      var peak = 0.0001;
      var wave = computeWave(300, function (t) {
        var y = 0;
        for (var n = 1; n <= N; n++) y += levels[n - 1] * Math.sin(2 * Math.PI * n * 2 * t);
        return y;
      });
      for (var i = 0; i < wave.length; i++) peak = Math.max(peak, Math.abs(wave[i]));
      for (var j = 0; j < wave.length; j++) wave[j] /= peak;
      drawTrace(ui.canvas, wave);
    }

    for (var i = 0; i < N; i++) {
      (function (idx) {
        sliders.push(sliderRow(ui.controls, 'h' + (idx + 1), 0, 1, 0.01, levels[idx], function (v) {
          return Math.round(v * 100) + '%';
        }, function (v) {
          levels[idx] = v;
          applyWave();
          if (!osc) drawStatic();
        }));
      })(i);
    }

    function setPreset(vals) {
      for (var k = 0; k < N; k++) {
        levels[k] = vals[k];
        sliders[k].value = vals[k];
        sliders[k].dispatchEvent(new Event('input'));
      }
    }

    var demo = { stop: stop };
    function stop() {
      powerBtn.classList.remove('is-active');
      powerBtn.textContent = '▶ play';
      if (stopScope) { stopScope(); stopScope = null; }
      if (osc) {
        var o = osc, g = gain;
        osc = null; gain = null;
        fadeOut(g, function () { o.stop(); o.disconnect(); g.disconnect(); });
      }
      drawStatic();
    }
    function start() {
      ensureCtx();
      setActive(demo);
      osc = ctx.createOscillator();
      osc.frequency.value = opts.freq;
      gain = ctx.createGain();
      gain.gain.value = 0.3;
      var analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      osc.connect(gain);
      gain.connect(analyser);
      gain.connect(masterGain);
      applyWave();
      osc.start();
      stopScope = scopeLoop(analyser, ui.canvas, 1 / 0.3);
      powerBtn.classList.add('is-active');
      powerBtn.textContent = '■ stop';
    }
    var powerBtn = button(ui.actions, '▶ play', function () {
      if (osc) { stop(); if (activeDemo === demo) activeDemo = null; }
      else start();
    });
    button(ui.actions, 'sine', function () { setPreset([1, 0, 0, 0, 0, 0, 0, 0]); });
    button(ui.actions, 'saw-ish', function () {
      setPreset([1, 0.5, 0.33, 0.25, 0.2, 0.17, 0.14, 0.13]);
    });
    button(ui.actions, 'square-ish', function () {
      setPreset([1, 0, 0.33, 0, 0.2, 0, 0.14, 0]);
    });
    caption(mount, 'Each slider is one sine at a whole-number multiple of the fundamental.');
    drawStatic();
  }

  /* ---- phase & interference lab ------------------------------------------- */

  function buildPhase(mount, opts) {
    var ui = shell(mount, opts.compact);
    var detune = 3; /* Hz offset on osc B */
    var invert = false;
    var nodes = null; /* { oscA, oscB, gainA, gainB, sum } */
    var stopScope = null;
    var VOICE = 0.18; /* per-osc gain; sum stays under AMP_MAX */

    function drawStatic() {
      /* Show the character of the sum, not exact frequencies: base wave plus
         a slightly detuned or inverted partner. */
      var cycles = 3;
      var ratio = (opts.freq + detune) / opts.freq;
      var sign = invert ? -1 : 1;
      drawTrace(ui.canvas, computeWave(300, function (t) {
        var a = Math.sin(2 * Math.PI * cycles * t);
        var b = sign * Math.sin(2 * Math.PI * cycles * ratio * t);
        return (a + b) / 2;
      }));
    }

    sliderRow(ui.controls, 'detune', 0, 15, 0.1, detune, function (v) {
      return v.toFixed(1) + ' Hz';
    }, function (v) {
      detune = v;
      if (nodes) {
        /* While detuned, the oscillators drift to an arbitrary relative
           phase; at exactly 0 Hz restart them so they realign and the
           invert switch truly cancels. */
        if (detune === 0) restart();
        else nodes.oscB.frequency.setTargetAtTime(opts.freq + detune, ctx.currentTime, 0.01);
      }
      if (!nodes) drawStatic();
    });

    var invRow = el('div', 'audio-demo__row');
    invRow.appendChild(el('label', 'audio-demo__label', 'invert B'));
    var invBox = el('input');
    invBox.type = 'checkbox';
    invBox.addEventListener('change', function () {
      invert = invBox.checked;
      if (nodes) nodes.gainB.gain.setTargetAtTime(invert ? -VOICE : VOICE, ctx.currentTime, 0.01);
      if (!nodes) drawStatic();
    });
    invRow.appendChild(invBox);
    invRow.appendChild(el('span', 'audio-demo__readout', 'polarity flip'));
    ui.controls.appendChild(invRow);

    /* Tear down and immediately rebuild both oscillators (same UI state) so
       they start phase-aligned. */
    function restart() {
      if (!nodes) return;
      teardown();
      startNodes();
    }
    function teardown() {
      if (stopScope) { stopScope(); stopScope = null; }
      if (nodes) {
        var n = nodes;
        nodes = null;
        fadeOut(n.sum, function () {
          n.oscA.stop(); n.oscB.stop();
          n.oscA.disconnect(); n.oscB.disconnect();
          n.gainA.disconnect(); n.gainB.disconnect(); n.sum.disconnect();
        });
      }
    }

    var demo = { stop: stop };
    function stop() {
      powerBtn.classList.remove('is-active');
      powerBtn.textContent = '▶ play both';
      teardown();
      drawStatic();
    }
    function start() {
      ensureCtx();
      setActive(demo);
      startNodes();
      powerBtn.classList.add('is-active');
      powerBtn.textContent = '■ stop';
    }
    function startNodes() {
      var oscA = ctx.createOscillator();
      var oscB = ctx.createOscillator();
      oscA.frequency.value = opts.freq;
      oscB.frequency.value = opts.freq + detune;
      var gainA = ctx.createGain();
      var gainB = ctx.createGain();
      gainA.gain.value = VOICE;
      gainB.gain.value = invert ? -VOICE : VOICE;
      var sum = ctx.createGain();
      sum.gain.value = 1;
      var analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      oscA.connect(gainA); gainA.connect(sum);
      oscB.connect(gainB); gainB.connect(sum);
      sum.connect(analyser);
      sum.connect(masterGain);
      oscA.start(); oscB.start();
      nodes = { oscA: oscA, oscB: oscB, gainA: gainA, gainB: gainB, sum: sum };
      stopScope = scopeLoop(analyser, ui.canvas, 1 / (2 * VOICE));
    }
    var powerBtn = button(ui.actions, '▶ play both', function () {
      if (nodes) { stop(); if (activeDemo === demo) activeDemo = null; }
      else start();
    });
    caption(mount, 'Small detune = beats. Invert + 0.0 Hz detune = silence (total cancellation).');
    drawStatic();
  }

  /* ---- boot --------------------------------------------------------------- */

  var DEMOS = {
    sine: buildSine,
    adsr: buildAdsr,
    harmonics: buildHarmonics,
    phase: buildPhase
  };

  Array.prototype.forEach.call(mounts, function (mount) {
    var type = mount.getAttribute('data-demo');
    var build = DEMOS[type];
    if (!build) return; /* leave fallback text */
    try {
      build(mount, {
        freq: parseFloat(mount.getAttribute('data-freq')) || 220,
        compact: mount.classList.contains('audio-demo--compact')
      });
    } catch (e) {
      /* leave the fallback text; the slide still reads */
      if (window.console) console.error('audio-demo (' + type + '):', e);
    }
  });

  if (document.readyState === 'complete') hookReveal();
  else window.addEventListener('load', hookReveal);
})();
