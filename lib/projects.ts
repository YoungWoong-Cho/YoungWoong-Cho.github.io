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
      "Retargeting the same human demonstrations in two different ways gave policies with very different success rates. I want to know which properties of the retargeted actions cause that.",
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
        text: "Retargeting maps human motion onto a robot. In a follow-up to WARP, two retargeting methods applied to the same source demonstrations produced policies with very different success (14% vs 37% on a coffee task in simulation, each evaluated in its own scene layout). I'm studying which properties of the action data, such as consistency, smoothness, diversity, and how well actions can be predicted from observations, make demonstrations easier to imitate.",
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
      { type: "h", text: "Findings so far" },
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
        text: "In the WARP scene, success goes up as the share of WARP-retargeted data increases. The two methods also place the robot base about 17 cm apart, though, so I haven't separated the effect of the scene layout from the effect of the data yet. None of the dataset-level metrics follows success consistently across tasks. Looking at individual frames shows a clearer pattern: the policy makes larger errors where its nearest training demonstrations disagree about the next action.",
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
    ],
    credits: [
      "Advisor: Prof. Danfei Xu.",
      "Part of the WARP project in RL2, led by Chuye Zhang (WARP: arXiv 2606.29940).",
      "DexMimicGen retargeted datasets, the baseline checkpoints used in the last figure, and the training and rollout code: Zhenyang Chen. I trained the 14 policies for the controlled study with that setup and did the analysis.",
    ],
  },
  {
    slug: "dexterous-foundation-models",
    title: "Adapting Robot Foundation Models to a 16-DoF Hand",
    oneLiner:
      "At RLWRLD I worked on getting large pretrained policies (GR00T N1.6, π0.5, and a 3D geometry-aware policy) to work on DexJoCo, a public benchmark with 11 dexterous manipulation tasks.",
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
