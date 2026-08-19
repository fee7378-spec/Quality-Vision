import { create } from 'zustand';
import { supabase, TokenRecord, SessionRecord } from '../lib/supabase';

export type AccessType = 'administracao' | 'supervisao' | 'visualizacao';

interface TokenState {
  tokenRecord: TokenRecord | null;
  tokenString: string | null;
  sessionId: string | null;
  accessType: AccessType | null;
  isLoggedIn: boolean;
  isInitialized: boolean;
  loginTime: number | null; // timestamp in ms
  renewalsUsed: number;
  isExpired: boolean;
  expiredReason: 'not_started' | 'expired' | null;
  remainingSeconds: number;
  isLoading: boolean;
  errorMsg: string | null;

  // Actions
  loginWithToken: (tokenInput: string, selectedType?: AccessType) => Promise<{ success: boolean; message: string }>;
  renewToken: () => Promise<{ success: boolean; isLastRenewal?: boolean; message: string }>;
  logout: () => Promise<void>;
  generateToken: (params: {
    tipo: AccessType;
    minutos: number;
    renovacao: boolean;
    qtdRenovacoes: number;
    qtdUsuarios: number;
    tokenLength?: number;
    presetToken?: string;
  }) => Promise<{ success: boolean; token?: string; message: string }>;
  checkTokenStatus: () => void;
  initSessionFromStorage: () => Promise<void>;
}

const STORAGE_KEY = 'app_token_session_v2';

// Clean and normalize token input
function cleanTokenString(rawToken: string): string {
  return String(rawToken || '')
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
    .trim();
}

async function fetchTokenRow(rawToken: string) {
  const cleanToken = cleanTokenString(rawToken);
  if (!cleanToken) return { data: null, error: null };

  try {
    const allRes = await supabase.from('tokens').select('*');
    if (allRes.data && Array.isArray(allRes.data) && allRes.data.length > 0) {
      const matched = allRes.data.find((row: any) => {
        const rowTokenVal = cleanTokenString(row.token ?? row.Token ?? row.TOKEN ?? '');
        if (rowTokenVal === cleanToken || rowTokenVal.toLowerCase() === cleanToken.toLowerCase()) {
          return true;
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

  // Fallback targeted queries
  let res = await supabase.from('tokens').select('*').eq('token', cleanToken).maybeSingle();
  if (res.data) return res;

  res = await supabase.from('tokens').select('*').ilike('token', cleanToken).maybeSingle();
  if (res.data) return res;

  return { data: null, error: null };
}

function parseCreationTime(data: any): { text: string; ms: number } {
  const raw = data.dataCriacao ?? data.data_criacao ?? data.datacriacao ?? data.DataCriacao ?? data.created_at;
  if (!raw) {
    const now = Date.now();
    return { text: new Date(now).toISOString(), ms: now };
  }
  if (typeof raw === 'number') {
    return { text: new Date(raw).toISOString(), ms: raw };
  }
  if (typeof raw === 'string') {
    const cleanStr = raw.trim();
    let isoLike = cleanStr.replace(' ', 'T');
    
    // Ensure string without timezone specifier is parsed as UTC to match Date.toISOString()
    if (!isoLike.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(isoLike)) {
      isoLike += 'Z';
    }
    const parsed = Date.parse(isoLike);
    if (!isNaN(parsed)) {
      return { text: cleanStr, ms: parsed };
    }
  }
  const fallbackNow = Date.now();
  return { text: String(raw), ms: fallbackNow };
}

function calculateTokenTiming(creationTimeMs: number, minutos: number) {
  const now = Date.now();
  const totalAllowedMs = (minutos || 60) * 60 * 1000;
  const expirationMs = creationTimeMs + totalAllowedMs;
  const remainingMs = expirationMs - now;
  const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  
  // Token is only considered "not started" if its creation time is set more than 5 minutes into the future
  const isNotStarted = now < (creationTimeMs - 5 * 60 * 1000);
  const isExpired = now >= expirationMs;

  return {
    now,
    creationTimeMs,
    totalAllowedMs,
    expirationMs,
    remainingSeconds,
    isNotStarted,
    isExpired,
  };
}

function parseTokenRecord(data: any, cleanToken: string): TokenRecord {
  const tokenVal = data.token ?? data.Token ?? data.TOKEN ?? cleanToken;
  
  // Normalize access type ('tipo')
  let tipoVal: AccessType = 'visualizacao';
  const rawTipo = String(data.tipo ?? data.modoVisualizacao ?? data.modo ?? '').toLowerCase().trim();
  if (rawTipo === 'administracao' || rawTipo === 'admin') {
    tipoVal = 'administracao';
  } else if (rawTipo === 'supervisao' || rawTipo === 'supervisor') {
    tipoVal = 'supervisao';
  } else {
    tipoVal = 'visualizacao';
  }

  const { text: dataCriacao, ms: creationTimeMs } = parseCreationTime(data);
  const minutos = Number(data.minutos ?? 60);

  return {
    id: data.id,
    token: tokenVal,
    tipo: tipoVal,
    qtdUsuarios: Number(data.qtdUsuarios ?? data.qtd_usuarios ?? 1),
    qtdUsuariosLogados: Number(data.qtdUsuariosLogados ?? data.qtd_usuarios_logados ?? 0),
    minutos,
    dataCriacao,
    renovacao: Boolean(data.renovacao),
    qtdRenovacoes: Number(data.qtdRenovacoes ?? data.qtd_renovacoes ?? 0),
    renovacoesUtilizadas: Number(data.renovacoesUtilizadas ?? data.renovacoes_utilizadas ?? 0),
    modoVisualizacao: tipoVal,
    modo: tipoVal,
    creationTimeMs,
    expirationTimeMs: creationTimeMs + minutos * 60 * 1000,
  };
}

// Generate cryptographically secure random token string containing A-Z, a-z, 0-9
// Automatically selects a random length between 32 and 40 characters if not specified
export function generateSecureToken(length?: number): string {
  const targetLength = length ? Math.max(32, Math.min(40, length)) : Math.floor(Math.random() * 9) + 32;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(targetLength);
  crypto.getRandomValues(array);
  let result = '';
  for (let i = 0; i < targetLength; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

export const useTokenStore = create<TokenState>((set, get) => ({
  tokenRecord: null,
  tokenString: null,
  sessionId: null,
  accessType: null,
  isLoggedIn: false,
  isInitialized: false,
  loginTime: null,
  renewalsUsed: 0,
  isExpired: false,
  expiredReason: null,
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

      const { data, error } = await fetchTokenRow(session.tokenString);
      if (error || !data) {
        localStorage.removeItem(STORAGE_KEY);
        set({ isInitialized: true });
        return;
      }

      const record = parseTokenRecord(data, session.tokenString);
      const { isNotStarted, isExpired, remainingSeconds } = calculateTokenTiming(record.creationTimeMs!, record.minutos);

      // Verify access type matching stored session
      const storedType = session.tipo as AccessType;
      if (record.tipo !== storedType) {
        localStorage.removeItem(STORAGE_KEY);
        set({ isInitialized: true });
        return;
      }

      if (isNotStarted) {
        set({
          tokenRecord: record,
          tokenString: record.token,
          accessType: record.tipo as AccessType,
          isLoggedIn: false,
          isExpired: true,
          expiredReason: 'not_started',
          errorMsg: 'Este token ainda não está disponível para utilização.',
          isInitialized: true,
        });
        return;
      }

      if (isExpired) {
        set({
          tokenRecord: record,
          tokenString: record.token,
          accessType: record.tipo as AccessType,
          isLoggedIn: true,
          isExpired: true,
          expiredReason: 'expired',
          remainingSeconds: 0,
          isInitialized: true,
        });
        return;
      }

      set({
        tokenRecord: record,
        tokenString: record.token,
        sessionId: session.sessionId || null,
        accessType: record.tipo as AccessType,
        isLoggedIn: true,
        loginTime: session.loginTime || record.creationTimeMs,
        renewalsUsed: record.renovacoesUtilizadas,
        isExpired: false,
        expiredReason: null,
        remainingSeconds,
        isInitialized: true,
      });

      // Update heartbeat in background
      if (session.sessionId && record.id) {
        try {
          await supabase.from('sessoes').update({
            ultimaAtividade: new Date().toISOString()
          }).eq('session_id', session.sessionId);
        } catch (e) {
          // Ignore table missing error
        }
      }

    } catch (err) {
      console.error('Error restoring session from storage:', err);
      localStorage.removeItem(STORAGE_KEY);
      set({ isInitialized: true });
    }
  },

  checkTokenStatus: () => {
    const { tokenRecord, isLoggedIn } = get();
    if (!isLoggedIn || !tokenRecord || !tokenRecord.creationTimeMs) return;

    const { isExpired, remainingSeconds } = calculateTokenTiming(tokenRecord.creationTimeMs, tokenRecord.minutos);

    if (isExpired) {
      set({
        remainingSeconds: 0,
        isExpired: true,
        expiredReason: 'expired',
      });
    } else {
      set({
        remainingSeconds,
        isExpired: false,
      });
    }
  },

  loginWithToken: async (tokenInput: string, selectedType?: AccessType) => {
    const cleanToken = cleanTokenString(tokenInput);
    if (!cleanToken) {
      return { success: false, message: 'Por favor, informe um token válido.' };
    }

    set({ isLoading: true, errorMsg: null });

    try {
      const { data, error } = await fetchTokenRow(cleanToken);

      if (error) {
        set({ isLoading: false });
        return { success: false, message: `Erro ao consultar Supabase: ${error.message}` };
      }

      if (!data) {
        set({ isLoading: false });
        return { success: false, message: 'Token não encontrado no banco de dados.' };
      }

      const record = parseTokenRecord(data, cleanToken);

      // Optional check if selectedType was explicitly passed and does not match
      if (selectedType && record.tipo !== selectedType) {
        set({ isLoading: false });
        return {
          success: false,
          message: `O tipo de acesso deste token é ${record.tipo.toUpperCase()}, divergente do solicitado.`,
        };
      }

      // 2. Check dataCriacao start time
      const { isNotStarted, isExpired, remainingSeconds } = calculateTokenTiming(record.creationTimeMs!, record.minutos);

      if (isNotStarted) {
        set({ isLoading: false });
        return {
          success: false,
          message: 'Este token ainda não está disponível para utilização.',
        };
      }

      // 3. Check expiration
      if (isExpired) {
        set({ isLoading: false });
        return {
          success: false,
          message: 'Este token expirou! Solicite a renovação ou informe um novo token.',
        };
      }

      // 4. Check max simultaneous users
      const currentLogados = record.qtdUsuariosLogados || 0;
      const maxUsuarios = record.qtdUsuarios || 1;

      if (currentLogados >= maxUsuarios) {
        set({ isLoading: false });
        return {
          success: false,
          message: 'Este token atingiu o limite de usuários simultâneos.',
        };
      }

      // 5. Increment qtdUsuariosLogados atomically / safely in Supabase
      const newLogados = currentLogados + 1;
      let updateRes = await supabase.from('tokens').update({
        qtdUsuariosLogados: newLogados
      }).eq('id', record.id);

      if (updateRes.error) {
        // Retry with token string match
        await supabase.from('tokens').update({
          qtdUsuariosLogados: newLogados
        }).eq('token', record.token);
      }

      record.qtdUsuariosLogados = newLogados;

      // 6. Create session entry in Supabase sessoes table
      const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      const nowIso = new Date().toISOString();

      try {
        await supabase.from('sessoes').insert([{
          token_id: record.id,
          session_id: sessionId,
          dataEntrada: nowIso,
          ultimaAtividade: nowIso,
          ativo: true,
        }]);
      } catch (sessErr) {
        console.warn('Could not insert session into sessoes table:', sessErr);
      }

      // 7. Store session in localStorage
      const nowMs = Date.now();
      const sessionObj = {
        tokenString: record.token,
        tipo: record.tipo,
        sessionId,
        loginTime: nowMs,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionObj));

      set({
        tokenRecord: record,
        tokenString: record.token,
        sessionId,
        accessType: record.tipo as AccessType,
        isLoggedIn: true,
        loginTime: nowMs,
        renewalsUsed: record.renovacoesUtilizadas,
        isExpired: false,
        expiredReason: null,
        remainingSeconds,
        isLoading: false,
        errorMsg: null,
      });

      return { success: true, message: 'Acesso concedido com sucesso!' };

    } catch (err: any) {
      console.error('Error logging in with token:', err);
      set({ isLoading: false });
      return { success: false, message: 'Ocorreu um erro ao conectar ao Supabase.' };
    }
  },

  renewToken: async () => {
    const { tokenString, tokenRecord } = get();
    if (!tokenString || !tokenRecord) {
      return { success: false, message: 'Sessão inválida para renovação.' };
    }

    set({ isLoading: true });

    try {
      // Re-fetch fresh token row from Supabase
      const { data, error } = await fetchTokenRow(tokenString);
      if (error || !data) {
        set({ isLoading: false });
        return { success: false, message: 'Token não encontrado no banco de dados para renovação.' };
      }

      const record = parseTokenRecord(data, tokenString);

      // Check if renewal allowed
      if (!record.renovacao) {
        set({ isLoading: false });
        return { success: false, message: 'A renovação não é permitida para este token.' };
      }

      const currentUsed = record.renovacoesUtilizadas || 0;
      const maxRenewals = record.qtdRenovacoes || 0;

      if (currentUsed >= maxRenewals) {
        set({ isLoading: false });
        return {
          success: false,
          message: `Limite de renovações atingido para este token (${currentUsed}/${maxRenewals}).`,
        };
      }

      const nextUsed = currentUsed + 1;
      const nowIso = new Date().toISOString();
      const nowMs = Date.now();

      // Atomic update in Supabase
      let updatePayload: any = {
        dataCriacao: nowIso,
        renovacoesUtilizadas: nextUsed,
      };

      let updateRes = await supabase.from('tokens').update(updatePayload).eq('id', record.id);
      if (updateRes.error) {
        // If renovacoesUtilizadas column doesn't exist, update dataCriacao only
        delete updatePayload.renovacoesUtilizadas;
        await supabase.from('tokens').update(updatePayload).eq('id', record.id);
      }

      record.dataCriacao = nowIso;
      record.creationTimeMs = nowMs;
      record.renovacoesUtilizadas = nextUsed;

      const isLastRenewal = nextUsed === maxRenewals;

      // Update local storage
      const sessionObj = {
        tokenString: record.token,
        tipo: record.tipo,
        sessionId: get().sessionId,
        loginTime: nowMs,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionObj));

      set({
        tokenRecord: record,
        loginTime: nowMs,
        renewalsUsed: nextUsed,
        isExpired: false,
        expiredReason: null,
        remainingSeconds: record.minutos * 60,
        isLoading: false,
      });

      const message = isLastRenewal 
        ? 'Esta foi a última renovação disponível para este token.' 
        : 'Token renovado com sucesso!';

      return {
        success: true,
        isLastRenewal,
        message,
      };

    } catch (err: any) {
      console.error('Error renewing token:', err);
      set({ isLoading: false });
      return { success: false, message: 'Falha ao renovar o token no Supabase.' };
    }
  },

  logout: async () => {
    const { tokenRecord, sessionId } = get();

    // Decrement qtdUsuariosLogados safely in Supabase
    if (tokenRecord) {
      try {
        const { data } = await fetchTokenRow(tokenRecord.token);
        if (data) {
          const currentLogados = Number(data.qtdUsuariosLogados ?? 1);
          const newLogados = Math.max(0, currentLogados - 1);
          await supabase.from('tokens').update({
            qtdUsuariosLogados: newLogados
          }).eq('id', data.id);
        }
      } catch (e) {
        console.warn('Error decrementing logged users on logout:', e);
      }
    }

    // Inactivate session in sessoes table
    if (sessionId) {
      try {
        await supabase.from('sessoes').update({
          ativo: false,
          ultimaAtividade: new Date().toISOString(),
        }).eq('session_id', sessionId);
      } catch (e) {
        // Ignore missing table error
      }
    }

    localStorage.removeItem(STORAGE_KEY);

    set({
      tokenRecord: null,
      tokenString: null,
      sessionId: null,
      accessType: null,
      isLoggedIn: false,
      loginTime: null,
      renewalsUsed: 0,
      isExpired: false,
      expiredReason: null,
      remainingSeconds: 0,
      errorMsg: null,
    });
  },

  generateToken: async ({ tipo, minutos, renovacao, qtdRenovacoes, qtdUsuarios, tokenLength, presetToken }) => {
    // Validations:
    const validMinutos = Math.max(1, minutos);
    const validRenovacoes = renovacao ? Math.max(0, qtdRenovacoes) : 0;
    const validUsuarios = Math.max(1, qtdUsuarios);

    // Generate cryptographically secure token string (A-Z, a-z, 0-9) with random length between 32 and 40 if not preset
    const tokenStr = presetToken || generateSecureToken(tokenLength);

    // Check duplicate
    try {
      const { data: existing } = await supabase.from('tokens').select('id').eq('token', tokenStr).maybeSingle();
      if (existing) {
        return { success: false, message: 'Token gerado duplicado. Por favor, tente novamente.' };
      }
    } catch (e) {
      // Continue
    }

    const nowIso = new Date().toISOString();

    const payload: any = {
      token: tokenStr,
      tipo: tipo,
      qtdUsuarios: validUsuarios,
      qtdUsuariosLogados: 0,
      minutos: validMinutos,
      dataCriacao: nowIso,
      renovacao: Boolean(renovacao),
      qtdRenovacoes: validRenovacoes,
      renovacoesUtilizadas: 0,
    };

    try {
      let { error } = await supabase.from('tokens').insert([payload]);

      if (error && error.message?.includes('renovacoesUtilizadas')) {
        delete payload.renovacoesUtilizadas;
        const retryRes = await supabase.from('tokens').insert([payload]);
        error = retryRes.error;
      }

      if (error) {
        console.error('Error inserting token into Supabase:', error);
        return { success: false, message: `Erro ao salvar token no Supabase: ${error.message}` };
      }

      return {
        success: true,
        token: tokenStr,
        message: 'Token gerado e salvo com sucesso!',
      };

    } catch (err: any) {
      console.error('Error generating token:', err);
      return { success: false, message: 'Ocorreu um erro ao gerar o token.' };
    }
  },
}));
