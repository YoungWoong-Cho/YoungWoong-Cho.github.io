export const site = {
  name: "Youngwoong Cho",
  title: "Youngwoong Cho",
  description:
    "Robot learning researcher working on dexterous manipulation across embodiments. M.S. Robotics at Georgia Tech (RL2, Prof. Danfei Xu).",
  url: "https://youngwoong-cho.github.io",
  email: "herocho1997@gmail.com",
  github: "https://github.com/YoungWoong-Cho",
  linkedin: "https://linkedin.com/in/youngwoong-cho",
  /** Set to "/cv.pdf" once public/cv.pdf exists. */
  cv: "/cv.pdf" as string | null,
};

export type ExperienceItem = {
  org: string;
  role: string;
  period: string;
  place: string;
  note?: string;
  href?: string;
};

export const experience: ExperienceItem[] = [
  {
    org: "Georgia Tech, Robot Learning and Reasoning Lab (RL2)",
    role: "Graduate Researcher, advised by Prof. Danfei Xu",
    period: "Aug 2026 – present",
    place: "Atlanta, GA",
    note: "Cross-embodiment dexterous manipulation and learning from retargeted demonstrations.",
    href: "https://rl2.cc.gatech.edu/",
  },
  {
    org: "RLWRLD",
    href: "https://www.rlwrld.ai/en",
    role: "Research Engineer",
    period: "Apr – Aug 2026",
    place: "Seoul, Korea",
    note: "Adapted robot foundation models (GR00T N1.6, π0.5, GAM) to dexterous hands and built the training and evaluation platform.",
  },
  {
    org: "Naver Labs",
    href: "https://www.naverlabs.com",
    role: "Deep Learning Research Intern, Autonomous Driving",
    period: "Mar – Aug 2022",
    place: "Seongnam, Korea",
    note: "RL and imitation learning for 3D annotation, and a 3D annotation tool for collecting human demonstrations.",
  },
  {
    org: "Seoul Robotics",
    href: "https://seoulrobotics.tech",
    role: "Machine Learning Research Engineer Intern",
    period: "May 2021 – Mar 2022",
    place: "Seoul, Korea",
    note: "LiDAR perception: curb detection, multi-view annotation tools, and the evaluation pipeline.",
  },
  {
    org: "Seoul National University, Interactive & Network Robotics Lab",
    role: "Research Intern, Prof. Dongjun Lee",
    period: "May – Jul 2020",
    place: "Seoul, Korea",
    note: "Cooperative manipulation on a physical multi-robot testbed.",
  },
];

export const education = [
  {
    school: "Georgia Institute of Technology",
    degree: "M.S. in Robotics",
    period: "Expected May 2028",
  },
  {
    school: "The Cooper Union",
    degree: "B.E. in Mechanical Engineering, Minor in Computer Science, Summa Cum Laude",
    period: "2023",
  },
];
