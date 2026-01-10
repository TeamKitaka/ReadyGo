/**
 * Steam 데이터 초기화 및 100개 계정 재연결
 * 
 * 1. 기존 Steam 관련 데이터 전체 삭제
 * 2. 검증된 Steam ID 상위 100개 선별
 * 3. 100개 테스트 계정에 연결
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/supabase';

// .env.local 로드
config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 이전 스크립트에서 검증된 Steam ID 상위 100개
const VALID_STEAM_IDS = [
  "76561198001221571", // 22705 games
  "76561198015856631", // 19526 games
  "76561198085238363", // 17488 games
  "76561197967923946", // 16367 games
  "76561198072936438", // 15914 games
  "76561198120120943", // 15841 games
  "76561198110425795", // 15266 games
  "76561198043828654", // 13434 games
  "76561197998422093", // 12970 games
  "76561198040127846", // 12696 games
  "76561198025115329", // 12070 games
  "76561198064230555", // 11783 games
  "76561197990492433", // 11611 games
  "76561198223385552", // 11348 games
  "76561198116515265", // 10904 games
  "76561197978088497", // 10640 games
  "76561198086034417", // 9623 games
  "76561198076395986", // 8911 games
  "76561198216115081", // 8823 games
  "76561198054621116", // 8688 games
  "76561198069476822", // 8397 games
  "76561198035236062", // 8290 games
  "76561198060317941", // 8581 games
  "76561198039694478", // 7886 games
  "76561198108641909", // 7597 games
  "76561198056976073", // 7089 games
  "76561198054494861", // 6774 games
  "76561198368799839", // 6557 games
  "76561198120524579", // 6274 games
  "76561198086846012", // 5763 games
  "76561197962459920", // 5188 games
  "76561198019786979", // 5150 games
  "76561198357461553", // 5066 games
  "76561198119738924", // 4111 games
  "76561198148354465", // 4111 games
  "76561198141201304", // 4539 games
  "76561197993878564", // 3833 games
  "76561198079549377", // 3858 games
  "76561198058918307", // 3546 games
  "76561198016719968", // 3216 games
  "76561197989302653", // 3183 games
  "76561198119803063", // 3148 games
  "76561198058790252", // 3150 games
  "76561198101097754", // 3088 games
  "76561198098017046", // 3064 games
  "76561197990905503", // 3051 games
  "76561197989248448", // 2930 games
  "76561198060033991", // 2875 games
  "76561198093291708", // 2746 games
  "76561199005727617", // 2731 games
  "76561198282616715", // 2632 games
  "76561198008243754", // 2539 games
  "76561198827112545", // 2405 games
  "76561198084486409", // 2344 games
  "76561198175759221", // 2342 games
  "76561198094320882", // 2302 games
  "76561198162047255", // 2221 games
  "76561198254553652", // 2099 games
  "76561198021433778", // 2052 games
  "76561199018607504", // 1985 games
  "76561197977420950", // 1861 games
  "76561198331555490", // 1836 games
  "76561198262051748", // 1814 games
  "76561198099998197", // 1802 games
  "76561198051160895", // 1792 games
  "76561198401812933", // 1746 games
  "76561198147677250", // 1739 games
  "76561198308250516", // 1705 games
  "76561198035843176", // 1670 games
  "76561197987259601", // 1640 games
  "76561198405828248", // 1605 games
  "76561198025071027", // 1520 games
  "76561197964743011", // 1504 games
  "76561198131065349", // 1398 games
  "76561198134565083", // 1345 games
  "76561198359366333", // 1312 games
  "76561198371819356", // 1249 games
  "76561198272456359", // 1227 games
  "76561198249622792", // 1180 games
  "76561198171991722", // 1175 games
  "76561198010117397", // 1159 games
  "76561198364845093", // 1137 games
  "76561198108929347", // 1065 games
  "76561198866090838", // 1042 games
  "76561198170777530", // 1028 games
  "76561198178841287", // 1012 games
  "76561198101187664", // 973 games
  "76561198194426982", // 970 games
  "76561198337214950", // 952 games
  "76561198119758236", // 910 games
  "76561198157740245", // 894 games
  "76561198121414530", // 888 games
  "76561198112547536", // 884 games
  "76561198827623088", // 870 games
  "76561198256314078", // 848 games
  "76561198063887625", // 848 games
  "76561197982102493", // 774 games
  "76561198049106893", // 756 games
];

/**
 * 기존 Steam 데이터 전체 삭제
 */
async function clearSteamData() {
  console.log('\n🗑️  Clearing existing Steam data...\n');
  
  // 1. steam_sync_logs 삭제
  const { error: logsError, count: logsCount } = await supabase
    .from('steam_sync_logs')
    .delete()
    .neq('id', 0); // 모든 row 삭제
  
  if (logsError) {
    console.error('❌ Failed to delete steam_sync_logs:', logsError);
  } else {
    console.log(`✅ Deleted steam_sync_logs: ${logsCount || 'all'} rows`);
  }
  
  // 2. steam_user_games 삭제
  const { error: gamesError, count: gamesCount } = await supabase
    .from('steam_user_games')
    .delete()
    .neq('id', 0);
  
  if (gamesError) {
    console.error('❌ Failed to delete steam_user_games:', gamesError);
  } else {
    console.log(`✅ Deleted steam_user_games: ${gamesCount || 'all'} rows`);
  }
  
  // 3. steam_user_stats 삭제
  const { error: statsError, count: statsCount } = await supabase
    .from('steam_user_stats')
    .delete()
    .neq('id', 0);
  
  if (statsError) {
    console.error('❌ Failed to delete steam_user_stats:', statsError);
  } else {
    console.log(`✅ Deleted steam_user_stats: ${statsCount || 'all'} rows`);
  }
  
  console.log('\n✅ Steam data cleared!\n');
}

/**
 * 100개 테스트 계정 조회 및 Steam ID 업데이트
 */
async function linkSteamIds() {
  console.log('🔗 Linking Steam IDs to test accounts...\n');
  
  // 1. 테스트 계정 조회 (생성 순서대로)
  const { data: profiles, error } = await supabase
    .from('user_profiles')
    .select('id, nickname')
    .not('steam_id', 'is', null) // Steam ID 필드가 있는 계정
    .order('created_at', { ascending: true })
    .limit(100);
  
  if (error) {
    throw new Error(`Failed to fetch profiles: ${error.message}`);
  }
  
  if (!profiles || profiles.length < 100) {
    console.warn(`⚠️  Only ${profiles?.length || 0} profiles found (expected 100)`);
  }
  
  console.log(`📋 Found ${profiles?.length || 0} test accounts\n`);
  
  // 2. Steam ID 업데이트
  let successCount = 0;
  
  for (let i = 0; i < Math.min(profiles.length, VALID_STEAM_IDS.length); i++) {
    const profile = profiles[i];
    const steamId = VALID_STEAM_IDS[i];
    
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ steam_id: steamId })
      .eq('id', profile.id);
    
    if (updateError) {
      console.error(`❌ Failed to update ${profile.nickname}:`, updateError);
    } else {
      console.log(`✅ ${i + 1}/100 ${profile.nickname}: ${steamId}`);
      successCount++;
    }
  }
  
  console.log(`\n✅ Linked ${successCount}/${Math.min(profiles.length, VALID_STEAM_IDS.length)} accounts\n`);
  
  return successCount;
}

/**
 * 메인 실행
 */
async function main() {
  try {
    console.log('='.repeat(60));
    console.log('Steam Data Reset & Link Script');
    console.log('='.repeat(60));
    
    // 1. 기존 데이터 삭제
    await clearSteamData();
    
    // 2. Steam ID 연결
    const linkedCount = await linkSteamIds();
    
    console.log('='.repeat(60));
    console.log('✅ Script completed successfully!');
    console.log('='.repeat(60));
    console.log(`\n💡 Linked ${linkedCount} accounts with valid Steam IDs`);
    console.log(`💡 Next: Run steam-sync-batch multiple times (10 accounts per run)\n`);
    
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

main();

