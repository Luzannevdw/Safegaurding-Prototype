/* ==========================================================================
   Phosphor icons — regular (line) weight.

   Paths are taken verbatim from @phosphor-icons/core so the shapes are the
   genuine article rather than hand-drawn approximations. They are inlined
   rather than loaded from a CDN because this prototype has to run offline
   from a plain static server.

   Every icon uses the 256x256 Phosphor viewBox and `fill: currentColor`, so
   colour and size are controlled entirely from CSS.
   ========================================================================== */

const PHOSPHOR_PATHS = {
  "check-circle":
    "M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z",
  "trend-up":
    "M240,56v64a8,8,0,0,1-16,0V75.31l-82.34,82.35a8,8,0,0,1-11.32,0L96,123.31,29.66,189.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0L136,140.69,212.69,64H168a8,8,0,0,1,0-16h64A8,8,0,0,1,240,56Z",
  "trend-down":
    "M240,128v64a8,8,0,0,1-8,8H168a8,8,0,0,1,0-16h44.69L136,107.31l-34.34,34.35a8,8,0,0,1-11.32,0l-72-72A8,8,0,0,1,29.66,58.34L96,124.69l34.34-34.35a8,8,0,0,1,11.32,0L224,172.69V128a8,8,0,0,1,16,0Z",
  "warning-circle":
    "M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm-8-80V80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,172Z",
  warning:
    "M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,144V104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm20,36a12,12,0,1,1-12-12A12,12,0,0,1,140,180Z",
};

/**
 * Returns an inline Phosphor SVG element, or null if the name is unknown.
 * Decorative by default — callers that need a label should set their own.
 */
function phosphorIcon(name) {
  const path = PHOSPHOR_PATHS[name];
  if (!path) return null;

  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 256 256");
  svg.setAttribute("fill", "currentColor");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add("phi", `phi--${name}`);

  const p = document.createElementNS(NS, "path");
  p.setAttribute("d", path);
  svg.append(p);

  return svg;
}

/** Replaces the contents of `el` with the named icon. */
function setPhosphorIcon(el, name) {
  if (!el) return;
  const svg = phosphorIcon(name);
  el.replaceChildren(...(svg ? [svg] : []));
}
