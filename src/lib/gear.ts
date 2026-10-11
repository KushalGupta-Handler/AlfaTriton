// Build-time SVG geometry for spur gears (centred on 0,0).

export type GearSpec = {
  teeth: number;
  module: number; // tooth size: pitch diameter = teeth * module
};

export const pitchRadius = (g: GearSpec) => (g.teeth * g.module) / 2;

/** Outline of a spur gear with trapezoidal, slightly rounded teeth. */
export function gearOutline({ teeth, module }: GearSpec): string {
  const rp = (teeth * module) / 2;
  const ra = rp + module; // addendum (tip)
  const rf = rp - 1.25 * module; // dedendum (root)
  const step = (Math.PI * 2) / teeth;
  const pt = (a: number, r: number) => `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const root0 = a;
    const flankIn = a + step * 0.12;
    const tip0 = a + step * 0.2;
    const tip1 = a + step * 0.38;
    const flankOut = a + step * 0.46;
    const root1 = a + step * 0.58;
    d += `${i === 0 ? 'M' : 'L'}${pt(root0, rf)} L${pt(flankIn, rf + (rp - rf) * 0.6)} `;
    d += `L${pt(tip0, ra)} A${ra} ${ra} 0 0 1 ${pt(tip1, ra)} `;
    d += `L${pt(flankOut, rf + (rp - rf) * 0.6)} L${pt(root1, rf)} A${rf} ${rf} 0 0 1 ${pt(a + step, rf)} `;
  }
  return d + 'Z';
}

/** Lightening holes between spokes, as an SVG path of rounded sectors. */
export function spokeCutouts(innerR: number, outerR: number, spokes: number, webDeg = 14): string {
  const out: string[] = [];
  const seg = 360 / spokes;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const pt = (deg: number, r: number) => `${(r * Math.cos(rad(deg))).toFixed(2)} ${(r * Math.sin(rad(deg))).toFixed(2)}`;
  for (let i = 0; i < spokes; i++) {
    const a0 = i * seg + webDeg / 2;
    const a1 = (i + 1) * seg - webDeg / 2;
    const large = a1 - a0 > 180 ? 1 : 0;
    out.push(`M${pt(a0, innerR)} L${pt(a0, outerR)} A${outerR} ${outerR} 0 ${large} 1 ${pt(a1, outerR)} L${pt(a1, innerR)} A${innerR} ${innerR} 0 ${large} 0 ${pt(a0, innerR)} Z`);
  }
  return out.join(' ');
}

/** Hub bore with a keyway. */
export function boreWithKeyway(r: number): string {
  const kw = r * 0.28;
  const kh = r * 0.32;
  const y = Math.sqrt(r * r - kw * kw);
  return `M${-kw} ${-y} L${-kw} ${-(r + kh)} L${kw} ${-(r + kh)} L${kw} ${-y} A${r} ${r} 0 1 1 ${-kw} ${-y} Z`;
}
