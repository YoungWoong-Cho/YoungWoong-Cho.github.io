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
    slug: "vision-pro-teleop",
    title: "Vision Pro Teleoperation for Dexterous Hands",
    oneLiner:
      "I built an Apple Vision Pro teleoperation setup for seven simulated robot hands and recorded 357 grasping demonstrations with it. On hardware, I teleoperate a Wuji Hand 2 with the Vision Pro to collect tactile data.",
    affiliation: "Georgia Tech RL2",
    tags: ["Apple Vision Pro", "Teleoperation", "Isaac Lab", "Tactile sensing"],
    ogImage: "/media/videos/wuji2-tactile-teleop.jpg",
    cover: {
      kind: "video",
      src: "/media/videos/wuji2-tactile-teleop.mp4",
      poster: "/media/videos/wuji2-tactile-teleop.jpg",
      alt: "Wearing an Apple Vision Pro, I move my hand and a Wuji Hand 2 on a Franka arm follows; a colleague touches the robot fingers.",
    },
    body: [
      { type: "h", text: "What it does" },
      {
        type: "p",
        text: "The operator wears an Apple Vision Pro and simply moves their hand. Hand and head poses stream to a GPU machine running Isaac Sim, get retargeted to whichever robot hand is loaded, and the rendered scene streams back into the headset, so the operator sees the robot hand in 3D and steers it like their own. Each successful grasp is saved as a training demonstration.",
      },
      {
        type: "media",
        media: {
          kind: "image",
          src: "/media/figures/teleop-pipeline.svg",
          alt: "Pipeline: Vision Pro hand tracking, GPU session with Isaac Sim, retargeting, 60 Hz simulation of 7 hands, the view streamed back, then episode loop, dataset, review and conversion.",
        },
        caption: "Teal boxes are the parts I built or extended; grey boxes are the existing tools underneath.",
        wide: true,
      },
      { type: "h", text: "What I built" },
      {
        type: "list",
        items: [
          "A one-click launcher that starts a full teleoperation session (Isaac Sim, the CloudXR runtime and the task) on a lab workstation or a Slurm GPU node, without Docker.",
          "An in-headset control panel, added to NVIDIA's open-source visionOS client. It follows the operator's view, shows the task, and has Start, Restart episode and End collection buttons, plus clear error messages.",
          "Six more robot hands next to the Shadow hand that DexVerse ships with: Inspire RH56, Allegro, LEAP, Sharpa Wave, Wuji and Wuji 2, each with a URDF bundle, DexPilot finger mapping and mimic-joint fixes.",
          "The recording loop: an episode is saved once the cube is lifted 20 cm and held for 10 steps. Tracking dropouts under 0.5 s resume the episode; longer ones discard it. Recordings are then checked in a 3D replay and converted into the shared wrist + fingertip action labels used for training.",
          "A small native visionOS app that records ARKit hand and head poses on the headset and exports them as JSON lines, for capturing human motion without the simulator.",
        ],
      },
      { type: "h", text: "Demonstrations" },
      {
        type: "p",
        text: "With this setup I recorded 357 Pick Cube demonstrations myself: 51 for each of the seven hands, each 1.4 to 2.7 seconds of simulated time at 60 Hz. They are the training data for the cross-embodiment project (One Action Interface, Seven Dexterous Hands).",
      },
      {
        type: "media",
        media: {
          kind: "video",
          src: "/media/videos/teleop-seven-hands.mp4",
          poster: "/media/videos/teleop-seven-hands.jpg",
          alt: "Seven robot hands, each reaching for, grasping and lifting a blue cube in a recorded demonstration.",
        },
        caption: "The first recorded demonstration for each of the seven hands, replayed from the saved camera images at half speed.",
        wide: true,
      },
      {
        type: "media",
        media: {
          kind: "video",
          src: "/media/videos/teleop-shadow-demos.mp4",
          poster: "/media/videos/teleop-shadow-demos.jpg",
          alt: "Five Shadow-hand demonstrations: the hand grasps and lifts the cube.",
        },
        caption: "Five saved Shadow-hand demonstrations, re-rendered for review.",
        wide: true,
      },
      { type: "h", text: "On a real robot" },
      {
        type: "p",
        text: "The video at the top is the same idea on hardware: I teleoperate a Wuji Hand 2 on a Franka arm with the Vision Pro while the hand's tactile readings are recorded, here while a colleague touches the robot fingers.",
      },
    ],
    credits: [
      "Advisor: Prof. Danfei Xu.",
      "Headset app: NVIDIA's open-source Isaac XR teleop sample client for Apple Vision Pro, which I patched. Streaming and simulation: NVIDIA CloudXR, Isaac Sim and Isaac Lab.",
      "Pick Cube task, wrist retargeter and the original VR recorder: DexVerse by Yunchao Yao.",
      "Robot hand models: open-source URDFs from the hand makers (sources on the cross-embodiment project page).",
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
          kind: "image",
          src: "/media/figures/gam-architecture.png",
          alt: "Diagram of GAM: a frozen geometry foundation model split at layer 12, a causal future predictor, and action, depth and feature losses.",
        },
        caption:
          "GAM as published, in a diagram I drew while porting it. Blue: pretrained and frozen. Orange: trained with GAM. Purple: training losses.",
        wide: true,
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
      {
        type: "media",
        media: {
          kind: "video",
          src: "/media/videos/gam-attention-hanoi.mp4",
          poster: "/media/videos/gam-attention-hanoi.jpg",
          alt: "Attention heat maps over the front and both wrist cameras at four layers during a Tower of Hanoi episode.",
        },
        caption:
          "Where the action tokens look: attention from GAM's action tokens to image patches in the front, left-wrist and right-wrist cameras (columns) at four layers (rows), over the same Tower of Hanoi task.",
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
        text: "Running the same seed twice changed the outcome in 22.5% of episodes. The causes were unseeded flow-matching noise in the policy and nondeterministic GPU rendering. After fixing both, reruns gave identical results, so we could tell real differences between models apart from noise. I also built the training and evaluation platform for these runs: a web console that launches, monitors and collects results for training and evaluation jobs on two Slurm clusters and a Kubernetes cluster.",
      },
      {
        type: "media",
        media: {
          kind: "image",
          src: "/media/images/train-eval-console.jpg",
          alt: "The training and evaluation console: a running DexJoCo evaluation job with per-GPU memory on 8 H200 GPUs.",
        },
        caption: "The console's job page: an 11-task DexJoCo evaluation running on 8 H200 GPUs, with progress and scheduler state.",
        wide: true,
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
  {
    slug: "robot-state-tokens",
    title: "Splitting Robot State into Tokens in GR00T N1.6",
    oneLiner:
      "GR00T N1.6 packs a humanoid's 48 joint values into a single token. Splitting them into 11 tokens raised simulated success from 35.8% to 41.5% without adding any parameters.",
    affiliation: "RLWRLD, Research Engineer",
    tags: ["GR00T N1.6", "VLA", "Humanoid", "Isaac Sim"],
    ogImage: "/media/figures/state-tokens.png",
    cover: {
      kind: "image",
      src: "/media/figures/state-tokens.svg",
      alt: "Task success against the number of robot-state tokens: 35.8% with 1 token, about 41.5% with 11 or 15 tokens.",
    },
    card: {
      kind: "image",
      src: "/media/images/allex-state-groups.jpg",
      alt: "ALLEX humanoid joints, colored by the state token each joint is grouped into.",
    },
    body: [
      { type: "h", text: "Question" },
      {
        type: "p",
        text: "GR00T N1.6 encodes the robot's whole joint state as one token, while the camera images and the instruction get many. For the ALLEX humanoid that means 48 numbers squeezed into a single token. Does the policy do better if the body gets more tokens?",
      },
      { type: "h", text: "What I did" },
      {
        type: "list",
        items: [
          "Split the 48 joint values into K equal-sized random groups, zero-padded each group to the same length, and passed every group through the existing state encoder, so the model sees K state tokens. Everything else in the model stays the same and no parameters are added.",
          "Trained GR00T N1.6 on three ALLEX manipulation tasks in Isaac Sim (cube into box, cube stacking, cylinder into tube) for K from 1 to 48, with three random groupings for each K between 3 and 15.",
          "Evaluated every model at three object offsets, 70 episodes × 3 runs each.",
        ],
      },
      {
        type: "media",
        media: {
          kind: "image",
          src: "/media/images/allex-state-groups.jpg",
          alt: "ALLEX humanoid joints, colored by the state token each joint is grouped into.",
        },
        caption: "ALLEX joints colored by the state token they are grouped into, for one random grouping.",
      },
      { type: "h", text: "Result" },
      {
        type: "p",
        text: "With 11 or 15 tokens, mean success rose from 35.8% to about 41.5%, with little spread across groupings (±0.6 and ±0.9 points). More tokens is not simply better: 3 tokens did slightly worse than the baseline and 5 to 9 tokens stayed close to it. One token per joint (48) scored highest at 44.0%, but that is a single configuration I have not repeated yet.",
      },
      { type: "h", text: "What didn't help" },
      {
        type: "p",
        text: "Two follow-ups did not beat random groups. Choosing the groups by mutual information between joints or by body part gave about 42% at best, the same as random groups. Giving each part its own encoder, or conditioning a shared encoder on the part with FiLM, made results worse (32.8% and 33.7% against 41.6%).",
      },
    ],
    credits: [
      "Work done as a Research Engineer at RLWRLD.",
      "GR00T N1.6: NVIDIA. ALLEX humanoid simulation and tasks: RLWRLD.",
    ],
  },
];

export const getProject = (slug: string) => projects.find((p) => p.slug === slug);
