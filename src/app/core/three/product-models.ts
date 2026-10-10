import {
  Box3,
  BoxGeometry,
  CylinderGeometry,
  EdgesGeometry,
  Group,
  InstancedMesh,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import type { BufferGeometry, LineBasicMaterial, Material } from 'three';

import { MATERIALS as M } from './models';
import type { ModelInstance } from './models';
import { tint } from './palette';

export const PRODUCT_IDS = [
  'cpu',
  'motherboard',
  'ram',
  'gpu',
  'ssd',
  'hdd',
  'psu',
  'cooler',
  'chassis',
  'audio-interface',
  'keyboard',
  'mouse',
  'monitor',
  'webcam',
  'microphone',
  'printer',
  'external-drive',
  'ups',
  'nic',
  'network-switch',
  'router',
  'wireless-ap',
  'firewall',
  'modem-ont',
  'nas',
  'ethernet-cable',
  'fiber-cable',
  'patch-panel',
  'optical-transceiver',
  'server-rack',
] as const;

export type ProductId = (typeof PRODUCT_IDS)[number];

type V3 = readonly [number, number, number];
type Anim = (seconds: number) => void;
type Builder = (g: Group, anim: Anim[]) => void;

// ---------------------------------------------------------------------------
// Extra materials (shared by all product models)
// ---------------------------------------------------------------------------
const dark = tint(new MeshStandardMaterial({ metalness: 0.35, roughness: 0.5 }), 'pDark');
const metal = tint(new MeshStandardMaterial({ metalness: 0.4, roughness: 0.45 }), 'pMetal');
const gold = tint(new MeshStandardMaterial({ metalness: 0.55, roughness: 0.4 }), 'gold');
const steel = tint(new MeshStandardMaterial({ metalness: 0.4, roughness: 0.5 }), 'steel');
const paper = tint(new MeshStandardMaterial({ roughness: 0.9 }), 'paper');
const cableBlue = tint(new MeshStandardMaterial({ roughness: 0.5, metalness: 0.1 }), 'accent');
const cableViolet = tint(new MeshStandardMaterial({ roughness: 0.5, metalness: 0.1 }), 'accent2');
const screen = tint(new MeshBasicMaterial(), 'screen');
const glass = tint(new MeshStandardMaterial({ transparent: true, opacity: 0.18, roughness: 0.1 }), 'glass');

// ---------------------------------------------------------------------------
// Tiny scene-building helpers
// ---------------------------------------------------------------------------
function addEdges(mesh: Mesh, geometry: BufferGeometry, edge: LineBasicMaterial | null): void {
  if (edge) {
    mesh.add(new LineSegments(new EdgesGeometry(geometry), edge));
  }
}

function box(
  g: Group,
  size: V3,
  pos: V3 = [0, 0, 0],
  mat: Material = metal,
  edge: LineBasicMaterial | null = M.edge,
  rot: V3 = [0, 0, 0],
): Mesh {
  const geometry = new BoxGeometry(size[0], size[1], size[2]);
  const mesh = new Mesh(geometry, mat);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.rotation.set(rot[0], rot[1], rot[2]);
  addEdges(mesh, geometry, edge);
  g.add(mesh);
  return mesh;
}

/** Cylinder; `axis` picks which way its length runs. */
function cyl(
  g: Group,
  r: number,
  h: number,
  pos: V3,
  mat: Material = metal,
  axis: 'x' | 'y' | 'z' = 'y',
  edge: LineBasicMaterial | null = null,
  segments = 28,
): Mesh {
  const geometry = new CylinderGeometry(r, r, h, segments);
  const mesh = new Mesh(geometry, mat);
  mesh.position.set(pos[0], pos[1], pos[2]);
  if (axis === 'x') {
    mesh.rotation.z = Math.PI / 2;
  } else if (axis === 'z') {
    mesh.rotation.x = Math.PI / 2;
  }
  addEdges(mesh, geometry, edge);
  g.add(mesh);
  return mesh;
}

function sphere(g: Group, r: number, pos: V3, mat: Material = metal, edge: LineBasicMaterial | null = null): Mesh {
  const geometry = new SphereGeometry(r, 24, 16);
  const mesh = new Mesh(geometry, mat);
  mesh.position.set(pos[0], pos[1], pos[2]);
  addEdges(mesh, new SphereGeometry(r, 8, 6), edge);
  g.add(mesh);
  return mesh;
}

function torus(g: Group, r: number, tube: number, pos: V3, mat: Material, rot: V3 = [0, 0, 0], arc = Math.PI * 2): Mesh {
  const mesh = new Mesh(new TorusGeometry(r, tube, 8, 48, arc), mat);
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.rotation.set(rot[0], rot[1], rot[2]);
  g.add(mesh);
  return mesh;
}

/** Instanced rows x cols grid of identical boxes in the XZ plane, starting at `origin`. */
function grid(g: Group, size: V3, rows: number, cols: number, origin: V3, dx: number, dz: number, mat: Material): void {
  const mesh = new InstancedMesh(new BoxGeometry(size[0], size[1], size[2]), mat, rows * cols);
  const dummy = new Object3D();
  let n = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      dummy.position.set(origin[0] + c * dx, origin[1], origin[2] + r * dz);
      dummy.updateMatrix();
      mesh.setMatrixAt(n, dummy.matrix);
      n += 1;
    }
  }
  g.add(mesh);
}

/** Spinning fan facing +Z (rotate the holder to aim it elsewhere). */
function fan(g: Group, anim: Anim[], r: number, pos: V3, rot: V3 = [0, 0, 0], blades = 7, speed = 6): void {
  const holder = new Group();
  holder.position.set(pos[0], pos[1], pos[2]);
  holder.rotation.set(rot[0], rot[1], rot[2]);
  holder.add(new Mesh(new TorusGeometry(r, 0.035, 8, 40), M.glow2));
  const spin = new Group();
  holder.add(spin);
  cyl(spin, r * 0.22, 0.1, [0, 0, 0], dark, 'z');
  for (let i = 0; i < blades; i += 1) {
    const arm = new Group();
    arm.rotation.z = (i / blades) * Math.PI * 2;
    const blade = new Mesh(new BoxGeometry(r * 0.72, r * 0.26, 0.025), metal);
    blade.position.x = r * 0.58;
    blade.rotation.x = 0.45;
    arm.add(blade);
    spin.add(arm);
  }
  g.add(holder);
  anim.push((t) => {
    spin.rotation.z = t * speed;
  });
}

/** A row of port openings on a +Z-facing face. */
function ports(g: Group, count: number, x0: number, dx: number, y: number, z: number, size: V3 = [0.14, 0.1, 0.06]): void {
  const mesh = new InstancedMesh(new BoxGeometry(size[0], size[1], size[2]), dark, count);
  const dummy = new Object3D();
  for (let i = 0; i < count; i += 1) {
    dummy.position.set(x0 + i * dx, y, z);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  g.add(mesh);
}

/** Row of status LEDs that blink on staggered phases. */
function leds(g: Group, anim: Anim[], count: number, x0: number, dx: number, y: number, z: number): void {
  const lamps: Mesh[] = [];
  const geometry = new BoxGeometry(0.06, 0.06, 0.03);
  for (let i = 0; i < count; i += 1) {
    const lamp = new Mesh(geometry, i % 2 ? M.glow2 : M.glow);
    lamp.position.set(x0 + i * dx, y, z);
    g.add(lamp);
    lamps.push(lamp);
  }
  anim.push((t) => {
    lamps.forEach((lamp, i) => {
      lamp.visible = Math.sin(t * 3 + i * 1.7) > -0.5;
    });
  });
}

// ---------------------------------------------------------------------------
// The 30 models
// ---------------------------------------------------------------------------
const builders: Record<ProductId, Builder> = {
  // ----- Internal hardware -----
  cpu(g) {
    box(g, [2.6, 0.1, 2.6], [0, 0, 0], dark);
    box(g, [1.8, 0.14, 1.8], [0, 0.12, 0], metal, M.edge2);
    box(g, [0.55, 0.02, 0.55], [0, 0.2, 0], M.glow, null);
    box(g, [0.22, 0.04, 0.22], [-1.15, 0.06, -1.15], M.glow2, null);
    grid(g, [0.07, 0.03, 0.07], 12, 12, [-1.1, -0.08, -1.1], 0.2, 0.2, gold);
  },

  motherboard(g) {
    box(g, [3.8, 0.08, 3.2], [0, 0, 0], dark);
    box(g, [0.9, 0.12, 0.9], [-0.6, 0.1, -0.5], metal, M.edge2);
    box(g, [0.5, 0.02, 0.5], [-0.6, 0.17, -0.5], M.glow, null);
    for (let i = 0; i < 4; i += 1) {
    box(g, [0.14, 0.16, 1.8], [0.5 + i * 0.24, 0.12, -0.3], metal, M.edge);
    }
    box(g, [2.2, 0.1, 0.18], [-0.3, 0.09, 0.95], metal, M.edge);
    box(g, [1.2, 0.1, 0.18], [-0.3, 0.09, 1.3], metal, M.edge);
    box(g, [0.5, 0.22, 1.1], [-1.5, 0.15, -0.4], metal, M.edge2);
    box(g, [0.7, 0.14, 0.7], [1.15, 0.11, 1.0], metal, M.edge2);
    box(g, [0.4, 0.5, 1.6], [-1.85, 0.3, 0.5], steel, M.edge);
    grid(g, [0.1, 0.06, 0.1], 2, 8, [0.6, 0.07, 1.25], 0.16, 0.2, M.glow);
  },

  ram(g) {
    box(g, [3.6, 0.85, 0.08], [0, 0, 0], dark);
    box(g, [3.4, 0.62, 0.1], [0, 0.06, 0.1], metal, M.edge2);
    box(g, [3.4, 0.62, 0.1], [0, 0.06, -0.1], metal, M.edge2);
    box(g, [3.5, 0.1, 0.1], [0, -0.45, 0], gold, null);
    box(g, [3.4, 0.07, 0.16], [0, 0.4, 0.1], steel, M.edge);
    box(g, [1.6, 0.06, 0.04], [0, 0.06, 0.16], M.glow, null);
    box(g, [0.1, 0.85, 0.12], [1.8, 0, 0], steel, M.edge);
    box(g, [0.1, 0.85, 0.12], [-1.8, 0, 0], steel, M.edge);
  },

  gpu(g, anim) {
    box(g, [3.8, 0.22, 1.6], [0, 0, 0], dark, M.edge2);
    box(g, [3.8, 0.04, 1.62], [0, 0.13, 0], metal, M.edge);
    fan(g, anim, 0.5, [-1.1, 0.17, 0.0], [-Math.PI / 2, 0, 0], 9, 7);
    fan(g, anim, 0.5, [0.0, 0.17, 0.0], [-Math.PI / 2, 0, 0], 9, 7);
    fan(g, anim, 0.5, [1.1, 0.17, 0.0], [-Math.PI / 2, 0, 0], 9, 7);
    box(g, [0.06, 0.9, 1.6], [-1.92, -0.35, 0], steel, M.edge);
    box(g, [2.2, 0.08, 0.1], [-0.4, -0.15, -0.75], gold, null);
    box(g, [3.0, 0.04, 0.05], [0.1, 0.17, -0.7], M.glow, null);
    box(g, [0.3, 0.16, 0.22], [1.95, 0.0, -0.4], dark, M.edge);
  },

  ssd(g) {
    box(g, [3.2, 0.06, 0.85], [0, 0, 0], dark);
    box(g, [0.5, 0.08, 0.6], [-1.15, 0.07, 0], metal, M.edge2);
    box(g, [0.55, 0.06, 0.6], [-0.4, 0.06, 0], dark, M.edge);
    box(g, [0.55, 0.06, 0.6], [0.35, 0.06, 0], dark, M.edge);
    box(g, [0.55, 0.06, 0.6], [1.1, 0.06, 0], dark, M.edge);
    box(g, [0.35, 0.08, 0.7], [-1.7, 0, 0], gold, null);
    cyl(g, 0.11, 0.1, [1.5, 0, 0], steel, 'y');
    box(g, [0.4, 0.04, 0.06], [-1.15, 0.12, 0.3], M.glow, null);
  },

  hdd(g, anim) {
    box(g, [3, 0.65, 2.1], [0, 0, 0], dark, M.edge);
    box(g, [2.8, 0.04, 1.9], [0, 0.34, 0], glass, M.edge2);
    const platters = new Group();
    platters.position.set(-0.25, 0.1, 0);
    cyl(platters, 0.8, 0.04, [0, 0, 0], steel, 'y', null, 40);
    cyl(platters, 0.8, 0.04, [0, 0.14, 0], steel, 'y', null, 40);
    cyl(platters, 0.14, 0.3, [0, 0.07, 0], metal, 'y');
    g.add(platters);
    const arm = new Group();
    arm.position.set(0.95, 0.15, 0.7);
    box(arm, [1.1, 0.03, 0.12], [-0.5, 0, 0], metal, M.edge2);
    g.add(arm);
    box(g, [0.5, 0.1, 0.18], [1.4, -0.25, -1.1], gold, null);
    anim.push((t) => {
      platters.rotation.y = t * 5;
      arm.rotation.y = Math.sin(t * 1.2) * 0.35;
    });
  },

  psu(g, anim) {
    box(g, [2.8, 1.5, 1.7], [0, 0, 0], dark, M.edge);
    box(g, [2.82, 0.04, 1.72], [0, 0.76, 0], metal, M.edge2);
    fan(g, anim, 0.55, [0.2, 0, 0.87], [0, 0, 0], 9, 6);
    for (let i = 0; i < 5; i += 1) {
      cyl(g, 0.07, 1.4, [-1.2 + i * 0.12, -0.3, -1.45], i % 2 ? cableBlue : cableViolet, 'z');
    }
    box(g, [0.4, 0.24, 0.1], [-1.1, 0.35, 0.86], dark, M.edge);
    box(g, [0.18, 0.04, 0.04], [-1.1, 0.35, 0.92], M.glow, null);
  },

  cooler(g, anim) {
    box(g, [1.6, 0.18, 1.6], [0, -1.15, 0], metal, M.edge2);
    for (let i = 0; i < 4; i += 1) {
      cyl(g, 0.06, 2.2, [-0.45 + i * 0.3, -0.05, 0], gold, 'y');
    }
    for (let i = 0; i < 16; i += 1) {
      box(g, [1.7, 0.05, 1.1], [0, -0.85 + i * 0.12, 0], metal, M.edge);
    }
    fan(g, anim, 0.7, [0, 0.1, 0.62], [0, 0, 0], 9, 8);
    box(g, [1.8, 1.9, 0.08], [0, 0.1, 0.55], dark, M.edge);
  },

  chassis(g, anim) {
    box(g, [2.2, 3.8, 3.4], [0, 0, 0], glass, M.edge);
    box(g, [2.0, 0.08, 3.0], [0, -1.6, 0], dark, M.edge2);
    box(g, [0.08, 3.4, 2.8], [-0.7, 0.1, -0.1], dark, M.edge);
    box(g, [1.2, 1.0, 0.1], [0.1, -0.3, -0.3], metal, M.edge2);
    box(g, [1.3, 0.5, 0.6], [0.0, -1.3, -0.3], dark, M.edge);
    fan(g, anim, 0.55, [0.2, 0.9, 1.72], [0, 0, 0], 9, 5);
    fan(g, anim, 0.55, [0.2, -0.3, 1.72], [0, 0, 0], 9, 5);
    box(g, [1.9, 3.5, 0.06], [0, 0, 1.7], dark, M.edge2);
  },

  'audio-interface'(g, anim) {
    box(g, [3.2, 0.55, 1.7], [0, 0, 0], dark, M.edge);
    box(g, [3.2, 0.04, 1.72], [0, 0.28, 0], metal, M.edge2);
    const knobs: Mesh[] = [];
    for (let i = 0; i < 3; i += 1) {
      knobs.push(cyl(g, 0.22, 0.2, [-1.0 + i * 0.7, 0.4, 0.2], metal, 'y', M.edge));
      box(g, [0.04, 0.02, 0.2], [-1.0 + i * 0.7, 0.51, 0.1], M.glow, null);
    }
    cyl(g, 0.3, 0.12, [1.1, 0.0, 0.88], dark, 'z', M.edge2);
    cyl(g, 0.3, 0.12, [0.3, 0.0, 0.88], dark, 'z', M.edge2);
    leds(g, anim, 5, 0.4, 0.28, 0.2, 0.86);
    anim.push((t) => {
      knobs.forEach((k, i) => {
        k.rotation.y = Math.sin(t * 0.8 + i) * 0.6;
      });
    });
  },

  // ----- External peripherals -----
  keyboard(g) {
    box(g, [4.4, 0.2, 1.7], [0, 0, 0], dark, M.edge2);
    const keys = new InstancedMesh(new BoxGeometry(0.28, 0.12, 0.28), metal, 5 * 14);
    const dummy = new Object3D();
    let n = 0;
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 13; c += 1) {
        dummy.position.set(-1.92 + c * 0.32, 0.15, -0.62 + r * 0.34);
        dummy.updateMatrix();
        keys.setMatrixAt(n, dummy.matrix);
        n += 1;
      }
    }
    keys.count = n;
    g.add(keys);
    box(g, [2.2, 0.12, 0.28], [0, 0.15, 0.74], metal, M.edge);
    box(g, [0.3, 0.12, 0.28], [1.9, 0.15, 0.74], M.glow2, null);
  },

  mouse(g, anim) {
    const body = sphere(g, 0.9, [0, 0, 0], metal, M.edge);
    body.scale.set(0.75, 0.45, 1.25);
    box(g, [0.04, 0.02, 0.9], [0, 0.4, -0.55], dark, null);
    cyl(g, 0.12, 0.2, [0, 0.38, -0.5], M.glow, 'x');
    box(g, [0.5, 0.02, 0.06], [0, 0.0, 0.0], M.glow2, null).position.y = -0.38;
    anim.push((t) => {
      body.position.y = Math.sin(t * 1.5) * 0.04;
    });
  },

  monitor(g) {
    box(g, [3.8, 2.2, 0.12], [0, 0.6, 0], dark, M.edge2);
    box(g, [3.6, 2.0, 0.03], [0, 0.6, 0.075], screen, null);
    box(g, [1.4, 0.05, 0.04], [-0.9, 1.25, 0.1], M.glow, null);
    box(g, [2.0, 0.05, 0.04], [-0.5, 0.95, 0.1], M.glow2, null);
    box(g, [1.0, 0.7, 0.04], [0.6, 0.45, 0.1], M.glow, null);
    box(g, [0.3, 1.1, 0.2], [0, -0.55, -0.1], metal, M.edge);
    cyl(g, 0.8, 0.1, [0, -1.15, -0.1], metal, 'y', M.edge2);
  },

  webcam(g, anim) {
    cyl(g, 0.7, 0.8, [0, 0.4, 0], dark, 'z', M.edge2);
    cyl(g, 0.42, 0.1, [0, 0.4, 0.42], dark, 'z');
    const lens = sphere(g, 0.3, [0, 0.4, 0.45], glass);
    lens.scale.z = 0.5;
    torus(g, 0.5, 0.04, [0, 0.4, 0.4], M.glow);
    box(g, [1.5, 0.22, 0.9], [0, -0.55, -0.1], metal, M.edge);
    box(g, [0.2, 0.8, 0.2], [0, -0.1, -0.1], metal, M.edge);
    box(g, [0.08, 0.08, 0.04], [0.5, 0.9, 0.4], M.glow2, null);
    anim.push((t) => {
      const pulse = 1 + Math.sin(t * 2) * 0.05;
      lens.scale.set(pulse, pulse, 0.5);
    });
  },

  microphone(g, anim) {
    const capsule = sphere(g, 0.55, [0, 1.0, 0], steel, M.edge);
    capsule.scale.y = 1.3;
    torus(g, 0.7, 0.05, [0, 1.0, 0], M.glow2, [Math.PI / 2, 0, 0]);
    cyl(g, 0.28, 1.4, [0, 0.0, 0], dark, 'y', M.edge2);
    cyl(g, 0.9, 0.1, [0, -0.85, 0], metal, 'y', M.edge);
    cyl(g, 0.1, 0.3, [0, -0.7, 0], metal, 'y');
    box(g, [0.3, 0.05, 0.04], [0, 0.3, 0.29], M.glow, null);
    anim.push((t) => {
      capsule.rotation.y = t * 0.8;
    });
  },

  printer(g, anim) {
    box(g, [3.4, 1.1, 2.4], [0, 0, 0], dark, M.edge2);
    box(g, [3.4, 0.2, 2.4], [0, 0.65, -0.1], metal, M.edge);
    box(g, [2.6, 0.06, 1.5], [0, -0.25, 1.45], metal, M.edge);
    box(g, [2.3, 0.02, 1.2], [0, -0.2, 1.55], paper, null);
    const sheet = box(g, [2.2, 0.02, 1.0], [0, 0.2, 1.3], paper, null);
    box(g, [2.4, 0.08, 0.08], [0, 0.1, 1.2], M.glow, null);
    box(g, [0.8, 0.3, 0.06], [1.0, 0.45, 1.22], screen, null);
    leds(g, anim, 3, 0.6, 0.18, 0.2, 1.22);
    anim.push((t) => {
      sheet.position.z = 1.0 + ((t * 0.5) % 1) * 0.5;
    });
  },

  'external-drive'(g, anim) {
    box(g, [2.4, 0.4, 1.5], [0, 0, 0], dark, M.edge2);
    box(g, [2.3, 0.04, 1.4], [0, 0.22, 0], metal, M.edge);
    box(g, [0.5, 0.22, 0.04], [0.5, 0.2, 0.0], M.glow, null);
    box(g, [0.36, 0.14, 0.2], [1.3, -0.02, 0.2], steel, M.edge);
    const lamp = box(g, [0.1, 0.1, 0.04], [-0.9, 0.0, 0.76], M.glow2, null);
    anim.push((t) => {
      lamp.visible = Math.sin(t * 6) > -0.3;
    });
  },

  ups(g, anim) {
    box(g, [2.0, 3.0, 2.6], [0, 0, 0], dark, M.edge);
    box(g, [2.0, 0.06, 2.62], [0, 1.5, 0], metal, M.edge2);
    box(g, [1.3, 0.6, 0.06], [0, 0.9, 1.33], screen, null);
    const bars: Mesh[] = [];
    for (let i = 0; i < 5; i += 1) {
      bars.push(box(g, [0.18, 0.3, 0.04], [-0.45 + i * 0.22, 0.9, 1.37], i % 2 ? M.glow2 : M.glow, null));
    }
    ports(g, 4, -0.6, 0.4, -0.2, 1.33, [0.26, 0.26, 0.06]);
    ports(g, 4, -0.6, 0.4, -0.7, 1.33, [0.26, 0.26, 0.06]);
    cyl(g, 0.12, 0.1, [0.75, 0.3, 1.33], M.glow2, 'z');
    anim.push((t) => {
      bars.forEach((b, i) => {
        b.scale.y = 0.6 + 0.4 * Math.abs(Math.sin(t * 1.4 + i * 0.6));
      });
    });
  },

  // ----- Active networking -----
  nic(g) {
    box(g, [3.0, 0.06, 1.2], [0, 0, 0], dark);
    box(g, [0.06, 1.5, 0.5], [-1.5, 0.3, -0.35], steel, M.edge);
    box(g, [0.6, 0.35, 0.5], [-1.2, 0.2, -0.2], steel, M.edge2);
    box(g, [0.6, 0.35, 0.5], [-1.2, 0.2, 0.35], steel, M.edge2);
    box(g, [0.7, 0.1, 0.7], [-0.3, 0.08, 0.1], metal, M.edge);
    box(g, [0.5, 0.12, 0.5], [0.6, 0.09, 0.1], dark, M.edge2);
    box(g, [2.0, 0.08, 0.12], [0.3, -0.05, -0.5], gold, null);
    box(g, [0.12, 0.04, 0.04], [-1.2, 0.4, -0.35], M.glow, null);
  },

  'network-switch'(g, anim) {
    box(g, [4.0, 0.42, 1.8], [0, 0, 0], dark, M.edge);
    box(g, [4.0, 0.04, 1.82], [0, 0.22, 0], metal, M.edge2);
    grid(g, [0.9, 0.02, 0.07], 5, 4, [-1.35, 0.25, -0.7], 0.9, 0.34, dark);
    box(g, [0.8, 0.02, 0.3], [1.4, 0.25, 0.5], M.glow, null);
    ports(g, 12, -1.65, 0.28, 0.07, 0.91, [0.2, 0.14, 0.06]);
    ports(g, 12, -1.65, 0.28, -0.1, 0.91, [0.2, 0.14, 0.06]);
    leds(g, anim, 12, -1.65, 0.28, 0.17, 0.91);
    box(g, [0.5, 0.2, 0.06], [1.75, 0.0, 0.91], metal, M.edge2);
    box(g, [0.18, 0.4, 0.2], [-2.05, 0, 0.3], steel, M.edge);
    box(g, [0.18, 0.4, 0.2], [2.05, 0, 0.3], steel, M.edge);
  },

  router(g, anim) {
    box(g, [2.6, 0.45, 1.7], [0, 0, 0], dark, M.edge2);
    for (let i = 0; i < 4; i += 1) {
      const ant = cyl(g, 0.06, 1.7, [-1.1 + i * 0.73, 1.0, -0.7], metal, 'y', M.edge);
      ant.rotation.z = (i - 1.5) * 0.12;
      cyl(g, 0.12, 0.2, [-1.1 + i * 0.73, 0.2, -0.7], dark, 'y');
    }
    ports(g, 5, -0.9, 0.42, 0.0, 0.86, [0.28, 0.16, 0.06]);
    leds(g, anim, 6, -1.0, 0.3, 0.17, 0.86);
    box(g, [0.3, 0.2, 0.06], [1.15, 0.0, 0.86], M.glow2, null);
  },

  'wireless-ap'(g, anim) {
    cyl(g, 1.3, 0.3, [0, 0, 0], dark, 'y', M.edge2, 48);
    cyl(g, 1.0, 0.04, [0, 0.17, 0], metal, 'y', M.edge, 48);
    torus(g, 1.15, 0.04, [0, 0.16, 0], M.glow, [Math.PI / 2, 0, 0]);
    sphere(g, 0.12, [0, 0.22, 0], M.glow2);
    const waves = [0, 1, 2].map((i) => torus(g, 0.5 + i * 0.4, 0.025, [0, 0.5 + i * 0.35, 0], M.glow, [Math.PI / 2, 0, 0]));
    anim.push((t) => {
      waves.forEach((w, i) => {
        const k = (t * 0.7 + i / 3) % 1;
        w.position.y = 0.4 + k * 1.6;
        w.scale.setScalar(0.5 + k * 1.2);
        w.visible = k < 0.95;
      });
    });
  },

  firewall(g, anim) {
    box(g, [3.6, 0.45, 1.8], [0, 0, 0], dark, M.edge);
    box(g, [3.6, 0.04, 1.82], [0, 0.23, 0], metal, M.edge2);
    grid(g, [0.9, 0.02, 0.07], 5, 4, [-1.3, 0.26, -0.7], 0.85, 0.34, dark);
    ports(g, 8, -1.5, 0.3, -0.05, 0.91, [0.22, 0.16, 0.06]);
    const shield = box(g, [0.55, 0.55, 0.06], [1.3, 0.0, 0.93], M.glow2, null, [0, 0, Math.PI / 4]);
    box(g, [0.5, 0.02, 0.06], [-1.4, 0.15, 0.93], M.glow, null);
    leds(g, anim, 4, 0.2, 0.2, 0.15, 0.91);
    anim.push((t) => {
      shield.scale.setScalar(1 + Math.sin(t * 2.5) * 0.08);
    });
  },

  'modem-ont'(g, anim) {
    box(g, [2.0, 0.55, 1.5], [0, 0, 0], dark, M.edge2);
    box(g, [2.0, 0.04, 1.52], [0, 0.29, 0], metal, M.edge);
    grid(g, [0.7, 0.02, 0.07], 4, 2, [-0.5, 0.32, -0.5], 1.0, 0.3, dark);
    cyl(g, 0.16, 0.22, [-0.6, 0.0, 0.8], steel, 'z', M.edge);
    cyl(g, 0.1, 0.12, [-0.6, 0.0, 0.92], M.glow, 'z');
    box(g, [0.5, 0.2, 0.06], [0.4, 0.0, 0.76], metal, M.edge2);
    leds(g, anim, 5, 0.1, 0.22, 0.2, 0.76);
    const fiber = torus(g, 0.8, 0.04, [-0.6, -0.1, 1.3], M.glow, [Math.PI / 2, 0, 0], Math.PI * 1.3);
    fiber.rotation.z = 2.2;
  },

  nas(g, anim) {
    box(g, [2.2, 2.4, 2.0], [0, 0, 0], dark, M.edge);
    for (let i = 0; i < 4; i += 1) {
      box(g, [1.7, 0.4, 0.06], [0, 0.78 - i * 0.52, 1.02], metal, M.edge2);
      box(g, [0.5, 0.03, 0.04], [-0.4, 0.88 - i * 0.52, 1.07], dark, null);
      box(g, [0.1, 0.1, 0.04], [0.65, 0.78 - i * 0.52, 1.07], i % 2 ? M.glow2 : M.glow, null);
    }
    leds(g, anim, 4, -0.9, 0.18, -1.1, 1.02);
    box(g, [2.22, 0.06, 2.02], [0, 1.2, 0], metal, M.edge2);
    grid(g, [1.4, 0.02, 0.07], 8, 1, [0, 1.24, -0.8], 0, 0.22, dark);
    box(g, [0.5, 0.02, 0.4], [0.7, 1.24, 0.6], M.glow2, null);
  },

  // ----- Passive infrastructure -----
  'ethernet-cable'(g) {
    for (let i = 0; i < 4; i += 1) {
      torus(g, 1.15, 0.07, [0, -0.3 + i * 0.18, 0], i % 2 ? cableViolet : cableBlue, [Math.PI / 2, 0, 0]);
    }
    box(g, [0.55, 0.45, 0.7], [1.3, 0.1, 1.1], dark, M.edge2, [0, 0.8, 0]);
    box(g, [0.5, 0.07, 0.6], [1.3, 0.34, 1.1], gold, null, [0, 0.8, 0]);
    box(g, [0.55, 0.45, 0.7], [-1.3, 0.1, 1.1], dark, M.edge2, [0, -0.8, 0]);
    box(g, [0.5, 0.07, 0.6], [-1.3, 0.34, 1.1], gold, null, [0, -0.8, 0]);
    cyl(g, 0.07, 1.0, [1.0, 0.1, 0.6], cableBlue, 'z', null, 12).rotation.y = 0.8;
  },

  'fiber-cable'(g, anim) {
    for (let i = 0; i < 3; i += 1) {
      torus(g, 1.2, 0.05, [0, -0.2 + i * 0.16, 0], M.glow, [Math.PI / 2, 0, 0]);
    }
    const pulses: Mesh[] = [];
    for (let i = 0; i < 5; i += 1) {
      pulses.push(sphere(g, 0.1, [0, 0, 0], M.glow2));
    }
    box(g, [0.5, 0.35, 0.5], [1.3, 0.0, 1.1], dark, M.edge2);
    box(g, [0.18, 0.18, 0.4], [1.15, 0.0, 1.45], steel, M.edge);
    box(g, [0.18, 0.18, 0.4], [1.45, 0.0, 1.45], steel, M.edge);
    box(g, [0.5, 0.35, 0.5], [-1.3, 0.0, 1.1], dark, M.edge2);
    box(g, [0.18, 0.18, 0.4], [-1.15, 0.0, 1.45], steel, M.edge);
    box(g, [0.18, 0.18, 0.4], [-1.45, 0.0, 1.45], steel, M.edge);
    anim.push((t) => {
      pulses.forEach((p, i) => {
        const a = t * 1.6 + (i / pulses.length) * Math.PI * 2;
        p.position.set(Math.cos(a) * 1.2, 0.05, Math.sin(a) * 1.2);
      });
    });
  },

  'patch-panel'(g) {
    box(g, [4.2, 0.5, 0.18], [0, 0, 0], metal, M.edge);
    ports(g, 12, -1.65, 0.3, 0.1, 0.1, [0.22, 0.2, 0.06]);
    ports(g, 12, -1.65, 0.3, -0.12, 0.1, [0.22, 0.2, 0.06]);
    box(g, [0.2, 0.5, 0.3], [-2.2, 0, 0.0], steel, M.edge2);
    box(g, [0.2, 0.5, 0.3], [2.2, 0, 0.0], steel, M.edge2);
    for (let i = 0; i < 8; i += 1) {
      cyl(g, 0.05, 1.3, [-1.5 + i * 0.43, 0.0, 0.8], i % 2 ? cableBlue : cableViolet, 'z', null, 10);
    }
    box(g, [3.8, 0.04, 0.04], [0, 0.18, 0.12], M.glow, null);
  },

  'optical-transceiver'(g, anim) {
    box(g, [1.0, 0.45, 2.6], [0, 0, 0], steel, M.edge);
    box(g, [1.02, 0.1, 1.0], [0, 0.0, -0.8], dark, M.edge2);
    cyl(g, 0.17, 0.5, [-0.2, 0.0, 1.35], dark, 'z', M.edge2);
    cyl(g, 0.17, 0.5, [0.2, 0.0, 1.35], dark, 'z', M.edge2);
    cyl(g, 0.07, 0.2, [-0.2, 0.0, 1.58], M.glow, 'z');
    cyl(g, 0.07, 0.2, [0.2, 0.0, 1.58], M.glow2, 'z');
    box(g, [0.9, 0.06, 0.5], [0, 0.28, 1.5], M.glow, null);
    box(g, [0.9, 0.06, 0.5], [0, -0.28, -1.0], gold, null);
    const tab = box(g, [0.5, 0.05, 0.4], [0, 0.0, 1.75], M.glow2, null);
    anim.push((t) => {
      tab.visible = Math.sin(t * 3) > -0.4;
    });
  },

  'server-rack'(g, anim) {
    for (const [x, z] of [[-1.3, -1.1], [1.3, -1.1], [-1.3, 1.1], [1.3, 1.1]] as const) {
      box(g, [0.14, 4.4, 0.14], [x, 0, z], steel, M.edge);
    }
    box(g, [2.7, 0.1, 2.5], [0, 2.2, 0], metal, M.edge2);
    box(g, [2.7, 0.1, 2.5], [0, -2.2, 0], metal, M.edge2);
    for (let i = 0; i < 6; i += 1) {
      box(g, [2.4, 0.42, 2.0], [0, -1.7 + i * 0.62, 0], i % 2 ? metal : dark, i % 2 ? M.edge : M.edge2);
      leds(g, anim, 3, -1.0, 0.16, -1.7 + i * 0.62, 1.02);
    }
    box(g, [0.18, 4.0, 0.22], [1.75, 0, 0.9], dark, M.edge2);
    for (let i = 0; i < 8; i += 1) {
      box(g, [0.12, 0.14, 0.06], [1.75, -1.6 + i * 0.46, 1.03], M.glow, null);
    }
  },
};

/** Devices with their detail on the front face are viewed more head-on than flat boards. */
const TILT: Partial<Record<ProductId, number>> = {
  'network-switch': 0.4,
  firewall: 0.4,
  router: 0.45,
  'modem-ont': 0.45,
  'optical-transceiver': 0.5,
  'patch-panel': 0.3,
  nas: 0.3,
  printer: 0.4,
  psu: 0.4,
};

/**
 * Builds a product model, centred and scaled to a common size so every product frames the same
 * in the viewer. Rotation/scale of the returned group are controlled by the viewer.
 */
export function buildProductModel(id: ProductId): ModelInstance {
  const content = new Group();
  const anim: Anim[] = [];
  builders[id](content, anim);

  const bounds = new Box3().setFromObject(content);
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  const holder = new Group();
  content.position.sub(center);
  holder.add(content);
  holder.scale.setScalar(3.7 / Math.max(size.x, size.y, size.z, 0.001));
  // Flat products (boards, cards, switches) are tilted further toward the camera so they never read edge-on.
  const flatness = size.y / Math.max(size.x, size.z, 0.001);

  const group = new Group();
  group.add(holder);
  // Tilt lives on the outer group (Euler XYZ), so it stays fixed relative to the camera while the
  // viewer spins the model about Y.
  group.rotation.x = TILT[id] ?? (flatness < 0.2 ? 0.95 : flatness < 0.45 ? 0.7 : 0.35);
  return {
    group,
    update(seconds) {
      anim.forEach((fn) => {
        fn(seconds);
      });
    },
  };
}
