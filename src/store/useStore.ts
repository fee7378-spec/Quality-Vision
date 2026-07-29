import { create } from 'zustand';
import { idbGet, idbSet, idbDel } from '../lib/idb';
import { saveToFirebase, clearFirebaseData, subscribeToFirebaseData } from '../lib/firebase';

export interface MonitoringItem {
  id?: string;
  CodigoAnalista: string;
  NomeAnalista: string;
  NomeMonitor: string;
  NomeSupervisor: string;
  FormaMonitoria: string;
  DataMonitoria: string; // YYYY-MM-DD format
  Tag: string;
  MotivoMacro: string;
  Erro: string; // '0' = Error, '100' = OK
  Esteira: string;
  DataFeedback: string; // YYYY-MM-DD or empty
  [key: string]: any;
}

export interface ColumnMapping {
  S: string;  // Código do analista
  T: string;  // Nome do Analista
  V: string;  // Nome do Monitor
  Y: string;  // Nome do Supervisor
  AA: string; // Forma da Monitoria
  AB: string; // Data da Monitoria
  AE: string; // Tags
  AF: string; // Motivo Macro
  AH: string; // Erro/Não Erro (0 ou 100)
  R: string;  // Esteira
  BT: string; // Data do Feedback
}

export const getCurrentMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const lastDayNum = new Date(year, now.getMonth() + 1, 0).getDate();
  const lastDay = String(lastDayNum).padStart(2, '0');
  return {
    start: `${year}-${month}-01`,
    end: `${year}-${month}-${lastDay}`
  };
};

export const normalizeDateStr = (raw: any): string => {
  if (!raw) return '';

  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const y = raw.getUTCFullYear();
    const m = String(raw.getUTCMonth() + 1).padStart(2, '0');
    const d = String(raw.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const str = String(raw).trim();
  if (!str) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parts = str.split('-');
    let year = Number(parts[0]);
    let month = Number(parts[1]);
    let day = Number(parts[2]);

    // Auto-fix legacy inverted dates post-July (where month > 7 was wrongly inverted from DD/MM/YYYY)
    if (month > 7 && day <= 12) {
      const temp = month;
      month = day;
      day = temp;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return str;
  }

  if (str.includes('T')) {
    const isoPart = str.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoPart)) {
      return normalizeDateStr(isoPart);
    }
  }

  if (str.includes('/')) {
    const parts = str.split(' ')[0].split('/');
    if (parts.length === 3) {
      let [p1, p2, p3] = parts.map(p => p.trim());
      if (p1.length === 4) {
        return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
      }
      // Strict DD/MM/YYYY format: p1 = Day, p2 = Month, p3 = Year
      let day = p1.padStart(2, '0');
      let month = p2.padStart(2, '0');
      let year = p3;
      if (year.length === 2) year = `20${year}`;
      return `${year.padStart(4, '20')}-${month}-${day}`;
    }
  }

  if (str.includes('-')) {
    const parts = str.split(' ')[0].split('-');
    if (parts.length === 3) {
      let [p1, p2, p3] = parts.map(p => p.trim());
      if (p1.length === 4) {
        return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
      }
      // Strict DD-MM-YYYY format: p1 = Day, p2 = Month, p3 = Year
      let day = p1.padStart(2, '0');
      let month = p2.padStart(2, '0');
      let year = p3;
      if (year.length === 2) year = `20${year}`;
      return `${year.padStart(4, '20')}-${month}-${day}`;
    }
  }

  return str.slice(0, 10);
};

export const sanitizeItems = (items: MonitoringItem[]): MonitoringItem[] => {
  if (!Array.isArray(items)) return [];
  return items.map(item => ({
    ...item,
    DataMonitoria: normalizeDateStr(item.DataMonitoria),
    DataFeedback: item.DataFeedback ? normalizeDateStr(item.DataFeedback) : ''
  }));
};

const initialMonthRange = getCurrentMonthRange();

interface AppState {
  data: MonitoringItem[];
  lastProcessed: string | null;
  startDate: string;
  endDate: string;
  selectedTag: string;
  selectedMacro: string;
  selectedEsteira: string;
  columnMapping: ColumnMapping;
  isFirebaseConnected: boolean;
  
  setData: (data: MonitoringItem[], timestamp?: string) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setSelectedTag: (tag: string) => void;
  setSelectedMacro: (macro: string) => void;
  setSelectedEsteira: (esteira: string) => void;
  setColumnMapping: (mapping: ColumnMapping) => void;
  clearData: () => void;
  resetToCurrentMonth: () => void;
}

const STORAGE_KEY = 'quality_vision_base_data_v1';
const TIMESTAMP_KEY = 'quality_vision_last_processed_v1';

// Initial rich mock data so the app displays instantly with meaningful metrics
const initialSampleData: MonitoringItem[] = [
  // CARLOS SILVA (Abertura PJ)
  { CodigoAnalista: 'MAT101', NomeAnalista: 'CARLOS SILVA', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Gravada', DataMonitoria: '2026-06-02', Tag: 'Documentação Incompleta', MotivoMacro: 'Falta de Informação', Erro: '0', Esteira: 'Abertura PJ', DataFeedback: '2026-06-05' },
  { CodigoAnalista: 'MAT101', NomeAnalista: 'CARLOS SILVA', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Ao Vivo', DataMonitoria: '2026-06-12', Tag: 'Documentação Incompleta', MotivoMacro: 'Falta de Informação', Erro: '0', Esteira: 'Abertura PJ', DataFeedback: '2026-06-15' },
  { CodigoAnalista: 'MAT101', NomeAnalista: 'CARLOS SILVA', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Ao Vivo', DataMonitoria: '2026-06-25', Tag: 'Procedimento Operacional', MotivoMacro: 'Processo Incorreto', Erro: '100', Esteira: 'Abertura PJ', DataFeedback: '' },
  { CodigoAnalista: 'MAT101', NomeAnalista: 'CARLOS SILVA', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Gravada', DataMonitoria: '2026-07-02', Tag: 'Procedimento Operacional', MotivoMacro: 'Processo Incorreto', Erro: '100', Esteira: 'Abertura PJ', DataFeedback: '' },
  { CodigoAnalista: 'MAT101', NomeAnalista: 'CARLOS SILVA', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Gravada', DataMonitoria: '2026-07-10', Tag: 'Documentação Incompleta', MotivoMacro: 'Falta de Informação', Erro: '100', Esteira: 'Abertura PJ', DataFeedback: '' },
  { CodigoAnalista: 'MAT101', NomeAnalista: 'CARLOS SILVA', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Ao Vivo', DataMonitoria: '2026-07-22', Tag: 'Documentação Incompleta', MotivoMacro: 'Falta de Informação', Erro: '100', Esteira: 'Abertura PJ', DataFeedback: '' },

  // ANA BEATRIZ (Abertura PF)
  { CodigoAnalista: 'MAT102', NomeAnalista: 'ANA BEATRIZ', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Gravada', DataMonitoria: '2026-06-05', Tag: 'SLA Excedido', MotivoMacro: 'Atraso na Entrega', Erro: '0', Esteira: 'Abertura PF', DataFeedback: '2026-06-08' },
  { CodigoAnalista: 'MAT102', NomeAnalista: 'ANA BEATRIZ', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Ao Vivo', DataMonitoria: '2026-06-18', Tag: 'SLA Excedido', MotivoMacro: 'Atraso na Entrega', Erro: '0', Esteira: 'Abertura PF', DataFeedback: '2026-06-20' },
  { CodigoAnalista: 'MAT102', NomeAnalista: 'ANA BEATRIZ', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Gravada', DataMonitoria: '2026-07-05', Tag: 'SLA Excedido', MotivoMacro: 'Atraso na Entrega', Erro: '100', Esteira: 'Abertura PF', DataFeedback: '' },
  { CodigoAnalista: 'MAT102', NomeAnalista: 'ANA BEATRIZ', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Ao Vivo', DataMonitoria: '2026-07-15', Tag: 'Atendimento ao Cliente', MotivoMacro: 'Comunicação Inadequada', Erro: '100', Esteira: 'Abertura PF', DataFeedback: '' },
  { CodigoAnalista: 'MAT102', NomeAnalista: 'ANA BEATRIZ', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Gravada', DataMonitoria: '2026-07-25', Tag: 'SLA Excedido', MotivoMacro: 'Atraso na Entrega', Erro: '100', Esteira: 'Abertura PF', DataFeedback: '' },

  // FERNANDO ALVES (Crédito PJ)
  { CodigoAnalista: 'MAT103', NomeAnalista: 'FERNANDO ALVES', NomeMonitor: 'JULIANA PEREIRA', NomeSupervisor: 'ROBERTO COSTA', FormaMonitoria: 'Gravada', DataMonitoria: '2026-06-10', Tag: 'Erro de Cadastro', MotivoMacro: 'Falha de Digitação', Erro: '0', Esteira: 'Crédito PJ', DataFeedback: '2026-06-12' },
  { CodigoAnalista: 'MAT103', NomeAnalista: 'FERNANDO ALVES', NomeMonitor: 'JULIANA PEREIRA', NomeSupervisor: 'ROBERTO COSTA', FormaMonitoria: 'Gravada', DataMonitoria: '2026-06-20', Tag: 'Erro de Cadastro', MotivoMacro: 'Falha de Digitação', Erro: '0', Esteira: 'Crédito PJ', DataFeedback: '' },
  { CodigoAnalista: 'MAT103', NomeAnalista: 'FERNANDO ALVES', NomeMonitor: 'JULIANA PEREIRA', NomeSupervisor: 'ROBERTO COSTA', FormaMonitoria: 'Ao Vivo', DataMonitoria: '2026-07-08', Tag: 'Erro de Cadastro', MotivoMacro: 'Falha de Digitação', Erro: '0', Esteira: 'Crédito PJ', DataFeedback: '2026-07-10' },
  { CodigoAnalista: 'MAT103', NomeAnalista: 'FERNANDO ALVES', NomeMonitor: 'JULIANA PEREIRA', NomeSupervisor: 'ROBERTO COSTA', FormaMonitoria: 'Ao Vivo', DataMonitoria: '2026-07-18', Tag: 'Procedimento Operacional', MotivoMacro: 'Processo Incorreto', Erro: '100', Esteira: 'Crédito PJ', DataFeedback: '' },

  // MARIANA COSTA (Crédito PJ)
  { CodigoAnalista: 'MAT104', NomeAnalista: 'MARIANA COSTA', NomeMonitor: 'JULIANA PEREIRA', NomeSupervisor: 'ROBERTO COSTA', FormaMonitoria: 'Gravada', DataMonitoria: '2026-06-15', Tag: 'Documentação Incompleta', MotivoMacro: 'Falta de Informação', Erro: '100', Esteira: 'Crédito PJ', DataFeedback: '' },
  { CodigoAnalista: 'MAT104', NomeAnalista: 'MARIANA COSTA', NomeMonitor: 'JULIANA PEREIRA', NomeSupervisor: 'ROBERTO COSTA', FormaMonitoria: 'Gravada', DataMonitoria: '2026-07-01', Tag: 'Documentação Incompleta', MotivoMacro: 'Falta de Informação', Erro: '100', Esteira: 'Crédito PJ', DataFeedback: '' },
  { CodigoAnalista: 'MAT104', NomeAnalista: 'MARIANA COSTA', NomeMonitor: 'JULIANA PEREIRA', NomeSupervisor: 'ROBERTO COSTA', FormaMonitoria: 'Ao Vivo', DataMonitoria: '2026-07-20', Tag: 'Procedimento Operacional', MotivoMacro: 'Processo Incorreto', Erro: '100', Esteira: 'Crédito PJ', DataFeedback: '' },

  // LUCAS MENDES (Abertura PF)
  { CodigoAnalista: 'MAT105', NomeAnalista: 'LUCAS MENDES', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Ao Vivo', DataMonitoria: '2026-06-28', Tag: 'Atendimento ao Cliente', MotivoMacro: 'Comunicação Inadequada', Erro: '0', Esteira: 'Abertura PF', DataFeedback: '2026-06-30' },
  { CodigoAnalista: 'MAT105', NomeAnalista: 'LUCAS MENDES', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Ao Vivo', DataMonitoria: '2026-07-12', Tag: 'Atendimento ao Cliente', MotivoMacro: 'Comunicação Inadequada', Erro: '100', Esteira: 'Abertura PF', DataFeedback: '' },
  { CodigoAnalista: 'MAT105', NomeAnalista: 'LUCAS MENDES', NomeMonitor: 'MARCOS SOUSA', NomeSupervisor: 'PATRICIA LIMA', FormaMonitoria: 'Gravada', DataMonitoria: '2026-07-24', Tag: 'Procedimento Operacional', MotivoMacro: 'Processo Incorreto', Erro: '100', Esteira: 'Abertura PF', DataFeedback: '' },
];

const loadInitialData = (): { data: MonitoringItem[]; lastProcessed: string | null } => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedTs = localStorage.getItem(TIMESTAMP_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { data: sanitizeItems(parsed), lastProcessed: savedTs || 'Gravação em cache' };
      }
    }
  } catch (e) {
    console.error("Error loading stored data:", e);
  }
  return { data: sanitizeItems(initialSampleData), lastProcessed: '28/07/2026, 09:31' };
};

const initialStored = loadInitialData();

export const useStore = create<AppState>((set) => ({
  data: initialStored.data,
  lastProcessed: initialStored.lastProcessed,
  startDate: initialMonthRange.start,
  endDate: initialMonthRange.end,
  selectedTag: 'TODAS',
  selectedMacro: 'TODOS',
  selectedEsteira: 'TODAS',
  isFirebaseConnected: true,
  columnMapping: {
    S: 'S',
    T: 'T',
    V: 'V',
    Y: 'Y',
    AA: 'AA',
    AB: 'AB',
    AE: 'AE',
    AF: 'AF',
    AH: 'AH',
    R: 'R',
    BT: 'BT'
  },
  
  setData: (newData, timestamp) => {
    const ts = timestamp || new Date().toLocaleString('pt-BR');
    const cleanData = sanitizeItems(newData);
    const range = getCurrentMonthRange();
    
    let start = range.start;
    let end = range.end;

    if (cleanData.length > 0) {
      const hasCurrentMonthData = cleanData.some(i => i.DataMonitoria >= range.start && i.DataMonitoria <= range.end);
      if (!hasCurrentMonthData) {
        const sortedDates = cleanData
          .map(i => i.DataMonitoria)
          .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
          .sort();
        if (sortedDates.length > 0) {
          start = sortedDates[0];
          end = sortedDates[sortedDates.length - 1];
        }
      }
    }

    // Direct save to Firebase Realtime Database
    saveToFirebase(cleanData, ts).catch((err) => {
      console.error("Failed to save to Firebase Realtime Database:", err);
    });

    // Async save to IndexedDB (local offline cache)
    idbSet(STORAGE_KEY, cleanData);
    idbSet(TIMESTAMP_KEY, ts);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanData));
      localStorage.setItem(TIMESTAMP_KEY, ts);
    } catch {
      console.warn("localStorage quota exceeded, saved exclusively to IndexedDB.");
    }

    set({
      data: cleanData,
      lastProcessed: ts,
      startDate: start,
      endDate: end,
      selectedTag: 'TODAS',
      selectedMacro: 'TODOS',
      selectedEsteira: 'TODAS'
    });
  },
  setStartDate: (date) => set({ startDate: date }),
  setEndDate: (date) => set({ endDate: date }),
  setSelectedTag: (tag) => set({ selectedTag: tag }),
  setSelectedMacro: (macro) => set({ selectedMacro: macro }),
  setSelectedEsteira: (esteira) => set({ selectedEsteira: esteira }),
  setColumnMapping: (mapping) => set({ columnMapping: mapping }),
  clearData: () => {
    // Clear in Firebase Realtime Database
    clearFirebaseData().catch((err) => {
      console.error("Failed to clear Firebase Realtime Database:", err);
    });

    idbDel(STORAGE_KEY);
    idbDel(TIMESTAMP_KEY);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TIMESTAMP_KEY);
    } catch {
      // Ignore
    }
    set({ data: [], lastProcessed: null });
  },
  resetToCurrentMonth: () => {
    const range = getCurrentMonthRange();
    set({
      startDate: range.start,
      endDate: range.end,
      selectedTag: 'TODAS',
      selectedMacro: 'TODOS',
      selectedEsteira: 'TODAS'
    });
  }
}));

// Real-time synchronization listener with Firebase Realtime Database
if (typeof window !== 'undefined') {
  subscribeToFirebaseData(
    (fbItems, fbTimestamp) => {
      if (fbItems && fbItems.length > 0) {
        useStore.setState((state) => ({
          ...state,
          data: fbItems,
          lastProcessed: fbTimestamp || state.lastProcessed,
          isFirebaseConnected: true
        }));
        // Update local cache
        idbSet(STORAGE_KEY, fbItems);
        if (fbTimestamp) idbSet(TIMESTAMP_KEY, fbTimestamp);
      } else {
        // Firebase is empty: seed with initial dataset so RTDB has data
        const initialTs = new Date().toLocaleString('pt-BR');
        saveToFirebase(initialSampleData, initialTs).then(() => {
          useStore.setState((state) => ({
            ...state,
            data: sanitizeItems(initialSampleData),
            lastProcessed: initialTs,
            isFirebaseConnected: true
          }));
        }).catch((err) => {
          console.error("Failed to seed initial data to Firebase:", err);
        });
      }
    },
    (err) => {
      console.warn("Firebase RTDB sync offline or error:", err);
      useStore.setState({ isFirebaseConnected: false });
    }
  );
}
