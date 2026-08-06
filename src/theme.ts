import { Platform } from "react-native";

/**
 * Design tokens — the single source of truth for the app's look.
 * See ARCHITECTURE.md §5. No hardcoded hex values in screens/components:
 * if a color/size isn't here, it doesn't exist.
 *
 * Intent: clinical instrument. White canvas, one accent, color reserved
 * for clinical meaning (danger/warning/success), values loud, labels quiet.
 */

export const colors = {
  // Canvas & surfaces — white is the primary color of the app
  background: "#FAFAF8", // app canvas (warm off-white)
  surface: "#FFFFFF", // cards, inputs, headers
  surfaceMuted: "#F2F2EF", // pressed states, subtle fills

  // Text — near-black, warm neutral grays
  text: "#1A1A1A", // primary text, values
  textSecondary: "#6B6B66", // labels, units, metadata
  textMuted: "#A3A39C", // placeholders, disabled

  // Borders
  border: "#E7E7E2",
  borderStrong: "#CFCFC7", // input borders
  hairline: "rgba(26, 26, 26, 0.08)", // translucent section/nav dividers
  hairlineStrong: "rgba(26, 26, 26, 0.12)",

  // The one accent — warm green. Primary actions, focus, links.
  accent: "#4A7C59",
  accentPressed: "#3B6347",
  accentSoft: "#EEF4EF", // selected/hover fills
  onAccent: "#FFFFFF",

  // Clinical semantics — never used decoratively.
  // success is deliberately cooler/deeper than the warm accent so
  // "confirmed/normal" reads differently from "tap me".
  danger: "#C62828", // alerts, destructive, errors
  dangerSoft: "#FDECEA",
  warning: "#B45309", // approaching thresholds
  warningSoft: "#FEF3C7",
  success: "#1B7F3B", // normal / saved / confirmed
  successSoft: "#E7F4EB",
} as const;

/** 4px-based spacing scale. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 6, // inputs, buttons
  md: 8, // cards
  lg: 12, // dialogs
  full: 999,
} as const;

/**
 * Type scale. `value`/`valueLarge` are for clinical readings: big, dark,
 * tabular figures so columns of numbers align and are glanceable.
 */
export const type = {
  display: { fontSize: 26, fontWeight: "700", color: colors.text } as const,
  title: { fontSize: 19, fontWeight: "600", color: colors.text } as const,
  body: { fontSize: 15, fontWeight: "400", color: colors.text } as const,
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
  } as const,
  caption: { fontSize: 12, fontWeight: "400", color: colors.textMuted } as const,
  value: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  } as const,
  valueLarge: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  } as const,
} as const;

/**
 * Font family for text inside react-native-svg graphs. SVG text does not
 * inherit the app font on web (browsers default to a serif), so it must be
 * set explicitly there; native already uses the system font.
 */
export const svgFontFamily = Platform.select({
  web: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
  default: undefined,
});

/**
 * Monospace face for clinical readings (BPM, dilation, dossier numbers) —
 * a small nod to a bedside monitor readout, used wherever a number is a
 * measured value rather than plain body text.
 */
export const monoFontFamily = Platform.select({
  ios: "Menlo",
  android: "monospace",
  web: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  default: "monospace",
});

export const layout = {
  /** Minimum touch target (gloved hands, stress). */
  touchTarget: 48,
  /** Forms/dialogs never grow wider than this on desktop. */
  maxFormWidth: 420,
  /** Reading content (lists, tables) cap on desktop. */
  maxContentWidth: 960,
} as const;

/**
 * Partogramme status → chip colors, following the clinical semantics above:
 * amber = labor in progress (needs attention), accent = transferred to the
 * doctor, green = finished/normal, neutral = admitted.
 */
export function statusColors(status: string | null | undefined): {
  bg: string;
  fg: string;
} {
  switch (status) {
    case "IN_PROGRESS":
      return { bg: colors.warningSoft, fg: colors.warning };
    case "TRANSFERRED":
      return { bg: colors.accentSoft, fg: colors.accent };
    case "WORK_FINISHED":
      return { bg: colors.successSoft, fg: colors.success };
    case "ADMITTED":
      return { bg: colors.accentSoft, fg: colors.accent };
    default:
      return { bg: colors.surfaceMuted, fg: colors.textSecondary };
  }
}

export const theme = { colors, spacing, radius, type, layout } as const;
export default theme;
