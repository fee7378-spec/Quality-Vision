const fs = require('fs');
let content = fs.readFileSync('src/pages/OperacaoPage.tsx', 'utf-8');

if (content.includes('volumetria,') && !content.includes('volumetriaMediaTmo')) {
  content = content.replace('volumetria,', 'volumetria, volumetriaMediaTmo,');
}

const oldTmoBlockStart = '  // 5. TMO por Esteira (Vertical Bars, Descending Order - apuracaoDeTempo / quantidade por esteira)';
const oldTmoBlockEnd = '  }, [filteredProd]);';

const oldTmoBlock = content.substring(content.indexOf(oldTmoBlockStart), content.indexOf(oldTmoBlockEnd) + oldTmoBlockEnd.length);

const newTmoBlock = `  // 5. TMO por Esteira (Vertical Bars, Descending Order - apuracaoDeTempo / quantidade por esteira)
  const tmoPorEsteira = useMemo(() => {
    const map: Record<string, { totalQty: number; totalApuracao: number }> = {};
    const filteredTmo = (volumetriaMediaTmo || []).filter(item => {
      const itemDate = item.data || item.Data;
      if (startDate && itemDate && itemDate < startDate) return false;
      if (endDate && itemDate && itemDate > endDate) return false;
      if (!matchesFilter(selectedEsteira, item.esteira || item.Esteira, 'TODAS')) return false;
      return true;
    });

    filteredTmo.forEach(p => {
      const e = p.esteira || p.Esteira || 'Geral';
      const qty = Number(p.quantidade || p.Quantidade) || 1;
      const tmoTotal = Number(p.apuracaoDeTempo || p.ApuracaoDeTempo) || 0;
      if (!map[e]) map[e] = { totalQty: 0, totalApuracao: 0 };
      map[e].totalQty += qty;
      map[e].totalApuracao += tmoTotal;
    });

    return Object.entries(map).map(([esteira, val]) => ({
      esteira,
      tmoMedio: val.totalQty > 0 ? parseFloat((val.totalApuracao / val.totalQty).toFixed(1)) : 0
    })).filter(item => item.tmoMedio > 0).sort((a, b) => b.tmoMedio - a.tmoMedio);
  }, [volumetriaMediaTmo, startDate, endDate, selectedEsteira]);`;

if (content.includes(oldTmoBlockStart)) {
  content = content.replace(oldTmoBlock, newTmoBlock);
}

fs.writeFileSync('src/pages/OperacaoPage.tsx', content);
