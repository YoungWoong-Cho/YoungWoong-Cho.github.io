// Shape of public/hands/hands.json (written by scripts/hands/prepare.py).

export type Vec3 = [number, number, number];

export const SLOTS = ["thumb", "index", "middle", "ring", "little"] as const;
export type Slot = (typeof SLOTS)[number];

export interface HumanFinger {
  slot: Exclude<Slot, "thumb">;
  /** MCP joint position in the palm frame (m). */
  mcp: Vec3;
  /** Proximal, middle, distal (incl. pad) phalanx lengths (m). */
  lengths: Vec3;
  /** Rest spread about the palm normal (rad). */
  spread: number;
}

export interface HumanModel {
  fingers: HumanFinger[];
  thumb: { cmc: Vec3; lengths: Vec3 };
}

/**
 * Human hand pose.
 * fingers[i] = [abduction, mcp, pip, dip] for index, middle, ring, little.
 * thumb = [yaw, pitch, roll, mcp, ip].
 */
export interface HandPose {
  fingers: number[][];
  thumb: number[];
}

export interface Preset {
  id: string;
  label: string;
  pose: HandPose;
  /** Fingertip pairs the human brings into contact (e.g. thumb-index pinch). */
  contacts?: [Slot, Slot][];
}

export interface SlotInfo {
  /** URDF link whose frame carries the fingertip. */
  link: string;
  /** Offset of the tracked fingertip point in that link frame (m). */
  site: Vec3;
  /** Actuated (non-mimic) joints that move this fingertip, palm to tip. */
  joints: string[];
  neutral_tip: Vec3;
}

export interface HandInfo {
  key: string;
  name: string;
  maker: string;
  urdf: string;
  /** GLB with every visual part, or null when the URDF uses primitives only. */
  mesh: string | null;
  root: string;
  palm: string;
  dof: number;
  fingers: number;
  slots: Record<Slot, SlotInfo | null>;
  joints: { name: string; lower: number; upper: number }[];
  mimic: { name: string; joint: string; multiplier: number; offset: number }[];
  /** Human palm-frame targets map to this hand as s * h + offset. */
  target_scale: number;
  target_offset: Vec3;
  /** Visual bounds at the neutral pose, palm frame (m). */
  bounds: { min: Vec3; max: Vec3 };
  /** Bounds of the palm + non-thumb fingers (used to centre the hand). */
  core_bounds?: { min: Vec3; max: Vec3 };
  display: { scale: number };
  /**
   * Converged IK configurations per preset (HandInfo.joints order), found
   * offline with random restarts; used as a joint-space prior while tracking.
   */
  ik_seeds?: Record<string, number[]>;
  license: string;
  source_url: string;
  revision: string;
}

export interface HandsManifest {
  schema: string;
  slots: Slot[];
  human: HumanModel;
  presets: Preset[];
  hands: HandInfo[];
}
