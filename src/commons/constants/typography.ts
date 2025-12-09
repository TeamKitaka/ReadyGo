/**
 * Typography 토큰 정의
 *
 * 피그마 파운데이션을 기반으로 한 타이포그래피 시스템
 * - 한글: Pretendard
 * - 영문: 추후 다른 폰트로 변경 가능하도록 설정
 * - 코드: Source Code Pro
 * - 모바일/데스크톱 반응형 지원
 */

// 폰트 패밀리 정의
export const fontFamily = {
  korean:
    "Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  english:
    "Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif", // 추후 영문 폰트로 변경 가능
  code: '"Source Code Pro", "Courier New", monospace',
} as const;

// 폰트 웨이트 정의
export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

// 타이포그래피 스타일 타입
export type TypographyVariant =
  | "heading-4xl"
  | "heading-3xl"
  | "heading-2xl"
  | "heading-xl"
  | "heading-lg"
  | "heading-md"
  | "heading-sm"
  | "body-lg-semibold"
  | "body-lg-medium"
  | "body-md-semibold"
  | "body-md-medium"
  | "body-md-underline"
  | "body-md-encode"
  | "body-sm-medium";

// 데스크톱 타이포그래피 스타일
export const typographyDesktop: Record<
  TypographyVariant,
  {
    fontSize: number;
    lineHeight: number;
    fontWeight: number;
    fontFamily: string;
    textDecoration?: string;
  }
> = {
  "heading-4xl": {
    fontSize: 48,
    lineHeight: 52,
    fontWeight: fontWeight.bold,
    fontFamily: fontFamily.korean,
  },
  "heading-3xl": {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.korean,
  },
  "heading-2xl": {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.korean,
  },
  "heading-xl": {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.korean,
  },
  "heading-lg": {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.korean,
  },
  "heading-md": {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.korean,
  },
  "heading-sm": {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.korean,
  },
  "body-lg-semibold": {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.korean,
  },
  "body-lg-medium": {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeight.medium,
    fontFamily: fontFamily.korean,
  },
  "body-md-semibold": {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.korean,
  },
  "body-md-medium": {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeight.medium,
    fontFamily: fontFamily.korean,
  },
  "body-md-underline": {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeight.medium,
    fontFamily: fontFamily.korean,
    textDecoration: "underline",
  },
  "body-md-encode": {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeight.medium,
    fontFamily: fontFamily.code,
  },
  "body-sm-medium": {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: fontWeight.medium,
    fontFamily: fontFamily.korean,
  },
} as const;

// 모바일 타이포그래피 스타일
export const typographyMobile: Record<
  TypographyVariant,
  {
    fontSize: number;
    lineHeight: number;
    fontWeight: number;
    fontFamily: string;
    textDecoration?: string;
  }
> = {
  "heading-4xl": {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: fontWeight.bold,
    fontFamily: fontFamily.korean,
  },
  "heading-3xl": {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.korean,
  },
  "heading-2xl": {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: fontWeight.bold,
    fontFamily: fontFamily.korean,
  },
  "heading-xl": {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.korean,
  },
  "heading-lg": {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.korean,
  },
  "heading-md": {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.korean,
  },
  "heading-sm": {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.korean,
  },
  "body-lg-semibold": {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.korean,
  },
  "body-lg-medium": {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: fontWeight.medium,
    fontFamily: fontFamily.korean,
  },
  "body-md-semibold": {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeight.semibold,
    fontFamily: fontFamily.korean,
  },
  "body-md-medium": {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeight.medium,
    fontFamily: fontFamily.korean,
  },
  "body-md-underline": {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeight.medium,
    fontFamily: fontFamily.korean,
    textDecoration: "underline",
  },
  "body-md-encode": {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: fontWeight.medium,
    fontFamily: fontFamily.code,
  },
  "body-sm-medium": {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: fontWeight.medium,
    fontFamily: fontFamily.korean,
  },
} as const;

// CSS 변수 이름 생성 헬퍼
export const getTypographyCSSVar = (
  variant: TypographyVariant,
  property:
    | "fontSize"
    | "lineHeight"
    | "fontWeight"
    | "fontFamily"
    | "textDecoration"
) => {
  return `--typography-${variant}-${property}`;
};

// 모든 타이포그래피 토큰을 CSS 변수로 내보내기
export const typographyTokens = {
  desktop: typographyDesktop,
  mobile: typographyMobile,
  fontFamily,
  fontWeight,
} as const;
