// The page is the road outward. Whatever part of it fills the middle of the screen sets the ring:
// colours (CSS), the weather on the canvas, and the distance shown in the corner.
(() => {
  const body = document.body;
  const places = [...document.querySelectorAll("[data-ring]:not(body)")];
  const distance = document.querySelector(".distance");
  const road = document.querySelector(".road");
  const eclipse = document.querySelector(".eclipse");
  const hero = document.querySelector(".hero");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function placeAtMiddle() {
    const mid = innerHeight / 2;
    for (const el of places) {
      const r = el.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) return { el, progress: (mid - r.top) / r.height };
    }
    return null;
  }

  function describe(el, progress) {
    const ring = el.dataset.ring;
    if (ring === "hearth") return "At the hearth";
    if (ring === "void") return "Beyond the world";
    if (ring === "board") return "Back at the hearth";
    const from = Number(el.dataset.from), to = Number(el.dataset.to);
    const blocks = Math.round((from + (to - from) * Math.min(Math.max(progress, 0), 1)) / 10) * 10;
    return `${blocks.toLocaleString("en-GB")} blocks from the hearth`;
  }

  let ticking = false;
  function update() {
    ticking = false;
    const here = placeAtMiddle();
    if (here) {
      const ring = here.el.dataset.ring;
      if (body.dataset.ring !== ring) body.dataset.ring = ring;
      distance.textContent = describe(here.el, here.progress);
    }
    road.style.setProperty("--road-y", `${-scrollY * 0.6}px`);
    if (!still) eclipse.style.setProperty("--ec", Math.min(scrollY / (hero.offsetHeight * 0.8), 1).toFixed(3));
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener("resize", update);
  update();
})();

// Weather on a canvas behind the text: drifting leaves in the Gilded Cage, rain in the Weald, ash in the Scars,
// nothing at the edge of the world. Old particles fall out of view while new ones follow the new ring.
(() => {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.querySelector(".weather");
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let w = 0, h = 0, parts = [];

  const weather = {
    hearth: { count: 26, make: leaf },
    cage: { count: 30, make: leaf },
    weald: { count: 140, make: rain },
    scars: { count: 90, make: ash },
    edge: { count: 25, make: ash },
    void: { count: 0 },
    board: { count: 8, make: leaf },
  };

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function leaf(top) {
    const hues = ["#ff9a2e", "#e0621c", "#ffc247", "#b8401a"];
    return {
      kind: "leaf", x: rnd(0, w), y: top ? rnd(-h, 0) : rnd(0, h),
      vx: rnd(0.3, 0.9) * dpr, vy: rnd(0.35, 0.8) * dpr, size: rnd(3, 6) * dpr,
      rot: rnd(0, 6.28), spin: rnd(-0.03, 0.03), sway: rnd(0, 6.28), color: hues[(Math.random() * hues.length) | 0],
    };
  }
  function rain(top) {
    return {
      kind: "rain", x: rnd(-0.2 * w, w), y: top ? rnd(-h, 0) : rnd(0, h),
      vx: 1.6 * dpr, vy: rnd(9, 13) * dpr, len: rnd(10, 22) * dpr, a: rnd(0.12, 0.3),
    };
  }
  function ash(top) {
    const ember = Math.random() < 0.18;
    return {
      kind: ember ? "ember" : "ash", x: rnd(0, w), y: top ? rnd(-h, 0) : rnd(0, h),
      vx: rnd(-0.15, 0.25) * dpr, vy: rnd(0.25, 0.6) * dpr, r: rnd(0.7, 1.9) * dpr,
      a: ember ? rnd(0.5, 0.9) : rnd(0.2, 0.5), sway: rnd(0, 6.28),
    };
  }

  function current() { return weather[document.body.dataset.ring] || weather.void; }

  function resize() {
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
  }

  function step(t) {
    const want = current();
    const alive = parts.filter((p) => !p.gone);
    // Top up towards the current ring's density with fresh particles from above.
    const sameKind = alive.length;
    if (want.make && sameKind < want.count) {
      for (let i = 0; i < Math.min(3, want.count - sameKind); i++) alive.push(want.make(true));
    }
    parts = alive;
    // Particles of a ring we have left stop being replaced; trim the surplus gently.
    if (parts.length > want.count) {
      for (let i = 0; i < parts.length - want.count && i < 2; i++) parts[i].leaving = true;
    }

    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      if (p.kind === "leaf") {
        p.x += p.vx + Math.sin(t / 900 + p.sway) * 0.6 * dpr;
        p.y += p.vy;
        p.rot += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.abs(Math.sin(t / 700 + p.sway)) * 0.7 + 0.3);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      } else if (p.kind === "rain") {
        p.x += p.vx; p.y += p.vy;
        ctx.strokeStyle = `rgba(190, 240, 215, ${p.a})`;
        ctx.lineWidth = dpr;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 1.5, p.y - p.len);
        ctx.stroke();
      } else {
        p.x += p.vx + Math.sin(t / 1500 + p.sway) * 0.25 * dpr;
        p.y += p.vy;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fillStyle = p.kind === "ember" ? `rgba(255, 120, 40, ${p.a})` : `rgba(200, 170, 185, ${p.a})`;
        ctx.fill();
      }
      if (p.y > h + 30 || p.x > w + 30) {
        if (p.leaving || current().make !== makerOf(p)) p.gone = true;
        else Object.assign(p, makerOf(p)(true), { y: -20 });
      }
    }
    requestAnimationFrame(step);
  }

  function makerOf(p) { return p.kind === "leaf" ? leaf : p.kind === "rain" ? rain : ash; }

  addEventListener("resize", resize);
  resize();
  parts = Array.from({ length: current().count }, () => current().make(false));
  requestAnimationFrame(step);
})();

// Stop the eclipse's idle animation while the hero is out of view.
(() => {
  const hero = document.querySelector(".hero");
  new IntersectionObserver(([e]) => hero.classList.toggle("is-away", !e.isIntersecting)).observe(hero);
})();
