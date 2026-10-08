// Ring map: clicking a ring or a tab shows its panel.
(() => {
  const map = document.querySelector(".map");
  const tabs = document.querySelectorAll(".ring-tabs button");
  const panels = document.querySelectorAll(".ring-panel");

  function select(ring) {
    tabs.forEach((t) => t.setAttribute("aria-selected", String(t.dataset.ring === ring)));
    panels.forEach((p) => (p.hidden = p.dataset.ring !== ring));
    map.classList.add("has-active");
    map.querySelectorAll(".ring").forEach((r) => r.classList.toggle("active", r.dataset.ring === ring));
  }

  tabs.forEach((t) => t.addEventListener("click", () => select(t.dataset.ring)));
  map.querySelectorAll(".ring").forEach((r) => r.addEventListener("click", () => select(r.dataset.ring)));
  select("cage");
})();

// Fade sections in as they scroll into view.
(() => {
  const items = document.querySelectorAll(".section h2, .intro, .slab, .card, .roadmap li");
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        io.unobserve(e.target);
      }
    }
  }, { rootMargin: "0px 0px -8% 0px" });
  items.forEach((el) => {
    el.classList.add("reveal");
    io.observe(el);
  });
})();

// Falling ash, drawn on a canvas behind the page.
(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const canvas = document.querySelector(".ash");
  const ctx = canvas.getContext("2d");
  let w, h, flakes;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.width = innerWidth * dpr;
    h = canvas.height = innerHeight * dpr;
    const count = Math.round((innerWidth * innerHeight) / 22000);
    flakes = Array.from({ length: count }, () => spawn(true, dpr));
  }

  function spawn(anywhere, dpr = Math.min(window.devicePixelRatio || 1, 2)) {
    const ember = Math.random() < 0.08;
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : -10,
      r: (Math.random() * 1.4 + 0.5) * dpr,
      vy: (Math.random() * 0.35 + 0.15) * dpr,
      vx: (Math.random() - 0.5) * 0.25 * dpr,
      phase: Math.random() * Math.PI * 2,
      ember,
      a: ember ? 0.7 : Math.random() * 0.35 + 0.15,
    };
  }

  function tick(t) {
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < flakes.length; i++) {
      const f = flakes[i];
      f.y += f.vy;
      f.x += f.vx + Math.sin(t / 2000 + f.phase) * 0.2;
      if (f.y > h + 10) flakes[i] = spawn(false);
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = f.ember ? `rgba(217,130,43,${f.a})` : `rgba(170,160,150,${f.a})`;
      ctx.fill();
    }
    requestAnimationFrame(tick);
  }

  addEventListener("resize", resize);
  resize();
  requestAnimationFrame(tick);
})();
