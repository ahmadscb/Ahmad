export const C = {
  bull: 0x22ffa6,
  bullCore: 0xb8ffe4,
  cyan: 0x2de2ff,
  bear: 0xff2e5b,
  bearCore: 0xffc2cf,
  fire: 0xff7a1a,
  fireCore: 0xffe08a,
  gold: 0xffc940,
  violet: 0xa66bff,
  white: 0xffffff,
  smoke: 0x2a2438,
  steel: 0x8fa3c7,
};
export const dirColor = (d: 'bull' | 'bear') => (d === 'bull' ? C.bull : C.bear);
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
export const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = Math.min(1, Math.max(0, t));
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
