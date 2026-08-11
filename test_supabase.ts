import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mtzeqbsnoqgmmmisqgis.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_OuSi334LBaCV3bZ8buXvMQ_sd8DJcXr';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const tables = ['volumetriaAnalistas', 'monitorias', 'monitoriaErros', 'volumetriaPrioridades', 'volumetriaPendencias', 'volumetriaReprovas', 'volumetria', 'volumetriaTipoDeDemanda', 'volumetriaMediaTmo', 'volumetriaStatus'];
  for (const t of tables) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`${t}: count=${count}, error=${error?.message}`);
  }
}

test();
