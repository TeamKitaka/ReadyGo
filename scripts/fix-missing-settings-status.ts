/**
 * Fix Missing Settings & Status Script
 * 
 * user_settings와 user_status가 누락된 계정들을 복구
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// 누락된 계정 User ID들
const MISSING_ACCOUNTS = [
  { userId: 'e86d1b23-6044-4dba-a051-233b471c14a5', email: 'test141@readygo.test' },
  { userId: 'd0ef582b-145b-45ac-a4ab-2a3add7919cc', email: 'test135@readygo.test' },
  { userId: '9cbc55b5-5220-439e-8eb0-9a5685422281', email: 'test138@readygo.test' },
  { userId: '0ce14b49-89f4-4c15-bad5-1cd1637be339', email: 'test127@readygo.test' },
  { userId: 'c6bc46e0-d6be-4c48-8fe6-c36e8ee37738', email: 'test123@readygo.test' },
  { userId: 'd908a91f-da2b-4833-8173-2d9036b8cb0a', email: 'test124@readygo.test' },
  { userId: '71b9e185-0922-4b46-9d4a-6317f09582c6', email: 'test122@readygo.test' },
  { userId: 'eb36d431-03e8-4918-86a4-5a2beef86a58', email: 'test111@readygo.test' },
  { userId: '5743bf6f-764e-4301-982f-e797976fbf53', email: 'test115@readygo.test' },
  { userId: '8b309313-9c34-473a-8e87-98a939dabdd0', email: 'test114@readygo.test' },
  { userId: '4ef74017-ece5-4a9f-9628-d1aece2e0072', email: 'test120@readygo.test' },
  { userId: '304ad7c6-a6e2-4216-9959-2e2b2357df02', email: 'test117@readygo.test' },
  { userId: '91b46009-80ae-4c0a-a9b3-4b8028c3aaf6', email: 'test113@readygo.test' },
  { userId: '021fb9df-c2b8-45e8-973b-2f7b17e222ac', email: 'test110@readygo.test' },
  { userId: '4991c277-ef6e-49dc-975d-f1365836602d', email: 'test108@readygo.test' },
  { userId: '4dd02902-a331-4b4a-bebf-3c0d7f510929', email: 'test103@readygo.test' },
];

const STATUS_OPTIONS = ['online', 'offline', 'away'] as const;

async function fixAccount(userId: string, email: string) {
  try {
    // 1. user_settings가 있는지 확인
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingSettings) {
      // user_settings 생성
      const { error: settingsError } = await supabase
        .from('user_settings')
        .insert({
          id: userId,
          theme_mode: 'dark',
          notification_push: true,
          notification_chat: true,
          notification_party: true,
          language: 'ko',
        });

      if (settingsError) {
        console.error(`❌ [${email}] Settings 생성 실패:`, settingsError.message);
        return false;
      }
    }

    // 2. user_status가 있는지 확인
    const { data: existingStatus } = await supabase
      .from('user_status')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingStatus) {
      // user_status 생성
      const randomStatus = STATUS_OPTIONS[Math.floor(Math.random() * STATUS_OPTIONS.length)];
      const { error: statusError } = await supabase
        .from('user_status')
        .upsert({
          user_id: userId,
          status: randomStatus,
        }, { onConflict: 'user_id' });

      if (statusError) {
        console.error(`❌ [${email}] Status 생성 실패:`, statusError.message);
        return false;
      }
    }

    console.log(`✅ [${email}] 복구 완료`);
    return true;
  } catch (error) {
    console.error(`❌ [${email}] 예상치 못한 오류:`, error);
    return false;
  }
}

async function main() {
  console.log('🔧 누락된 settings & status 복구 시작...');
  console.log(`📊 복구 대상: ${MISSING_ACCOUNTS.length}명`);
  console.log('');

  let successCount = 0;
  let failCount = 0;

  for (const account of MISSING_ACCOUNTS) {
    const success = await fixAccount(account.userId, account.email);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }

    // Rate limiting 방지
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log('');
  console.log('=' .repeat(60));
  console.log('✅ 복구 완료!');
  console.log(`성공: ${successCount}명`);
  console.log(`실패: ${failCount}명`);
  console.log('=' .repeat(60));
  console.log('');
  console.log('💡 다음 단계:');
  console.log('  1. npm run seed:check (재확인)');
  console.log('  2. npm run seed:redistribute-tier (티어 재배분)');
  console.log('  3. npm run seed:steam (Steam 연동)');
}

main();

