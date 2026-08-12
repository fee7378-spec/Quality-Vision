import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mtzeqbsnoqgmmmisqgis.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_OuSi334LBaCV3bZ8buXvMQ_sd8DJcXr';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface TokenRecord {
  id?: number;
  token: string;
  tipo: 'administracao' | 'supervisao' | 'visualizacao' | string;
  qtdUsuarios: number;
  qtdUsuariosLogados: number;
  minutos: number;
  dataCriacao: string;
  renovacao: boolean;
  qtdRenovacoes: number;
  renovacoesUtilizadas: number;
  // Fallbacks or derived properties
  modoVisualizacao?: string;
  modo?: string;
  creationTimeMs?: number;
  expirationTimeMs?: number;
}

export interface SessionRecord {
  id?: number;
  token_id?: number;
  session_id?: string;
  dataEntrada: string;
  ultimaAtividade: string;
  ativo: boolean;
}
