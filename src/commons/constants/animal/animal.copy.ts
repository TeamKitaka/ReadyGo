/**
 * Animal Copy Data
 * UI 문구, 역할, 설명 등
 */

import { AnimalType } from './animal.enum';

// ============================================
// Copy Type Definition
// ============================================

export type AnimalCopy = {
  label: string;
  description: string[];
  extendedDescription: string;
  mainRole: {
    name: string;
    description: string;
  };
  subRole: {
    name: string;
    description: string;
  };
  checkSentences: string[];
  unknownDescriptions?: {
    my: string;
    user: string;
  };
};

// ============================================
// Copy Data
// ============================================

export const animalCopies: Record<AnimalType, AnimalCopy> = {
  // ========== attack 그룹 ==========
  [AnimalType.wolf]: {
    label: '늑대',
    description: ['타고난 리더', '팀을 이끄는 카리스마와 강한 주도력'],
    extendedDescription:
      '늑대 타입의 당신은 팀을 이끄는 강한 추진력과 리더십을 지닌 플레이어입니다. 상황이 주어지면 과감하게 전진하며 흐름을 만들어내고, 팀이 따라갈 수 있는 방향을 제시합니다. 협동도 가능하지만 결국 판을 움직이는 핵심 동력은 언제나 당신입니다.',
    mainRole: {
      name: '전술리더',
      description: '팀의 흐름을 먼저 읽고,\n싸울지 물러날지의 기준을 잡습니다.',
    },
    subRole: {
      name: '메인콜러',
      description:
        '상황을 빠르게 공유하고,\n결정이 필요한 순간 콜로 팀을 묶습니다.',
    },
    checkSentences: [
      '팀을 끌고 가며 필요한 순간 과감하게 밀어붙입니다.',
      '결단이 필요한 상황에서 주저하지 않는 편입니다.',
      '전체 흐름을 보며 팀의 방향을 잡습니다.',
    ],
  },
  [AnimalType.tiger]: {
    label: '호랑이',
    description: ['판을 깨는 공격수', '빠르고 과감한 돌파형 플레이어'],
    extendedDescription:
      '호랑이 타입의 당신은 과감하고 단독 행동에 능한 공격적 플레이가 특징입니다. 빠른 판단과 높은 모험성으로 누구보다 먼저 치고 나가며 전장의 흐름을 폭발적으로 바꿉니다. 팀에 얽매이기보다는 스스로 기회를 만들고 해결하는 솔로 캐리형입니다.',
    mainRole: {
      name: '돌파 실행가',
      description: '빠른 판단과 과감한 진입으로,\n전투의 흐름을 직접 바꿉니다.',
    },
    subRole: {
      name: '선봉 압박자',
      description: '앞에서 압박하며,\n팀이 공격적으로 나설 수 있게 만듭니다.',
    },
    checkSentences: [
      '혼자서도 빠르게 치고 나가는 플레이를 선호합니다.',
      '공격 타이밍을 놓치지 않는 편입니다.',
      '솔랭이나 개인 기량 중심 플레이에 강합니다.',
    ],
  },
  [AnimalType.hawk]: {
    label: '매',
    description: ['한 방 노리는 딜러', '침착한 판단과 정확한 타이밍'],
    extendedDescription:
      '매 타입의 당신은 침착함과 관찰력, 정확한 판단을 바탕으로 한 방을 노리는 전략적 딜러입니다. 감정에 흔들리지 않고 분석을 통해 최적의 타이밍을 포착하며, 정확한 결정으로 팀의 승리에 기여합니다. 단독 플레이에서도 흔들림 없는 집중형입니다.',
    mainRole: {
      name: '정밀 딜러',
      description: '상황을 정확히 읽고,\n필요한 순간에만 공격합니다.',
    },
    subRole: {
      name: '침착한 판단자',
      description: '감정에 휘둘리지 않고,\n냉정한 선택을 유지합니다.',
    },
    checkSentences: [
      '집중력과 정확도를 중요하게 생각합니다.',
      '무리하지 않고 확실한 상황만 노립니다.',
      '침착한 플레이로 안정적인 딜을 넣습니다.',
    ],
  },

  // ========== strategy 그룹 ==========
  [AnimalType.owl]: {
    label: '올빼미',
    description: ['판을 읽는 전략가', '운영으로 승리를 설계하는 타입'],
    extendedDescription:
      '올빼미 타입의 당신은 게임의 큰 흐름을 읽고 장기적인 전략을 세우는 운영 장인입니다. 계산적인 선택과 안정적 플레이를 선호하며, 팀 전체의 승리 구조를 세밀하게 설계합니다. 눈앞의 싸움보다 전체 판을 바라보는 통찰력 있는 전략가입니다.',
    mainRole: {
      name: '운영 전략가',
      description: '전체 흐름을 길게 보며,\n운영 중심으로 전투를 설계합니다.',
    },
    subRole: {
      name: '판단 보조자',
      description: '리스크를 계산해,\n안정적인 선택을 돕습니다.',
    },
    checkSentences: [
      '장기적인 운영과 흐름을 중시합니다.',
      '급한 판단보다는 안정적인 선택을 선호합니다.',
      '게임 전체를 설계하듯 플레이합니다.',
    ],
  },
  [AnimalType.fox]: {
    label: '여우',
    description: ['흐름 뒤집는 전략가', '눈치와 심리전에 강한 플레이'],
    extendedDescription:
      '여우 타입의 당신은 센스와 눈치, 심리전을 통해 흐름을 뒤집는 유연한 전술가입니다. 상대의 의도를 빠르게 파악해 허점을 파고들며, 예측 불가능한 움직임으로 변수를 만들어냅니다. 안정적이면서도 전략적인 플레이로 팀 전황을 변화시키는 타입입니다.',
    mainRole: {
      name: '심리전 설계자',
      description: '상대의 선택을 읽고,\n유리한 상황을 만듭니다.',
    },
    subRole: {
      name: '유연한 대응자',
      description: '상황에 따라 전략을 바꾸며,\n흐름을 조절합니다.',
    },
    checkSentences: [
      '눈치 싸움과 심리전에 강한 편입니다.',
      '정형화되지 않은 플레이를 선호합니다.',
      '유연한 판단으로 상황을 풀어갑니다.',
    ],
  },
  [AnimalType.hedgehog]: {
    label: '고슴도치',
    description: ['공략 파는 연구가', '최적화에 진심인 분석형 플레이어'],
    extendedDescription:
      '고슴도치 타입의 당신은 연구와 분석을 통해 정교한 플레이를 구성하는 학습형 게이머입니다. 공략의 완성도를 중시하며 깊이 파고드는 스타일로 높은 효율을 만들어냅니다. 팀플보다 독립적인 연구에서 강점을 발휘하는 최적화형 플레이어입니다.',
    mainRole: {
      name: '공략 연구가',
      description: '데이터와 공략을 기반으로,\n최적의 플레이를 찾습니다.',
    },
    subRole: {
      name: '최적화 담당',
      description: '세부 요소를 분석해,\n플레이 효율을 높입니다.',
    },
    checkSentences: [
      '혼자서 공략을 연구하는 시간을 즐깁니다.',
      '실험과 분석을 통해 답을 찾는 편입니다.',
      '최적화된 플레이를 선호합니다.',
    ],
  },
  [AnimalType.raven]: {
    label: '까마귀',
    description: ['패턴 읽는 관찰자', '계산적인 예측 플레이의 달인'],
    extendedDescription:
      '까마귀 타입의 당신은 뛰어난 관찰력과 계산 능력으로 판의 흐름을 읽어내는 예측형 플레이어입니다. 상대 패턴을 빠르게 분석해 실수를 최소화하며 안정적인 운영을 만들어냅니다. 조용하지만 정확한 판단으로 팀에 균형과 통찰을 더합니다.',
    mainRole: {
      name: '패턴 분석가',
      description: '상대의 움직임을 읽고,\n다음 행동을 예측합니다.',
    },
    subRole: {
      name: '정보 공유자',
      description: '관찰한 내용을 정리해,\n팀에 전달합니다.',
    },
    checkSentences: [
      '상대 패턴을 파악하는 데 강합니다.',
      '계산된 플레이를 선호합니다.',
      '전투 흐름을 예측하며 움직입니다.',
    ],
  },

  // ========== support 그룹 ==========
  [AnimalType.bear]: {
    label: '곰',
    description: ['팀을 지켜주는 버팀목', '안정적인 보호와 든든한 팀플레이'],
    extendedDescription:
      '곰 타입의 당신은 묵직한 안정감으로 팀을 든든하게 지켜주는 보호자형 스타일입니다. 모험보다는 생존과 유지력을 중심으로 플레이하며, 위기 상황에서도 쉽게 흔들리지 않습니다. 믿고 따라갈 수 있는 안정적 팀 플레이의 핵심 존재입니다.',
    mainRole: {
      name: '팀 보호자',
      description: '팀의 중심을 지키며,\n안정적인 전투를 만듭니다.',
    },
    subRole: {
      name: '전선 유지자',
      description: '무너지지 않도록 버티며,\n팀을 지탱합니다.',
    },
    checkSentences: [
      '팀을 지켜주는 역할을 선호합니다.',
      '안정적인 플레이로 신뢰를 줍니다.',
      '무리하지 않고 팀을 보호합니다.',
    ],
  },
  [AnimalType.deer]: {
    label: '사슴',
    description: ['흐름 잇는 힐러', '편안한 분위기의 안정형 플레이'],
    extendedDescription:
      '사슴 타입의 당신은 부드럽고 차분한 플레이로 팀 분위기를 안정시키는 힐러형입니다. 무리한 도전보다 팀의 편안함과 조화를 중요하게 여기며, 공격적인 상황에서도 마음의 여유를 유지합니다. 온화한 감성으로 팀의 긴장을 풀어주는 타입입니다.',
    mainRole: {
      name: '힐링 서포터',
      description: '차분한 플레이로,\n팀의 분위기를 안정시킵니다.',
    },
    subRole: {
      name: '분위기 완충자',
      description: '긴장을 낮추며,\n편안한 게임을 만듭니다.',
    },
    checkSentences: [
      '편안한 게임을 선호합니다.',
      '과도한 경쟁보다는 안정감을 중시합니다.',
      '차분한 분위기를 만듭니다.',
    ],
  },
  [AnimalType.koala]: {
    label: '코알라',
    description: ['편하게 즐기는 감성러', '웃으면서 게임하는 캐주얼 타입'],
    extendedDescription:
      '코알라 타입의 당신은 경쟁보다 즐거움과 편안함을 우선하는 캐주얼 플레이어입니다. 함께 게임하는 사람들과의 대화를 좋아하고 여유로운 분위기를 만들어냅니다. 부담 없이 웃으며 즐기는 플레이에서 최고의 퍼포먼스를 발휘하는 타입입니다.',
    mainRole: {
      name: '캐주얼 플레이어',
      description: '부담 없이 플레이하며,\n게임을 즐기는 데 집중합니다.',
    },
    subRole: {
      name: '편안한 동료',
      description: '주변을 편하게 만들어,\n함께 즐기기 좋은 분위기를 만듭니다.',
    },
    checkSentences: [
      '가볍게 즐기는 플레이를 좋아합니다.',
      '성과보다 재미를 중요하게 생각합니다.',
      '편안한 파티 플레이를 선호합니다.',
    ],
  },

  // ========== social 그룹 ==========
  [AnimalType.dog]: {
    label: '강아지',
    description: ['팀 분위기 메이커', '케미와 소통으로 판을 살리는 타입'],
    extendedDescription:
      '강아지 타입의 당신은 뛰어난 친화력과 소통 능력으로 팀 분위기를 밝게 만드는 플레이어입니다. 적극적인 교류를 통해 팀워크를 강화하고, 어떤 상황에서도 긍정적인 에너지를 유지합니다. 함께할 때 가장 즐거운 케미 메이커입니다.',
    mainRole: {
      name: '분위기 메이커',
      description: '밝은 소통으로,\n팀의 텐션을 끌어올립니다.',
    },
    subRole: {
      name: '커뮤니케이션 허브',
      description: '팀원 간 소통을 이어,\n호흡을 맞춥니다.',
    },
    checkSentences: [
      '팀 분위기를 살리는 데 강합니다.',
      '사람들과 빠르게 친해지는 편입니다.',
      '함께 플레이하는 재미를 중시합니다.',
    ],
  },
  [AnimalType.dolphin]: {
    label: '돌고래',
    description: ['텐션 올리는 파티러', '함께할수록 즐거운 플레이어'],
    extendedDescription:
      '돌고래 타입의 당신은 유쾌하고 활기찬 에너지로 파티 플레이에서 큰 시너지를 만드는 타입입니다. 높은 교류성과 밝은 텐션으로 팀 전체 분위기를 즉시 끌어올립니다. 함께할수록 즐거움이 배가되는 파티형 플레이어입니다.',
    mainRole: {
      name: '텐션 리더',
      description: '유쾌한 에너지로,\n파티 분위기를 주도합니다.',
    },
    subRole: {
      name: '협동 촉진자',
      description: '함께 움직이며,\n협동 플레이를 끌어냅니다.',
    },
    checkSentences: [
      '파티 게임과 협동 플레이를 좋아합니다.',
      '분위기를 띄우는 데 익숙합니다.',
      '함께 웃으며 플레이하는 걸 선호합니다.',
    ],
  },
  [AnimalType.panda]: {
    label: '판다',
    description: ['잘 맞는 균형형', '편안하게 함께할 수 있는 타입'],
    extendedDescription:
      '판다 타입의 당신은 누구와도 편안하게 맞춰갈 수 있는 균형 잡힌 플레이 성향을 가졌습니다. 무리하지 않는 선택과 부드러운 교류 방식으로 팀에 조화를 이끌어냅니다. 안정성과 편안함을 동시에 추구하는 조화형 게이머입니다.',
    mainRole: {
      name: '밸런스 플레이어',
      description: '어느 역할이든 무난하게,\n팀에 맞춰 플레이합니다.',
    },
    subRole: {
      name: '조율 담당',
      description: '팀 분위기에 맞게,\n플레이를 조정합니다.',
    },
    checkSentences: [
      '누구와도 무난하게 어울립니다.',
      '특정 스타일에 치우치지 않습니다.',
      '팀에 맞춰 유연하게 움직입니다.',
    ],
  },
  [AnimalType.rabbit]: {
    label: '토끼',
    description: ['밝고 빠른 소셜러', '분위기를 가볍게 만드는 친화력 타입'],
    extendedDescription:
      '토끼 타입의 당신은 밝고 빠른 템포의 친화력을 바탕으로 분위기를 환하게 만드는 소셜러입니다. 새로운 사람들과도 금방 친해지고, 가볍고 유쾌한 에너지를 팀 전체로 확산시킵니다. 팀 시너지를 가장 빠르게 끌어올리는 활력형 플레이어입니다.',
    mainRole: {
      name: '분위기 업로더',
      description: '가벼운 소통으로,\n팀 분위기를 밝게 만듭니다.',
    },
    subRole: {
      name: '순발 대응자',
      description: '빠른 반응으로,\n흐름에 잘 적응합니다.',
    },
    checkSentences: [
      '분위기를 가볍게 만드는 편입니다.',
      '사람들과 빠르게 친해집니다.',
      '경쾌한 플레이를 선호합니다.',
    ],
  },

  // ========== lone 그룹 ==========
  [AnimalType.leopard]: {
    label: '표범',
    description: ['승부 집중 몰입형', '성능과 결과 중심'],
    extendedDescription:
      '표범 타입의 당신은 강한 몰입도와 집중력을 기반으로 실력과 성과를 중시하는 경쟁형 플레이어입니다. 과감한 공격과 단독 판단으로 승부처를 빠르게 장악하며, 성능 향상 자체를 즐깁니다. 솔로 플레이에서도 강한 존재감을 드러내는 타입입니다.',
    mainRole: {
      name: '집중 경쟁자',
      description: '승부에 집중하며,\n개인 성능을 극대화합니다.',
    },
    subRole: {
      name: '고속 판단자',
      description: '빠른 판단으로,\n기회를 놓치지 않습니다.',
    },
    checkSentences: [
      '경쟁전과 솔랭을 선호합니다.',
      '집중력이 높은 편입니다.',
      '성능 위주 플레이를 합니다.',
    ],
  },
  [AnimalType.cat]: {
    label: '고양이',
    description: ['깊이 파고드는 전략가', '루트를 만드는 플레이'],
    extendedDescription:
      '고양이 타입의 당신은 조용하지만 깊이 있는 플레이로 자신만의 루트를 구축하는 독립형 전략가입니다. 상대 움직임을 세밀하게 파악하고 효율적인 선택을 추구하며, 혼자 있을 때 오히려 더 강점을 발휘합니다. 고독한 몰입 속에서 실력을 완성하는 타입입니다.',
    mainRole: {
      name: '잠입 플레이어',
      description: '자신만의 루트로,\n혼자서 깊이 플레이합니다.',
    },
    subRole: {
      name: '기술 숙련자',
      description: '조작과 기술을 연마해,\n완성도 높은 플레이를 합니다.',
    },
    checkSentences: [
      '혼자 몰입하는 플레이를 좋아합니다.',
      '자신만의 스타일을 중시합니다.',
      '기술적인 완성도를 추구합니다.',
    ],
  },

  // ========== uninitialized 그룹 ==========
  [AnimalType.unknown]: {
    label: '미정',
    description: ['아직 내 게임 타입이 없어요'],
    extendedDescription:
      '아직 게임 성향 테스트를 완료하지 않아 당신의 게임 타입이 정해지지 않았습니다. 테스트를 완료하면 당신만의 동물 타입을 확인할 수 있습니다.',
    mainRole: {
      name: '분석 필요',
      description:
        '게임 성향 테스트를 완료하면\n당신의 플레이 스타일을 알 수 있습니다.',
    },
    subRole: {
      name: '분석 필요',
      description: '활동 시간과 게임 성향을\n분석하여 타입을 결정합니다.',
    },
    checkSentences: [
      '게임 성향 테스트를 완료하면 내 타입을 알 수 있어요.',
      '테스트를 통해 나에게 맞는 플레이 스타일을 찾아보세요.',
      '내 플레이 스타일 알아보기 버튼을 눌러 테스트를 시작하세요.',
    ],
    unknownDescriptions: {
      my: '아직 내 게임 타입이 없어요',
      user: '아직 상대방의 게임 타입이 없어요',
    },
  },
} as const;

// ============================================
// Utilities
// ============================================

/**
 * 동물 타입의 카피 데이터를 반환
 */
export const getAnimalCopy = (type: AnimalType): AnimalCopy => {
  return animalCopies[type];
};
