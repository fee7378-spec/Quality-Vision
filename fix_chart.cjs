const fs = require('fs');

let content = fs.readFileSync('src/pages/OperacaoPage.tsx', 'utf-8');

const esteiraPrioDataReplace = `
  const esteiraPrioData = useMemo(() => {
    const map: Record<string, { esteira: string; sim: number; nao: number; total: number }> = {};
    const filtPrio = filterSupabase(volumetriaPrioridades);
    const filtVol = filterSupabase(volumetria);

    // Primeiro preenche com o total de volumetria
    filtVol.forEach(p => {
      const e = getVal(p, 'esteira') || 'Geral';
      if (!map[e]) map[e] = { esteira: e, sim: 0, nao: 0, total: 0 };
      const qty = Number(getVal(p, 'quantidade')) || 0;
      map[e].total += qty;
    });

    // Depois adiciona o que é prioridade (Sim)
    filtPrio.forEach(p => {
      const e = getVal(p, 'esteira') || 'Geral';
      if (!map[e]) map[e] = { esteira: e, sim: 0, nao: 0, total: 0 };
      const qty = Number(getVal(p, 'quantidade')) || 0;
      map[e].sim += qty;
    });

    // Calcula o que é Normal (Nao = Total - Sim) e previne números negativos se a base estiver inconsistente
    Object.values(map).forEach(v => {
      v.nao = Math.max(0, v.total - v.sim);
      // Ajusta o total real apenas para ordenação, garantindo que seja pelo menos a soma (caso sim > total base)
      v.total = v.sim + v.nao; 
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [volumetria, volumetriaPrioridades, startDate, endDate, selectedEsteira]);`;

content = content.replace(/  const esteiraPrioData = useMemo\(\(\) => \{[\s\S]*?\}, \[volumetriaPrioridades, startDate, endDate, selectedEsteira\]\);/, esteiraPrioDataReplace.trim());

fs.writeFileSync('src/pages/OperacaoPage.tsx', content);
