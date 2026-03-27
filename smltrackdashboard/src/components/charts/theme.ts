// Chart color palette — works with dark/light theme
export const CHART_COLORS = [
  "#818cf8", // indigo (primary)
  "#22d3ee", // cyan (accent)
  "#34d399", // emerald
  "#fbbf24", // amber
  "#f87171", // red
  "#a78bfa", // violet
  "#fb923c", // orange
  "#2dd4bf", // teal
  "#f472b6", // pink
  "#60a5fa", // blue
];

export const PIPELINE_COLORS: Record<string, string> = {
  new: "#6b7280",
  interested: "#60a5fa",
  quoting: "#a78bfa",
  negotiating: "#fbbf24",
  closed_won: "#34d399",
  closed_lost: "#f87171",
  following_up: "#22d3ee",
};

export const PLATFORM_COLORS: Record<string, string> = {
  line: "#22c55e",
  facebook: "#3b82f6",
  instagram: "#ec4899",
};

export const SENTIMENT_COLORS: Record<string, string> = {
  green: "#34d399",
  yellow: "#fbbf24",
  red: "#f87171",
};

// Shared chart style for dark theme
export const chartStyle = {
  fontSize: 11,
  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
};
