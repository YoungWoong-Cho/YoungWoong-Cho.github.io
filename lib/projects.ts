export type Media =
  | { kind: "video"; src: string; poster?: string; alt: string }
  | { kind: "image"; src: string; alt: string }
  | { kind: "hands" };

export type Block =
  | { type: "h"; text: string }
  | { type: "p"; text: string }
  | { type: "list"; items: string[] }
  | { type: "media"; media: Media; caption?: string; wide?: boolean };

export type Project = {
  slug: string;
  title: string;
  oneLiner: string;
  where: string;
  period: string;
  tags: string[];
  /** Shown at the top of the project page (and on the home card unless `card` is set). */
  cover: Media;
  /** Lighter media for the home-page card. */
  card?: Media;
  /** Social-preview image (site-relative); defaults to the card/cover image. */
  ogImage?: string;
  body: Block[];
  credits: string[];
};

export const projects: Project[] = [
  {
    slug: "cross-embodiment-hands",
    title: "One Action Interface, Seven Dexterous Hands",
    oneLiner:
      "Does training on more kinds of robot hands let a policy control a hand it has never seen?",
    where: "Georgia Tech · RL2",
    period: "Sep 2026 – present",
    tags: ["Ongoing", "Simulation", "Cross-embodiment", "Teleoperation"],
    cover: { kind: "hands" },
    card: {
      kind: "image",
      src: "/media/images/hands-viewer.jpg",
      alt: "Seven robot hands following the same fingertip targets.",
    },
    body: [
      { type: "h", text: "The question" },
      {
        type: "p",
        text: "Dexterous hands differ in size, joint count, and finger layout, so a policy trained on one hand usually cannot drive another. I am studying whether co-training on more hand types improves zero-shot transfer to a hand that was held out of training entirely.",
      },
      { type: "h", text: "What I built" },
      {
        type: "list",
        items: [
          "A shared action interface — wrist pose plus five palm-frame fingertip positions — and per-hand inverse kinematics that turns it into each hand's joint commands. Fingers a hand does not have are left empty rather than invented. The viewer above runs the same idea live in your browser.",
          "An Apple Vision Pro → Isaac Sim teleoperation workflow (on NVIDIA Isaac Lab's CloudXR streaming), which I used to collect demonstrations on all seven simulated hands.",
          "A leave-one-hand-out benchmark over seven hands — Shadow, Inspire RH56, Allegro, LEAP, Sharpa Wave, Wuji, and Wuji 2 — and the experiment platform that schedules and tracks well over a hundred training and evaluation jobs on a Slurm cluster.",
        ],
      },
      { type: "h", text: "Early result" },
      {
        type: "media",
        media: {
          kind: "image",
          src: "/media/figures/hat-zero-shot.svg",
          alt: "Zero-shot success on each held-out hand when training on one hand versus six hands.",
        },
        caption:
          "Interim results in simulation (100 episodes per evaluation). Each target hand is never seen during training.",
        wide: true,
      },
      {
        type: "p",
        text: "With the same demonstration budget, a policy co-trained on six hands reaches about twice the zero-shot success of single-hand training on the held-out hand, and is higher on every target hand evaluated so far. It does not yet beat the single best source hand; the full curve from one to six training hands is in progress.",
      },
    ],
    credits: [
      "Advisor: Prof. Danfei Xu.",
      "Policy: HAT (Human Action Transformer) with its official code.",
      "Hand models: open-source URDFs from Shadow Robot (BSD-3-Clause), Wonik Robotics/SimLab (BSD-2-Clause), LEAP Hand/CMU (MIT), Sharpa (Apache-2.0), Wuji Technology (MIT) and Inspire Robots (RH56 model via Renesas RDK / dex_urdf). Sources and licenses: /hands/CREDITS.json.",
      "Simulation: Isaac Sim with DexVerse environments. IK: dex-retargeting.",
    ],
  },
  {
    slug: "retargeted-demonstrations",
    title: "What Makes Retargeted Demonstrations Learnable?",
    oneLiner:
      "The same human demonstrations, retargeted two ways, train policies with very different success. Which properties of the retargeted actions explain it?",
    where: "Georgia Tech · RL2",
    period: "Sep 2026 – present",
    tags: ["Ongoing", "Real robot + simulation", "Imitation learning", "Humanoid"],
    ogImage: "/media/figures/warp-mix-success.png",
    cover: {
      kind: "image",
      src: "/media/images/aria-demo-contact-sheet.jpg",
      alt: "Frames from my egocentric Aria-glasses demonstration of a two-handed basket carry.",
    },
    body: [
      { type: "h", text: "The question" },
      {
        type: "p",
        text: "Retargeting maps human motion onto a robot. In a follow-up to WARP, two retargeters applied to the same source demonstrations produced policies with very different success (14% vs 37% on a coffee-making task in simulation, each in its own scene layout). I study which properties of the resulting action data — consistency, smoothness, diversity, and how predictable actions are from observations — make demonstrations easier to learn by imitation.",
      },
      { type: "h", text: "What I did" },
      {
        type: "list",
        items: [
          "Recorded egocentric human demonstrations with Aria glasses (45 of the 98 demos of a two-handed basket carry), which the WARP pipeline retargets to the Rainbow RBY1 humanoid, and ran the real-robot policy rollouts.",
          "Characterized how a demonstrator's style survives retargeting: the two demonstrators' motions differ clearly in speed and timing.",
          "Designed a controlled simulation study on the RBY1 (DexMimicGen coffee task): 7 training-data conditions, 14 policies, 1,400 closed-loop rollouts, testing whether data-quality metrics from the literature — action variance, state–action mutual information, spectral arc length, and signature-kernel diversity — explain the gap.",
        ],
      },
      {
        type: "media",
        media: {
          kind: "image",
          src: "/media/figures/demonstrator-style.svg",
          alt: "Per-demonstration duration and arm speed for two demonstrators.",
        },
        caption: "Two people demonstrating the same task leave clearly different signatures in the retargeted data.",
        wide: true,
      },
      { type: "h", text: "Findings so far" },
      {
        type: "media",
        media: {
          kind: "image",
          src: "/media/figures/warp-mix-success.svg",
          alt: "Closed-loop success as the share of WARP-retargeted demonstrations in training increases.",
        },
        caption:
          "Same source demonstrations; only the retargeting mix changes. 100 simulated rollouts per point, 95% intervals.",
        wide: true,
      },
      {
        type: "p",
        text: "In the WARP scene, success rises with the share of WARP-retargeted data — though the two retargetings also place the robot base about 17 cm apart, so scene layout and data are not yet separated. None of the dataset-level metrics tracks success consistently across tasks. Looking frame by frame is more telling: a policy errs more exactly where its nearest training demonstrations disagree about what to do next.",
      },
      {
        type: "media",
        media: {
          kind: "image",
          src: "/media/figures/learnability-local-consistency.svg",
          alt: "Policy error rises with how much the nearest training demonstrations disagree about the next action.",
        },
        caption:
          "Same direction in all 6 datasets (3 tasks × 2 retargetings; Spearman ρ 0.25–0.50). Correlational, open-loop; policies are Zhenyang Chen's checkpoints, analysis mine.",
        wide: true,
      },
    ],
    credits: [
      "Advisor: Prof. Danfei Xu.",
      "Part of the WARP project in RL2, led by Chuye Zhang (WARP: arXiv 2606.29940).",
      "DexMimicGen retargeted datasets, the baseline policy checkpoints analysed in the local-consistency figure, and the training/rollout code: Zhenyang Chen. I trained the 14 controlled-study policies with that setup and ran the analyses.",
    ],
  },
  {
    slug: "dexterous-foundation-models",
    title: "Adapting Robot Foundation Models to a 16-DoF Hand",
    oneLiner:
      "Bringing large pretrained policies — GR00T N1.6, π0.5, and a 3D geometry-aware policy — to DexJoCo, a public 11-task dexterous-manipulation benchmark.",
    where: "RLWRLD",
    period: "Apr – Aug 2026",
    tags: ["Industry", "Simulation (MuJoCo)", "VLA fine-tuning", "Evaluation"],
    cover: {
      kind: "video",
      src: "/media/videos/gam-water-plant-before-after.mp4",
      poster: "/media/videos/gam-water-plant-before-after.jpg",
      alt: "Same scene, initial versus tuned training recipe: the tuned policy completes the water-plant task.",
    },
    body: [
      { type: "h", text: "A geometry-aware policy on a dexterous hand" },
      {
        type: "p",
        text: "GAM, a recently published 3D geometry-aware policy, was designed for parallel-jaw grippers. I adapted it to a Franka arm with a 16-DoF Allegro hand — new data loader and policy server, delta actions, depth inputs, and a corrected training recipe. Along the way I found that its training step limit counts micro-batches rather than optimizer updates, so with our gradient-accumulation settings early runs had received only ~156 updates instead of the intended 10k. Water-plant success rose from 11% to about 55% (one training run; 6 evaluation seeds × 50 episodes, a plateau over 20k–70k updates).",
      },
      {
        type: "media",
        media: {
          kind: "video",
          src: "/media/videos/dexjoco-hanoi-depth.mp4",
          poster: "/media/videos/dexjoco-hanoi-depth.jpg",
          alt: "Bimanual Tower of Hanoi with the policy's predicted future depth next to the actual depth.",
        },
        caption: "Probing what the policy expects to see: its predicted depth for the next step (middle) versus the depth that follows (right). The prediction is smoother and misses thin parts like the peg.",
        wide: true,
      },
      { type: "h", text: "Fine-tuning and benchmarking VLAs" },
      {
        type: "p",
        text: "I fine-tuned GR00T N1.6 on all 11 DexJoCo tasks (46.2% mean success, versus 40.3% reported for GR00T N1.5) and re-evaluated the released π0.5 checkpoints in the same harness, matching the reported 52.5% mean (individual tasks vary).",
      },
      {
        type: "media",
        media: {
          kind: "image",
          src: "/media/figures/dexjoco-success.svg",
          alt: "Per-task success on the 11 DexJoCo tasks for GR00T N1.6 (fine-tuned) and π0.5.",
        },
        wide: true,
      },
      {
        type: "media",
        media: {
          kind: "video",
          src: "/media/videos/hammer-nail-comparison.mp4",
          poster: "/media/videos/hammer-nail-comparison.jpg",
          alt: "Side-by-side rollouts of π0.5 and fine-tuned GR00T N1.6 on the hammer-nail task.",
        },
        caption: "Hammer Nail from the same starting scene: fine-tuned GR00T N1.6 drives the nail while π0.5 hovers until the time limit. Over all 50 episodes π0.5 is still ahead on this task (44 vs 36).",
        wide: true,
      },
      { type: "h", text: "Evaluation you can trust" },
      {
        type: "p",
        text: "Re-running the same seed flipped 22.5% of episode outcomes. I traced it to unseeded flow-matching noise in the policy and nondeterministic GPU rendering; after fixing both, reruns were identical, so differences between models could finally be measured against a known noise floor. I also built the training/evaluation platform behind these runs across three compute clusters.",
      },
      {
        type: "media",
        media: {
          kind: "video",
          src: "/media/videos/eval-determinism.mp4",
          poster: "/media/videos/eval-determinism.jpg",
          alt: "The same checkpoint and seed run twice: one pass fails and the other succeeds.",
        },
        caption:
          "Before the fix: same checkpoint, same seed, run twice. Rendering nondeterminism alone sends the passes down different paths.",
        wide: true,
      },
    ],
    credits: [
      "Work done as a Research Engineer at RLWRLD.",
      "DexJoCo benchmark: Wang et al., arXiv 2605.16257. GAM: Han et al., arXiv 2606.17046. GR00T N1.6: NVIDIA. π0.5: Physical Intelligence.",
    ],
  },
];

export const getProject = (slug: string) => projects.find((p) => p.slug === slug);
