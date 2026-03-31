/**
 * Single source for layout spacing. Screens and shared surfaces should use these
 * instead of ad-hoc numeric padding/margin.
 */
export const spacing = {
  /** 4 */
  xs: 4,
  /** 8 */
  sm: 8,
  /** 12 */
  md: 12,
  /** 16 */
  lg: 16,
  /** 20 */
  xl: 20,
  /** 24 */
  xxl: 24,
  /** 32 */
  xxxl: 32,
  /** Vertical gap between stacked cards / list rows */
  cardGap: 12,
  /** Space between major sections on a screen */
  sectionGap: 24,
  /** Space after a page headline */
  afterHeadline: 24,
  /** Top inset for content under a native Stack header */
  screenTopNav: 8,
  /** Minimum scroll bottom padding (added to safe-area bottom) */
  bottomContent: 24,
} as const;

export const layout = {
  /** Horizontal padding for screen body (matches header logo row) */
  screenHorizontal: 20,
  screenBackground: "#ffffff",
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

export const colors = {
  text: "#1e293b",
  textMuted: "#64748b",
  textSubtle: "#94a3b8",
  border: "#e2e8f0",
  surface: "#f8fafc",
  primary: "#2563eb",
} as const;
