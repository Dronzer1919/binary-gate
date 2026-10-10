import {
  BoxGeometry,
  BufferGeometry,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import type { Material } from 'three';
import { tint } from './palette';

export type ModelName = 'hardware' | 'network' | 'peripherals' | 'software';

export interface ModelInstance {
  readonly group: Group;
  update(seconds: number): void;
}

const metalMaterial = tint(new MeshStandardMaterial({ metalness: 0.55, roughness: 0.38 }), 'metal');
const darkMaterial = tint(new MeshStandardMaterial({ metalness: 0.4, roughness: 0.55 }), 'dark');
const edgeMaterial = tint(new LineBasicMaterial({ transparent: true, opacity: 0.85 }), 'accent');
const edgeMaterial2 = tint(new LineBasicMaterial({ transparent: true, opacity: 0.85 }), 'accent2');
const glowMaterial = tint(new MeshBasicMaterial(), 'accent');
const glowMaterial2 = tint(new MeshBasicMaterial(), 'accent2');

/** Shared materials so every model (home + catalogue) looks like one family. */
export const MATERIALS = {
  metal: metalMaterial,
  dark: darkMaterial,
  edge: edgeMaterial,
  edge2: edgeMaterial2,
  glow: glowMaterial,
  glow2: glowMaterial2,
} as const;

function edged(
  geometry: BufferGeometry,
  material: Material = metalMaterial,
  edge: LineBasicMaterial = edgeMaterial,
): Mesh {
  const mesh = new Mesh(geometry, material);
  mesh.add(new LineSegments(new EdgesGeometry(geometry), edge));
  return mesh;
}

/** Deterministic pseudo-random so the models look identical on every visit. */
function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Stacked server rack used by the hero. */
export function createRack(): Group {
  const group = new Group();
  const geometry = new BoxGeometry(3.2, 0.42, 2.2);
  const ledGeometry = new BoxGeometry(0.09, 0.09, 0.02);
  const slotGeometry = new BoxGeometry(0.5, 0.05, 0.02);

  for (let i = 0; i < 4; i += 1) {
    const even = i % 2 === 0;
    const unit = edged(geometry, even ? metalMaterial : darkMaterial, even ? edgeMaterial : edgeMaterial2);
    unit.position.y = i * 0.56 - 0.84;
    for (let l = 0; l < 4; l += 1) {
      const led = new Mesh(ledGeometry, (l + i) % 2 === 0 ? glowMaterial : glowMaterial2);
      led.position.set(-1.25 + l * 0.2, 0, 1.11);
      unit.add(led);
    }
    for (let v = 0; v < 6; v += 1) {
      const slot = new Mesh(slotGeometry, darkMaterial);
      slot.position.set(v * 0.18, 0.08 - (v % 2) * 0.16, 1.11);
      unit.add(slot);
    }
    group.add(unit);
  }
  return group;
}

interface Packet {
  readonly mesh: Mesh;
  readonly radius: number;
  readonly offset: number;
  readonly speed: number;
}

/** Orbiting data rings with packets, used by the hero. */
export function createOrbits(): ModelInstance {
  const group = new Group();
  const packets: Packet[] = [];
  const rings = [
    { radius: 2.9, tilt: [1.25, 0, 0.2], material: glowMaterial, speed: 0.5, count: 10 },
    { radius: 3.4, tilt: [1.0, 0.4, -0.5], material: glowMaterial2, speed: -0.35, count: 12 },
  ] as const;
  const packetGeometry = new BoxGeometry(0.13, 0.13, 0.13);

  rings.forEach((ring) => {
    const holder = new Group();
    holder.rotation.set(ring.tilt[0], ring.tilt[1], ring.tilt[2]);
    holder.add(new Mesh(new TorusGeometry(ring.radius, 0.008, 6, 160), ring.material));
    for (let i = 0; i < ring.count; i += 1) {
      const mesh = new Mesh(packetGeometry, ring.material);
      holder.add(mesh);
      packets.push({ mesh, radius: ring.radius, offset: (i / ring.count) * Math.PI * 2, speed: ring.speed });
    }
    group.add(holder);
  });

  return {
    group,
    update(t) {
      packets.forEach(({ mesh, radius, offset, speed }) => {
        const a = offset + t * speed;
        mesh.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
        mesh.rotation.set(t, t * 0.7, 0);
      });
    },
  };
}

const builders: Record<ModelName, () => ModelInstance> = {
  hardware() {
    const group = new Group();
    const random = rng(7);
    group.add(edged(new BoxGeometry(3.4, 0.16, 3.4), darkMaterial));

    const die = edged(new BoxGeometry(1.5, 0.16, 1.5), metalMaterial, edgeMaterial2);
    die.position.y = 0.16;
    group.add(die);
    const core = new Mesh(new BoxGeometry(0.7, 0.05, 0.7), glowMaterial);
    core.position.y = 0.27;
    group.add(core);

    const pins = new InstancedMesh(new BoxGeometry(0.08, 0.04, 0.22), glowMaterial2, 4 * 14);
    const dummy = new Object3D();
    let n = 0;
    for (let side = 0; side < 4; side += 1) {
      for (let i = 0; i < 14; i += 1) {
        const p = -1.5 + (i / 13) * 3;
        const horizontal = side % 2 === 0;
        const edge = side === 1 || side === 0 ? 1.8 : -1.8;
        dummy.position.set(horizontal ? p : edge, 0.09, horizontal ? edge : p);
        dummy.rotation.y = horizontal ? 0 : Math.PI / 2;
        dummy.updateMatrix();
        pins.setMatrixAt(n, dummy.matrix);
        n += 1;
      }
    }
    group.add(pins);

    const points: number[] = [];
    for (let i = 0; i < 26; i += 1) {
      const x = (random() - 0.5) * 3;
      const z = (random() - 0.5) * 3;
      const horizontal = random() > 0.5;
      const len = 0.3 + random() * 0.5;
      points.push(x, 0.09, z, horizontal ? x + len : x, 0.09, horizontal ? z : z + len);
    }
    const traces = new BufferGeometry();
    traces.setAttribute('position', new Float32BufferAttribute(points, 3));
    group.add(new LineSegments(traces, edgeMaterial));

    group.rotation.x = 0.5;
    return {
      group,
      update: (t) => {
        core.scale.setScalar(1 + Math.sin(t * 2.4) * 0.12);
      },
    };
  },

  network() {
    const group = new Group();
    group.add(edged(new BoxGeometry(1.4, 0.5, 0.9), metalMaterial, edgeMaterial));

    const nodes: Vector3[] = [];
    const lines: number[] = [];
    const nodeGeometry = new SphereGeometry(0.22, 20, 14);
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      const pos = new Vector3(Math.cos(a) * 2.1, i % 2 === 0 ? 0.7 : -0.7, Math.sin(a) * 2.1);
      const node = new Mesh(nodeGeometry, i % 2 === 0 ? glowMaterial : glowMaterial2);
      node.position.copy(pos);
      group.add(node);
      nodes.push(pos);
      lines.push(0, 0, 0, pos.x, pos.y, pos.z);
    }
    const lineGeometry = new BufferGeometry();
    lineGeometry.setAttribute('position', new Float32BufferAttribute(lines, 3));
    group.add(new LineSegments(lineGeometry, edgeMaterial));

    const pulseGeometry = new SphereGeometry(0.07, 10, 8);
    const pulses = nodes.map((pos, i) => {
      const pulse = new Mesh(pulseGeometry, glowMaterial);
      group.add(pulse);
      return { pulse, pos, offset: i / 6 };
    });

    group.rotation.x = 0.35;
    return {
      group,
      update(t) {
        pulses.forEach(({ pulse, pos, offset }) => {
          pulse.position.copy(pos).multiplyScalar((t * 0.45 + offset) % 1);
        });
      },
    };
  },

  peripherals() {
    const group = new Group();
    group.add(edged(new BoxGeometry(4.4, 0.18, 1.7), darkMaterial));

    const rows = 4;
    const cols = 13;
    const keys = new InstancedMesh(new BoxGeometry(0.28, 0.12, 0.28), metalMaterial, rows * cols);
    const dummy = new Object3D();
    let n = 0;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        dummy.position.set(-1.92 + c * 0.32, 0.15, -0.55 + r * 0.36);
        dummy.updateMatrix();
        keys.setMatrixAt(n, dummy.matrix);
        n += 1;
      }
    }
    group.add(keys);
    const space = edged(new BoxGeometry(2.2, 0.12, 0.28), metalMaterial, edgeMaterial2);
    space.position.set(0, 0.15, 0.88);
    group.add(space);

    const mouse = new Mesh(new SphereGeometry(0.42, 24, 16), metalMaterial);
    mouse.scale.set(0.8, 0.5, 1.2);
    mouse.position.set(3.1, 0.15, 0);
    mouse.add(new LineSegments(new EdgesGeometry(new SphereGeometry(0.42, 8, 6)), edgeMaterial2));
    group.add(mouse);

    group.rotation.x = 0.6;
    group.position.x = -0.5;
    return {
      group,
      update: (t) => {
        mouse.position.z = Math.sin(t * 1.2) * 0.25;
      },
    };
  },

  software() {
    const group = new Group();
    for (let i = 0; i < 3; i += 1) {
      const layer = new Mesh(
        new BoxGeometry(3.2, 0.08, 3.2),
        tint(
          new MeshStandardMaterial({
            transparent: true,
            opacity: 0.45 + i * 0.15,
            metalness: 0.3,
            roughness: 0.5,
          }),
          'metal',
        ),
      );
      layer.add(new LineSegments(new EdgesGeometry(layer.geometry), i % 2 ? edgeMaterial2 : edgeMaterial));
      layer.position.y = i * 0.75 - 0.75;
      group.add(layer);
    }
    const cubeGeometry = new BoxGeometry(0.34, 0.34, 0.34);
    const cubes = Array.from({ length: 6 }, (_, i) => {
      const cube = edged(cubeGeometry, darkMaterial, i % 2 ? edgeMaterial2 : edgeMaterial);
      group.add(cube);
      return { cube, angle: (i / 6) * Math.PI * 2, y: (i % 3) * 0.75 - 0.4 };
    });
    group.rotation.x = 0.4;
    return {
      group,
      update(t) {
        cubes.forEach(({ cube, angle, y }) => {
          const a = angle + t * 0.5;
          cube.position.set(Math.cos(a) * 1.1, y + Math.sin(t * 2 + angle) * 0.08, Math.sin(a) * 1.1);
          cube.rotation.set(t, t * 0.6, 0);
        });
      },
    };
  },
};

export const buildModel = (name: ModelName): ModelInstance => builders[name]();
