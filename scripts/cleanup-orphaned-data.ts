/**
 * Cleanup Orphaned Data Script
 * 
 * auth.users가 없는 고아 데이터(user_profiles, user_traits 등) 삭제
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

async function main() {
  console.log('🧹 고아 데이터 정리 시작...');
  console.log('');

  try {
    // 1. 모든 auth.users 조회
    const { data: authData } = await supabase.auth.admin.listUsers();
    const validUserIds = new Set(authData?.users?.map(u => u.id) || []);
    
    console.log(`📊 유효한 auth.users: ${validUserIds.size}명`);
    console.log('');

    let totalOrphaned = 0;

    // 2. user_profiles 체크
    console.log('🔍 user_profiles 체크 중...');
    const { data: profiles } = await supabase.from('user_profiles').select('id, nickname');
    
    const orphanedProfiles = profiles?.filter(p => !validUserIds.has(p.id)) || [];
    console.log(`   고아 데이터: ${orphanedProfiles.length}개`);
    
    if (orphanedProfiles.length > 0) {
      orphanedProfiles.forEach(p => {
        console.log(`   - ${p.id} (${p.nickname})`);
      });
      
      // 삭제
      for (const profile of orphanedProfiles) {
        const { error } = await supabase
          .from('user_profiles')
          .delete()
          .eq('id', profile.id);
        
        if (error) {
          console.error(`   ❌ 삭제 실패 (${profile.nickname}):`, error.message);
        } else {
          console.log(`   ✅ 삭제 완료 (${profile.nickname})`);
        }
      }
      
      totalOrphaned += orphanedProfiles.length;
    }
    console.log('');

    // 3. user_settings 체크
    console.log('🔍 user_settings 체크 중...');
    const { data: settings } = await supabase.from('user_settings').select('id');
    
    const orphanedSettings = settings?.filter(s => !validUserIds.has(s.id)) || [];
    console.log(`   고아 데이터: ${orphanedSettings.length}개`);
    
    if (orphanedSettings.length > 0) {
      const orphanedIds = orphanedSettings.map(s => s.id);
      const { error } = await supabase
        .from('user_settings')
        .delete()
        .in('id', orphanedIds);
      
      if (error) {
        console.error(`   ❌ 삭제 실패:`, error.message);
      } else {
        console.log(`   ✅ ${orphanedSettings.length}개 삭제 완료`);
      }
      
      totalOrphaned += orphanedSettings.length;
    }
    console.log('');

    // 4. user_status 체크
    console.log('🔍 user_status 체크 중...');
    const { data: statuses } = await supabase.from('user_status').select('user_id');
    
    const orphanedStatuses = statuses?.filter(s => !validUserIds.has(s.user_id)) || [];
    console.log(`   고아 데이터: ${orphanedStatuses.length}개`);
    
    if (orphanedStatuses.length > 0) {
      const orphanedIds = orphanedStatuses.map(s => s.user_id);
      const { error } = await supabase
        .from('user_status')
        .delete()
        .in('user_id', orphanedIds);
      
      if (error) {
        console.error(`   ❌ 삭제 실패:`, error.message);
      } else {
        console.log(`   ✅ ${orphanedStatuses.length}개 삭제 완료`);
      }
      
      totalOrphaned += orphanedStatuses.length;
    }
    console.log('');

    // 5. user_traits 체크
    console.log('🔍 user_traits 체크 중...');
    const { data: traits } = await supabase.from('user_traits').select('user_id');
    
    const orphanedTraits = traits?.filter(t => !validUserIds.has(t.user_id)) || [];
    console.log(`   고아 데이터: ${orphanedTraits.length}개`);
    
    if (orphanedTraits.length > 0) {
      const orphanedIds = orphanedTraits.map(t => t.user_id);
      const { error } = await supabase
        .from('user_traits')
        .delete()
        .in('user_id', orphanedIds);
      
      if (error) {
        console.error(`   ❌ 삭제 실패:`, error.message);
      } else {
        console.log(`   ✅ ${orphanedTraits.length}개 삭제 완료`);
      }
      
      totalOrphaned += orphanedTraits.length;
    }
    console.log('');

    // 6. user_play_schedules 체크
    console.log('🔍 user_play_schedules 체크 중...');
    const { data: schedules } = await supabase.from('user_play_schedules').select('user_id');
    
    // 중복 제거
    const uniqueScheduleUserIds = [...new Set(schedules?.map(s => s.user_id) || [])];
    const orphanedScheduleIds = uniqueScheduleUserIds.filter(id => !validUserIds.has(id));
    
    console.log(`   고아 데이터: ${orphanedScheduleIds.length}명의 스케줄`);
    
    if (orphanedScheduleIds.length > 0) {
      const { error } = await supabase
        .from('user_play_schedules')
        .delete()
        .in('user_id', orphanedScheduleIds);
      
      if (error) {
        console.error(`   ❌ 삭제 실패:`, error.message);
      } else {
        console.log(`   ✅ ${orphanedScheduleIds.length}명의 스케줄 삭제 완료`);
      }
      
      totalOrphaned += orphanedScheduleIds.length;
    }
    console.log('');

    // 7. 결과
    console.log('='.repeat(60));
    console.log('✅ 정리 완료!');
    console.log(`총 ${totalOrphaned}개의 고아 데이터 삭제`);
    console.log('='.repeat(60));
    console.log('');
    console.log('💡 다음 단계:');
    console.log('  1. npm run seed:check (재확인)');
    console.log('  2. 개발 서버 재시작');
    console.log('  3. 500 에러 해결 확인');

  } catch (error) {
    console.error('');
    console.error('💥 오류 발생:', error);
    process.exit(1);
  }
}

main();

