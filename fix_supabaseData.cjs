const fs = require('fs');

let content = fs.readFileSync('src/store/supabaseData.ts', 'utf-8');
content = content.replace(
  "const mapData = (arr: any[]) => arr ? arr.map(item => ({ ...item, data: normalizeDateStr(item.data) })) : [];",
  "const mapData = (arr: any[]) => arr ? arr.map(item => { const dataKey = Object.keys(item).find(k => k.toLowerCase() === 'data'); return { ...item, data: dataKey ? normalizeDateStr(item[dataKey]) : '' }; }) : [];"
);

fs.writeFileSync('src/store/supabaseData.ts', content);
