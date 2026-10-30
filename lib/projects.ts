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
  /** Where the work was done, shown under the title on the home page. */
  affiliation: string;
  /** Short topic tags shown on the home page. */
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
    oneLiner: "Can a policy trained on several robot hands control a hand it has never seen?",
    affiliation: "Georgia Tech RL2, advised by Prof. Danfei Xu",
    tags: ["Cross-embodiment", "Dexterous hands", "Isaac Sim", "Vision Pro teleoperation"],
    cover: { kind: "hands" },
    card: {
      kind: "image",
      src: "/media/images/hands-viewer.jpg",
      alt: "Seven robot hands following the same fingertip targets.",
    },
    body: [
      { type: "h", text: "Question" },
      {
        type: "p",
        text: "Robot hands differ in size, number of joints, and finger layout, so a policy trained on one hand usually does not work on another. I'm testing whether training on more hand types helps a policy transfer zero-shot to a hand it never saw during training.",
      },
      { type: "h", text: "What I built" },
      {
        type: "list",
        items: [
          "A shared action space for all seven hands: the wrist pose plus the positions of the five fingertips in the palm frame. Per-hand inverse kinematics converts it into joint commands. If a hand has fewer fingers, the extra slots stay empty. The 3D viewer at the top of this page uses the same mapping.",
          "A teleoperation setup from Apple Vision Pro to Isaac Sim, built on NVIDIA Isaac Lab's CloudXR streaming. I used it to collect the demonstrations for all seven hands.",
          "A leave-one-hand-out benchmark with Shadow, Inspire RH56, Allegro, LEAP, Sharpa Wave, Wuji, and Wuji 2, plus the tooling that runs and tracks over a hundred training and evaluation jobs on our Slurm cluster.",
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
        caption: "Interim results in simulation, 100 episodes per evaluation. The target hand is never used in training.",
        wide: true,
      },
      {
        type: "p",
        text: "With the same amount of demonstration data, a policy trained on six hands gets about twice the zero-shot success of one trained on a single hand, and it does better on every target hand tested so far. It doesn't beat the best single source hand yet. Runs with two to five training hands are still in progress.",
      },
    ],
    credits: [
      "Advisor: Prof. Danfei Xu.",
      "Policy: HAT (Human Action Transformer), using its official code.",
      "Hand models: open-source URDFs from Shadow Robot (BSD-3-Clause), Wonik Robotics/SimLab (BSD-2-Clause), LEAP Hand/CMU (MIT), Sharpa (Apache-2.0), Wuji Technology (MIT) and Inspire Robots (RH56 model via Renesas RDK / dex_urdf). Sources and licenses: /hands/CREDITS.json.",
      "Simulation: Isaac Sim with DexVerse environments. IK: dex-retargeting.",
    ],
  },
  {
    slug: "retargeted-demonstrations",
    title: "What Makes Retargeted Demonstrations Learnable?",
    oneLiner:
      "Retargeting the same human demonstrations in two different ways gave policies with very different success rates. I studied which properties of the retargeted actions cause that.",
    affiliation: "Georgia Tech RL2, part of the WARP project",
    tags: ["Human demonstrations", "Retargeting", "Point clouds", "Rainbow RB-Y1"],
    ogImage: "/media/figures/warp-mix-success.png",
    cover: {
      kind: "image",
      src: "/media/images/aria-demo-contact-sheet.jpg",
      alt: "Frames from my egocentric Aria-glasses demonstration of a two-handed basket carry.",
    },
    body: [
      { type: "h", text: "Question" },
      {
        type: "p",
        text: "Retargeting maps human motion onto a robot. In a follow-up to WARP, two retargeting methods applied to the same source demonstrations produced policies with very different success (14% vs 37% on a coffee task in simulation, each evaluated in its own scene layout). I studied which properties of the action data, such as consistency, smoothness, diversity, and how well actions can be predicted from observations, make demonstrations easier to imitate.",
      },
      { type: "h", text: "What I did" },
      {
        type: "list",
        items: [
          "Recorded 45 of the 98 egocentric human demonstrations (Aria glasses) for a two-handed basket carry. The WARP pipeline retargets them to the Rainbow RBY1 humanoid, and I ran the policy rollouts on the real robot.",
          "Compared how the two demonstrators move in the retargeted data. Their speed and timing are clearly different.",
          "Set up a controlled simulation study on the RBY1 (DexMimicGen coffee task) with 7 training-data conditions, 14 policies, and 1,400 closed-loop rollouts. It tests whether data-quality metrics from the literature (action variance, state-action mutual information, spectral arc length, signature-kernel diversity) explain the gap.",
        ],
      },
      {
        type: "media",
        media: {
          kind: "image",
          src: "/media/figures/demonstrator-style.svg",
          alt: "Per-demonstration duration and arm speed for two demonstrators.",
        },
        caption: "Same task, two demonstrators, clearly different motion in the retargeted data.",
        wide: true,
      },
      { type: "h", text: "Findings" },
      {
        type: "media",
        media: {
          kind: "image",
          src: "/media/figures/warp-mix-success.svg",
          alt: "Closed-loop success as the share of WARP-retargeted demonstrations in training increases.",
        },
        caption: "Same source demonstrations, only the retargeting mix changes. 100 simulated rollouts per point with 95% intervals.",
        wide: true,
      },
      {
        type: "p",
        text: "In the WARP scene, success goes up as the share of WARP-retargeted data increases. The two methods also place the robot base about 17 cm apart, though, so this result does not separate the effect of the scene layout from the effect of the data. None of the dataset-level metrics follows success consistently across tasks. Looking at individual frames shows a clearer pattern: the policy makes larger errors where its nearest training demonstrations disagree about the next action.",
      },
      {
        type: "media",
        media: {
          kind: "image",
          src: "/media/figures/learnability-local-consistency.svg",
          alt: "Policy error rises with how much the nearest training demonstrations disagree about the next action.",
        },
        caption:
          "Same trend in all 6 datasets (3 tasks × 2 retargeting methods, Spearman ρ 0.25 to 0.50). This is a correlation from open-loop evaluation. The policies are Zhenyang Chen's checkpoints and the analysis is mine.",
        wide: true,
      },
      { type: "h", text: "What came next" },
      {
        type: "p",
        text: "The dataset-level metrics did not predict closed-loop success well enough to guide data collection, so I closed this study. The project now asks a more direct question: how well can a policy trained only on human demonstrations work on the RBY1? The policies take point clouds as input, with the human hand removed from the cloud.",
      },
      { type: "h", text: "Current work: steering toward the object" },
      {
        type: "p",
        text: "Policies trained only on the human demonstrations do reach and pick up the basket in simulation, but they don't steer toward it. In the human demonstrations, wherever the basket starts sideways, it ends up in the same place in front of the body by first contact (slope 0.00 across 53 demos). The baseline policy carries the starting offset straight into contact (slope 1.13 across 29 simulated trials), and the basket ends up 31 cm to its right on average.",
      },
      {
        type: "media",
        media: {
          kind: "video",
          src: "/media/videos/warp-sim-rollout.mp4",
          poster: "/media/videos/warp-sim-rollout.jpg",
          alt: "A policy trained only on human demonstrations picks up the basket with the RB-Y1 in simulation.",
        },
        caption:
          "A successful simulated rollout of a policy trained only on human demonstrations. Left: third-person view. Right: the simulated egocentric (Aria) camera.",
        wide: true,
      },
      {
        type: "media",
        media: {
          kind: "video",
          src: "/media/videos/warp-basket-offset.mp4",
          poster: "/media/videos/warp-basket-offset.jpg",
          alt: "Top-down rollouts and trajectory plots: humans correct the basket's sideways offset before contact, the policy does not.",
        },
        caption:
          "Where the basket is relative to the body on the way to it. Human demonstrations (blue) correct the starting offset before contact; the baseline policy (orange) keeps it.",
        wide: true,
      },
      {
        type: "p",
        text: "I'm testing a change to the model structure: plan the base motion relative to the basket's position. In simulation it brings the robot to the basket in 30 of 30 trials, against 13 for the baseline. It doesn't lift the basket more often, though, so full-task success hasn't improved yet. On a second set of 45 recorded layouts it approached the basket in 41 cases (baseline 31), while the baseline finished more full tasks (6 vs 0).",
      },
      {
        type: "media",
        media: {
          kind: "video",
          src: "/media/videos/warp-same-scene.mp4",
          poster: "/media/videos/warp-same-scene.jpg",
          alt: "Top-down view of the same scene for three policy variants: the baseline sidesteps left, the basket-anchored variant lines up on the basket.",
        },
        caption:
          "Same scene, three variants, seen from above (approach only, simulation, 2x speed). The basket starts 26 cm to the right; yellow dots trace the robot base. C0 sidesteps left and leaves the basket off to its right, C2 lines up on it. None of them lifts the basket in this scene.",
        wide: true,
      },
      {
        type: "media",
        media: {
          kind: "image",
          src: "/media/figures/human-only-stages.svg",
          alt: "Grouped bars: how many trials reached, lifted, and finished the basket task for three policy variants.",
        },
        caption: "All results in simulation. These policies have not been run on the real robot yet.",
        wide: true,
      },
    ],
    credits: [
      "Advisor: Prof. Danfei Xu.",
      "Part of the WARP project in RL2, led by Chuye Zhang (WARP: arXiv 2606.29940).",
      "DexMimicGen retargeted datasets, the baseline checkpoints used in the learnability figure, and the training and rollout code: Zhenyang Chen. I trained the 14 policies for the controlled study with that setup and did the analysis.",
      "Basket simulation for the RB-Y1, its renderer, and the baseline human-only policy: Chuye Zhang. Evaluation, analysis, and the basket-anchored variant: mine.",
    ],
  },
  {
    slug: "dexterous-foundation-models",
    title: "Adapting Robot Foundation Models to a 16-DoF Hand",
    oneLiner:
      "At RLWRLD I worked on getting large pretrained policies (GR00T N1.6, π0.5, and a 3D geometry-aware policy) to work on DexJoCo, a public benchmark with 11 dexterous manipulation tasks.",
    affiliation: "RLWRLD, Research Engineer",
    tags: ["GR00T N1.6", "π0.5", "GAM", "DexJoCo"],
    cover: {
      kind: "video",
      src: "/media/videos/gam-water-plant-before-after.mp4",
      poster: "/media/videos/gam-water-plant-before-after.jpg",
      alt: "Same scene, initial versus tuned training recipe: the tuned policy completes the water-plant task.",
    },
    body: [
      { type: "h", text: "GAM on a dexterous hand" },
      {
        type: "p",
        text: "GAM is a recent 3D geometry-aware policy designed for parallel-jaw grippers. I adapted it to a Franka arm with a 16-DoF Allegro hand, which meant a new data loader and policy server, delta actions, depth inputs, and a fixed training recipe. One issue I found was that the training step limit counts micro-batches, not optimizer updates, so with our gradient accumulation the early runs got about 156 updates instead of 10k. On the water-plant task, success went from 11% to about 55% (one training run, 6 evaluation seeds × 50 episodes, flat between 20k and 70k updates).",
      },
      {
        type: "media",
        media: {
          kind: "video",
          src: "/media/videos/dexjoco-hanoi-depth.mp4",
          poster: "/media/videos/dexjoco-hanoi-depth.jpg",
          alt: "Bimanual Tower of Hanoi with the policy's predicted future depth next to the actual depth.",
        },
        caption:
          "The policy's predicted depth for the next step (middle) next to the depth that actually follows (right). The prediction is smoother and misses thin parts like the peg.",
        wide: true,
      },
      { type: "h", text: "Fine-tuning and benchmarking VLAs" },
      {
        type: "p",
        text: "I fine-tuned GR00T N1.6 on all 11 DexJoCo tasks and got 46.2% mean success, compared with 40.3% reported for GR00T N1.5. I also re-ran the released π0.5 checkpoints in the same evaluation setup. The mean matched the reported 52.5%, though individual tasks varied.",
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
        caption:
          "Hammer Nail from the same starting scene. Fine-tuned GR00T N1.6 drives the nail, while π0.5 hovers until time runs out. Across all 50 episodes π0.5 still does better on this task (44 vs 36).",
        wide: true,
      },
      { type: "h", text: "Reproducible evaluation" },
      {
        type: "p",
        text: "Running the same seed twice changed the outcome in 22.5% of episodes. The causes were unseeded flow-matching noise in the policy and nondeterministic GPU rendering. After fixing both, reruns gave identical results, so we could tell real differences between models apart from noise. I also built the training and evaluation platform for these runs across three compute clusters.",
      },
      {
        type: "media",
        media: {
          kind: "video",
          src: "/media/videos/eval-determinism.mp4",
          poster: "/media/videos/eval-determinism.jpg",
          alt: "The same checkpoint and seed run twice: one pass fails and the other succeeds.",
        },
        caption: "Before the fix: the same checkpoint and seed, run twice. Rendering differences alone make one run fail and the other succeed.",
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
