// Imperative three.js scene for the 7-hand viewer: a canonical human hand
// (source of the fingertip targets) plus seven robot hands, each tracking the
// same palm-frame fingertip targets through its own IK.

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  HemisphereLight,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  PMREMGenerator,
  PerspectiveCamera,
  Quaternion,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { HandIK, type Targets } from "./ik";
import { HandRetargeter, mapTargets } from "./retarget";
import { clonePose, humanKeypoints, humanTips, lerpPose, poseDistance } from "./human";
import { loadHand, loadManifest, type LoadedHand } from "./loader";
import { SLOTS, type HandInfo, type HandPose, type HandsManifest, type Preset, type Slot, type Vec3 } from "./types";

const TEAL = 0x45d0bd;
const AUTOPLAY_ORDER = ["pinch", "tripod", "power", "point", "thumbs_up"];
const RISE = 1.1, HOLD = 1.1, FALL = 0.9, REST = 0.35;
/** Each hand is turned about the vertical axis so grasps read in 3/4 view. */
const HAND_YAW = -0.62;

// palm frame (+X fingers, +Y thumb, +Z dorsal) -> world (Y up, camera on +Z):
// fingers up, thumb to the viewer's right, palm facing the camera.
const PALM_TO_WORLD = new Matrix4().set(0, 1, 0, 0, 1, 0, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1);

export interface SceneState {
  preset: string;
  closure: number;
  autoplay: boolean;
}

export interface SceneStatus {
  loaded: number;
  total: number;
  failed: string[];
}

export interface HandsSceneOptions {
  reducedMotion: boolean;
  onState?: (s: SceneState) => void;
  onStatus?: (s: SceneStatus) => void;
}

interface Cell {
  key: string;
  group: Group; // positioned in the grid, rotated palm -> world
  frame: Group; // palm frame of this hand (offset to centre the hand)
  label: HTMLDivElement;
  err?: HTMLSpanElement;
  center: Vec3; // core centre, palm frame
  extent: Vec3; // core size, palm frame
}

interface RobotCell extends Cell {
  info: HandInfo;
  hand?: LoadedHand;
  ik?: HandIK;
  targets: Partial<Record<Slot, Mesh>>;
  rt?: HandRetargeter;
}

interface HumanCell extends Cell {
  bones: Mesh[];
  joints: Mesh[];
  tips: Mesh[];
  palm: Mesh;
}

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export class HandsScene {
  private host: HTMLElement;
  private labels: HTMLElement;
  private opts: HandsSceneOptions;
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(26, 1, 0.01, 30);
  private controls: OrbitControls;
  private envTexture: { dispose(): void } | null = null;
  private abort = new AbortController();
  private disposed = false;

  private manifest: HandsManifest | null = null;
  private human: HumanCell | null = null;
  private robots: RobotCell[] = [];
  private shared = {
    sphere: new SphereGeometry(1, 14, 10),
    cylinder: new CylinderGeometry(1, 1, 1, 10, 1),
    target: new MeshBasicMaterial({ color: TEAL, transparent: true, opacity: 0.92 }),
    halo: new MeshBasicMaterial({
      color: TEAL, transparent: true, opacity: 0.16, depthTest: false, depthWrite: false, blending: AdditiveBlending,
    }),
    bone: new MeshStandardMaterial({ color: 0x8e9aa8, roughness: 0.55, metalness: 0.05 }),
    joint: new MeshStandardMaterial({ color: 0xc9d2dc, roughness: 0.5, metalness: 0.05 }),
    palm: new MeshBasicMaterial({ color: 0x66727f, transparent: true, opacity: 0.18, side: DoubleSide, depthWrite: false }),
  };

  // pose state
  private presetId = "pinch";
  private closure = 0;
  private closureTween: { from: number; to: number; t: number; dur: number } | null = null;
  private autoplay: boolean;
  private playClock = 0;
  private playIndex = 0;
  private commanded: HandPose | null = null;
  private current: HandPose | null = null;

  // loop state
  private visible = true;
  private raf = 0;
  private last = 0;
  private settled = false;
  /** IK still converging after a pose change or a hand load. */
  private ikBusy = true;
  private cols = 4;
  private lastLabelUpdate = 0;
  private lastStateEmit = 0;
  private io: IntersectionObserver;
  private ro: ResizeObserver;

  constructor(host: HTMLElement, labels: HTMLElement, opts: HandsSceneOptions) {
    this.host = host;
    this.labels = labels;
    this.opts = opts;
    this.autoplay = !opts.reducedMotion;

    this.renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(0x000000, 0);
    const canvas = this.renderer.domElement;
    canvas.setAttribute("role", "img");
    canvas.setAttribute(
      "aria-label",
      "Seven robot hands and a human hand side by side. Each robot hand reaches the same fingertip targets with its own inverse kinematics. Drag to rotate.",
    );
    canvas.style.display = "block";
    host.appendChild(canvas);

    const pmrem = new PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    pmrem.dispose();
    this.envTexture = env;
    this.scene.environment = env;
    this.scene.environmentIntensity = 0.55;
    this.scene.add(new HemisphereLight(0xdfe8f2, 0x0b0d10, 0.7));
    const key = new DirectionalLight(0xffffff, 1.7);
    key.position.set(0.8, 1.4, 1.6);
    const rim = new DirectionalLight(0x9fe8dd, 0.9);
    rim.position.set(-1.2, 0.8, -1.4);
    const fill = new DirectionalLight(0xc8d4ff, 0.35);
    fill.position.set(-1.5, -0.4, 1.0);
    this.scene.add(key, rim, fill);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25; // light easing; the view should track the cursor closely
    this.controls.enableZoom = false; // keep page scrolling intact
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 1.2;
    this.controls.minPolarAngle = Math.PI * 0.2;
    this.controls.maxPolarAngle = Math.PI * 0.8;
    canvas.style.touchAction = "pan-y"; // vertical swipes still scroll the page
    this.controls.addEventListener("start", () => this.wake());
    this.controls.addEventListener("change", () => this.wake());

    this.io = new IntersectionObserver(
      (entries) => {
        this.visible = entries.some((e) => e.isIntersecting);
        if (this.visible) this.wake();
      },
      { rootMargin: "120px" },
    );
    this.io.observe(host);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  // ------------------------------------------------------------------ public

  async load(url = "/hands/hands.json"): Promise<void> {
    const manifest = await loadManifest(url, this.abort.signal);
    if (this.disposed) return;
    this.manifest = manifest;
    const open = this.preset("open").pose;
    this.commanded = clonePose(open);
    this.current = clonePose(open);
    this.buildHuman();
    for (const info of manifest.hands) this.robots.push(this.buildRobotCell(info));
    this.layout();
    this.resize();
    this.emitState(true);

    const status: SceneStatus = { loaded: 0, total: manifest.hands.length, failed: [] };
    this.opts.onStatus?.({ ...status });
    await Promise.all(
      this.robots.map(async (cell) => {
        try {
          const hand = await loadHand(cell.info, this.abort.signal);
          if (this.disposed) {
            hand.dispose();
            return;
          }
          cell.hand = hand;
          cell.frame.add(hand.robot);
          cell.ik = new HandIK(hand.robot, cell.info);
          cell.rt = new HandRetargeter(cell.ik, cell.info);
          // start from the stored open-hand solution, then converge on the
          // current targets before the first frame
          if (!cell.rt.seed("open")) cell.ik.reset();
          this.solveCell(cell, 1, 40);
          for (let k = 0; k < 20; k++) this.solveCell(cell, 1, 6);
          status.loaded++;
          this.ikBusy = true;
        } catch (e) {
          if (this.disposed) return;
          status.failed.push(cell.info.name);
          cell.label.dataset.state = "failed";
          console.warn(`hands: ${cell.info.key} failed to load`, e);
        }
        this.opts.onStatus?.({ ...status, failed: [...status.failed] });
        this.wake();
      }),
    );
  }

  setPreset(id: string): void {
    if (!this.manifest || !this.manifest.presets.some((p) => p.id === id)) return;
    this.autoplay = false;
    this.presetId = id;
    this.ikBusy = true;
    this.tweenClosure(1);
    this.emitState(true);
    this.wake();
  }

  setClosure(c: number): void {
    this.autoplay = false;
    this.closureTween = null;
    this.closure = Math.min(1, Math.max(0, c));
    this.ikBusy = true;
    this.emitState(true);
    this.wake();
  }

  setAutoplay(on: boolean): void {
    this.autoplay = on;
    this.ikBusy = true;
    if (on) {
      const i = AUTOPLAY_ORDER.indexOf(this.presetId);
      this.playIndex = i >= 0 ? i : 0;
      this.presetId = AUTOPLAY_ORDER[this.playIndex];
      // resume the cycle from the current closure
      this.playClock = this.closure >= 0.999 ? RISE : this.closure * RISE;
      this.closureTween = null;
    }
    this.emitState(true);
    this.wake();
  }

  dispose(): void {
    this.disposed = true;
    this.abort.abort();
    cancelAnimationFrame(this.raf);
    this.io.disconnect();
    this.ro.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.controls.dispose();
    for (const cell of this.robots) cell.hand?.dispose();
    this.human?.palm.geometry.dispose();
    Object.values(this.shared).forEach((x) => x.dispose());
    this.envTexture?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.labels.replaceChildren();
  }

  // ------------------------------------------------------------- building

  private preset(id: string): Preset {
    const m = this.manifest!;
    return m.presets.find((p) => p.id === id) ?? m.presets[0];
  }

  private makeLabel(title: string, meta: string, withErr: boolean): { el: HTMLDivElement; err?: HTMLSpanElement } {
    const el = document.createElement("div");
    el.className = "hands-label";
    const t = document.createElement("div");
    t.className = "hands-label-title";
    t.textContent = title;
    const m = document.createElement("div");
    m.className = "hands-label-meta";
    m.textContent = meta;
    el.append(t, m);
    let err: HTMLSpanElement | undefined;
    if (withErr) {
      err = document.createElement("span");
      err.className = "hands-label-err";
      const line = document.createElement("div");
      line.className = "hands-label-meta";
      line.append(err);
      el.append(line);
    }
    this.labels.appendChild(el);
    return { el, err };
  }

  private buildHuman(): void {
    const group = new Group();
    const frame = new Group();
    group.add(frame);
    this.scene.add(group);
    const bones: Mesh[] = [];
    const joints: Mesh[] = [];
    const tips: Mesh[] = [];
    for (let i = 0; i < 4 * 4 + 4 + 3; i++) {
      const b = new Mesh(this.shared.cylinder, this.shared.bone);
      bones.push(b);
      frame.add(b);
    }
    for (let i = 0; i < 4 * 3 + 3 + 1; i++) {
      const j = new Mesh(this.shared.sphere, this.shared.joint);
      j.scale.setScalar(0.0042);
      joints.push(j);
      frame.add(j);
    }
    for (let i = 0; i < 5; i++) {
      const t = new Mesh(this.shared.sphere, this.shared.target);
      t.scale.setScalar(0.0065);
      const halo = new Mesh(this.shared.sphere, this.shared.halo);
      halo.scale.setScalar(1.9);
      halo.renderOrder = 10;
      t.add(halo);
      tips.push(t);
      frame.add(t);
    }
    const palmGeo = new BufferGeometry();
    palmGeo.setAttribute("position", new BufferAttribute(new Float32Array(6 * 3), 3));
    palmGeo.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5]);
    const palm = new Mesh(palmGeo, this.shared.palm);
    frame.add(palm);
    const { el } = this.makeLabel("Human hand", "source of the 5 targets", false);
    el.dataset.kind = "source";
    this.human = {
      key: "human", group, frame, label: el, bones, joints, tips, palm,
      center: [0.1, 0.0, -0.02], extent: [0.2, 0.09, 0.05],
    };
  }

  private buildRobotCell(info: HandInfo): RobotCell {
    const group = new Group();
    const frame = new Group();
    group.add(frame);
    group.scale.setScalar(info.display?.scale ?? 1);
    this.scene.add(group);
    const targets: Partial<Record<Slot, Mesh>> = {};
    const r = 0.0052 * Math.min(1.25, Math.max(0.85, info.target_scale));
    for (const slot of SLOTS) {
      if (!info.slots[slot]) continue;
      const m = new Mesh(this.shared.sphere, this.shared.target);
      m.scale.setScalar(r);
      const halo = new Mesh(this.shared.sphere, this.shared.halo);
      halo.scale.setScalar(1.9);
      halo.renderOrder = 10;
      m.add(halo);
      frame.add(m);
      targets[slot] = m;
    }
    const b = info.core_bounds ?? info.bounds;
    const center: Vec3 = [0, 1, 2].map((i) => (b.min[i] + b.max[i]) / 2) as Vec3;
    const extent: Vec3 = [0, 1, 2].map((i) => b.max[i] - b.min[i]) as Vec3;
    const { el, err } = this.makeLabel(info.name, `${info.dof} DoF · ${info.fingers} fingers`, true);
    el.title = `${info.name} (${info.maker}), ${info.license}`;
    return { key: info.key, info, group, frame, label: el, err, targets, center, extent };
  }

  private cells(): Cell[] {
    return this.human ? [this.human, ...this.robots] : [...this.robots];
  }

  private layout(): void {
    const w = this.host.clientWidth || 800;
    const h = this.host.clientHeight || 460;
    this.cols = w / h < 1.05 ? 2 : 4;
    const cells = this.cells();
    const rows = Math.ceil(cells.length / this.cols);
    // true-scale hands; spacing from the largest core plus room for thumbs
    let maxW = 0, maxH = 0;
    for (const c of cells) {
      maxW = Math.max(maxW, c.extent[1]);
      maxH = Math.max(maxH, c.extent[0]);
    }
    const cellH = maxH * 0.94 + 0.05;
    // spread columns to use the available width (hands keep their true size)
    const cellW = Math.max(maxW + 0.06, Math.min(maxW * 2.2, ((rows * cellH) * (w / h)) / this.cols * 0.9));
    const yawQ = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), HAND_YAW);
    const baseQ = new Quaternion().setFromRotationMatrix(PALM_TO_WORLD);
    cells.forEach((c, i) => {
      const col = i % this.cols;
      const row = Math.floor(i / this.cols);
      c.group.position.set((col - (this.cols - 1) / 2) * cellW, ((rows - 1) / 2 - row) * cellH + 0.012, 0);
      c.group.quaternion.copy(yawQ).multiply(baseQ);
      // centre the core of the hand on the cell, nudged away from the thumb
      c.frame.position.set(-c.center[0], -c.center[1] - 0.018, -c.center[2]);
      c.label.dataset.row = String(row);
    });
    this.grid = { cellW, cellH, rows };
    this.fitCamera();
  }

  private grid = { cellW: 0.3, cellH: 0.3, rows: 2 };

  private fitCamera(): void {
    const { cellW, cellH, rows } = this.grid;
    const W = this.cols * cellW;
    // leave room under the bottom row for its HTML label (name, DoF, tip error)
    const labelRoom = cellH * 0.38;
    const H = rows * cellH + labelRoom;
    const aspect = this.camera.aspect || 1;
    const t = Math.tan((this.camera.fov * Math.PI) / 360);
    const d = Math.max(H / 2 / t, W / 2 / (t * aspect)) + 0.02;
    const dir = new Vector3(0.0, 0.16, 1).normalize();
    const target = new Vector3(0, -labelRoom / 2, 0);
    this.controls.target.copy(target);
    this.camera.position.copy(dir.multiplyScalar(d).add(target));
    this.camera.near = d * 0.2;
    this.camera.far = d * 4;
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  private resize(): void {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.manifest) this.layout();
    this.settled = false;
    this.wake();
  }

  // --------------------------------------------------------------- update

  private tweenClosure(to: number): void {
    if (this.opts.reducedMotion) {
      this.closure = to;
      this.closureTween = null;
      return;
    }
    const dist = Math.abs(to - this.closure);
    this.closureTween = { from: this.closure, to, t: 0, dur: 0.25 + 0.45 * dist };
  }

  private advance(dt: number): void {
    if (this.autoplay) {
      this.playClock += dt;
      const cycle = RISE + HOLD + FALL + REST;
      if (this.playClock >= cycle) {
        this.playClock -= cycle;
        this.playIndex = (this.playIndex + 1) % AUTOPLAY_ORDER.length;
        this.presetId = AUTOPLAY_ORDER[this.playIndex];
      }
      const t = this.playClock;
      this.closure =
        t < RISE ? ease(t / RISE) : t < RISE + HOLD ? 1 : t < RISE + HOLD + FALL ? 1 - ease((t - RISE - HOLD) / FALL) : 0;
    } else if (this.closureTween) {
      const tw = this.closureTween;
      tw.t += dt;
      const k = ease(tw.t / tw.dur);
      this.closure = tw.from + (tw.to - tw.from) * k;
      if (tw.t >= tw.dur) this.closureTween = null;
    }
    this.emitState(false);
  }

  private emitState(force: boolean): void {
    const now = performance.now();
    if (!force && now - this.lastStateEmit < 66) return;
    this.lastStateEmit = now;
    this.opts.onState?.({ preset: this.presetId, closure: this.closure, autoplay: this.autoplay });
  }

  private updateHumanPose(dt: number): number {
    const open = this.preset("open").pose;
    const target = this.preset(this.presetId).pose;
    lerpPose(open, target, this.closure, this.commanded!);
    const k = this.opts.reducedMotion ? 1 : 1 - Math.exp(-dt / 0.09);
    lerpPose(this.current!, this.commanded!, k, this.current!);
    return poseDistance(this.current!, this.commanded!);
  }

  private updateHumanMeshes(): void {
    const h = this.human!;
    const kp = humanKeypoints(this.manifest!.human, this.current!);
    const v = (p: Vec3) => new Vector3(p[0], p[1], p[2]);
    const segs: [Vec3, Vec3, number][] = [];
    const w = kp.wrist;
    for (const f of kp.fingers) {
      segs.push([w, f[0], 0.0024]);
      segs.push([f[0], f[1], 0.0034], [f[1], f[2], 0.0031], [f[2], f[3], 0.0028]);
    }
    segs.push([w, kp.thumb[0], 0.0034]);
    segs.push([kp.thumb[0], kp.thumb[1], 0.0036], [kp.thumb[1], kp.thumb[2], 0.0033], [kp.thumb[2], kp.thumb[3], 0.003]);
    for (let i = 0; i < 3; i++) segs.push([kp.fingers[i][0], kp.fingers[i + 1][0], 0.0022]);
    const up = new Vector3(0, 1, 0);
    segs.forEach(([a, b, r], i) => {
      const bone = h.bones[i];
      const A = v(a), B = v(b);
      const d = B.clone().sub(A);
      const len = d.length();
      bone.position.copy(A).addScaledVector(d, 0.5);
      bone.quaternion.setFromUnitVectors(up, d.normalize());
      bone.scale.set(r, len, r);
    });
    const jointPts: Vec3[] = [w, ...kp.thumb.slice(0, 3), ...kp.fingers.flatMap((f) => f.slice(0, 3))];
    jointPts.forEach((p, i) => h.joints[i].position.set(p[0], p[1], p[2]));
    const tips = humanTips(this.manifest!.human, this.current!);
    SLOTS.forEach((s, i) => h.tips[i].position.set(...tips[s]));
    const pos = h.palm.geometry.getAttribute("position") as BufferAttribute;
    [w, kp.thumb[0], kp.fingers[0][0], kp.fingers[1][0], kp.fingers[2][0], kp.fingers[3][0]].forEach((p, i) =>
      pos.setXYZ(i, p[0], p[1], p[2]),
    );
    pos.needsUpdate = true;
    h.palm.geometry.computeBoundingSphere();
  }

  /**
   * Map the current human fingertips onto this hand, ease the joint-space prior,
   * couple contacts and run DLS. Returns the net joint motion of this step.
   */
  private solveCell(cell: RobotCell, k: number, iterations: number): number {
    const tips = humanTips(this.manifest!.human, this.current!);
    if (!cell.rt) {
      mapTargets(cell.info, tips, this.scratch);
      for (const slot of SLOTS) {
        const t = this.scratch[slot];
        if (t) cell.targets[slot]?.position.copy(t);
      }
      return 0;
    }
    cell.rt.updatePrior("open", this.presetId, this.closure, k);
    const motion = cell.rt.step(tips, this.preset(this.presetId).contacts, iterations);
    for (const slot of SLOTS) {
      const t = cell.rt.base[slot];
      if (t) cell.targets[slot]?.position.copy(t);
    }
    return motion;
  }

  private scratch: Targets = {};

  private updateLabels(now: number, force: boolean): void {
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    const p = new Vector3();
    for (const c of this.cells()) {
      p.set(0, -this.grid.cellH * 0.43, 0).add(c.group.position);
      p.project(this.camera);
      const x = (p.x * 0.5 + 0.5) * w;
      const y = (-p.y * 0.5 + 0.5) * h;
      c.label.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, 0)`;
    }
    if (!force && now - this.lastLabelUpdate < 120) return;
    this.lastLabelUpdate = now;
    for (const r of this.robots) {
      if (!r.err) continue;
      if (!r.rt) {
        r.err.textContent = r.label.dataset.state === "failed" ? "unavailable" : "loading…";
        continue;
      }
      const mean = r.rt?.meanErr ?? 0;
      r.err.textContent = `tip err ${(mean * 1000).toFixed(1)} mm`;
      r.err.dataset.level = mean < 0.004 ? "ok" : mean < 0.012 ? "mid" : "high";
    }
  }

  /** One simulation + render step. Returns true while anything is still moving. */
  private tick(dt: number, now: number): boolean {
    this.advance(dt);
    const poseGap = this.updateHumanPose(dt);
    this.updateHumanMeshes();
    let step = 0;
    const iters = this.opts.reducedMotion ? 16 : 5;
    const k = this.opts.reducedMotion ? 1 : 1 - Math.exp(-dt / 0.09);
    // a pure camera orbit leaves the pose unchanged: render only
    const poseMoving = this.autoplay || !!this.closureTween || poseGap > 1e-4 || this.ikBusy || !this.settled;
    if (poseMoving) for (const cell of this.robots) step = Math.max(step, this.solveCell(cell, k, iters));
    this.ikBusy = step > 1e-5;
    const moving = this.controls.update();
    this.updateLabels(now, false);
    this.renderer.render(this.scene, this.camera);
    const busy =
      this.autoplay || !!this.closureTween || poseGap > 1e-4 || step > 1e-5 || moving || !this.settled;
    this.settled = true;
    return busy;
  }

  private frame = (now: number) => {
    if (this.disposed || !this.visible || document.hidden || !this.manifest) {
      this.raf = 0;
      return;
    }
    const dt = Math.min(0.05, this.last ? (now - this.last) / 1000 : 0.016);
    this.last = now;
    // Keep this.raf set while ticking: controls.update() inside tick() emits
    // "change" -> wake(), which must not queue a second callback. Clearing it
    // first forked one extra render loop per orbit frame.
    if (this.tick(dt, now)) this.raf = requestAnimationFrame(this.frame);
    else {
      this.raf = 0;
      this.updateLabels(now, true);
      this.last = 0;
    }
  };

  /** Advance `frames` fixed steps synchronously, even while hidden (tests, captures). */
  step(frames = 1, dt = 1 / 60): void {
    if (this.disposed || !this.manifest) return;
    for (let i = 0; i < frames; i++) this.tick(dt, performance.now());
    this.updateLabels(performance.now(), true);
  }

  private wake = () => {
    if (this.disposed || this.raf || !this.visible || document.hidden) return;
    this.raf = requestAnimationFrame(this.frame);
  };

  private onVisibility = () => {
    if (!document.hidden) {
      this.last = 0;
      this.wake();
    }
  };
}
