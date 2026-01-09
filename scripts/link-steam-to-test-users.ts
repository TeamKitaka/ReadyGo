/**
 * Steam ID Bulk Link Script
 * 
 * test26~test125 (100명)에게 Steam ID 연동
 * - 기존 bulk-link API 활용
 * - 성향분석 완료된 계정만 Steam 연동
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// .env.local 파일 명시적으로 로드
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ADMIN_API_KEY) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!SUPABASE_URL);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY);
  console.error('ADMIN_API_KEY:', !!ADMIN_API_KEY);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Steam ID 100개
const STEAM_IDS = [
  "76561198842603734",
  "76561198023414915",
  "76561199080934614",
  "76561197984432884",
  "76561198254085126",
  "76561198048165534",
  "76561198023455525",
  "76561198044426667",
  "76561199219841553",
  "76561198212206651",
  "76561198294650349",
  "76561198062673538",
  "76561198203118756",
  "76561197986603983",
  "76561198306626714",
  "76561198014898339",
  "76561198067053149",
  "76561199499421434",
  "76561198046160451",
  "76561198108581917",
  "76561198089412043",
  "76561198071621154",
  "76561197976968076",
  "76561198409565259",
  "76561197968423451",
  "76561198146973883",
  "76561198150467988",
  "76561198023416824",
  "76561198912653263",
  "76561198176366622",
  "76561198813424031",
  "76561198228094348",
  "76561198039386132",
  "76561198027584758",
  "76561198025653291",
  "76561198264035001",
  "76561198043066606",
  "76561198130807766",
  "76561198092730606",
  "76561198136077175",
  "76561198145710359",
  "76561197999473427",
  "76561198159388675",
  "76561198831075066",
  "76561198235217560",
  "76561197999457425",
  "76561198256856681",
  "76561198295203109",
  "76561198096260905",
  "76561199494657872",
  "76561198208943801",
  "76561198339417346",
  "76561198103602015",
  "76561197989256139",
  "76561198290287872",
  "76561198000472919",
  "76561198260880899",
  "76561198003030375",
  "76561198062901118",
  "76561198098168017",
  "76561198019712127",
  "76561198081507037",
  "76561198038537892",
  "76561198835780877",
  "76561198017054389",
  "76561198088078416",
  "76561198004332929",
  "76561198262236331",
  "76561198814267893",
  "76561198129192831",
  "76561198066084037",
  "76561198368894435",
  "76561198003163863",
  "76561198197719893",
  "76561198023959749",
  "76561197960267352",
  "76561198212710908",
  "76561198393825591",
  "76561198301460892",
  "76561198127601057",
  "76561198089067428",
  "76561198048432253",
  "76561198389241377",
  "76561198801475475",
  "76561197962473290",
  "76561199023443428",
  "76561198168877244",
  "76561198417108689",
  "76561198134745097",
  "76561198096354242",
  "76561199149306132",
  "76561198044770902",
  "76561198317593324",
  "76561198192424481",
  "76561198009100803",
  "76561199468448157",
  "76561199202258624",
  "76561198803770628",
  "76561198866252396",
  "76561199260767838"
];

// test26~test125 계정의 userId 조회
async function getTestUserIds(): Promise<Array<{ email: string; userId: string }>> {
  const emails = Array.from({ length: 100 }, (_, i) => `test${i + 26}@readygo.test`);
  
  // 페이지네이션 처리
  const allUsers: any[] = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      console.error('❌ 유저 조회 실패:', error.message);
      throw error;
    }

    if (!data || data.users.length === 0) {
      hasMore = false;
      break;
    }

    allUsers.push(...data.users);

    if (data.users.length < 1000) {
      hasMore = false;
    }
    page++;
  }

  const testUsers = allUsers
    .filter((user) => emails.includes(user.email || ''))
    .map((user) => ({
      email: user.email || '',
      userId: user.id,
    }))
    .sort((a, b) => {
      const numA = parseInt(a.email.match(/test(\d+)@/)?.[1] || '0');
      const numB = parseInt(b.email.match(/test(\d+)@/)?.[1] || '0');
      return numA - numB;
    });

  return testUsers;
}

// bulk-link API 호출
async function linkSteamIds(users: Array<{ userId: string; steamId: string }>) {
  const apiUrl = `${SUPABASE_URL.replace(/\/$/, '')}/api/admin/steam/bulk-link`;
  
  console.log('🔗 Bulk-link API 호출 중...');
  console.log(`URL: ${apiUrl}`);
  console.log(`Users: ${users.length}명`);

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-api-key': ADMIN_API_KEY,
    },
    body: JSON.stringify({
      users,
      force: false, // 중복 시 에러
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ API 호출 실패:', response.status, errorText);
    throw new Error(`API call failed: ${response.status}`);
  }

  const result = await response.json();
  return result;
}

// 메인 함수
async function main() {
  console.log('🚀 Steam ID 연동 시작...');
  console.log(`📊 연동 대상: test26~test125 (100명)`);
  console.log(`🎮 Steam ID: ${STEAM_IDS.length}개`);
  console.log('');

  try {
    // 1. test26~test125의 userId 조회
    console.log('📋 Step 1: 테스트 계정 조회 중...');
    const testUsers = await getTestUserIds();
    
    if (testUsers.length === 0) {
      console.error('❌ 테스트 계정을 찾을 수 없습니다.');
      console.log('💡 먼저 npm run seed:users를 실행하세요.');
      process.exit(1);
    }

    console.log(`✅ ${testUsers.length}명의 계정 발견`);
    console.log('');

    // 2. userId와 Steam ID 매핑
    const mappedUsers = testUsers.slice(0, STEAM_IDS.length).map((user, index) => ({
      userId: user.userId,
      steamId: STEAM_IDS[index],
    }));

    console.log(`🔗 Step 2: Steam ID 매핑 완료 (${mappedUsers.length}명)`);
    console.log('');

    // 3. Bulk-link API 호출
    console.log('🚀 Step 3: Bulk-link API 호출 중...');
    
    // 개발 서버가 실행 중이어야 하므로, localhost URL 사용
    const DEV_SERVER_URL = 'http://localhost:3000';
    const response = await fetch(`${DEV_SERVER_URL}/api/admin/steam/bulk-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-api-key': ADMIN_API_KEY,
      },
      body: JSON.stringify({
        users: mappedUsers,
        force: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API 호출 실패:', response.status);
      console.error('Response:', errorText);
      throw new Error(`API call failed: ${response.status}`);
    }

    const result = await response.json();

    // 4. 결과 출력
    console.log('');
    console.log('=' .repeat(60));
    console.log('✅ 완료!');
    console.log('');
    console.log(`📊 총 ${result.summary.total}명 처리`);
    console.log(`✅ 성공: ${result.summary.success}명`);
    console.log(`❌ 실패: ${result.summary.failure}명`);
    console.log('=' .repeat(60));

    // 실패한 케이스가 있으면 출력
    if (result.summary.failure > 0) {
      console.log('');
      console.log('❌ 실패한 케이스:');
      result.results
        .filter((r: any) => !r.success)
        .forEach((r: any, index: number) => {
          console.log(`  ${index + 1}. ${r.userId}: ${r.error} (${r.errorCode})`);
        });
    }

  } catch (error) {
    console.error('');
    console.error('💥 오류 발생:', error);
    
    if (error instanceof Error && error.message.includes('fetch')) {
      console.error('');
      console.error('💡 해결 방법:');
      console.error('   1. 개발 서버가 실행 중인지 확인: npm run dev');
      console.error('   2. .env.local에 ADMIN_API_KEY가 설정되어 있는지 확인');
    }
    
    process.exit(1);
  }
}

main();

