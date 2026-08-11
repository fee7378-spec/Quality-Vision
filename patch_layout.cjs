const fs = require('fs');

let content = fs.readFileSync('src/layouts/DashboardLayout.tsx', 'utf-8');

if (!content.includes('useEffect(() => {')) {
  content = content.replace('export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {', 
  `import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const fetchSupabaseData = useStore(state => state.fetchSupabaseData);
  useEffect(() => {
    fetchSupabaseData();
  }, [fetchSupabaseData]);
`);
  fs.writeFileSync('src/layouts/DashboardLayout.tsx', content);
}
