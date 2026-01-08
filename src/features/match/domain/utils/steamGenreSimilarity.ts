/**
 * Steam 장르 유사도 계산
 *
 * 📌 책임 (Responsibility):
 * - viewer와 target의 주요 장르 간 유사도 계산
 * - Jaccard 유사도 사용 (공통 장르 수 / 전체 장르 수)
 * - 0~100 범위의 점수 반환
 *
 * 📌 입력:
 * - viewerGenres: viewer의 주요 장르 목록 (최대 3개)
 * - targetGenres: target의 주요 장르 목록 (최대 3개)
 *
 * 📌 출력:
 * - number: 장르 유사도 (0~100)
 *
 * 📌 계산 방식:
 * - Jaccard 유사도 = |A ∩ B| / |A ∪ B|
 * - 공통 장르 수 / 전체 장르 수 (중복 제거)
 * - 백분율로 변환 (0~100)
 *
 * @example
 * ```typescript
 * // 완전 일치
 * calculateGenreSimilarity(['RPG', 'Action', 'Adventure'], ['RPG', 'Action', 'Adventure'])
 * // → 100
 *
 * // 부분 일치
 * calculateGenreSimilarity(['RPG', 'Action', 'Adventure'], ['RPG', 'Strategy', 'Simulation'])
 * // → 20 (1개 공통 / 5개 전체)
 *
 * // 불일치
 * calculateGenreSimilarity(['RPG', 'Action'], ['Strategy', 'Simulation'])
 * // → 0
 *
 * // 빈 배열
 * calculateGenreSimilarity([], ['RPG', 'Action'])
 * // → 0
 * ```
 */
export const calculateGenreSimilarity = (
  viewerGenres: string[],
  targetGenres: string[]
): number => {
  // 빈 배열 처리
  if (viewerGenres.length === 0 || targetGenres.length === 0) {
    return 0;
  }

  // 대소문자 구분 없이 비교하기 위해 소문자로 변환
  const viewerSet = new Set(viewerGenres.map((g) => g.toLowerCase().trim()));
  const targetSet = new Set(targetGenres.map((g) => g.toLowerCase().trim()));

  // 교집합 (공통 장르)
  const intersection = new Set(
    Array.from(viewerSet).filter((genre) => targetSet.has(genre))
  );

  // 합집합 (전체 장르, 중복 제거)
  const union = new Set([...Array.from(viewerSet), ...Array.from(targetSet)]);

  // Jaccard 유사도 계산
  const similarity = intersection.size / union.size;

  // 백분율로 변환 (0~100)
  return Math.round(similarity * 100);
};

