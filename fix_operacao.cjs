const fs = require('fs');
let content = fs.readFileSync('src/pages/OperacaoPage.tsx', 'utf-8');

const missingFunctions = `
  // 2. Volumetria por Esteira e Prioridade (Sim vs Não) - Descending Order
  const esteiraPrioData = useMemo(() => {
    const map: Record<string, { esteira: string; sim: number; nao: number; total: number }> = {};
    const filtPrio = (volumetriaPrioridades || []).filter(item => {
      const itemDate = item.data || item.Data;
      if (startDate && itemDate && itemDate < startDate) return false;
      if (endDate && itemDate && itemDate > endDate) return false;
      if (!matchesFilter(selectedEsteira, item.esteira || item.Esteira, 'TODAS')) return false;
      return true;
    });

    filtPrio.forEach(p => {
      const e = p.esteira || p.Esteira || 'Geral';
      if (!map[e]) {
        map[e] = { esteira: e, sim: 0, nao: 0, total: 0 };
      }
      const qty = Number(p.quantidade || p.Quantidade) || 0;
      const prio = (p.prioridade || p.Prioridade || '').trim().toLowerCase();
      if (prio === 'sim' || prio === 's' || prio === 'true' || prio === '1') {
        map[e].sim += qty;
      } else {
        map[e].nao += qty;
      }
      map[e].total += qty;
    });

    // Sort descending by total volume
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [volumetriaPrioridades, startDate, endDate, selectedEsteira]);

  // 3. Status Distribution & Top Motivos de Pendência / Reprova
  const statusDist = useMemo(() => {
    let aprovados = 0;
    let pendentes = 0;
    let reprovados = 0;

    const filtStatus = (volumetriaStatus || []).filter(item => {
      const itemDate = item.data || item.Data;
      if (startDate && itemDate && itemDate < startDate) return false;
      if (endDate && itemDate && itemDate > endDate) return false;
      if (!matchesFilter(selectedEsteira, item.esteira || item.Esteira, 'TODAS')) return false;
      return true;
    });

    filtStatus.forEach(p => {
      const st = p.status || p.Status || 'Aprovado';
      const qty = Number(p.quantidade || p.Quantidade) || 0;
      if (st === 'Pendência' || st === 'Pendencia') pendentes += qty;
      else if (st === 'Reprovado' || st === 'Reprova') reprovados += qty;
      else aprovados += qty;
    });

    return [
      { name: 'Aprovados', value: aprovados, color: '#14B8A6' },
      { name: 'Pendências', value: pendentes, color: '#F59E0B' },
      { name: 'Reprovados', value: reprovados, color: '#EF4444' }
    ];
  }, [volumetriaStatus, startDate, endDate, selectedEsteira]);

  const topMotivos = useMemo(() => {
    const map: Record<string, number> = {};
    const filtPend = (volumetriaPendencias || []).filter(item => {
      const itemDate = item.data || item.Data;
      if (startDate && itemDate && itemDate < startDate) return false;
      if (endDate && itemDate && itemDate > endDate) return false;
      if (!matchesFilter(selectedEsteira, item.esteira || item.Esteira, 'TODAS')) return false;
      return true;
    });

    const filtRepr = (volumetriaReprovas || []).filter(item => {
      const itemDate = item.data || item.Data;
      if (startDate && itemDate && itemDate < startDate) return false;
      if (endDate && itemDate && itemDate > endDate) return false;
      if (!matchesFilter(selectedEsteira, item.esteira || item.Esteira, 'TODAS')) return false;
      return true;
    });

    filtPend.forEach(p => {
      const mot = (p.motivo || p.Motivo || '').trim();
      if (mot && mot.toLowerCase() !== 'nenhum' && mot.toLowerCase() !== 'outros / não especificado') {
        map[mot] = (map[mot] || 0) + (Number(p.quantidade || p.Quantidade) || 0);
      }
    });

    filtRepr.forEach(p => {
      const mot = (p.motivo || p.Motivo || '').trim();
      if (mot && mot.toLowerCase() !== 'nenhum' && mot.toLowerCase() !== 'outros / não especificado') {
        map[mot] = (map[mot] || 0) + (Number(p.quantidade || p.Quantidade) || 0);
      }
    });

    return Object.entries(map)
      .map(([motivo, count]) => ({ motivo, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [volumetriaPendencias, volumetriaReprovas, startDate, endDate, selectedEsteira]);
`;

// I will insert them right before " // 4. Atividades com maior volume por Esteira"
content = content.replace('  // 4. Atividades com', missingFunctions + '\n  // 4. Atividades com');

// Make sure to add volumetriaStatus to useStore import inside OperacaoPage
if (!content.includes('volumetriaStatus,')) {
    content = content.replace('volumetriaReprovas,', 'volumetriaReprovas, volumetriaStatus,');
}

fs.writeFileSync('src/pages/OperacaoPage.tsx', content);
