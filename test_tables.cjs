const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://mtzeqbsnoqgmmmisqgis.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_OuSi334LBaCV3bZ8buXvMQ_sd8DJcXr';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const tables = [
    'volumetriaAnalistas',
    'monitorias',
    'monitoriaErros',
    'volumetriaPrioridades',
    'volumetriaPendencias',
    'volumetriaReprovas',
    'volumetria',
    'volumetriaTipoDeDemanda',
    'volumetriaMediaTmo',
    'volumetriaStatus'
  ];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('id').limit(1);
    console.log(`Table ${t}:`, data ? `OK (${data.length} rows)` : `Error: ${error?.message}`);
  }
}
run();
