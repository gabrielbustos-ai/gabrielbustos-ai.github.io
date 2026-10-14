const year = document.getElementById("year");
const menuButton = document.querySelector(".nav-toggle");
const mainNav = document.querySelector(".main-nav");
const navLinks = document.querySelectorAll(".main-nav a");
const sections = document.querySelectorAll("main section[id]");

year.textContent = new Date().getFullYear();

const closeMenu = (returnFocus = false) => {
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Abrir menú");
  menuButton.classList.remove("is-toggled");
  mainNav.classList.remove("is-open");
  document.body.classList.remove("menu-open");

  if (returnFocus) menuButton.focus();
};

menuButton.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.classList.toggle("is-toggled", isOpen);
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
  mainNav.classList.toggle("is-open", isOpen);
  document.body.classList.toggle("menu-open", isOpen);

  if (isOpen) mainNav.querySelector("a").focus();
});

navLinks.forEach((link) => link.addEventListener("click", () => closeMenu()));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
    closeMenu(true);
  }
});

window.matchMedia("(min-width: 701px)").addEventListener("change", (event) => {
  if (event.matches) closeMenu();
});

const setActiveLink = () => {
  let currentId = "";

  sections.forEach((section) => {
    const bounds = section.getBoundingClientRect();
    if (bounds.top <= 130 && bounds.bottom >= 130) currentId = section.id;
  });

  navLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === `#${currentId}`;
    link.classList.toggle("is-current", isActive);
    if (isActive) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
};

window.addEventListener("scroll", setActiveLink, { passive: true });
setActiveLink();

/* Tema claro / oscuro */
const root = document.documentElement;
const themeBtn = document.querySelector(".theme-toggle");
let palette = {};
const readPalette = () => {
  const s = getComputedStyle(root);
  palette = { a: s.getPropertyValue("--accent").trim(), b: s.getPropertyValue("--violet").trim() };
};
const syncThemeLabel = () =>
  themeBtn.setAttribute("aria-label", root.dataset.theme === "light" ? "Cambiar a tema oscuro" : "Cambiar a tema claro");
themeBtn.addEventListener("click", () => {
  const next = root.dataset.theme === "light" ? "dark" : "light";
  root.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch (e) {}
  syncThemeLabel();
  readPalette();
  if (calm && active) draw(performance.now());
});

/* Fondo: líneas curvas vivas con pulsos de luz (transmisión de datos) */
const canvas = document.getElementById("bg-canvas");
let ctx = null; // el contexto se crea recién cuando el fondo se activa (solo escritorio)
// El fondo siempre se anima, sin importar la preferencia "reducir movimiento" del sistema
const calm = false;
const t0 = performance.now();
const STEPS = 160;
let W = 0, H = 0, lines = [], visible = true, raf = 0, last = t0, active = false, observer = null;
let mx = 0, my = 0, tx = 0, ty = 0;

const bezier = (p, t, out) => {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  out[0] = a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0];
  out[1] = a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1];
};

const build = () => {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = canvas.parentElement.clientWidth;
  H = canvas.parentElement.clientHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  lines = Array.from({ length: 8 }, (_, i) => {
    const k = i / 7;
    return {
      i,
      f: 0.5 + (i % 3) * 0.18,
      base: [
        [-W * 0.05, H * (0.5 + 0.42 * k)],
        [W * 0.3, H * (0.95 - 0.2 * k)],
        [W * 0.62, H * (0.05 + 0.25 * k)],
        [W * 1.05, H * (0.1 + 0.45 * k)],
      ],
      pts: Array.from({ length: STEPS + 1 }, () => [0, 0]),
      violet: i % 2 === 1,
      // cada pulso: progreso (0 a 1; negativo = espera), velocidad por segundo y largo
      pulses: [
        { p: calm ? (i * 0.13) % 1 : Math.random() * 1.1 - 0.1, speed: 0.14 + (i % 4) * 0.035, len: 0.14 },
        { p: calm ? (i * 0.13 + 0.5) % 1 : Math.random() * 1.1 - 0.1, speed: 0.22 + (i % 3) * 0.04, len: 0.09 },
      ],
    };
  });
};

const draw = (now) => {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  const sec = calm ? 0 : (now - t0) / 1000;
  const fade = calm ? 1 : Math.min((now - t0) / 1500, 1);
  mx += (tx - mx) * 0.05;
  my += (ty - my) * 0.05;
  ctx.clearRect(0, 0, W, H);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  lines.forEach((ln) => {
    const col = ln.violet ? palette.b : palette.a;
    const sa = Math.sin(sec * ln.f + ln.i) * H * 0.06;
    const sb = Math.cos(sec * ln.f * 0.8 + ln.i * 2) * H * 0.06;
    const px = mx * (24 + ln.i * 7), py = my * (16 + ln.i * 5);
    const b = ln.base;
    const p = [b[0], [b[1][0] + px, b[1][1] + sa + py], [b[2][0] + px, b[2][1] + sb + py], b[3]];
    ln.pts.forEach((pt, s) => bezier(p, s / STEPS, pt));

    // 1. cable apagado
    ctx.shadowBlur = 0;
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.16 * fade;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ln.pts.forEach(([x, y], s) => (s ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();

    // 2. pulsos de luz que recorren la curva
    ln.pulses.forEach((pl) => {
      if (!calm) {
        pl.p += pl.speed * dt;
        if (pl.p > 1 + pl.len) pl.p = -Math.random() * 0.6;
      }
      const from = Math.floor(Math.max(0, pl.p - pl.len) * STEPS);
      const to = Math.floor(Math.min(1, pl.p) * STEPS);
      if (pl.p <= 0 || to <= from) return;
      ctx.globalAlpha = fade;
      ctx.strokeStyle = ctx.shadowColor = col;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      for (let s = from; s <= to; s++) {
        const [x, y] = ln.pts[s];
        s === from ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
    ctx.shadowBlur = 0;
  });
  ctx.globalAlpha = 1;
};

const loop = (now) => {
  draw(now);
  raf = active && visible && !calm ? requestAnimationFrame(loop) : 0;
};
const start = () => { if (!raf && active && visible && !calm) raf = requestAnimationFrame(loop); };

const heroEl = canvas.parentElement;
heroEl.addEventListener("pointermove", (e) => {
  const r = heroEl.getBoundingClientRect();
  tx = (e.clientX - r.left) / r.width - 0.5;
  ty = (e.clientY - r.top) / r.height - 0.5;
});
heroEl.addEventListener("pointerleave", () => { tx = 0; ty = 0; });

readPalette();
syncThemeLabel();

/* En celulares (<= 700px) el fondo animado no se inicia: el hero usa un fondo estático en CSS */
const mobileQuery = window.matchMedia("(max-width: 700px)");

const activateBackground = () => {
  if (active) return;
  active = true;
  ctx = ctx || canvas.getContext("2d");
  last = performance.now();
  build();
  if (calm) draw(performance.now()); else start();
  observer = new IntersectionObserver(([e]) => { visible = e.isIntersecting; start(); });
  observer.observe(heroEl);
};

const deactivateBackground = () => {
  active = false;
  cancelAnimationFrame(raf);
  raf = 0;
  if (observer) observer.disconnect();
  observer = null;
};

window.addEventListener("resize", () => { if (active) build(); });
mobileQuery.addEventListener("change", (e) => (e.matches ? deactivateBackground() : activateBackground()));
if (!mobileQuery.matches) activateBackground();

/* Formulario de contacto */
const form = document.getElementById("contact-form");
const statusEl = form.querySelector(".form-status");
const submitBtn = form.querySelector("button[type=submit]");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!form.checkValidity()) {
    statusEl.className = "form-status is-error";
    statusEl.textContent = "Completá nombre, email y mensaje.";
    return;
  }
  submitBtn.disabled = true;
  statusEl.className = "form-status";
  statusEl.textContent = "Enviando…";

  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    form.reset();
    statusEl.className = "form-status is-ok";
    statusEl.textContent = "¡Listo! Recibí tu consulta y te respondo pronto.";
  } catch (err) {
    statusEl.className = "form-status is-error";
    statusEl.textContent = "No se pudo enviar. Probá por WhatsApp o escribime a gabrielbustosdev@gmail.com.";
  } finally {
    submitBtn.disabled = false;
  }
});

/* Certificados: carrusel infinito, una tarjeta a la vez (flechas, arrastre y teclado) + vista ampliada */
(() => {
  const carousel = document.querySelector(".carousel");
  if (!carousel) return;
  const viewport = carousel.querySelector(".carousel-viewport");
  const track = carousel.querySelector(".carousel-track");
  const counter = document.querySelector(".carousel-count");
  const dialog = document.getElementById("cert-dialog");
  const dialogImg = dialog.querySelector("img");
  const dialogCaption = dialog.querySelector(".cert-caption");
  const total = track.children.length;

  [...track.children].forEach((li, i) => { li.dataset.n = i; });
  // Layout fijo: [0] = tarjeta previa (fuera de vista), [1] = la que se ve, [2] = siguiente
  track.prepend(track.lastElementChild);

  let busy = false, dragStart = null, dragX = 0, moved = false, timer = 0;

  // El desplazamiento se calcula en CSS (porcentajes), así no depende de medir el ancho en píxeles
  const setPos = (k, drag, animate) => {
    track.classList.toggle("no-anim", !animate);
    track.style.setProperty("--k", k);
    track.style.setProperty("--drag", `${drag}px`);
  };

  // Solo la tarjeta visible recibe foco (evita que el foco desplace el carrusel)
  const sync = () => {
    [...track.children].forEach((li, i) => {
      li.inert = i !== 1;
      li.setAttribute("aria-hidden", String(i !== 1));
    });
    counter.textContent = `${Number(track.children[1].dataset.n) + 1} / ${total}`;
  };

  const settle = () => {
    setPos(1, 0, false);
    sync();
    void track.offsetWidth; // fuerza el reflow antes de reactivar la animación
    track.classList.remove("no-anim");
    busy = false;
  };

  const go = (dir) => {
    if (busy) return;
    busy = true;
    setPos(dir === "next" ? 2 : 0, 0, true);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      track.removeEventListener("transitionend", onEnd);
      if (dir === "next") track.append(track.firstElementChild);
      else track.prepend(track.lastElementChild);
      settle();
    };
    const onEnd = (e) => { if (e.target === track && e.propertyName === "transform") finish(); };
    track.addEventListener("transitionend", onEnd);
    timer = setTimeout(finish, 700); // respaldo (por ejemplo con "reducir movimiento")
  };

  carousel.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-dir]");
    if (btn) go(btn.dataset.dir);
  });
  carousel.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") go("next");
    else if (e.key === "ArrowLeft") go("prev");
  });

  // Arrastre con mouse o dedo
  viewport.addEventListener("pointerdown", (e) => {
    if (busy || (e.pointerType === "mouse" && e.button !== 0)) return;
    dragStart = e.clientX; dragX = 0; moved = false;
  });
  viewport.addEventListener("pointermove", (e) => {
    if (dragStart === null) return;
    dragX = e.clientX - dragStart;
    if (!moved && Math.abs(dragX) > 6) {
      moved = true;
      viewport.setPointerCapture(e.pointerId);
      viewport.classList.add("is-dragging");
    }
    if (moved) setPos(1, dragX, false);
  });
  const endDrag = () => {
    if (dragStart === null) return;
    dragStart = null;
    viewport.classList.remove("is-dragging");
    if (!moved) return;
    if (Math.abs(dragX) > Math.min(80, viewport.clientWidth / 5)) go(dragX < 0 ? "next" : "prev");
    else setPos(1, 0, true);
    setTimeout(() => { moved = false; }, 0); // evita que el arrastre dispare un "click"
  };
  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);
  viewport.addEventListener("scroll", () => { viewport.scrollLeft = 0; });

  // Vista ampliada
  track.addEventListener("click", (e) => {
    const thumb = e.target.closest(".cert-thumb");
    if (!thumb || moved) return;
    dialogImg.src = thumb.dataset.full;
    dialogImg.alt = thumb.querySelector("img").alt;
    dialogCaption.textContent = thumb.closest(".cert-card").querySelector("h3").textContent;
    dialog.showModal();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog || e.target.closest(".cert-close")) dialog.close();
  });

  settle();
})();