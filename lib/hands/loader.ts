// Browser loader for the prepared hands: URDF (kinematics, colours) + one GLB
// per hand holding every visual part as a named node ("meshes.glb#pN").

import {
  BufferGeometry,
  Color,
  Material,
  Mesh,
  MeshPhongMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import URDFLoader, { type URDFRobot } from "urdf-loader";
import type { HandInfo, HandsManifest } from "./types";

const CREASE = (32 * Math.PI) / 180;

export async function loadManifest(url = "/hands/hands.json", signal?: AbortSignal): Promise<HandsManifest> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`hands.json: HTTP ${res.status}`);
  return (await res.json()) as HandsManifest;
}

/**
 * Restyle a source colour for the dark site theme: keep hue, soften saturation
 * and lift very dark plastics so they read against the background.
 */
function themed(raw: Color): Color {
  const c = new Color().setRGB(raw.r, raw.g, raw.b, SRGBColorSpace);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl, SRGBColorSpace);
  const l = 0.2 + 0.68 * hsl.l;
  const s = hsl.s * 0.4;
  return c.setHSL(hsl.h, s, l, SRGBColorSpace);
}

export interface LoadedHand {
  robot: URDFRobot;
  dispose(): void;
}

export async function loadHand(info: HandInfo, signal?: AbortSignal): Promise<LoadedHand> {
  const urdfPromise = fetch(info.urdf, { signal }).then((r) => {
    if (!r.ok) throw new Error(`${info.urdf}: HTTP ${r.status}`);
    return r.text();
  });
  const geometries = new Map<string, BufferGeometry>();
  const stray = new Set<Material>();
  // A hand without a mesh bundle (e.g. Inspire) uses URDF primitives only.
  const gltf = info.mesh ? await new GLTFLoader().loadAsync(info.mesh) : null;
  gltf?.scene.updateMatrixWorld(true);
  gltf?.scene.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    const g = m.geometry.clone().applyMatrix4(m.matrixWorld);
    const creased = toCreasedNormals(g, CREASE);
    g.dispose();
    m.geometry.dispose();
    [m.material].flat().forEach((x) => stray.add(x));
    creased.computeBoundingSphere();
    geometries.set(m.name, creased);
  });
  stray.forEach((m) => m.dispose());
  const source = await urdfPromise;
  if (signal?.aborted) {
    geometries.forEach((g) => g.dispose());
    throw new DOMException("aborted", "AbortError");
  }

  const materials = new Map<string, MeshStandardMaterial>();
  const materialFor = (raw: Color) => {
    const key = raw.getHexString();
    let m = materials.get(key);
    if (!m) {
      m = new MeshStandardMaterial({ color: themed(raw), roughness: 0.46, metalness: 0.12 });
      materials.set(key, m);
    }
    return m;
  };

  const loader = new URDFLoader();
  loader.parseCollision = false;
  loader.loadMeshCb = (path, _manager, material, done) => {
    const id = path.slice(path.lastIndexOf("#") + 1);
    const geometry = geometries.get(id);
    const color = (material as MeshPhongMaterial).color ?? new Color(0.7, 0.7, 0.7);
    const mesh = geometry ? new Mesh(geometry, materialFor(color)) : null;
    material.dispose();
    if (mesh) done(mesh);
    else done(mesh as unknown as Mesh, new Error(`missing mesh part ${id}`));
  };
  const robot = loader.parse(source);
  robot.name = info.key;
  // URDF primitives (box/cylinder/sphere) come with a Phong material; give them
  // the same themed PBR material as the meshes.
  robot.traverse((o) => {
    const m = o as Mesh;
    const mat = m.isMesh ? (m.material as MeshPhongMaterial) : null;
    if (mat?.isMeshPhongMaterial) {
      m.material = materialFor(mat.color);
      mat.dispose();
    }
  });

  return {
    robot,
    dispose() {
      robot.removeFromParent();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
