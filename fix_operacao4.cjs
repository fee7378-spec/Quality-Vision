const fs = require('fs');

const missingFuncs = `
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

  // 4. Atividades com maior volume
`;

let content = fs.readFileSync('src/pages/OperacaoPage.tsx', 'utf-8');

// Replace the duplicate tmoPorEsteira and whatever is between them
const tmoStart = content.indexOf('const tmoPorEsteira = useMemo(() => {', content.indexOf('const tmoPorEsteira = useMemo(() => {') + 1);
if (tmoStart !== -1) {
    const tmoEnd = content.indexOf('  }, [filteredProd]);', tmoStart);
    if (tmoEnd !== -1) {
        content = content.substring(0, content.indexOf('// 5. TMO por Esteira', tmoStart - 100)) + content.substring(tmoEnd + 21);
    }
}

content = content.replace('// 4. Atividades com maior volume', missingFuncs);

if (!content.includes('volumetriaStatus,')) {
    content = content.replace('volumetriaReprovas,', 'volumetriaReprovas, volumetriaStatus,');
}

fs.writeFileSync('src/pages/OperacaoPage.tsx', content);

