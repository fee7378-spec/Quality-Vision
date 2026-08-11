const fs = require('fs');

let content = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf-8');

// 1. Ensure `volumetria` is exported from useStore
if (!content.includes('volumetria,')) {
  content = content.replace('productivityData,', 'productivityData,\n    volumetria,');
}

// 2. Add `getVal` helper before the component
const getValFunc = `
const getVal = (obj: any, key: string) => {
  if (!obj) return undefined;
  const found = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
  return found ? obj[found] : undefined;
};

export const DashboardPage = () => {`;
if (!content.includes('const getVal = (obj: any, key: string) => {')) {
  content = content.replace('export const DashboardPage = () => {', getValFunc);
}

// 3. Update totalProdutividade
const totalProdReplace = `
  // Total Produtividade calculation
  const totalProdutividade = useMemo(() => {
    return volumetria
      .filter(item => {
        const itemDate = getVal(item, 'data');
        if (!itemDate || typeof itemDate !== 'string') return false;
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        if (!matchesFilter(selectedEsteira, getVal(item, 'esteira'), 'TODAS')) return false;
        return true;
      })
      .reduce((sum, item) => sum + (Number(getVal(item, 'quantidade')) || 0), 0);
  }, [volumetria, startDate, endDate, selectedEsteira]);`;

content = content.replace(/  \/\/ Total Produtividade calculation[\s\S]*?\}, \[productivityData, startDate, endDate, selectedEsteira\]\);/, totalProdReplace.trim());


// 4. Update Evolucao Diaria -> Evolucao Produtividade
const evolucaoReplace = `
  // Evolução da Produtividade
  const evolucaoDiaria = useMemo(() => {
    const map = new Map<string, { key: string, label: string, volume: number }>();
    let mode: 'month' | 'week' | 'day' = 'month';

    if (startDate && endDate) {
      const d1 = new Date(startDate);
      const d2 = new Date(endDate);
      const diffDays = (d2.getTime() - d1.getTime()) / (1000 * 3600 * 24);
      if (diffDays <= 7) mode = 'day';
      else if (diffDays <= 31) mode = 'week';
    }

    const getGroup = (dateStr: string) => {
      const [y, m, d] = dateStr.split('-');
      if (mode === 'day') return { key: dateStr, label: \`\${d}/\${m}/\${y}\` };
      if (mode === 'week') {
        const dateObj = new Date(Number(y), Number(m)-1, Number(d));
        const day = dateObj.getDay();
        const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(Number(y), Number(m)-1, diff);
        const wsY = weekStart.getFullYear();
        const wsM = String(weekStart.getMonth()+1).padStart(2, '0');
        const wsD = String(weekStart.getDate()).padStart(2, '0');
        return { key: \`\${wsY}-\${wsM}-\${wsD}\`, label: \`Sem. \${wsD}/\${wsM}\` };
      }
      const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      return { key: \`\${y}-\${m}\`, label: \`\${months[Number(m)-1]}/\${y}\` };
    };

    volumetria
      .filter(item => {
        const itemDate = getVal(item, 'data');
        if (!itemDate || typeof itemDate !== 'string') return false;
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
        if (!matchesFilter(selectedEsteira, getVal(item, 'esteira'), 'TODAS')) return false;
        return true;
      })
      .forEach(p => {
        const d = getVal(p, 'data');
        if (d && typeof d === 'string') {
          const group = getGroup(d);
          const qty = Number(getVal(p, 'quantidade')) || 0;
          
          if (!map.has(group.key)) {
            map.set(group.key, { ...group, volume: 0 });
          }
          const entry = map.get(group.key)!;
          entry.volume += qty;
        }
      });

    return Array.from(map.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(item => ({
        label: item.label,
        volume: item.volume
      }));
  }, [volumetria, startDate, endDate, selectedEsteira]);`;

content = content.replace(/  \/\/ Evolução Diária da Produtividade[\s\S]*?\}, \[productivityData, startDate, endDate, selectedEsteira\]\);/, evolucaoReplace.trim());

fs.writeFileSync('src/pages/DashboardPage.tsx', content);
