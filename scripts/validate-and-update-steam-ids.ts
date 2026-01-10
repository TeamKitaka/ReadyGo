/**
 * Steam ID 검증 및 업데이트 스크립트
 * 
 * 1. Steam Web API로 각 ID 검증 (public + 게임 보유)
 * 2. Private였던 테스트 계정 조회
 * 3. 유효한 Steam ID를 테스트 계정에 연결
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/supabase';

// .env.local 로드
config({ path: '.env.local' });

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 제공된 Steam ID 목록
const STEAM_IDS = [
  "76561198051449037", "76561198108929347", "76561198306987004", "76561198035236062",
  "76561198178841287", "76561198364845093", "76561198110425795", "76561198046175132",
  "76561198179572658", "76561198123963132", "76561198119738924", "76561198359366333",
  "76561198988334816", "76561198289631881", "76561198001221571", "76561198282565222",
  "76561198408566333", "76561198147572953", "76561198418700524", "76561198111474049",
  "76561198078396783", "76561198064230555", "76561198425597909", "76561198045557947",
  "76561198101803605", "76561198148354465", "76561198041824866", "76561198264114830",
  "76561198357461553", "76561199007619949", "76561198008243754", "76561198256314078",
  "76561198120120943", "76561198336653292", "76561198049607129", "76561198069476822",
  "76561199024339844", "76561198084486409", "76561197960941287", "76561197978088497",
  "76561198086846012", "76561198091352192", "76561198808962341", "76561198058208258",
  "76561198996786657", "76561198223811792", "76561198065664293", "76561198070168241",
  "76561198101187664", "76561198254553652", "76561198248422910", "76561199276492356",
  "76561198127899356", "76561198211004203", "76561198223385552", "76561199064834749",
  "76561198317996762", "76561199177059330", "76561198025115329", "76561198141201304",
  "76561198263666801", "76561198160900038", "76561198054621116", "76561198075721752",
  "76561198796740064", "76561199018607504", "76561199155558938", "76561198020617239",
  "76561198025071027", "76561199125568073", "76561198170777530", "76561199085051557",
  "76561199172489829", "76561198015856631", "76561198115777744", "76561198147677250",
  "76561198172886753", "76561198098017046", "76561198967422821", "76561198173646982",
  "76561198157871726", "76561198047472282", "76561198107176687", "76561198099998197",
  "76561198292467222", "76561198162047255", "76561198120939003", "76561198054494861",
  "76561198401812933", "76561197967923946", "76561198116515265", "76561198272456359",
  "76561197987124126", "76561199004975885", "76561199799992675", "76561198081792545",
  "76561198101097754", "76561198094320882", "76561198331555490", "76561197964743011",
  "76561198112547536", "76561198336798935", "76561199234205416", "76561198120524579",
  "76561198887488381", "76561198866090838", "76561198368799839", "76561198249622792",
  "76561198149060216", "76561198158359249", "76561198969371696", "76561198024421298",
  "76561198093291708", "76561198019786979", "76561198060033991", "76561198262051748",
  "76561198086972983", "76561198058918307", "76561197977420950", "76561198282616715",
  "76561198072936438", "76561197964762266", "76561198173761427", "76561198079240930",
  "76561198044776243", "76561198134565083", "76561197964771710", "76561198216115081",
  "76561198115352014", "76561198158706745", "76561198104825028", "76561198177784481",
  "76561198219122459", "76561198076395986", "76561198150068907", "76561198823384796",
  "76561198820469869", "76561198152258347", "76561198033832787", "76561197962949880",
  "76561198280195362", "76561199623985292", "76561198152126316", "76561198012282186",
  "76561198161499527", "76561199104577036", "76561198121414530", "76561198286494626",
  "76561198827112545", "76561198059726819", "76561198374149428", "76561198371819356",
  "76561198129779445", "76561198028422997", "76561197976597284", "76561198131065349",
  "76561198173891022", "76561198452758331", "76561198262004415", "76561199697778304",
  "76561197963470741", "76561199203329894", "76561197985072965", "76561198091695135",
  "76561197992674631", "76561198942017274", "76561198063887625", "76561198175759221",
  "76561198346101944", "76561198043828654", "76561198130208383", "76561198053520556",
  "76561198140936939", "76561197993878564", "76561198040127846", "76561198124058765",
  "76561198413592140", "76561198119946953", "76561198054773615", "76561198204971153",
  "76561198195657401", "76561198414470687", "76561198112471856", "76561198851415384",
  "76561198010117397", "76561198065344567", "76561198143077543", "76561198119758236",
  "76561198079549377", "76561198086034417", "76561198283973471", "76561198380925250",
  "76561198304680736", "76561198057426934", "76561198442015468", "76561197998422093",
  "76561198171991722", "76561199394165649", "76561197989248448", "76561198068349439",
  "76561198827623088", "76561198115346673", "76561198194426982", "76561198108641909",
  "76561197990492433", "76561199402295362", "76561199005727617", "76561198115916642",
  "76561197989302653", "76561198192823363", "76561197982102493", "76561197997780967",
  "76561198405828248", "76561198176443902", "76561198119913705", "76561198119803063",
  "76561198058790252", "76561198084321525", "76561198085238363", "76561198871902541",
  "76561198156006659", "76561198041108750", "76561198039694478", "76561198826310398",
  "76561198337214950", "76561198051160895", "76561198021433778", "76561198093888483",
  "76561198178415710", "76561197962459920", "76561193784418805", "76561198985084254",
  "76561198343432391", "76561198035843176", "76561198283554950", "76561198890475282",
  "76561198446206733", "76561198046090660", "76561198016719968", "76561198320278461",
  "76561198056976073", "76561198112500495", "76561199184740932", "76561198049106893",
  "76561198308250516", "76561198082816409", "76561198060317941", "76561198157740245",
  "76561197990905503", "76561197987259601"
];

interface SteamValidationResult {
  steamId: string;
  isValid: boolean;
  gameCount: number;
}

/**
 * Steam Web API로 게임 목록 조회
 */
async function fetchSteamGames(steamId: string): Promise<number> {
  try {
    const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&format=json`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`[${steamId}] API error: ${response.status}`);
      return 0;
    }

    const data = await response.json();
    
    if (!data.response || !data.response.games) {
      console.warn(`[${steamId}] Private or no games`);
      return 0;
    }

    return data.response.game_count || data.response.games.length || 0;
  } catch (error) {
    console.error(`[${steamId}] Failed to fetch:`, error);
    return 0;
  }
}

/**
 * Steam ID 일괄 검증
 */
async function validateSteamIds(): Promise<SteamValidationResult[]> {
  console.log(`\n🔍 Validating ${STEAM_IDS.length} Steam IDs...\n`);
  
  const results: SteamValidationResult[] = [];
  
  for (let i = 0; i < STEAM_IDS.length; i++) {
    const steamId = STEAM_IDS[i];
    
    // Rate limiting: 200ms 대기
    if (i > 0 && i % 10 === 0) {
      console.log(`Progress: ${i}/${STEAM_IDS.length}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    const gameCount = await fetchSteamGames(steamId);
    const isValid = gameCount > 0;
    
    if (isValid) {
      console.log(`✅ ${steamId}: ${gameCount} games`);
    }
    
    results.push({
      steamId,
      isValid,
      gameCount,
    });
  }
  
  return results;
}

/**
 * Private였던 테스트 계정 조회
 */
async function getPrivateTestAccounts() {
  const { data: privateLogs, error } = await supabase
    .from('steam_sync_logs')
    .select('user_id')
    .eq('status', 'private');
  
  if (error) {
    throw new Error(`Failed to fetch private logs: ${error.message}`);
  }
  
  const privateUserIds = new Set(privateLogs?.map(log => log.user_id) || []);
  
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, nickname, steam_id')
    .not('steam_id', 'is', null)
    .order('created_at', { ascending: true });
  
  if (profileError) {
    throw new Error(`Failed to fetch profiles: ${profileError.message}`);
  }
  
  // Private였던 계정 필터링
  const privateAccounts = profiles?.filter(p => privateUserIds.has(p.id)) || [];
  
  console.log(`\n📋 Found ${privateAccounts.length} private accounts to update\n`);
  
  return privateAccounts;
}

/**
 * Steam ID 업데이트
 */
async function updateSteamIds(
  validSteamIds: string[],
  targetAccounts: Array<{ id: string; nickname: string; steam_id: string | null }>
) {
  console.log(`\n🔄 Updating Steam IDs...\n`);
  
  const updates = targetAccounts.slice(0, validSteamIds.length).map((account, index) => ({
    userId: account.id,
    nickname: account.nickname,
    oldSteamId: account.steam_id,
    newSteamId: validSteamIds[index],
  }));
  
  let successCount = 0;
  
  for (const update of updates) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ steam_id: update.newSteamId })
      .eq('id', update.userId);
    
    if (error) {
      console.error(`❌ Failed to update ${update.nickname}:`, error);
    } else {
      console.log(`✅ ${update.nickname}: ${update.oldSteamId} → ${update.newSteamId}`);
      successCount++;
    }
    
    // steam_sync_logs 기록 삭제 (재동기화 대상으로 만들기)
    await supabase
      .from('steam_sync_logs')
      .delete()
      .eq('user_id', update.userId);
  }
  
  console.log(`\n✅ Updated ${successCount}/${updates.length} accounts\n`);
  
  return updates;
}

/**
 * 메인 실행
 */
async function main() {
  try {
    if (!STEAM_API_KEY) {
      throw new Error('STEAM_API_KEY is required in .env.local');
    }
    
    console.log('='.repeat(60));
    console.log('Steam ID Validation & Update Script');
    console.log('='.repeat(60));
    
    // 1. Steam ID 검증
    const validationResults = await validateSteamIds();
    
    const validResults = validationResults
      .filter(r => r.isValid)
      .sort((a, b) => b.gameCount - a.gameCount); // 게임 많은 순
    
    console.log(`\n✅ Valid Steam IDs: ${validResults.length}/${STEAM_IDS.length}`);
    console.log(`   Total games range: ${Math.min(...validResults.map(r => r.gameCount))} ~ ${Math.max(...validResults.map(r => r.gameCount))}`);
    
    if (validResults.length === 0) {
      console.log('\n❌ No valid Steam IDs found. Exiting.');
      return;
    }
    
    // 2. Private 계정 조회
    const privateAccounts = await getPrivateTestAccounts();
    
    if (privateAccounts.length === 0) {
      console.log('\n❌ No private accounts to update. Exiting.');
      return;
    }
    
    // 3. 매칭 및 업데이트
    const validSteamIds = validResults.map(r => r.steamId);
    const updateCount = Math.min(validSteamIds.length, privateAccounts.length, 100);
    
    console.log(`\n📊 Will update ${updateCount} accounts with valid Steam IDs\n`);
    
    const updates = await updateSteamIds(
      validSteamIds.slice(0, updateCount),
      privateAccounts.slice(0, updateCount)
    );
    
    console.log('='.repeat(60));
    console.log('✅ Script completed successfully!');
    console.log('='.repeat(60));
    console.log(`\n💡 Next step: Run steam-sync-batch to sync the updated accounts\n`);
    
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

main();

