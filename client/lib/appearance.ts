export type ThemeMode = "dark" | "light";
export type FontPresetId = "poppins" | "jakarta-inter" | "playfair-source" | "syne-manrope";
export type FontScaleId = "compact" | "default" | "large";
export type ColorThemeId =
  | "teal-tangerine"
  | "prussian-mustard"
  | "periwinkle-lime"
  | "pink-yellow"
  | "sky-sage"
  | "coral-mint"
  | "graphite";

export interface FontPreset {
  id: FontPresetId;
  name: string;
  description: string;
  headingLabel: string;
  bodyLabel: string;
  headingCss: string;
  bodyCss: string;
}

export interface ColorTheme {
  id: ColorThemeId;
  name: string;
  source: string;
  swatches: [string, string, string];
  dark: {
    accent: string;
    accentFg: string;
    accentSecondary: string;
    accentSecondaryFg: string;
    accentTertiary: string;
    bg: string;
    surface1: string;
    surface2: string;
    surface3: string;
    glassTint: string;
  };
  light: {
    accent: string;
    accentFg: string;
    accentSecondary: string;
    accentSecondaryFg: string;
    accentTertiary: string;
    bg: string;
    surface1: string;
    surface2: string;
    surface3: string;
    glassTint: string;
  };
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: "teal-tangerine",
    name: "Teal & Tangerine",
    source: "Looka Palette",
    swatches: ["#80C4B7", "#E3856B", "#EDCBD2"],
    dark: {
      accent: "#80C4B7",
      accentFg: "#071815",
      accentSecondary: "#E3856B",
      accentSecondaryFg: "#1F0D08",
      accentTertiary: "#EDCBD2",
      bg: "#091010",
      surface1: "#111A1A",
      surface2: "#182424",
      surface3: "#213030",
      glassTint: "#131F1E",
    },
    light: {
      accent: "#287D6E",
      accentFg: "#FFFFFF",
      accentSecondary: "#C95D40",
      accentSecondaryFg: "#FFFFFF",
      accentTertiary: "#9D5566",
      bg: "#F1F6F5",
      surface1: "#FFFFFF",
      surface2: "#E5EEEC",
      surface3: "#D7E4E1",
      glassTint: "#FFFFFF",
    },
  },
  {
    id: "prussian-mustard",
    name: "Prussian & Mustard",
    source: "Looka Palette",
    swatches: ["#3B5BA5", "#E87A5D", "#F3B941"],
    dark: {
      accent: "#5D83DC",
      accentFg: "#081022",
      accentSecondary: "#F3B941",
      accentSecondaryFg: "#1F1503",
      accentTertiary: "#E87A5D",
      bg: "#090C14",
      surface1: "#111726",
      surface2: "#182034",
      surface3: "#212B44",
      glassTint: "#121A2B",
    },
    light: {
      accent: "#3B5BA5",
      accentFg: "#FFFFFF",
      accentSecondary: "#B7790A",
      accentSecondaryFg: "#FFFFFF",
      accentTertiary: "#C95335",
      bg: "#F2F4F9",
      surface1: "#FFFFFF",
      surface2: "#E6EAF3",
      surface3: "#D8DFEC",
      glassTint: "#FFFFFF",
    },
  },
  {
    id: "periwinkle-lime",
    name: "Periwinkle & Lime",
    source: "Looka Palette",
    swatches: ["#678CEC", "#BBCB50", "#D49BAE"],
    dark: {
      accent: "#678CEC",
      accentFg: "#081022",
      accentSecondary: "#BBCB50",
      accentSecondaryFg: "#181C06",
      accentTertiary: "#D49BAE",
      bg: "#0A0C14",
      surface1: "#121625",
      surface2: "#191F33",
      surface3: "#232B45",
      glassTint: "#14192C",
    },
    light: {
      accent: "#476DD1",
      accentFg: "#FFFFFF",
      accentSecondary: "#6A7914",
      accentSecondaryFg: "#FFFFFF",
      accentTertiary: "#9D556F",
      bg: "#F3F5FB",
      surface1: "#FFFFFF",
      surface2: "#E8ECF6",
      surface3: "#DCE1F0",
      glassTint: "#FFFFFF",
    },
  },
  {
    id: "pink-yellow",
    name: "Crimson Pink & Gold",
    source: "Looka Palette",
    swatches: ["#C7395F", "#E8BA40", "#DED4E8"],
    dark: {
      accent: "#E05278",
      accentFg: "#1B070C",
      accentSecondary: "#E8BA40",
      accentSecondaryFg: "#1F1704",
      accentTertiary: "#DED4E8",
      bg: "#100A0D",
      surface1: "#1B1116",
      surface2: "#25181E",
      surface3: "#322129",
      glassTint: "#20141A",
    },
    light: {
      accent: "#C7395F",
      accentFg: "#FFFFFF",
      accentSecondary: "#9F740A",
      accentSecondaryFg: "#FFFFFF",
      accentTertiary: "#685282",
      bg: "#FBF4F6",
      surface1: "#FFFFFF",
      surface2: "#F4E8EC",
      surface3: "#EAD9DF",
      glassTint: "#FFFFFF",
    },
  },
  {
    id: "sky-sage",
    name: "Sky, Sage & Amber",
    source: "Looka Palette",
    swatches: ["#4AAFD5", "#91B187", "#E7A339"],
    dark: {
      accent: "#4AAFD5",
      accentFg: "#061820",
      accentSecondary: "#91B187",
      accentSecondaryFg: "#0F170D",
      accentTertiary: "#E7A339",
      bg: "#090F12",
      surface1: "#111B20",
      surface2: "#18262D",
      surface3: "#21323B",
      glassTint: "#132026",
    },
    light: {
      accent: "#2184AA",
      accentFg: "#FFFFFF",
      accentSecondary: "#527448",
      accentSecondaryFg: "#FFFFFF",
      accentTertiary: "#A86D0E",
      bg: "#F2F7F9",
      surface1: "#FFFFFF",
      surface2: "#E5EFF3",
      surface3: "#D6E5EB",
      glassTint: "#FFFFFF",
    },
  },
  {
    id: "coral-mint",
    name: "Coral & Mint",
    source: "Looka Palette",
    swatches: ["#EC6D67", "#CEE4B3", "#F2AE7F"],
    dark: {
      accent: "#EC6D67",
      accentFg: "#1D0706",
      accentSecondary: "#CEE4B3",
      accentSecondaryFg: "#131C09",
      accentTertiary: "#F2AE7F",
      bg: "#100B0B",
      surface1: "#1A1212",
      surface2: "#241919",
      surface3: "#302222",
      glassTint: "#201515",
    },
    light: {
      accent: "#D14C45",
      accentFg: "#FFFFFF",
      accentSecondary: "#4B6D27",
      accentSecondaryFg: "#FFFFFF",
      accentTertiary: "#A85D2A",
      bg: "#FBF5F4",
      surface1: "#FFFFFF",
      surface2: "#F4E9E8",
      surface3: "#EBDCD9",
      glassTint: "#FFFFFF",
    },
  },
  {
    id: "graphite",
    name: "Apple Graphite",
    source: "Minimal Studio",
    swatches: ["#E4E4E7", "#A1A1AA", "#27272A"],
    dark: {
      accent: "#F4F4F5",
      accentFg: "#09090B",
      accentSecondary: "#D4D4D8",
      accentSecondaryFg: "#09090B",
      accentTertiary: "#A1A1AA",
      bg: "#09090B",
      surface1: "#121215",
      surface2: "#1A1A1F",
      surface3: "#24242B",
      glassTint: "#16161A",
    },
    light: {
      accent: "#18181B",
      accentFg: "#FFFFFF",
      accentSecondary: "#3F3F46",
      accentSecondaryFg: "#FFFFFF",
      accentTertiary: "#52525B",
      bg: "#F5F5F7",
      surface1: "#FFFFFF",
      surface2: "#ECECEF",
      surface3: "#E0E0E6",
      glassTint: "#FFFFFF",
    },
  },
];

export const FONT_PRESETS: FontPreset[] = [
  {
    id: "jakarta-inter",
    name: "Modern SaaS",
    description: "Clean geometric headings with ultra-legible UI body",
    headingLabel: "Plus Jakarta Sans",
    bodyLabel: "Inter",
    headingCss: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    bodyCss: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  {
    id: "playfair-source",
    name: "Editorial Contrast",
    description: "High-contrast display serif paired with humanist sans",
    headingLabel: "Playfair Display",
    bodyLabel: "Source Sans 3",
    headingCss: "'Playfair Display', Georgia, serif",
    bodyCss: "'Source Sans 3', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  {
    id: "syne-manrope",
    name: "Avant-Garde Studio",
    description: "Expressive architectural headings with crisp neo-grotesque body",
    headingLabel: "Syne",
    bodyLabel: "Manrope",
    headingCss: "'Syne', -apple-system, BlinkMacSystemFont, sans-serif",
    bodyCss: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  {
    id: "poppins",
    name: "Studio Classic",
    description: "Uniform rounded geometric typography throughout",
    headingLabel: "Poppins",
    bodyLabel: "Poppins",
    headingCss: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
    bodyCss: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
  },
];

export const FONT_SCALE_OPTIONS: { id: FontScaleId; label: string; px: string }[] = [
  { id: "compact", label: "Standard (16px)", px: "16px" },
  { id: "default", label: "Comfort (18px)", px: "18px" },
  { id: "large", label: "Large (19.5px)", px: "19.5px" },
];

export interface AppearanceSettings {
  theme: ThemeMode;
  colorTheme: ColorThemeId;
  fontPreset: FontPresetId;
  fontScale: FontScaleId;
}

const STORAGE_KEYS = {
  theme: "latentcraft_theme",
  colorTheme: "latentcraft_color_theme",
  fontPreset: "latentcraft_font_preset",
  fontScale: "latentcraft_font_scale",
};

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function loadAppearanceSettings(): AppearanceSettings {
  if (typeof window === "undefined") {
    return { theme: "dark", colorTheme: "teal-tangerine", fontPreset: "jakarta-inter", fontScale: "default" };
  }
  try {
    const theme = (localStorage.getItem(STORAGE_KEYS.theme) as ThemeMode) || "dark";
    const colorTheme = (localStorage.getItem(STORAGE_KEYS.colorTheme) as ColorThemeId) || "teal-tangerine";
    const fontPreset = (localStorage.getItem(STORAGE_KEYS.fontPreset) as FontPresetId) || "jakarta-inter";
    const fontScale = (localStorage.getItem(STORAGE_KEYS.fontScale) as FontScaleId) || "default";
    return {
      theme: theme === "light" ? "light" : "dark",
      colorTheme: COLOR_THEMES.some((c) => c.id === colorTheme) ? colorTheme : "teal-tangerine",
      fontPreset: FONT_PRESETS.some((p) => p.id === fontPreset) ? fontPreset : "jakarta-inter",
      fontScale: FONT_SCALE_OPTIONS.some((s) => s.id === fontScale) ? fontScale : "default",
    };
  } catch {
    return { theme: "dark", colorTheme: "teal-tangerine", fontPreset: "jakarta-inter", fontScale: "default" };
  }
}

export function applyAppearanceSettings(settings: AppearanceSettings): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const isLight = settings.theme === "light";

  if (isLight) {
    root.classList.add("light");
  } else {
    root.classList.remove("light");
  }

  const themeObj = COLOR_THEMES.find((c) => c.id === settings.colorTheme) || COLOR_THEMES[0];
  const palette = isLight ? themeObj.light : themeObj.dark;

  root.style.setProperty("--background", palette.bg);
  root.style.setProperty("--card", palette.surface1);
  root.style.setProperty("--surface-raised", palette.surface1);
  root.style.setProperty("--surface-overlay", palette.surface2);
  root.style.setProperty("--surface-elevated", palette.surface3);
  root.style.setProperty("--muted", palette.surface2);
  root.style.setProperty("--secondary", palette.surface2);
  root.style.setProperty("--accent", palette.surface3);

  root.style.setProperty("--glass-bg", hexToRgba(palette.glassTint, isLight ? 0.72 : 0.64));
  root.style.setProperty("--glass-bg-elevated", hexToRgba(palette.glassTint, isLight ? 0.86 : 0.78));
  root.style.setProperty("--popover", hexToRgba(palette.glassTint, isLight ? 0.88 : 0.84));
  root.style.setProperty(
    "--glass-highlight",
    isLight ? "rgba(255, 255, 255, 0.9)" : hexToRgba(palette.accent, 0.14)
  );

  root.style.setProperty("--brand-accent", palette.accent);
  root.style.setProperty("--brand-accent-fg", palette.accentFg);
  root.style.setProperty("--brand-accent-soft", hexToRgba(palette.accent, isLight ? 0.14 : 0.18));

  root.style.setProperty("--brand-secondary", palette.accentSecondary);
  root.style.setProperty("--brand-secondary-fg", palette.accentSecondaryFg);
  root.style.setProperty("--brand-secondary-soft", hexToRgba(palette.accentSecondary, isLight ? 0.14 : 0.18));

  root.style.setProperty("--brand-tertiary", palette.accentTertiary);
  root.style.setProperty("--brand-tertiary-soft", hexToRgba(palette.accentTertiary, isLight ? 0.14 : 0.16));

  root.style.setProperty("--primary", palette.accent);
  root.style.setProperty("--primary-foreground", palette.accentFg);
  root.style.setProperty("--ring", palette.accent);

  root.style.setProperty("--ambient-glow-1", hexToRgba(palette.accent, isLight ? 0.16 : 0.18));
  root.style.setProperty("--ambient-glow-2", hexToRgba(palette.accentSecondary, isLight ? 0.14 : 0.15));
  root.style.setProperty("--ambient-glow-3", hexToRgba(palette.accentTertiary, isLight ? 0.12 : 0.1));

  const preset = FONT_PRESETS.find((p) => p.id === settings.fontPreset) || FONT_PRESETS[0];
  root.style.setProperty("--font-heading", preset.headingCss);
  root.style.setProperty("--font-body", preset.bodyCss);
  root.style.setProperty("--font-sans", preset.bodyCss);

  const scale = FONT_SCALE_OPTIONS.find((s) => s.id === settings.fontScale) || FONT_SCALE_OPTIONS[1];
  root.style.setProperty("--root-font-size", scale.px);
  root.style.fontSize = scale.px;

  try {
    localStorage.setItem(STORAGE_KEYS.theme, settings.theme);
    localStorage.setItem(STORAGE_KEYS.colorTheme, settings.colorTheme);
    localStorage.setItem(STORAGE_KEYS.fontPreset, settings.fontPreset);
    localStorage.setItem(STORAGE_KEYS.fontScale, settings.fontScale);
    window.dispatchEvent(new CustomEvent("latentcraft-appearance-change", { detail: settings }));
  } catch {}
}
