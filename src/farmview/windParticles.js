// Animated wind: thousands of short-lived particles drift across the map along
// the forecast wind field and leave fading trails, the same idea as the Wind
// layer in God's Eye View. The field is model data (ECMWF IFS via Open-Meteo),
// so this shows modelled flow, not measured wind.
//
// Particles live in screen pixels; each frame the wind is sampled at the
// particle's map position. Panning or zooming clears the trails (cheap) and
// the particles carry on, so the flow is always right for what is on screen.

import { sampleField } from "./weatherGrid";

const PX_PER_MS_PER_FRAME = 0.2; // how far a 1 m/s wind moves a particle per frame
const MAX_AGE = 90;

export default class WindParticles {
  /**
   * @param map       a MapLibre map
   * @param getField  () => ({ grid, hour }) the current grid and hour index, or null
   */
  constructor(map, getField) {
    this.map = map;
    this.getField = getField;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "fv-wind-canvas";
    Object.assign(this.canvas.style, { position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 });
    map.getCanvasContainer().appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.particles = [];
    this.raf = 0;
    this.running = false;
    this.lastFrame = 0;
    this.slow = (navigator.hardwareConcurrency || 4) <= 4; // 30 fps on modest devices
    this.reducedMotion = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    this.onResize = () => this.resize();
    this.onMove = () => this.clear();
    map.on("resize", this.onResize);
    map.on("movestart", this.onMove);
    map.on("move", this.onMove);
    this.resize();
  }

  resize() {
    // The map's own element has the real size; its canvas container is sized by
    // its (absolutely positioned) child and reports 0 x 0.
    const { clientWidth: w, clientHeight: h } = this.map.getContainer();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
    // About one particle per 250 px2: dense enough to read, light enough for phones.
    const count = Math.max(300, Math.min(3500, Math.round((w * h) / 250)));
    this.particles = Array.from({ length: count }, () => this.spawn());
    this.clear();
  }

  spawn() {
    return { x: Math.random() * (this.w || 800), y: Math.random() * (this.h || 600), age: Math.floor(Math.random() * MAX_AGE) };
  }

  clear() {
    this.ctx.clearRect(0, 0, this.w || 0, this.h || 0);
  }

  start() {
    if (this.running) return;
    this.running = true;
    if (this.reducedMotion) {
      this.drawStatic();
      return;
    }
    const loop = (now) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      if (this.slow && now - this.lastFrame < 33) return;
      this.lastFrame = now;
      this.step();
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.clear();
  }

  // Move every particle one step and draw its trail segment.
  step() {
    const field = this.getField();
    if (!field) return;
    const { grid, hour } = field;
    const ctx = this.ctx;

    // Fade old trails a little each frame.
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.07)";
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = 1.3;

    for (const p of this.particles) {
      const ll = this.map.unproject([p.x, p.y]);
      const u = sampleField(grid, grid.u[hour], ll.lng, ll.lat);
      const v = sampleField(grid, grid.v[hour], ll.lng, ll.lat);
      if (u == null || v == null || p.age++ > MAX_AGE || p.x < 0 || p.y < 0 || p.x > this.w || p.y > this.h) {
        Object.assign(p, this.spawn(), { age: 0 });
        continue;
      }
      const nx = p.x + u * PX_PER_MS_PER_FRAME;
      const ny = p.y - v * PX_PER_MS_PER_FRAME; // screen y grows downward
      const speed = Math.hypot(u, v);
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(0.9, 0.35 + speed / 14)})`;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      p.x = nx;
      p.y = ny;
    }
  }

  // For people who prefer reduced motion: one still picture of the flow lines.
  drawStatic() {
    const field = this.getField();
    if (!field) return;
    this.clear();
    for (let i = 0; i < 40; i++) this.step();
  }

  refresh() {
    if (this.reducedMotion && this.running) this.drawStatic();
  }

  destroy() {
    this.stop();
    this.map.off("resize", this.onResize);
    this.map.off("movestart", this.onMove);
    this.map.off("move", this.onMove);
    this.canvas.remove();
  }
}
