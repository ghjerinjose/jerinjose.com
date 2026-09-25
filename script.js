document.getElementById("year").textContent = String(new Date().getFullYear());

(function megaSequence() {
  const canvas = document.getElementById("mega-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const caption = document.getElementById("mega-caption");
  const structures = [
    "Dyson swarm", "Dyson sphere", "Dyson bubble", "Ringworld",
    "Shkadov engine", "Caplan thruster", "Matrioshka brain", "Jupiter brain",
    "Alderson disk", "Topopolis", "Banks Orbital", "Bishop ring",
    "O'Neill cylinder", "McKendree cylinder", "Stanford torus", "Bernal sphere",
    "Rama", "Globus Cassus", "Shell world", "Birch planet",
    "Klemperer rosette", "Orbital ring", "Nicoll–Dyson beam", "Planet swarm",
    "Star worlds"
  ];
  const W = canvas.width;
  const H = canvas.height;
  let t0 = performance.now();
  const dwell = 1600;

  function starfield(seed) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) {
      const x = Math.abs((Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1);
      const y = Math.abs((Math.sin(seed * 4.11 + i * 19.19) * 23421.631) % 1);
      const a = 0.2 + (i % 5) * 0.12;
      ctx.fillStyle = "rgba(255,255,255," + a + ")";
      ctx.fillRect(x * W, y * H, 1.2, 1.2);
    }
  }

  function drawStruct(name, progress, pulse) {
    const cx = W * 0.5;
    const cy = H * 0.46;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = "rgba(255,255,255," + (0.45 + pulse * 0.35) + ")";
    ctx.fillStyle = "rgba(255,255,255," + (0.06 + pulse * 0.08) + ")";
    ctx.lineWidth = 2;
    const key = name.toLowerCase();
    if (key.includes("swarm") || key.includes("bubble") || key.includes("planet swarm")) {
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2 + progress * 2;
        const r = 70 + (i % 5) * 10;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r, Math.sin(a) * r * 0.55, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fill();
    } else if (key.includes("sphere") && !key.includes("bernal")) {
      ctx.beginPath();
      ctx.arc(0, 0, 95 * progress, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fill();
    } else if (key.includes("ring") || key.includes("orbital") || key.includes("torus") || key.includes("rosette")) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 120 * progress, 42 * progress, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fill();
    } else if (key.includes("disk") || key.includes("shell") || key.includes("birch") || key.includes("globus")) {
      ctx.beginPath();
      ctx.ellipse(0, 10, 130 * progress, 28 * progress, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -6, 11, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fill();
    } else if (key.includes("cylinder") || key.includes("rama") || key.includes("topopolis") || key.includes("bernal")) {
      const L = 150 * progress;
      ctx.strokeRect(-L / 2, -28, L, 56);
    } else if (key.includes("brain") || key.includes("matrioshka") || key.includes("jupiter")) {
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, 28 * i * progress, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (key.includes("engine") || key.includes("thruster") || key.includes("beam") || key.includes("shkadov") || key.includes("caplan") || key.includes("nicoll")) {
      ctx.beginPath();
      ctx.arc(-40, 0, 14, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-20, -50 * progress);
      ctx.lineTo(110 * progress, 0);
      ctx.lineTo(-20, 50 * progress);
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
    } else {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(0, 30 - i * 28, 100 - i * 18, 22, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, -40, 12, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 1;
    ctx.strokeRect(18, 16, W - 36, H - 32);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = "600 11px SF Pro Text, Segoe UI, system-ui, sans-serif";
    ctx.fillText("OMNIVERSE  ·  MEGASTRUCTURE SEQUENCE", 28, 34);
    ctx.fillStyle = "#fff";
    ctx.font = "600 22px SF Pro Text, Segoe UI, system-ui, sans-serif";
    ctx.fillText(name, 28, H - 28);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "12px SF Pro Text, Segoe UI, system-ui, sans-serif";
    ctx.fillText("Accelerating Omniverse Expansion and Exploration.", 28, H - 12);
  }

  function frame(now) {
    const elapsed = now - t0;
    const idx = Math.floor(elapsed / dwell) % structures.length;
    const local = (elapsed % dwell) / dwell;
    const progress = Math.min(1, local * 1.4);
    const pulse = 0.5 + 0.5 * Math.sin(now / 280);
    starfield(idx + local);
    drawStruct(structures[idx], progress, pulse);
    if (caption) caption.textContent = "Omniverse · " + structures[idx] + " · " + (idx + 1) + "/" + structures.length;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
