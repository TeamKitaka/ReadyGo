/**
 * Color Design Tokens
 *
 * 프로젝트 전체에서 사용되는 색상 토큰 정의
 * 라이트 모드와 다크 모드를 모두 지원합니다.
 *
 * 피그마 파운데이션 노드 ID: 42:8577
 */

/**
 * 기본 색상 토큰
 */
export const colorTokens = {
  light: {
    // 기본 색상
    background: "#ffffff",
    foreground: "#171717",

    // Primary 색상 팔레트
    primary: {
      50: "#f0f9ff",
      100: "#e0f2fe",
      200: "#bae6fd",
      300: "#7dd3fc",
      400: "#38bdf8",
      500: "#0ea5e9",
      600: "#0284c7",
      700: "#0369a1",
      800: "#075985",
      900: "#0c4a6e",
      950: "#082f49",
    },

    // Secondary 색상 팔레트
    secondary: {
      50: "#fafafa",
      100: "#f4f4f5",
      200: "#e4e4e7",
      300: "#d4d4d8",
      400: "#a1a1aa",
      500: "#71717a",
      600: "#52525b",
      700: "#3f3f46",
      800: "#27272a",
      900: "#18181b",
      950: "#09090b",
    },

    // 상태 색상
    status: {
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#3b82f6",
    },

    // 테두리 및 구분선
    border: {
      default: "#e5e7eb",
      divider: "#e5e7eb",
    },

    // 텍스트 색상
    text: {
      primary: "#171717",
      secondary: "#52525b",
      tertiary: "#a1a1aa",
      disabled: "#d4d4d8",
    },
  },

  dark: {
    // 기본 색상
    background: "#0a0a0a",
    foreground: "#ededed",

    // Primary 색상 팔레트 (다크모드용 반전)
    primary: {
      50: "#082f49",
      100: "#0c4a6e",
      200: "#075985",
      300: "#0369a1",
      400: "#0284c7",
      500: "#0ea5e9",
      600: "#38bdf8",
      700: "#7dd3fc",
      800: "#bae6fd",
      900: "#e0f2fe",
      950: "#f0f9ff",
    },

    // Secondary 색상 팔레트 (다크모드용 반전)
    secondary: {
      50: "#09090b",
      100: "#18181b",
      200: "#27272a",
      300: "#3f3f46",
      400: "#52525b",
      500: "#71717a",
      600: "#a1a1aa",
      700: "#d4d4d8",
      800: "#e4e4e7",
      900: "#f4f4f5",
      950: "#fafafa",
    },

    // 상태 색상 (다크모드에서도 동일)
    status: {
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#3b82f6",
    },

    // 테두리 및 구분선
    border: {
      default: "#27272a",
      divider: "#27272a",
    },

    // 텍스트 색상
    text: {
      primary: "#ededed",
      secondary: "#a1a1aa",
      tertiary: "#71717a",
      disabled: "#52525b",
    },
  },
} as const;

/**
 * CSS 변수 이름 생성 헬퍼
 */
export const getColorVarName = (path: string[]): string => {
  return `--color-${path.join("-")}`;
};

/**
 * Color 토큰을 CSS 변수 이름으로 매핑
 */
export const colorVarNames = {
  light: {
    background: getColorVarName(["background"]),
    foreground: getColorVarName(["foreground"]),
    primary: {
      50: getColorVarName(["primary", "50"]),
      100: getColorVarName(["primary", "100"]),
      200: getColorVarName(["primary", "200"]),
      300: getColorVarName(["primary", "300"]),
      400: getColorVarName(["primary", "400"]),
      500: getColorVarName(["primary", "500"]),
      600: getColorVarName(["primary", "600"]),
      700: getColorVarName(["primary", "700"]),
      800: getColorVarName(["primary", "800"]),
      900: getColorVarName(["primary", "900"]),
      950: getColorVarName(["primary", "950"]),
    },
    secondary: {
      50: getColorVarName(["secondary", "50"]),
      100: getColorVarName(["secondary", "100"]),
      200: getColorVarName(["secondary", "200"]),
      300: getColorVarName(["secondary", "300"]),
      400: getColorVarName(["secondary", "400"]),
      500: getColorVarName(["secondary", "500"]),
      600: getColorVarName(["secondary", "600"]),
      700: getColorVarName(["secondary", "700"]),
      800: getColorVarName(["secondary", "800"]),
      900: getColorVarName(["secondary", "900"]),
      950: getColorVarName(["secondary", "950"]),
    },
    status: {
      success: getColorVarName(["success"]),
      warning: getColorVarName(["warning"]),
      error: getColorVarName(["error"]),
      info: getColorVarName(["info"]),
    },
    border: {
      default: getColorVarName(["border"]),
      divider: getColorVarName(["divider"]),
    },
    text: {
      primary: getColorVarName(["text", "primary"]),
      secondary: getColorVarName(["text", "secondary"]),
      tertiary: getColorVarName(["text", "tertiary"]),
      disabled: getColorVarName(["text", "disabled"]),
    },
  },
} as const;

/**
 * 현재 테마에 맞는 색상 토큰 반환
 * @param theme - 'light' | 'dark'
 */
export const getColorTokens = (theme: "light" | "dark" = "light") => {
  return colorTokens[theme];
};

/**
 * CSS 변수로 색상 값 가져오기
 * @param varName - CSS 변수 이름 (예: '--color-primary-500')
 */
export const getColorVar = (varName: string): string => {
  return `var(${varName})`;
};

// 타입 정의
export type ColorTheme = "light" | "dark";
export type PrimaryColorScale = keyof typeof colorTokens.light.primary;
export type SecondaryColorScale = keyof typeof colorTokens.light.secondary;
export type StatusColor = keyof typeof colorTokens.light.status;
export type TextColor = keyof typeof colorTokens.light.text;
