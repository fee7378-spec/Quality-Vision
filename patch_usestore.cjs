const fs = require('fs');

let content = fs.readFileSync('src/store/useStore.ts', 'utf-8');

const newFields = `
  volumetriaAnalistas: any[];
  monitorias: any[];
  monitoriaErros: any[];
  volumetriaPrioridades: any[];
  volumetriaPendencias: any[];
  volumetriaReprovas: any[];
  volumetria: any[];
  volumetriaTipoDeDemanda: any[];
  volumetriaMediaTmo: any[];
  volumetriaStatus: any[];

  fetchSupabaseData: () => Promise<void>;
`;

if (!content.includes('volumetriaAnalistas: any[]')) {
  content = content.replace('interface AppState {', 'interface AppState {' + newFields);
}

const initialFields = `
  volumetriaAnalistas: [],
  monitorias: [],
  monitoriaErros: [],
  volumetriaPrioridades: [],
  volumetriaPendencias: [],
  volumetriaReprovas: [],
  volumetria: [],
  volumetriaTipoDeDemanda: [],
  volumetriaMediaTmo: [],
  volumetriaStatus: [],
`;

if (!content.includes('volumetriaAnalistas: [],')) {
  content = content.replace('export const useStore = create<AppState>((set, get) => ({', 'export const useStore = create<AppState>((set, get) => ({\n' + initialFields);
}

const fetchSupabaseDataFunc = `
  fetchSupabaseData: async () => {
    try {
      const { fetchAllSupabaseData } = await import('./supabaseData');
      const data = await fetchAllSupabaseData();
      set({ ...data });
    } catch (e) {
      console.error("Error fetching from Supabase:", e);
    }
  },
`;

if (!content.includes('fetchSupabaseData: async () => {')) {
  content = content.replace('clearData: () => {', fetchSupabaseDataFunc + '\n  clearData: () => {');
}

fs.writeFileSync('src/store/useStore.ts', content);
