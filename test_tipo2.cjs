const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://mtzeqbsnoqgmmmisqgis.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_OuSi334LBaCV3bZ8buXvMQ_sd8DJcXr';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.from('tipoDeDemanda').select('*').limit(5);
  console.log("Data:", data, "Error:", error);
}
run();
