export const COLORS = {
  primary: "#CDD5C6",
  secondary: "#FBF2ED",
  accent: "#B7BCBF",
  highlight: "#E8D4C6",
  light: "#FFE2C3",
} as const;

export type ColorKey = keyof typeof COLORS; 