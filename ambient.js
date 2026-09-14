/* ============================================================
   MATCHAPP AMBIENT BACKGROUND

   Three layers on one canvas:

   1. FLOWING AURORA — several independent sine waves, each with its own
      speed, amplitude and phase, stacked with additive blending so where
      they overlap the colour brightens. The palette is MatchApp's own
      (gold #E5C158, royal purple #6B3FA0, deep magenta) rather than any
      other product's, and the motion is built from layered sine bands
      rather than any particular library's look — it should read as ours.

   2. A PROJECTION BEAM WITH DUST IN IT.

      This replaced eight brand-lettered bubbles that bounced around the
      viewport with real collision physics. The physics were correct and the
      effect was wrong: circles labelled N, M, D+ and P drifted straight
      across the reading area and came to rest on top of headlines and
      buttons, so the eye kept leaving the content to track them. A
      background that recruits attention is not a background.

      What replaces it is the oldest image the industry has: a projector
      beam, and dust turning over inside it. It reads as cinema instantly,
      it is anchored to one corner instead of roaming, it moves at the pace
      of air in a still room, and at these alphas it registers as texture
      rather than as objects. Nothing crosses the middle of the screen.

      A little film grain sits on top — a pre-rendered noise tile, drawn at
      very low alpha and re-offset a few times a second rather than
      regenerated per frame, which is what makes it affordable.

   Performance and courtesy:
   - Respects prefers-reduced-motion by rendering ONE static frame and
     stopping. Motion sensitivity is real and a moving background is
     exactly the kind of thing that triggers it.
   - Pauses entirely when the tab is hidden (no wasted battery).
   - Caps device pixel ratio at 2 — beyond that the cost climbs sharply
     for no visible gain.
   - Halves the dust count on small screens, where there is less beam to
     fill and less headroom to spend.
   ============================================================ */

(function () {
    const canvas = document.getElementById('ambient-bg');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');

    const reduceMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0, H = 0, dpr = 1;
    let rafId = null;
    let t = 0;

    /* ---------- Aurora wave bands ---------- */
    // Each band is an independent sine with its own character. Layered with
    // 'lighter' compositing so crossings glow rather than occlude.
    //
    // TIMING IS EXPRESSED AS A PERIOD IN SECONDS, deliberately. The previous
    // version used an opaque `speed` multiplier applied as `t * speed * 1000`
    // with t in milliseconds, which worked out to 25-46 full wave cycles per
    // SECOND — a fast shimmer, not a wave. Real ocean swell has roughly 6-16
    // seconds between crests, so these are set in that range and the maths
    // below converts a period directly into radians. Stating the period in
    // seconds means the intent is readable and a mistake of this size can't
    // hide inside a magic number again.
    //
    // dir is simply which way the band drifts (+1 / -1).
    // Alphas roughly halved and every band pushed below the upper third.
    // The top of the viewport is where the headline, the form and the result
    // card live; a moving gradient behind body copy is legible-but-annoying,
    // which is the worst place for a background to be.
    const BANDS = [
        { colour: '229,193,88',  amp: 0.055, freq: 1.15, periodSec: 13, dir:  1, yOff: 0.58, alpha: 0.075, thick: 0.18 },
        { colour: '107,63,160',  amp: 0.075, freq: 0.85, periodSec: 19, dir: -1, yOff: 0.70, alpha: 0.105, thick: 0.24 },
        { colour: '163,118,182', amp: 0.045, freq: 1.55, periodSec: 11, dir:  1, yOff: 0.80, alpha: 0.065, thick: 0.16 },
        { colour: '196,72,123',  amp: 0.065, freq: 0.65, periodSec: 17, dir: -1, yOff: 0.90, alpha: 0.055, thick: 0.20 }
    ];

    function drawBands() {
        const seconds = t / 1000;
        ctx.globalCompositeOperation = 'lighter';
        for (const b of BANDS) {
            const baseY = H * b.yOff;
            const amp = H * b.amp;
            const thickness = H * b.thick;

            // One full 2π cycle every periodSec seconds.
            const phase = seconds * (Math.PI * 2 / b.periodSec) * b.dir;
            // The second, slower sine runs at ~0.61x so the two never line up
            // on a short common period — the crest keeps drifting instead of
            // visibly repeating.
            const phaseSlow = phase * 0.61;

            const grad = ctx.createLinearGradient(0, baseY - thickness, 0, baseY + thickness);
            grad.addColorStop(0,   `rgba(${b.colour},0)`);
            grad.addColorStop(0.5, `rgba(${b.colour},${b.alpha})`);
            grad.addColorStop(1,   `rgba(${b.colour},0)`);

            ctx.beginPath();
            ctx.moveTo(0, H);
            const step = Math.max(6, W / 120);
            for (let x = 0; x <= W + step; x += step) {
                const p = (x / W) * Math.PI * 2 * b.freq;
                const y = baseY
                    + Math.sin(p + phase) * amp
                    + Math.sin(p * 0.5 + phaseSlow) * amp * 0.45;
                ctx.lineTo(x, y);
            }
            ctx.lineTo(W, H);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    /* ---------- Projection beam + dust ---------- */

    // The beam is a soft wedge from just off the top-left corner down across
    // the upper-left of the viewport — the geometry of a projector throwing
    // over an audience. It breathes on a long period so it is never still and
    // never obviously moving.
    function drawBeam(seconds) {
        const sway = Math.sin(seconds * (Math.PI * 2 / 34)) * 0.055;
        const breathe = 0.78 + Math.sin(seconds * (Math.PI * 2 / 23)) * 0.22;

        const originX = -W * 0.06;
        const originY = -H * 0.12;
        const spread  = 0.42 + sway;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const far = Math.hypot(W, H) * 1.25;
        const a1 = Math.PI * (0.16 + sway * 0.3);
        const a2 = a1 + Math.PI * spread * 0.5;

        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(originX + Math.cos(a1) * far, originY + Math.sin(a1) * far);
        ctx.lineTo(originX + Math.cos(a2) * far, originY + Math.sin(a2) * far);
        ctx.closePath();

        const g = ctx.createRadialGradient(originX, originY, 0, originX, originY, far * 0.8);
        g.addColorStop(0,    `rgba(255,243,163,${0.085 * breathe})`);
        g.addColorStop(0.35, `rgba(229,193,88,${0.042 * breathe})`);
        g.addColorStop(1,     'rgba(229,193,88,0)');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
    }

    // Dust motes. They live INSIDE the beam's reach and drift on a slow
    // convection loop rather than bouncing: dust in still air rises, turns
    // over and settles, it does not ricochet off walls.
    let motes = [];

    function makeMotes() {
        const count = W < 700 ? 22 : 46;
        motes = [];
        for (let i = 0; i < count; i++) {
            motes.push({
                x: Math.random() * W * 0.85,
                y: Math.random() * H,
                r: 0.6 + Math.random() * 1.7,
                // Slow, mostly-downward drift with a lateral wander, so the
                // field turns over instead of marching in one direction.
                vy: 0.045 + Math.random() * 0.075,
                phase: Math.random() * Math.PI * 2,
                wobble: 0.18 + Math.random() * 0.5,
                alpha: 0.10 + Math.random() * 0.26
            });
        }
    }

    function stepMotes(seconds) {
        for (const m of motes) {
            m.y += m.vy;
            m.x += Math.sin(seconds * 0.35 + m.phase) * m.wobble * 0.22;
            // Wrap rather than bounce — a mote leaving the frame is simply
            // one more arriving at the top, which keeps the density constant
            // without any edge behaviour to notice.
            if (m.y - m.r > H) { m.y = -m.r; m.x = Math.random() * W * 0.85; }
            if (m.x < -4) m.x = W * 0.85;
            else if (m.x > W * 0.85 + 4) m.x = -4;
        }
    }

    function drawMotes() {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const m of motes) {
            // Brightest where the beam is strongest (upper left), fading to
            // nothing outside it, so the dust only exists where light is.
            const inBeam = Math.max(0, 1 - (m.x / (W * 0.9)) * 0.85 - (m.y / (H * 1.5)) * 0.35);
            const a = m.alpha * inBeam;
            if (a <= 0.004) continue;
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,247,214,${a})`;
            ctx.fill();
        }
        ctx.restore();
    }

    /* ---------- Film grain ---------- */

    // A 128px noise tile, generated once and tiled. Regenerating noise per
    // frame is what makes grain expensive; re-OFFSETTING one tile a few times
    // a second is indistinguishable at this alpha and costs nothing.
    let grainTile = null;
    let grainPattern = null;   // built once; createPattern per frame is the
                               // one genuinely wasteful call in this layer
    let grainOffset = { x: 0, y: 0, at: 0 };

    function makeGrain() {
        const size = 128;
        const off = document.createElement('canvas');
        off.width = off.height = size;
        const octx = off.getContext('2d');
        const img = octx.createImageData(size, size);
        for (let i = 0; i < img.data.length; i += 4) {
            const v = 120 + Math.random() * 135;
            img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
            img.data[i + 3] = 255;
        }
        octx.putImageData(img, 0, 0);
        grainTile = off;
        grainPattern = ctx.createPattern(off, 'repeat');
    }

    function drawGrain(seconds) {
        if (!grainTile) return;
        // ~8 reshuffles a second. Faster reads as static; slower reads as a
        // texture stuck to the glass.
        if (seconds - grainOffset.at > 0.125) {
            grainOffset = { x: Math.random() * 128, y: Math.random() * 128, at: seconds };
        }
        if (!grainPattern) return;
        ctx.save();
        ctx.globalAlpha = 0.028;
        ctx.globalCompositeOperation = 'overlay';
        ctx.translate(-grainOffset.x, -grainOffset.y);
        ctx.fillStyle = grainPattern;
        ctx.fillRect(0, 0, W + 128, H + 128);
        ctx.restore();
    }

    function frame(now) {
        t = now || 0;
        const seconds = t / 1000;
        ctx.clearRect(0, 0, W, H);
        drawBeam(seconds);
        drawBands();
        stepMotes(seconds);
        drawMotes();
        drawGrain(seconds);
        rafId = requestAnimationFrame(frame);
    }

    function renderStaticFrame() {
        ctx.clearRect(0, 0, W, H);
        drawBeam(0);
        drawBands();
        drawMotes();
        drawGrain(0);
    }

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = Math.floor(W * dpr);
        canvas.height = Math.floor(H * dpr);
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        makeMotes();
        if (!grainTile) makeGrain();
        else grainPattern = ctx.createPattern(grainTile, 'repeat'); // pattern is tied to the context's transform state
        if (reduceMotion) renderStaticFrame();
    }

    function start() {
        if (reduceMotion || rafId !== null || document.querySelector('.poster-wall') || document.documentElement.classList.contains('reduce-motion')) return;
        rafId = requestAnimationFrame(frame);
    }
    function stop() {
        if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    }

    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resize, 180);
    });

    // Don't burn battery animating a background nobody is looking at.
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stop(); else start();
    });
    document.addEventListener('matchapp:posterwall', stop);
    document.addEventListener('matchapp:settingschanged',()=>{if(document.documentElement.classList.contains('reduce-motion'))stop();else start();});

    resize();
    start();
})();
