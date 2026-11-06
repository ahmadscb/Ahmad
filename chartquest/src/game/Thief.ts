import { Container, Graphics } from 'pixi.js';

export type ThiefPose = 'sneak' | 'run' | 'grab' | 'leap';

/**
 * A vector-drawn masked thief with a procedural skeletal rig (hips, shoulders, knees, scarf).
 * Drawn once; animated by rotating limb pivots and re-drawing only the cloth (scarf/cape).
 */
export class Thief extends Container {
  private legB = limb(0x1b1535, 0x2a2150, 22, 7);
  private legF = limb(0x241b45, 0x3a2d6b, 22, 7);
  private armB = limb(0x1b1535, 0x2a2150, 17, 6);
  private armF = limb(0x2b2152, 0x433379, 17, 6);
  private torso = new Graphics();
  private head = new Container();
  private cape = new Graphics();
  private scarf = new Graphics();
  private bag = new Container();
  private bagGlow = new Graphics();
  private eyes = new Graphics();
  private shadow = new Graphics();
  private rig = new Container();
  t = 0;
  pose: ThiefPose = 'sneak';
  /** 0..1 how full the loot bag is. */
  loot = 0;
  speed = 1;
  reach = 0; // 0..1 arm extension toward reachTarget
  reachAngle = -Math.PI / 2;

  constructor() {
    super();
    this.shadow.ellipse(0, 0, 18, 4).fill({ color: 0x000000, alpha: 0.45 });
    this.addChild(this.shadow, this.rig);

    // Torso: hunched cloak body with rim light.
    this.torso
      .roundRect(-9, -40, 19, 24, 7)
      .fill(0x221a40)
      .roundRect(-9, -40, 19, 24, 7)
      .stroke({ width: 1.5, color: 0x8f6bff, alpha: 0.9 })
      .rect(-9, -22, 19, 4)
      .fill(0x0d0a1c)
      .rect(-2, -22, 5, 4)
      .fill(0xffc940);

    // Head: hood + mask band + glowing eyes.
    const hood = new Graphics()
      .circle(0, 0, 10)
      .fill(0x1a1433)
      .circle(0, 0, 10)
      .stroke({ width: 1.5, color: 0x9a7bff, alpha: 0.9 })
      .moveTo(-8, -6)
      .quadraticCurveTo(-16, -14, -12, -2)
      .fill(0x1a1433);
    const face = new Graphics().roundRect(-2, -5, 11, 9, 4).fill(0xe8c4a0).rect(-2, -4, 11, 4).fill(0x0b0816);
    this.eyes.circle(4, -2, 1.6).circle(8, -2, 1.4).fill(0x3ff7ff);
    const eyeGlow = new Graphics().circle(6, -2, 6).fill({ color: 0x3ff7ff, alpha: 0.18 });
    this.head.addChild(hood, face, eyeGlow, this.eyes);
    this.head.position.set(2, -48);

    // Loot sack slung on the back.
    const sack = new Graphics()
      .ellipse(0, 0, 11, 12)
      .fill(0x6b4a2a)
      .ellipse(0, 0, 11, 12)
      .stroke({ width: 1.5, color: 0xffd27a, alpha: 0.6 })
      .moveTo(-4, -11)
      .lineTo(0, -15)
      .lineTo(4, -11)
      .stroke({ width: 2, color: 0x3d2a16 });
    this.bag.addChild(this.bagGlow, sack);
    this.bag.position.set(-13, -30);

    this.legB.position.set(-2, -18);
    this.legF.position.set(3, -18);
    this.armB.position.set(-4, -37);
    this.armF.position.set(5, -37);
    this.rig.addChild(this.cape, this.legB, this.armB, this.bag, this.torso, this.legF, this.scarf, this.head, this.armF);
  }

  update(dt: number) {
    this.t += dt * this.speed;
    const t = this.t;
    let cycle = 0;
    let lean = 0;
    let bob = 0;
    switch (this.pose) {
      case 'sneak':
        cycle = Math.sin(t * 7);
        lean = 0.12;
        bob = Math.abs(Math.sin(t * 7)) * 1.5 + 4;
        this.legB.rotation = cycle * 0.55;
        this.legF.rotation = -cycle * 0.55;
        this.armB.rotation = -0.9 + cycle * 0.2;
        this.armF.rotation = -1.1 - cycle * 0.2;
        setKnee(this.legB, Math.max(0, -cycle) * 0.9 + 0.3);
        setKnee(this.legF, Math.max(0, cycle) * 0.9 + 0.3);
        break;
      case 'run':
        cycle = Math.sin(t * 16);
        lean = 0.32;
        bob = Math.abs(Math.cos(t * 16)) * 3;
        this.legB.rotation = cycle * 1.0;
        this.legF.rotation = -cycle * 1.0;
        this.armB.rotation = -cycle * 1.1 - 0.2;
        this.armF.rotation = cycle * 1.1 - 0.2;
        setKnee(this.legB, Math.max(0, -cycle) * 1.5 + 0.2);
        setKnee(this.legF, Math.max(0, cycle) * 1.5 + 0.2);
        break;
      case 'grab':
        lean = -0.05;
        bob = 2 + Math.sin(t * 20) * 0.6;
        this.legB.rotation = 0.35;
        this.legF.rotation = -0.3;
        setKnee(this.legB, 0.5);
        setKnee(this.legF, 0.6);
        this.armB.rotation = -0.6;
        this.armF.rotation = lerp(-0.4, this.reachAngle - Math.PI / 2 - lean, this.reach);
        setKnee(this.armF, 0.1);
        break;
      case 'leap':
        lean = 0.5;
        this.legB.rotation = 1.1;
        this.legF.rotation = -0.9;
        setKnee(this.legB, 1.4);
        setKnee(this.legF, 0.4);
        this.armB.rotation = -2.4;
        this.armF.rotation = -2.0;
        break;
    }
    this.rig.rotation = lean;
    this.rig.y = -bob;
    this.head.rotation = -lean * 0.6;
    this.shadow.scale.set(1 - bob * 0.04, 1);

    // Cloth simulation-lite: scarf and cape trail with a travelling wave.
    const flow = this.pose === 'run' || this.pose === 'leap' ? 1 : 0.35;
    this.scarf.clear();
    const sx = -4;
    const sy = -42;
    this.scarf.moveTo(sx, sy);
    for (let i = 1; i <= 6; i++) {
      this.scarf.lineTo(sx - i * 5 * (0.6 + flow * 0.6), sy + Math.sin(t * 14 - i * 0.9) * (1 + i * 0.9 * flow) + i * (1 - flow) * 2);
    }
    this.scarf.stroke({ width: 3.5, color: 0xff3b6b, cap: 'round', join: 'round' });
    this.cape.clear();
    const w = Math.sin(t * 10) * 3 * flow;
    this.cape
      .moveTo(-8, -40)
      .quadraticCurveTo(-22 - flow * 8, -26 + w, -18 - flow * 10, -10 + w)
      .lineTo(-6, -16)
      .closePath()
      .fill({ color: 0x150f2a, alpha: 0.95 })
      .stroke({ width: 1, color: 0x6a4cff, alpha: 0.6 });

    // Loot glow.
    const L = this.loot;
    this.bag.scale.set(0.8 + L * 0.5);
    this.bagGlow.clear();
    if (L > 0) {
      const pulse = 0.6 + Math.sin(t * 12) * 0.25;
      this.bagGlow.circle(0, 0, 14 + L * 10).fill({ color: 0xffc940, alpha: 0.18 * L * pulse }).circle(0, -4, 6 + L * 4).fill({ color: 0xffe9a8, alpha: 0.5 * L });
    }
    this.eyes.alpha = 0.75 + Math.sin(t * 9) * 0.25;
  }
}

function limb(c1: number, c2: number, len: number, w: number) {
  const root = new Container();
  const upper = new Graphics().roundRect(-w / 2, 0, w, len * 0.55, w / 2).fill(c1).stroke({ width: 1, color: 0x7d5cff, alpha: 0.5 });
  const lower = new Container();
  lower.y = len * 0.5;
  lower.addChild(new Graphics().roundRect(-w / 2 + 0.5, 0, w - 1, len * 0.55, w / 2).fill(c2).roundRect(-w / 2, len * 0.45, w + 3, 4, 2).fill(0x0c0818));
  root.addChild(upper, lower);
  return root;
}

function setKnee(l: Container, a: number) {
  (l.children[1] as Container).rotation = a;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
