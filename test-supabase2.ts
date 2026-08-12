import { fetchAllSupabaseData } from './src/store/supabaseData.ts';

async function test() {
  const data = await fetchAllSupabaseData();
  console.log('MonitoriaErros columns:', data.monitoriaErros.length > 0 ? Object.keys(data.monitoriaErros[0]) : 'Empty');
}

test();
