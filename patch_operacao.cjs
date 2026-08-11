const fs = require('fs');

let content = fs.readFileSync('src/pages/OperacaoPage.tsx', 'utf-8');

// replace the hook imports to include volumetriaTipoDeDemanda
if (content.includes('productivityData,')) {
  content = content.replace('productivityData,', 'productivityData, volumetriaTipoDeDemanda,');
}

// replace atividadeVolume calculation
const oldAtividadeVolume = `  // 4. Atividades com maior volume por Esteira (Tipo de Demanda - apenas preenchidos)
  const atividadeVolume = useMemo(() => {
    const map: Record<string, number> = {};
    filteredProd.forEach(p => {
      const demanda = (p.TipoDemanda || '').trim();
      if (!demanda) return; // Não contabiliza se não tiver dados
      const key = \`\${demanda} (\${p.Esteira || 'Geral'})\`;
      map[key] = (map[key] || 0) + (p.Quantidade || 1);
    });

    return Object.entries(map)
      .map(([atividade, volume]) => ({ atividade, volume }))
      .sort((a, b) => b.volume - a.volume);
  }, [filteredProd]);`;

const newAtividadeVolume = `  // 4. Atividades com maior volume por Esteira (Tipo de Demanda - apenas preenchidos)
  const atividadeVolume = useMemo(() => {
    const map: Record<string, number> = {};
    const filteredVolumetria = (volumetriaTipoDeDemanda || []).filter(item => {
      const itemDate = item.data || item.Data;
      if (startDate && itemDate && itemDate < startDate) return false;
      if (endDate && itemDate && itemDate > endDate) return false;
      if (!matchesFilter(selectedEsteira, item.esteira || item.Esteira, 'TODAS')) return false;
      return true;
    });

    filteredVolumetria.forEach(p => {
      const demanda = (p.tipoDeDemanda || p.TipoDeDemanda || '').trim();
      if (!demanda) return;
      const esteira = p.esteira || p.Esteira || 'Geral';
      const key = \`\${demanda} (\${esteira})\`;
      const qty = Number(p.quantidade || p.Quantidade) || 1;
      map[key] = (map[key] || 0) + qty;
    });

    return Object.entries(map)
      .map(([atividade, volume]) => ({ atividade, volume }))
      .sort((a, b) => b.volume - a.volume);
  }, [volumetriaTipoDeDemanda, startDate, endDate, selectedEsteira]);`;

content = content.replace(oldAtividadeVolume, newAtividadeVolume);

fs.writeFileSync('src/pages/OperacaoPage.tsx', content);
