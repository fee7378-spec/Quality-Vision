import { fetchAllSupabaseData } from './src/store/supabaseData.ts';

async function test() {
  const data = await fetchAllSupabaseData();
  console.log('Monitorias first item:', data.monitorias.length > 0 ? data.monitorias[0] : 'Empty');
}

test();
