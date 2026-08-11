const fs = require('fs');

let content = fs.readFileSync('src/store/useStore.ts', 'utf-8');

const fetchFunc = `
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
  content = content.replace('volumetriaStatus: [],', 'volumetriaStatus: [],' + fetchFunc);
  fs.writeFileSync('src/store/useStore.ts', content);
}
