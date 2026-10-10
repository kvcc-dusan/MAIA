// Tiny inline icons (Lucide shapes) for the vanilla-DOM popup, which cannot render React icons.
const SVG_NS = 'http://www.w3.org/2000/svg';
const FILE = ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6'];

const PATHS = {
  note: [...FILE, 'M16 13H8', 'M16 17H8'],
  pdf: FILE,
  image: ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', 'M9 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z', 'm21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21'],
  audio: ['M9 18V5l12-2v13', 'M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', 'M21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z'],
  video: ['m22 8-6 4 6 4V8z', 'M3 6h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z'],
  heading: ['M4 9h16', 'M4 15h16', 'M10 3 8 21', 'M16 3l-2 18'],
  block: ['M12 4v16', 'M17 4v16', 'M17 4H9.5a4.5 4.5 0 0 0 0 9H12'],
};

/** kind is an item's `fileKind` for files, else its `kind`. */
export const createIcon = (kind) => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  ['viewBox:0 0 24 24', 'fill:none', 'stroke:currentColor', 'stroke-width:2', 'stroke-linecap:round',
    'stroke-linejoin:round', 'aria-hidden:true', 'width:16', 'height:16'].forEach((pair) => {
    const [name, value] = pair.split(':');
    svg.setAttribute(name, value);
  });
  (PATHS[kind] ?? FILE).forEach((d) => {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  });
  return svg;
};
