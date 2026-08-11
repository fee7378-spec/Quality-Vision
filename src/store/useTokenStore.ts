import { create } from 'zustand';
import { supabase, TokenRecord } from '../lib/supabase';

interface TokenState {
  tokenRecord: TokenRecord | null;
  tokenString: string | null;
  isLoggedIn: boolean;
  isInitialized: boolean;
  loginTime: number | null; // timestamp in ms
  renewalsUsed: number;
  isExpired: boolean;
  remainingSeconds: number;
  isLoading: boolean;
  errorMsg: string | null;

  // Actions
  loginWithToken: (tokenInput: string) => Promise<{ success: boolean; message: string }>;
  renewToken: () => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  generateToken: (params: {
    modoVisualizacao: 'admin' | 'usuario';
    minutos: number; // max 300 (5h)
    renovacao: boolean;
    qtdRenovacoes: number; // max 3
    qtdUsuarios: number; // max 25
    customToken?: string;
  }) => Promise<{ success: boolean; token?: string; message: string }>;
  checkTokenStatus: () => void;
  initSessionFromStorage: () => Promise<void>;
}

const STORAGE_KEY = 'app_token_session_v1';

async function fetchTokenRow(rawToken: string) {
  const cleanToken = String(rawToken || '')
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
    .trim();

  if (!cleanToken) return { data: null, error: null };

  // 1. Fetch all rows from 'tokens' table directly (most resilient for small/medium token tables)
  try {
    const allRes = await supabase.from('tokens').select('*');
    if (allRes.data && Array.isArray(allRes.data) && allRes.data.length > 0) {
      // Find row where any token column matches cleanToken (exact case or case-insensitive)
      const matched = allRes.data.find((row: any) => {
        const rowTokenVal = String(row.token ?? row.Token ?? row.TOKEN ?? '')
          .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
          .trim();
        
        if (rowTokenVal === cleanToken) return true;
        if (rowTokenVal.toLowerCase() === cleanToken.toLowerCase()) return true;

        // Check all string fields in row as fallback
        for (const key of Object.keys(row)) {
          if (typeof row[key] === 'string') {
            const val = String(row[key]).replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim();
            if (val === cleanToken || val.toLowerCase() === cleanToken.toLowerCase()) {
              return true;
            }
          }
        }
        return false;
      });

      if (matched) {
        return { data: matched, error: null };
      }
    }
  } catch (err) {
    console.warn('Direct tokens list query failed:', err);
  }

  // 2. Targeted queries if fetch all didn't yield a match
  let res = await supabase.from('tokens').select('*').eq('token', cleanToken).maybeSingle();
  if (res.data) return res;

  res = await supabase.from('tokens').select('*').eq('Token', cleanToken).maybeSingle();
  if (res.data) return res;

  res = await supabase.from('tokens').select('*').ilike('token', cleanToken).maybeSingle();
  if (res.data) return res;

  res = await supabase.from('tokens').select('*').ilike('Token', cleanToken).maybeSingle();
  if (res.data) return res;

  return { data: null, error: null };
}

function parseCreationTime(data: any): { text: string; ms: number } {
  const raw = data.dataCriacao ?? data.data_criacao ?? data.datacriacao ?? data.DataCriacao ?? data.created_at ?? data.CreatedAt;
  if (!raw) {
    const now = Date.now();
    return { text: new Date(now).toISOString().replace('T', ' ').substring(0, 19), ms: now };
  }
  if (typeof raw === 'number') {
    return { text: new Date(raw).toISOString().replace('T', ' ').substring(0, 19), ms: raw };
  }
  if (typeof raw === 'string') {
    const cleanStr = raw.trim();
    // Parse "yyyy-mm-dd hh:mm:ss" or ISO string
    const isoLike = cleanStr.replace(' ', 'T');
    const parsed = Date.parse(isoLike);
    if (!isNaN(parsed)) {
      return { text: cleanStr, ms: parsed };
    }
  }
  const fallbackNow = Date.now();
  return { text: String(raw), ms: fallbackNow };
}

function calculateTokenExpiry(creationTimeMs: number, minutos: number) {
  const now = Date.now();
  const totalAllowedMs = (minutos || 60) * 60 * 1000;
  const expirationMs = creationTimeMs + totalAllowedMs;
  const remainingMs = expirationMs - now;
  const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const isExpired = now >= expirationMs;

  return {
    now,
    creationTimeMs,
    totalAllowedMs,
    expirationMs,
    remainingSeconds,
    isExpired,
  };
}

function parseTokenRecord(data: any, cleanToken: string): TokenRecord {
  const tokenVal = data.token ?? data.Token ?? data.TOKEN ?? cleanToken;
  const modo = data.modoVisualizacao ?? data.modo_visualizacao ?? data.modo ?? 'admin';
  const { text: dataCriacao, ms: creationTimeMs } = parseCreationTime(data);

  return {
    token: tokenVal,
    qtdUsuarios: Number(data.qtdUsuarios ?? data.qtd_usuarios ?? 1),
    minutos: Number(data.minutos ?? 60),
    renovacao: Boolean(data.renovacao),
    qtdRenovacoes: Number(data.qtdRenovacoes ?? data.qtd_renovacoes ?? 0),
    qtdUsuariosLogados: Number(data.qtdUsuariosLogados ?? data.qtd_usuarios_logados ?? 0),
    modoVisualizacao: modo,
    dataCriacao,
    creationTimeMs,
  };
}

export const useTokenStore = create<TokenState>((set, get) => ({
  tokenRecord: null,
  tokenString: null,
  isLoggedIn: false,
  isInitialized: false,
  loginTime: null,
  renewalsUsed: 0,
  isExpired: false,
  remainingSeconds: 0,
  isLoading: false,
  errorMsg: null,

  initSessionFromStorage: async () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        set({ isInitialized: true });
        return;
      }

      const session = JSON.parse(stored);
      if (!session || !session.tokenString) {
        set({ isInitialized: true });
        return;
      }

      // Fetch fresh token from Supabase using multi-level search
      const { data, error } = await fetchTokenRow(session.tokenString);

      if (error || !data) {
        localStorage.removeItem(STORAGE_KEY);
        set({ isInitialized: true });
        return;
      }

      const record = parseTokenRecord(data, session.tokenString);
      const { isExpired, remainingSeconds } = calculateTokenExpiry(record.creationTimeMs!, record.minutos);

      set({
        tokenRecord: record,
        tokenString: record.token,
        isLoggedIn: true,
        loginTime: session.loginTime || record.creationTimeMs,
        renewalsUsed: Number(session.renewalsUsed || 0),
        isExpired,
        remainingSeconds,
        isInitialized: true,
      });
    } catch (err) {
      console.error('Error restoring session:', err);
      localStorage.removeItem(STORAGE_KEY);
      set({ isInitialized: true });
    }
  },

  checkTokenStatus: () => {
    const { tokenRecord, isLoggedIn } = get();
    if (!isLoggedIn || !tokenRecord || !tokenRecord.creationTimeMs) return;

    const { isExpired, remainingSeconds } = calculateTokenExpiry(tokenRecord.creationTimeMs, tokenRecord.minutos);

    set({
      remainingSeconds,
      isExpired,
    });
  },

  loginWithToken: async (tokenInput: string) => {
    const cleanToken = tokenInput.trim();
    if (!cleanToken) {
      return { success: false, message: 'Por favor, informe um token válido.' };
    }

    set({ isLoading: true, errorMsg: null });

    try {
      const { data, error } = await fetchTokenRow(cleanToken);

      if (error) {
        console.error('Supabase query error:', error);
        set({ isLoading: false });
        return { success: false, message: `Erro ao buscar token: ${error.message}` };
      }

      if (!data) {
        set({ isLoading: false });
        return { success: false, message: 'Token inválido ou não encontrado no banco de dados.' };
      }

      const record = parseTokenRecord(data, cleanToken);
      const { isExpired, remainingSeconds } = calculateTokenExpiry(record.creationTimeMs!, record.minutos);

      if (isExpired) {
        set({ isLoading: false });
        return {
          success: false,
          message: `Token expirado! O token foi criado em ${record.dataCriacao} e tinha validade de ${record.minutos} minuto(s).`,
        };
      }

      const now = Date.now();
      const sessionObj = {
        tokenString: record.token,
        loginTime: now,
        renewalsUsed: 0,
        modoVisualizacao: record.modoVisualizacao,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionObj));

      set({
        tokenRecord: record,
        tokenString: record.token,
        isLoggedIn: true,
        loginTime: now,
        renewalsUsed: 0,
        isExpired: false,
        remainingSeconds,
        isLoading: false,
      });

      return { success: true, message: 'Token validado com sucesso!' };
    } catch (err: any) {
      console.error('Error logging in with token:', err);
      set({ isLoading: false });
      return { success: false, message: 'Ocorreu um erro ao conectar ao banco de dados.' };
    }
  },

  renewToken: async () => {
    const { tokenString, tokenRecord, renewalsUsed } = get();
    if (!tokenString || !tokenRecord) {
      return { success: false, message: 'Sessão inválida para renovação.' };
    }

    set({ isLoading: true });

    try {
      // Re-check token in Supabase
      const { data, error } = await fetchTokenRow(tokenString);

      if (error || !data) {
        set({ isLoading: false });
        return { success: false, message: 'Token não encontrado para renovação.' };
      }

      const record = parseTokenRecord(data, tokenString);
      const isRenovacaoPermitida = record.renovacao;
      const maxRenovacoes = record.qtdRenovacoes;

      if (!isRenovacaoPermitida) {
        set({ isLoading: false });
        return { success: false, message: 'Este token não permite renovações.' };
      }

      if (renewalsUsed >= maxRenovacoes) {
        set({ isLoading: false });
        return {
          success: false,
          message: `Limite de renovações atingido (${renewalsUsed}/${maxRenovacoes}).`,
        };
      }

      const now = Date.now();
      const formattedNow = new Date(now).toISOString().replace('T', ' ').substring(0, 19);

      // Update dataCriacao in Supabase to current timestamp
      if (data.id) {
        await supabase.from('tokens').update({
          dataCriacao: formattedNow,
          data_criacao: formattedNow,
        }).eq('id', data.id);
      } else {
        await supabase.from('tokens').update({
          dataCriacao: formattedNow,
          data_criacao: formattedNow,
        }).eq('token', tokenString);
      }

      record.dataCriacao = formattedNow;
      record.creationTimeMs = now;

      const nextRenewalsUsed = renewalsUsed + 1;

      const sessionObj = {
        tokenString: record.token,
        loginTime: now,
        renewalsUsed: nextRenewalsUsed,
        modoVisualizacao: record.modoVisualizacao,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionObj));

      set({
        tokenRecord: record,
        loginTime: now,
        renewalsUsed: nextRenewalsUsed,
        isExpired: false,
        remainingSeconds: record.minutos * 60,
        isLoading: false,
      });

      return { success: true, message: 'Token renovado com sucesso!' };
    } catch (err: any) {
      console.error('Error renewing token:', err);
      set({ isLoading: false });
      return { success: false, message: 'Falha ao renovar o token.' };
    }
  },

  logout: async () => {
    localStorage.removeItem(STORAGE_KEY);
    set({
      tokenRecord: null,
      tokenString: null,
      isLoggedIn: false,
      loginTime: null,
      renewalsUsed: 0,
      isExpired: false,
      remainingSeconds: 0,
      errorMsg: null,
    });
  },

  generateToken: async ({ modoVisualizacao, minutos, renovacao, qtdRenovacoes, qtdUsuarios, customToken }: {
    modoVisualizacao: 'admin' | 'usuario';
    minutos: number;
    renovacao: boolean;
    qtdRenovacoes: number;
    qtdUsuarios: number;
    customToken?: string;
  }) => {
    // Validations:
    // Max 5h = 300 min
    const validMinutos = Math.min(300, Math.max(1, minutos));
    // Max 3 renewals
    const validRenovacoes = renovacao ? Math.min(3, Math.max(0, qtdRenovacoes)) : 0;
    // Max 25 users
    const validUsuarios = Math.min(25, Math.max(1, qtdUsuarios));

    // Auto-generate token string if customToken not provided (32 chars: 'TK-' + 29 chars, upper & lower)
    let tokenStr = customToken?.trim();
    if (!tokenStr) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let randomStr = '';
      for (let i = 0; i < 29; i++) {
        randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      tokenStr = `TK-${randomStr}`; // Length 32 (between 20 and 40 chars)
    }

    const nowFormatted = new Date().toISOString().replace('T', ' ').substring(0, 19);

    try {
      // Prepare payload.
      const payload: Record<string, any> = {
        token: tokenStr,
        Token: tokenStr,
        qtdUsuarios: validUsuarios,
        minutos: validMinutos,
        renovacao: renovacao,
        qtdRenovacoes: validRenovacoes,
        qtdUsuariosLogados: 0,
        modoVisualizacao: modoVisualizacao,
        dataCriacao: nowFormatted,
        data_criacao: nowFormatted,
      };

      let { error } = await supabase.from('tokens').insert([payload]);

      // If error might be due to duplicate token/Token column or missing modoVisualizacao column, try fallbacks
      if (error) {
        delete payload.Token;
        let res1 = await supabase.from('tokens').insert([payload]);
        error = res1.error;

        if (error && error.message?.includes('modoVisualizacao')) {
          delete payload.modoVisualizacao;
          payload.modo = modoVisualizacao;
          const res2 = await supabase.from('tokens').insert([payload]);
          if (res2.error && res2.error.message?.includes('modo')) {
            delete payload.modo;
            const res3 = await supabase.from('tokens').insert([payload]);
            error = res3.error;
          } else {
            error = res2.error;
          }
        }
      }

      if (error) {
        console.error('Error inserting token into Supabase:', error);
        return { success: false, message: `Erro ao salvar token: ${error.message}` };
      }

      return {
        success: true,
        token: tokenStr,
        message: 'Token gerado com sucesso!',
      };
    } catch (err: any) {
      console.error('Error generating token:', err);
      return { success: false, message: 'Ocorreu um erro ao gerar o token.' };
    }
  },
}));
