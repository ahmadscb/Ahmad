/* product3d.js — reusable cinematic 3D product stage (ES module; three.js r161 vendored, CPU via SwiftShader).
   import { productStage } from '../../lib/product3d.js'   (page needs the importmap for "three", see projects/aether-ad)
   const P = productStage(canvas, { W, H, shape: 'bottle'|'can'|'phone'|'watch'|'ring'|'box', color, metal, rough, label })
   Animate P.S (camera + object state) with GSAP; call P.render(t) from BM.everyFrame. Deterministic (no clocks). */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const lathe = (pts, seg = 128) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
const rounded = (w, h, r) => { const s = new THREE.Shape(); s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); return s; };
/* label texture drawn on a 2D canvas (brand name, thin rules) */
function labelTex(text, bg, fg) { const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 512); g.fillStyle = fg; g.font = '200 92px Inter, sans-serif'; g.textAlign = 'center'; g.letterSpacing = '24px';
  g.fillText(text, 512, 280); g.fillRect(352, 320, 320, 3); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

export const SHAPES = {
  bottle(m, o) { const g = new THREE.Group();
    const body = lathe([[0, -1.3], [.52, -1.3], [.56, -1.22], [.56, .35], [.5, .55], [.22, .85], [.2, 1.05], [0, 1.05]]);
    g.add(new THREE.Mesh(body, new THREE.MeshPhysicalMaterial({ color: o.color, metalness: 0, roughness: .05, transmission: .9, thickness: .6, ior: 1.45, clearcoat: 1 })));
    const juice = lathe([[0, -1.24], [.5, -1.24], [.5, .2], [0, .2]]); g.add(new THREE.Mesh(juice, new THREE.MeshPhysicalMaterial({ color: o.liquid || 0xd9a441, roughness: .2, transmission: .4, thickness: 1 })));
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, .34, 64), m); cap.position.y = 1.2; g.add(cap);
    if (o.label) { const lb = new THREE.Mesh(new THREE.CylinderGeometry(.565, .565, .7, 128, 1, true), new THREE.MeshStandardMaterial({ map: labelTex(o.label, '#111114', '#E8E3D8'), roughness: .5 })); lb.position.y = -.45; g.add(lb); }
    return g; },
  can(m, o) { const g = new THREE.Group(); g.add(new THREE.Mesh(lathe([[0, -1], [.5, -1], [.55, -.92], [.55, .88], [.46, 1], [0, 1]]), m));
    if (o.label) { const lb = new THREE.Mesh(new THREE.CylinderGeometry(.553, .553, 1.4, 128, 1, true), new THREE.MeshStandardMaterial({ map: labelTex(o.label, o.labelBg || '#E23D3D', '#FFFFFF'), metalness: .6, roughness: .3 })); g.add(lb); } return g; },
  phone(m, o) { const g = new THREE.Group(); const geo = new THREE.ExtrudeGeometry(rounded(1.1, 2.3, .18), { depth: .1, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 6 }); geo.center();
    g.add(new THREE.Mesh(geo, m)); const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 2.24), new THREE.MeshPhysicalMaterial({ color: 0x050508, roughness: .05, clearcoat: 1, emissive: o.screen || 0x1b2a6b, emissiveIntensity: .35 }));
    scr.position.z = .085; g.add(scr); const cam = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .04, 48), new THREE.MeshPhysicalMaterial({ color: 0x0a0a0a, roughness: .1, clearcoat: 1 }));
    cam.rotation.x = Math.PI / 2; cam.position.set(-.3, .85, -.09); g.add(cam); return g; },
  watch(m, o) { const g = new THREE.Group(); const cs = new THREE.Mesh(new THREE.CylinderGeometry(.62, .62, .22, 96), m); cs.rotation.x = Math.PI / 2; g.add(cs);
    const face = new THREE.Mesh(new THREE.CircleGeometry(.54, 96), new THREE.MeshPhysicalMaterial({ color: o.dial || 0x0d1a2b, roughness: .3, clearcoat: 1 })); face.position.z = .112; g.add(face);
    for (let i = 0; i < 12; i++) { const ix = new THREE.Mesh(new THREE.BoxGeometry(.03, .1, .01), m); const a = i / 12 * Math.PI * 2; ix.position.set(Math.sin(a) * .45, Math.cos(a) * .45, .118); ix.rotation.z = -a; g.add(ix); }
    const strap = new THREE.Mesh(new THREE.BoxGeometry(.5, 3, .08), new THREE.MeshStandardMaterial({ color: o.strap || 0x070606, roughness: .6, envMapIntensity: .25 })); strap.position.z = -.06; g.add(strap); return g; },
  ring(m) { const p = []; for (let i = 0; i <= 40; i++) { const a = -Math.PI / 2 + i / 40 * Math.PI; p.push([1.1 + Math.cos(a) * .06, Math.sin(a) * .19]); }
    for (let i = 0; i <= 40; i++) { const a = Math.PI / 2 + i / 40 * Math.PI; p.push([1.03 - Math.cos(a) * .03, Math.sin(a) * .17]); } const g = new THREE.Group(); const r = new THREE.Mesh(lathe(p, 256), m); r.rotation.x = Math.PI / 2; g.add(r); return g; },
  box(m, o) { const g = new THREE.Group(); const geo = new THREE.ExtrudeGeometry(rounded(1.6, 1.6, .12), { depth: 1.2, bevelEnabled: true, bevelThickness: .04, bevelSize: .04, bevelSegments: 4 }); geo.center(); g.add(new THREE.Mesh(geo, m)); return g; },
};

export function productStage(canvas, o = {}) {
  const W = o.W || 1080, H = o.H || 1920;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  const camera = new THREE.PerspectiveCamera(26, W / H, .05, 100);
  const mat = new THREE.MeshPhysicalMaterial({ color: o.color ?? 0xd9dbe0, metalness: o.metal ?? 1, roughness: o.rough ?? .18, clearcoat: .6, clearcoatRoughness: .2, envMapIntensity: 1.2 });
  const hero = SHAPES[o.shape || 'bottle'](mat, o), pivot = new THREE.Group(); pivot.add(hero); scene.add(pivot);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(6, 64), new THREE.MeshStandardMaterial({ color: o.floor ?? 0x0b0b0e, roughness: .35, metalness: .4 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = o.floorY ?? -1.45; floor.visible = o.showFloor !== false; scene.add(floor);
  const key = new THREE.DirectionalLight(0xfff1dd, o.key ?? 3); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xbcd6ff, 2.4); rim.position.set(-4, 1, -3); scene.add(rim);
  const sweep = new THREE.PointLight(0xffe2b0, 0, 8); scene.add(sweep);
  /* state animated by GSAP: camera orbit + object spin + exposure + light sweep */
  const S = { camX: 0, camY: .2, camZ: 9, lookY: 0, fov: 26, rx: 0, ry: 0, rz: 0, spin: 0, py: 0, scale: 1, exp: 1.05, sweepX: -6, sweepI: 0, float: 0 };
  function render(t) {
    camera.fov = S.fov; camera.position.set(S.camX, S.camY, S.camZ); camera.lookAt(0, S.lookY, 0); camera.updateProjectionMatrix();
    hero.rotation.set(S.rx, 0, S.rz); pivot.rotation.y = S.ry + S.spin; pivot.position.y = S.py + Math.sin(t * 1.3) * .04 * S.float; pivot.scale.setScalar(S.scale);
    renderer.toneMappingExposure = S.exp; sweep.position.set(S.sweepX, 1.5, 3); sweep.intensity = S.sweepI;
    renderer.render(scene, camera);
  }
  /* helpers that write GSAP tweens on the shared timeline */
  const tl = () => window.BM.tl;
  const api = { S, render, scene, camera, hero, mat, renderer,
    turntable(at, dur, turns = 1) { tl().to(S, { spin: '+=' + Math.PI * 2 * turns, duration: dur, ease: 'none' }, at); },
    orbit(at, dur, { x = S.camX, y = S.camY, z = S.camZ, lookY = S.lookY, ease = 'power2.inOut' } = {}) { tl().to(S, { camX: x, camY: y, camZ: z, lookY, duration: dur, ease }, at); },
    sweepLight(at, dur = 1.6, I = 40) { tl().to(S, { keyframes: [{ sweepX: -6, sweepI: 0, duration: .001 }, { sweepI: I, duration: dur * .2 }, { sweepX: 6, duration: dur * .6, ease: 'none' }, { sweepI: 0, duration: dur * .2 }] }, at); },
    reveal(at, dur = 2, exp = 1.05, from = 0) { tl().fromTo(S, { exp: from }, { exp, duration: dur, ease: 'power2.out', immediateRender: false }, at); tl().set(S, { exp: from }, 0); } };
  return api;
}
