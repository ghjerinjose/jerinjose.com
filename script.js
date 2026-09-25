document.getElementById("year").textContent = String(new Date().getFullYear());

(function stringTheoryScroll() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hero = document.getElementById("hero");
  const heroCanvas = document.getElementById("hero-canvas");
  const overlayCanvas = document.getElementById("string-canvas");
  if (!hero || !heroCanvas) return;
  if (reduce) return;

  const hctx = heroCanvas.getContext("2d", { alpha: true });
  const octx = overlayCanvas ? overlayCanvas.getContext("2d", { alpha: true }) : null;
  const MAX = 360;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  let heroW = 0, heroH = 0;
  let particles = [];
  let phase = "idle"; // idle | dissolve | drift | swarm | done
  let phaseT = 0;
  let raf = 0;
  let heroVisible = true;
  let overlayActive = false;
  let overlayParticles = [];
  let overlayUntil = 0;

  function resizeHero() {
    const rect = heroCanvas.getBoundingClientRect();
    heroW = Math.max(1, Math.floor(rect.width));
    heroH = Math.max(1, Math.floor(rect.height));
    heroCanvas.width = Math.floor(heroW * DPR);
    heroCanvas.height = Math.floor(heroH * DPR);
    hctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function resizeOverlay() {
    if (!overlayCanvas || !octx) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    overlayCanvas.width = Math.floor(w * DPR);
    overlayCanvas.height = Math.floor(h * DPR);
    octx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function sampleTextPoints(text, fontSize, maxPts) {
    const off = document.createElement("canvas");
    const pad = 24;
    const tw = Math.ceil(fontSize * text.length * 0.62 + pad * 2);
    const th = Math.ceil(fontSize * 1.4 + pad * 2);
    off.width = tw;
    off.height = th;
    const c = off.getContext("2d");
    c.fillStyle = "#fff";
    c.font = "650 " + fontSize + "px SF Pro Text, Segoe UI, system-ui, sans-serif";
    c.textBaseline = "middle";
    c.textAlign = "center";
    c.fillText(text, tw / 2, th / 2);
    const data = c.getImageData(0, 0, tw, th).data;
    const pts = [];
    const step = Math.max(2, Math.floor(fontSize / 18));
    for (let y = 0; y < th; y += step) {
      for (let x = 0; x < tw; x += step) {
        if (data[(y * tw + x) * 4 + 3] > 40) pts.push({ x: x - tw / 2, y: y - th / 2 });
      }
    }
    if (pts.length <= maxPts) return pts;
    const out = [];
    const stride = pts.length / maxPts;
    for (let i = 0; i < maxPts; i++) out.push(pts[Math.floor(i * stride)]);
    return out;
  }

  function dysonTargets(n, cx, cy, scale) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const ring = 1 + (i % 4);
      const a = (i / n) * Math.PI * 2 + ring * 0.35;
      const r = scale * (0.55 + ring * 0.14);
      const ex = Math.cos(a) * r;
      const ey = Math.sin(a) * r * 0.42;
      if (i % 11 === 0) {
        out.push({ x: cx, y: cy, kind: "star" });
      } else {
        out.push({ x: cx + ex, y: cy + ey, kind: "dot", a: a, ring: ring });
      }
    }
    return out;
  }

  function spawnHeroParticles() {
    const title = hero.querySelector("[data-string-text]") || hero.querySelector("h1");
    const text = (title && (title.getAttribute("data-string-text") || title.textContent)) || "Jerin Jose";
    const fontSize = Math.min(64, Math.max(36, heroW * 0.08));
    const pts = sampleTextPoints(text, fontSize, Math.min(280, MAX));
    const cx = heroW * 0.5;
    const cy = heroH * 0.42;
    const targets = dysonTargets(pts.length, cx, cy + heroH * 0.02, Math.min(heroW, heroH) * 0.28);
    particles = pts.map(function (p, i) {
      const t = targets[i];
      return {
        x: cx + p.x, y: cy + p.y,
        ox: cx + p.x, oy: cy + p.y,
        tx: t.x, ty: t.y,
        vx: (Math.random() - 0.5) * 1.8,
        vy: (Math.random() - 0.5) * 1.8 - 0.4,
        life: Math.random(),
        kind: t.kind || "dot",
        a: t.a || 0,
        ring: t.ring || 1,
        w: 0.6 + Math.random() * 1.2
      };
    });
  }

  function startDissolve() {
    if (phase !== "idle") return;
    resizeHero();
    spawnHeroParticles();
    phase = "dissolve";
    phaseT = 0;
    hero.classList.add("is-dissolving");
    hero.classList.remove("is-swarm");
  }

  function drawFilament(ctx, p, alpha) {
    const len = 4 + p.w * 5;
    const ang = Math.atan2(p.vy || 0.01, p.vx || 0.01);
    ctx.strokeStyle = "rgba(235,238,245," + alpha + ")";
    ctx.lineWidth = Math.max(0.6, p.w * 0.55);
    ctx.beginPath();
    ctx.moveTo(p.x - Math.cos(ang) * len * 0.5, p.y - Math.sin(ang) * len * 0.5);
    ctx.lineTo(p.x + Math.cos(ang) * len * 0.5, p.y + Math.sin(ang) * len * 0.5);
    ctx.stroke();
  }

  function drawHeroFrame(now) {
    if (!heroVisible && phase === "done") return;
    hctx.clearRect(0, 0, heroW, heroH);
    if (phase === "idle") {
      // soft ambient filaments behind static text
      hctx.globalAlpha = 0.25;
      for (let i = 0; i < 28; i++) {
        const x = (Math.sin(now * 0.0003 + i) * 0.5 + 0.5) * heroW;
        const y = (Math.cos(now * 0.00022 + i * 1.7) * 0.5 + 0.5) * heroH;
        drawFilament(hctx, { x: x, y: y, vx: Math.cos(i), vy: Math.sin(i), w: 1 }, 0.35);
      }
      hctx.globalAlpha = 1;
      return;
    }

    const dt = 16;
    phaseT += dt;

    if (phase === "dissolve") {
      const t = Math.min(1, phaseT / 900);
      particles.forEach(function (p) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy *= 0.985;
        drawFilament(hctx, p, 0.35 + (1 - t) * 0.5);
      });
      if (t >= 1) { phase = "drift"; phaseT = 0; }
      return;
    }

    if (phase === "drift") {
      const t = Math.min(1, phaseT / 700);
      particles.forEach(function (p) {
        p.x += p.vx * 0.4 + (Math.random() - 0.5) * 0.15;
        p.y += p.vy * 0.4 + (Math.random() - 0.5) * 0.15;
        drawFilament(hctx, p, 0.45 + Math.random() * 0.25);
      });
      if (t >= 1) {
        phase = "swarm";
        phaseT = 0;
        hero.classList.remove("is-dissolving");
        hero.classList.add("is-swarm");
      }
      return;
    }

    if (phase === "swarm" || phase === "done") {
      const assemble = Math.min(1, phaseT / 1100);
      const ease = assemble * assemble * (3 - 2 * assemble);
      const spin = now * 0.00045;
      // central star
      hctx.fillStyle = "rgba(255,255,255,0.92)";
      hctx.beginPath();
      hctx.arc(heroW * 0.5, heroH * 0.48, 7 + Math.sin(now * 0.004) * 1.2, 0, Math.PI * 2);
      hctx.fill();
      hctx.strokeStyle = "rgba(220,225,235,0.25)";
      hctx.lineWidth = 1;
      for (let r = 1; r <= 4; r++) {
        hctx.beginPath();
        hctx.ellipse(heroW * 0.5, heroH * 0.48, Math.min(heroW, heroH) * (0.12 + r * 0.055), Math.min(heroW, heroH) * (0.05 + r * 0.022), 0, 0, Math.PI * 2);
        hctx.stroke();
      }
      particles.forEach(function (p, i) {
        const ang = (p.a || 0) + spin * (0.6 + (p.ring || 1) * 0.15);
        const scale = Math.min(heroW, heroH) * 0.28;
        const ring = p.ring || 1;
        const targetX = heroW * 0.5 + Math.cos(ang) * scale * (0.55 + ring * 0.14);
        const targetY = heroH * 0.48 + Math.sin(ang) * scale * (0.55 + ring * 0.14) * 0.42;
        p.x = p.ox * (1 - ease) + targetX * ease;
        p.y = p.oy * (1 - ease) + targetY * ease;
        if (assemble > 0.85) {
          p.ox = targetX;
          p.oy = targetY;
        }
        const alpha = 0.35 + ease * 0.55;
        if (p.kind === "star") {
          hctx.fillStyle = "rgba(255,255,255," + alpha + ")";
          hctx.fillRect(p.x - 1, p.y - 1, 2, 2);
        } else {
          drawFilament(hctx, { x: p.x, y: p.y, vx: -Math.sin(ang), vy: Math.cos(ang) * 0.4, w: p.w }, alpha);
        }
      });
      if (assemble >= 1 && phase === "swarm") phase = "done";
      // caption
      hctx.fillStyle = "rgba(235,238,245,0.55)";
      hctx.font = "600 11px SF Pro Text, Segoe UI, system-ui, sans-serif";
      hctx.fillText("DYSON SWARM  ·  OMNIVERSE", 20, heroH - 18);
    }
  }

  function spawnOverlayFromEl(el) {
    if (!overlayCanvas || !octx || !el) return;
    const text = el.getAttribute("data-string-text") || el.textContent || "";
    const rect = el.getBoundingClientRect();
    const fontSize = Math.min(28, Math.max(18, rect.height * 0.9));
    const pts = sampleTextPoints(text.trim(), fontSize, 120);
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    overlayParticles = pts.map(function (p) {
      return {
        x: cx + p.x, y: cy + p.y,
        ox: cx + p.x, oy: cy + p.y,
        vx: (Math.random() - 0.5) * 2.2,
        vy: (Math.random() - 0.5) * 2.2 - 0.3,
        w: 0.5 + Math.random() * 1.1
      };
    });
    el.classList.add("is-stringing");
    overlayCanvas.classList.add("is-active");
    overlayActive = true;
    overlayUntil = performance.now() + 1100;
    const start = performance.now();
    function reform() {
      const t = Math.min(1, (performance.now() - start - 450) / 550);
      if (t > 0) {
        overlayParticles.forEach(function (p) {
          p.x = p.x + (p.ox - p.x) * 0.18;
          p.y = p.y + (p.oy - p.y) * 0.18;
        });
      }
      if (performance.now() < overlayUntil) {
        requestAnimationFrame(reform);
      } else {
        el.classList.remove("is-stringing");
        overlayCanvas.classList.remove("is-active");
        overlayActive = false;
        overlayParticles = [];
        octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      }
    }
    requestAnimationFrame(reform);
  }

  function drawOverlay() {
    if (!octx || !overlayActive) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    octx.clearRect(0, 0, w, h);
    overlayParticles.forEach(function (p) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.94;
      p.vy *= 0.94;
      drawFilament(octx, p, 0.55);
    });
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (heroVisible || phase !== "done") drawHeroFrame(now);
    if (overlayActive) drawOverlay();
  }

  function onScrollIntent() {
    if (phase === "idle") startDissolve();
  }

  let lastY = window.scrollY;
  window.addEventListener("scroll", function () {
    const y = window.scrollY;
    if (y > lastY + 4 || y > 24) onScrollIntent();
    lastY = y;
  }, { passive: true });
  window.addEventListener("wheel", function (e) {
    if (e.deltaY > 0) onScrollIntent();
  }, { passive: true });
  window.addEventListener("touchmove", function () { onScrollIntent(); }, { passive: true });

  const heroObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { heroVisible = en.isIntersecting; });
  }, { threshold: 0.05 });
  heroObs.observe(hero);

  const sectionObs = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting || en.intersectionRatio < 0.35) return;
      const section = en.target;
      if (section.dataset.stringPlayed === "1") return;
      section.dataset.stringPlayed = "1";
      const title = section.querySelector(".string-title, h2");
      if (title) spawnOverlayFromEl(title);
    });
  }, { threshold: 0.4 });

  document.querySelectorAll("[data-string-title]").forEach(function (sec) {
    sectionObs.observe(sec);
  });

  window.addEventListener("resize", function () {
    resizeHero();
    resizeOverlay();
    if (phase === "idle") return;
    if (phase === "done" || phase === "swarm") spawnHeroParticles();
  });

  resizeHero();
  resizeOverlay();
  raf = requestAnimationFrame(loop);
})();
