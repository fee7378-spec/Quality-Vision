import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mtzeqbsnoqgmmmisqgis.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_OuSi334LBaCV3bZ8buXvMQ_sd8DJcXr';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface TokenRecord {
  token: string;
  qtdUsuarios: number;
  minutos: number;
  renovacao: boolean;
  qtdRenovacoes: number;
  qtdUsuariosLogados: number;
  modoVisualizacao?: string; // 'admin' | 'usuario' | 'leitura' etc.
  modo?: string;
  created_at?: string;
  dataCriacao?: string;
  creationTimeMs?: number;
}
