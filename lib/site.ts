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
  /** Square headshot shown in the intro, e.g. "/media/images/profile.jpg". */
  photo: "/media/images/profile.jpg" as string | null,
  /** Highlighted line under the intro; null hides it. */
  seeking: "I'm looking for research internships for Summer 2027. Feel free to reach out!" as string | null,
};

export type ExperienceItem = {
  org: string;
  /** Short name for the home-page timeline. */
  short: string;
  /** Square logo shown on the timeline. */
  logo: string;
  role: string;
  period: string;
};

export const experience: ExperienceItem[] = [
  {
    org: "Georgia Tech, Robot Learning and Reasoning Lab (RL2)",
    short: "Georgia Tech RL2",
    logo: "/media/logos/gatech.png",
    role: "Graduate Researcher, advised by Prof. Danfei Xu",
    period: "Aug 2026 – present",
  },
  {
    org: "RLWRLD",
    short: "RLWRLD",
    logo: "/media/logos/rlwrld.png",
    role: "Research Engineer",
    period: "Apr – Aug 2026",
  },
  {
    org: "Naver Labs",
    short: "Naver Labs",
    logo: "/media/logos/naverlabs.png",
    role: "Deep Learning Research Intern, Autonomous Driving",
    period: "Mar – Aug 2022",
  },
  {
    org: "Seoul Robotics",
    short: "Seoul Robotics",
    logo: "/media/logos/seoulrobotics.png",
    role: "Machine Learning Research Engineer Intern",
    period: "May 2021 – Mar 2022",
  },
  {
    org: "Seoul National University, Interactive & Network Robotics Lab",
    short: "Seoul National University",
    logo: "/media/logos/snu.png",
    role: "Research Intern, Prof. Dongjun Lee",
    period: "May – Jul 2020",
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

export type LinkItem = { label: string; href: string };

export const earlierProjects: { title: string; context: string; text: string; links?: LinkItem[] }[] = [
  {
    title: "BarlowZero: Sample-Efficient Model-Based Reinforcement Learning",
    context: "ECE-472 Deep Learning, The Cooper Union · Fall 2022",
    text: "A MuZero variant with Barlow Twins self-supervision. It cut the training batch size from 512 to 64 while performing comparably to EfficientZero on Atari Breakout.",
    links: [
      { label: "Report", href: "/media/docs/barlowzero-report.pdf" },
      { label: "Code", href: "https://github.com/YoungWoong-Cho/ECE472/tree/main/finals" },
    ],
  },
  {
    title: "Self-Driving Delivery Robot",
    context: "Senior capstone, The Cooper Union · Spring 2023",
    text: "An end-to-end autonomous navigation stack (3D LiDAR SLAM, localization, planning, control) for an indoor delivery robot, with localization latency under 100 ms.",
  },
  {
    title: "Cooper Union IGVC",
    context: "Intelligent Ground Vehicle Competition · 2022–2023",
    text: "LiDAR- and RGB-based localization, mapping, and path planning in ROS, plus an OCR-based stop-sign classifier. Placed 2nd in autonomous navigation and 3rd in vehicle design.",
  },
];
