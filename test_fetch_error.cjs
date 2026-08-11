const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://mtzeqbsnoqgmmmisqgis.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_OuSi334LBaCV3bZ8buXvMQ_sd8DJcXr';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const [res1, res2] = await Promise.all([
    supabase.from('monitorias').select('id').limit(1),
    supabase.from('table_that_does_not_exist').select('id').limit(1)
  ]);
  console.log("Res1:", res1);
  console.log("Res2:", res2);
}
run();
