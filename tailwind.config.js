/** Colours come from CSS variables (src/index.css) so light/dark swap in one place. */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        surface: "var(--surface)",
        sunken: "var(--sunken)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        line: "var(--line)",
        action: "var(--action)",
        "action-ink": "var(--action-ink)",
        series: { 1: "var(--series-1)", 2: "var(--series-2)", 3: "var(--series-3)" },
        risk: {
          low: "var(--risk-low)",
          medium: "var(--risk-medium)",
          high: "var(--risk-high)",
          critical: "var(--risk-critical)",
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', "system-ui", "sans-serif"],
        sans: ['"Public Sans Variable"', "system-ui", "sans-serif"],
      },
      borderRadius: { panel: "6px" },
    },
  },
  plugins: [],
};
