const fs = require('fs');

let content = fs.readFileSync('src/pages/OperacaoPage.tsx', 'utf-8');
const getValFunc = `  const getVal = (obj: any, key: string) => {
    if (!obj) return undefined;
    const found = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
    return found ? obj[found] : undefined;
  };\n`;

content = content.replace(getValFunc, '');

const exportStart = content.indexOf('export const OperacaoPage: React.FC = () => {');
content = content.substring(0, exportStart) + `
const getVal = (obj: any, key: string) => {
  if (!obj) return undefined;
  const found = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
  return found ? obj[found] : undefined;
};
` + content.substring(exportStart);

fs.writeFileSync('src/pages/OperacaoPage.tsx', content);
