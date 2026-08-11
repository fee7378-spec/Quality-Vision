const fs = require('fs');

let content = fs.readFileSync('src/pages/OperacaoPage.tsx', 'utf-8');

const getValFunc = `
  const getVal = (obj: any, key: string) => {
    if (!obj) return undefined;
    const found = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
    return found ? obj[found] : undefined;
  };

  const filterSupabase = (arr: any[]) => {
    return (arr || []).filter(item => {
      const itemDate = getVal(item, 'data');
      if (startDate && itemDate && itemDate < startDate) return false;
      if (endDate && itemDate && itemDate > endDate) return false;
      if (!matchesFilter(selectedEsteira, getVal(item, 'esteira'), 'TODAS')) return false;
      return true;
    });
  };
`;

content = content.replace(/  const filterSupabase = \(arr: any\[\]\) => \{[\s\S]*?\};\n/, getValFunc);

// Update volumetriaPrioridades
content = content.replace(/const isSim = \(curr\.prioridade \|\| curr\.Prioridade \|\| ''\)\.trim\(\)\.toLowerCase\(\) === 'sim';/g, 
  "const isSim = String(getVal(curr, 'prioridade') || '').trim().toLowerCase() === 'sim';");
content = content.replace(/Number\(curr\.quantidade \|\| curr\.Quantidade\) \|\| 0/g, "Number(getVal(curr, 'quantidade')) || 0");

content = content.replace(/const e = p\.esteira \|\| p\.Esteira \|\| 'Geral';/g, "const e = getVal(p, 'esteira') || 'Geral';");
content = content.replace(/const prio = \(p\.prioridade \|\| p\.Prioridade \|\| ''\)\.trim\(\)\.toLowerCase\(\);/g, "const prio = String(getVal(p, 'prioridade') || '').trim().toLowerCase();");

// Status
content = content.replace(/const st = p\.status \|\| p\.Status \|\| 'Aprovado';/g, "const st = getVal(p, 'status') || 'Aprovado';");
content = content.replace(/Number\(p\.quantidade \|\| p\.Quantidade\) \|\| 0/g, "Number(getVal(p, 'quantidade')) || 0");

// Motivos
content = content.replace(/const mot = \(p\.motivo \|\| p\.Motivo \|\| ''\)\.trim\(\);/g, "const mot = String(getVal(p, 'motivo') || '').trim();");

// Atividade
content = content.replace(/const demanda = \(p\.tipoDeDemanda \|\| p\.TipoDeDemanda \|\| ''\)\.trim\(\);/g, "const demanda = String(getVal(p, 'tipoDeDemanda') || '').trim();");

// TMO
content = content.replace(/const tmoTotal = Number\(p\.apuracaoDeTempo \|\| p\.ApuracaoDeTempo\) \|\| 0;/g, "const tmoTotal = Number(getVal(p, 'apuracaoDeTempo')) || 0;");

fs.writeFileSync('src/pages/OperacaoPage.tsx', content);
