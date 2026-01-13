import TraitsResultPage from '@/components/traits/traitsResultPage';
import {
  AnimalType,
  getAnimalTypeMeta,
  getAnimalCompatibility,
} from '@/commons/constants/animal';
import { URL_PATHS } from '@/commons/constants/url';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTraitsResult } from '@/services/traits/getTraitsResult.service';

export const dynamic = 'force-dynamic';

type TraitsResultApiResponse = {
  traits: {
    cooperation: number;
    exploration: number;
    strategy: number;
    leadership: number;
    social: number;
  };
  animalType: string;
  nickname: string;
  schedule: {
    dayTypes: string[];
    timeSlots: string[];
  };
  isSteamConnected: boolean;
};

const fetchTraitsResult = async (): Promise<TraitsResultApiResponse | null> => {
  try {
    // Server Component에서 직접 Supabase 사용
    const supabase = createClient();

    // 사용자 인증 확인
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      redirect(URL_PATHS.LOGIN);
    }

    // 서비스 호출
    const result = await getTraitsResult(supabase, user.id);
    return result;
  } catch (error) {
    console.error('Failed to fetch traits result:', error);
    return null;
  }
};

export default async function Page() {
  const result = await fetchTraitsResult();

  if (!result) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: '16px',
        }}
      >
        <p style={{ fontSize: '18px', fontWeight: 600 }}>
          성향 테스트 결과를 찾을 수 없습니다.
        </p>
        <p style={{ fontSize: '14px', color: '#666' }}>
          먼저 성향 테스트를 완료해주세요.
        </p>
      </div>
    );
  }

  const animalType = result.animalType as AnimalType;
  const animalMeta = getAnimalTypeMeta(animalType);
  const compatibility = getAnimalCompatibility(animalType);

  const radarData: {
    trait: 'cooperation' | 'exploration' | 'strategy' | 'leadership' | 'social';
    value: number;
  }[] = [
    { trait: 'cooperation', value: result.traits.cooperation },
    { trait: 'exploration', value: result.traits.exploration },
    { trait: 'strategy', value: result.traits.strategy },
    { trait: 'leadership', value: result.traits.leadership },
    { trait: 'social', value: result.traits.social },
  ];

  const matchTypes =
    compatibility?.bestMatches.map((type) => getAnimalTypeMeta(type).label) ||
    [];

  return (
    <TraitsResultPage
      animalType={animalType}
      nickname={result.nickname}
      radarData={radarData}
      mainRole={{
        label: animalMeta.mainRole.name,
        description: animalMeta.mainRole.description,
      }}
      subRole={{
        label: animalMeta.subRole.name,
        description: animalMeta.subRole.description,
      }}
      matchTypes={matchTypes}
      characteristics={animalMeta.checkSentences}
      isSteamConnected={result.isSteamConnected}
    />
  );
}
