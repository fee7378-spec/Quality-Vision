import { fetchAllSupabaseData } from './src/store/supabaseData.ts';

async function test() {
  const data = await fetchAllSupabaseData();
  console.log('Monitorias columns:', data.monitorias.length > 0 ? Object.keys(data.monitorias[0]) : 'Empty');
}

test();
