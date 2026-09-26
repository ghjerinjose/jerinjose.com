document.getElementById("year").textContent = String(new Date().getFullYear());

(function stringTheoryScroll() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hero = document.getElementById("hero");
  const stage = hero && hero.querySelector(".hero-stage");
  const canvas = document.getElementById("hero-canvas");
  const copy = document.getElementById("hero-copy");
  const hint = document.getElementById("scroll-hint");
  const overlayCanvas = document.getElementById("string-canvas");
  if (!hero || !canvas || !stage) return;

  if (reduce) {
    canvas.style.display = "none";
    return;
  }

  const ctx = canvas.getContext("2d", { alpha: true });
  const octx = overlayCanvas ? overlayCanvas.getContext("2d", { alpha: true }) : null;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const COUNT = 520;

  let W = 0, H = 0;
  let particles = [];
  let namePts = [];
  let swarmPts = [];
  let progress = 0;
  let overlayActive = false;
  let overlayParticles = [];
  let overlayUntil = 0;
  let raf = 0;
  let lastNow = 0;

  function resize() {
    const rect = stage.getBoundingClientRect();
    W = Math.max(2, Math.floor(rect.width));
    H = Math.max(2, Math.floor(rect.height));
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (overlayCanvas && octx) {
      const ww = window.innerWidth;
      const hh = window.innerHeight;
      overlayCanvas.width = Math.floor(ww * DPR);
      overlayCanvas.height = Math.floor(hh * DPR);
      octx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    rebuildParticles();
  }

  function sampleTextPoints(text, fontSize, maxPts) {
    const off = document.createElement("canvas");
    const pad = 32;
    const tw = Math.ceil(fontSize * text.length * 0.58 + pad * 2);
    const th = Math.ceil(fontSize * 1.5 + pad * 2);
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
    const step = Math.max(2, Math.floor(fontSize / 22));
    for (let y = 0; y < th; y += step) {
      for (let x = 0; x < tw; x += step) {
        if (data[(y * tw + x) * 4 + 3] > 48) pts.push({ x: x - tw / 2, y: y - th / 2 });
      }
    }
    if (!pts.length) {
      for (let i = 0; i < maxPts; i++) {
        pts.push({ x: (i / maxPts - 0.5) * fontSize * text.length * 0.5, y: (Math.random() - 0.5) * fontSize * 0.4 });
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
      const ring = 1 + (i % 5);
      const a = (i / n) * Math.PI * 2 * 3.2 + ring * 0.41;
      const r = scale * (0.42 + ring * 0.12);
      const tilt = 0.38 + (ring % 2) * 0.08;
      out.push({
        x: cx + Math.cos(a) * r,
        y: cy + Math.sin(a) * r * tilt,
        a: a,
        ring: ring,
        kind: i % 17 === 0 ? "node" : "dot"
      });
    }
    return out;
  }

  function rebuildParticles() {
    const title = hero.querySelector("[data-string-text]") || hero.querySelector("h1");
    const text = (title && (title.getAttribute("data-string-text") || title.textContent)) || "Jerin Jose";
    const stageRect = stage.getBoundingClientRect();
    let cx = W * 0.5;
    let cy = H * 0.42;
    let fontSize = Math.min(72, Math.max(40, W * 0.085));
    if (title) {
      const tr = title.getBoundingClientRect();
      cx = tr.left - stageRect.left + tr.width / 2;
      cy = tr.top - stageRect.top + tr.height / 2;
      fontSize = Math.max(28, Math.min(72, tr.height * 0.92));
    }
    const swarmCx = W * 0.5;
    const swarmCy = H * 0.46;
    namePts = sampleTextPoints(text.trim(), fontSize, COUNT);
    swarmPts = dysonTargets(namePts.length, swarmCx, swarmCy, Math.min(W, H) * 0.34);
    particles = namePts.map(function (p, i) {
      const s = swarmPts[i];
      const ang = Math.random() * Math.PI * 2;
      const burst = 50 + Math.random() * Math.min(W, H) * 0.28;
      return {
        nx: cx + p.x,
        ny: cy + p.y,
        mx: cx + p.x + Math.cos(ang) * burst,
        my: cy + p.y + Math.sin(ang) * burst * 0.9,
        sx: s.x,
        sy: s.y,
        a: s.a,
        ring: s.ring,
        kind: s.kind,
        w: 0.55 + Math.random() * 1.35,
        phase: Math.random() * Math.PI * 2
      };
    });
  }

  function smoothstep(t) {
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function scrollProgress() {
    const rect = hero.getBoundingClientRect();
    const travel = Math.max(180, hero.offsetHeight * 0.85);
    const raw = (-rect.top) / travel;
    return Math.max(0, Math.min(1, raw));
  }

  function drawFilament(x, y, ang, len, width, alpha) {
    ctx.strokeStyle = "rgba(236,240,248," + alpha + ")";
    ctx.lineWidth = Math.max(0.55, width);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(ang) * len * 0.5, y - Math.sin(ang) * len * 0.5);
    ctx.lineTo(x + Math.cos(ang) * len * 0.5, y + Math.sin(ang) * len * 0.5);
    ctx.stroke();
  }

  function particleAt(p, t, now) {
    let x, y, ang, len, alpha;
    if (t < 0.28) {
      const u = smoothstep(t / 0.28);
      x = lerp(p.nx, p.mx, u);
      y = lerp(p.ny, p.my, u);
      ang = Math.atan2(p.my - p.ny, p.mx - p.nx) + Math.sin(now * 0.002 + p.phase) * 0.4;
      len = lerp(2.2, 14, u) + p.w * 3;
      alpha = lerp(0.95, 0.55, u);
    } else if (t < 0.52) {
      const u = (t - 0.28) / 0.24;
      const wave = Math.sin(now * 0.003 + p.phase + u * 4) * 10;
      x = p.mx + Math.cos(p.phase + now * 0.0015) * (6 + u * 18) + wave * 0.15;
      y = p.my + Math.sin(p.phase * 1.3 + now * 0.0012) * (5 + u * 14);
      ang = p.phase + now * 0.002 + u;
      len = 11 + p.w * 5;
      alpha = 0.4 + Math.random() * 0.2;
    } else {
      const u = smoothstep((t - 0.52) / 0.48);
      const spin = now * 0.00055 * (0.55 + p.ring * 0.12);
      const targetX = W * 0.5 + Math.cos(p.a + spin) * (Math.min(W, H) * 0.34) * (0.42 + p.ring * 0.12);
      const targetY = H * 0.46 + Math.sin(p.a + spin) * (Math.min(W, H) * 0.34) * (0.42 + p.ring * 0.12) * (0.38 + (p.ring % 2) * 0.08);
      x = lerp(p.mx, targetX, u);
      y = lerp(p.my, targetY, u);
      ang = p.a + spin + Math.PI * 0.5;
      len = lerp(12, 5 + p.w * 2.2, u);
      alpha = lerp(0.45, 0.85, u);
    }
    return { x: x, y: y, ang: ang, len: len, alpha: alpha };
  }

  function drawFrame(now) {
    progress = scrollProgress();
    ctx.clearRect(0, 0, W, H);

    ctx.globalAlpha = 0.18 + progress * 0.12;
    for (let i = 0; i < 36; i++) {
      const x = (Math.sin(now * 0.00025 + i * 1.7) * 0.5 + 0.5) * W;
      const y = (Math.cos(now * 0.0002 + i * 2.1) * 0.5 + 0.5) * H;
      drawFilament(x, y, i * 0.7 + now * 0.0004, 8 + (i % 5), 0.7, 0.35);
    }
    ctx.globalAlpha = 1;

    if (progress > 0.2 && progress < 0.7) {
      ctx.strokeStyle = "rgba(200,210,225," + (0.06 + progress * 0.08) + ")";
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i += 7) {
        const a = particleAt(particles[i], progress, now);
        const b = particleAt(particles[(i + 19) % particles.length], progress, now);
        const dx = a.x - b.x, dy = a.y - b.y;
        if (dx * dx + dy * dy < 120 * 120) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    if (progress > 0.55) {
      const u = smoothstep((progress - 0.55) / 0.45);
      const cx = W * 0.5, cy = H * 0.46;
      ctx.fillStyle = "rgba(255,255,255," + (0.55 + u * 0.4) + ")";
      ctx.beginPath();
      ctx.arc(cx, cy, 5 + Math.sin(now * 0.005) * 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(220,228,240," + (0.12 + u * 0.22) + ")";
      ctx.lineWidth = 1;
      for (let r = 1; r <= 5; r++) {
        ctx.beginPath();
        ctx.ellipse(
          cx, cy,
          Math.min(W, H) * 0.34 * (0.42 + r * 0.12),
          Math.min(W, H) * 0.34 * (0.42 + r * 0.12) * (0.38 + (r % 2) * 0.08),
          now * 0.0002 * r, 0, Math.PI * 2
        );
        ctx.stroke();
      }
    }

    if (progress > 0.02) {
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const q = particleAt(p, progress, now);
        const a = progress < 0.2 ? Math.min(1, q.alpha + 0.25) : q.alpha;
        if (progress > 0.85 && p.kind === "node") {
          ctx.fillStyle = "rgba(255,255,255," + a + ")";
          ctx.beginPath();
          ctx.arc(q.x, q.y, 1.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          drawFilament(q.x, q.y, q.ang, q.len, p.w * 0.55, a);
        }
      }
    }

    if (progress > 0.72) {
      const fade = smoothstep((progress - 0.72) / 0.28);
      ctx.fillStyle = "rgba(230,235,245," + (0.35 + fade * 0.35) + ")";
      ctx.font = "600 11px SF Pro Text, Segoe UI, system-ui, sans-serif";
      ctx.letterSpacing = "0.12em";
      ctx.fillText("DYSON SWARM  ·  OMNIVERSE", 22, H - 22);
    }

    if (copy) {
      const hide = Math.min(1, progress / 0.18);
      copy.style.opacity = String(1 - hide);
      copy.style.transform = "translateY(" + (hide * 14) + "px)";
      copy.style.pointerEvents = hide > 0.85 ? "none" : "auto";
    }
    if (hint) hint.style.opacity = String(Math.max(0, 1 - progress * 6));
    hero.classList.toggle("is-dissolving", progress > 0.05 && progress < 0.55);
    hero.classList.toggle("is-swarm", progress >= 0.55);
  }

  function spawnOverlayFromEl(el) {
    if (!overlayCanvas || !octx || !el) return;
    const text = el.getAttribute("data-string-text") || el.textContent || "";
    const rect = el.getBoundingClientRect();
    const fontSize = Math.min(28, Math.max(18, rect.height * 0.9));
    const pts = sampleTextPoints(text.trim(), fontSize, 100);
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    overlayParticles = pts.map(function (p) {
      return {
        x: cx + p.x, y: cy + p.y,
        ox: cx + p.x, oy: cy + p.y,
        vx: (Math.random() - 0.5) * 2.4,
        vy: (Math.random() - 0.5) * 2.4 - 0.2,
        w: 0.5 + Math.random() * 1.1
      };
    });
    el.classList.add("is-stringing");
    overlayCanvas.classList.add("is-active");
    overlayActive = true;
    overlayUntil = performance.now() + 1000;
  }

  function drawOverlay(now) {
    if (!octx || !overlayActive) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    octx.clearRect(0, 0, w, h);
    const left = overlayUntil - now;
    overlayParticles.forEach(function (p) {
      if (left > 450) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94;
        p.vy *= 0.94;
      } else {
        p.x += (p.ox - p.x) * 0.16;
        p.y += (p.oy - p.y) * 0.16;
      }
      octx.strokeStyle = "rgba(235,238,245,0.55)";
      octx.lineWidth = Math.max(0.5, p.w * 0.5);
      octx.beginPath();
      octx.moveTo(p.x - 3, p.y);
      octx.lineTo(p.x + 3, p.y);
      octx.stroke();
    });
    if (now >= overlayUntil) {
      overlayActive = false;
      overlayParticles = [];
      overlayCanvas.classList.remove("is-active");
      document.querySelectorAll(".is-stringing").forEach(function (el) {
        el.classList.remove("is-stringing");
      });
      octx.clearRect(0, 0, w, h);
    }
  }

  function loop(now) {
    raf = requestAnimationFrame(loop);
    lastNow = now;
    drawFrame(now);
    if (overlayActive) drawOverlay(now);
  }

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

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("scroll", function () { }, { passive: true });

  resize();
  raf = requestAnimationFrame(loop);
})();
