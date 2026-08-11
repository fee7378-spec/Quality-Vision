const fs = require('fs');

let content = fs.readFileSync('src/pages/OperacaoPage.tsx', 'utf-8');

// import the new arrays
content = content.replace('productivityData, volumetriaTipoDeDemanda,', 'productivityData, volumetriaTipoDeDemanda, volumetriaPrioridades, volumetriaPendencias, volumetriaReprovas, volumetria,');

// replace kpis block
const oldKpisStart = '  // 1. KPI Totals';
const oldKpisEnd = '  }, [filteredProd, filteredMonitoring]);';

const oldKpisBlock = content.substring(content.indexOf(oldKpisStart), content.indexOf(oldKpisEnd) + oldKpisEnd.length);

const newKpisBlock = `  // 1. KPI Totals
  const kpis = useMemo(() => {
    // Helper to filter data from supabase tables
    const filterSupabase = (arr: any[]) => {
      return (arr || []).filter(item => {
        const itemDate = item.data || item.Data;
        if (startDate && itemDate && itemDate < startDate) return false;
        if (endDate && itemDate && itemDate > endDate) return false;
        if (!matchesFilter(selectedEsteira, item.esteira || item.Esteira, 'TODAS')) return false;
        return true;
      });
    };

    const filtVolumetria = filterSupabase(volumetria);
    const totalVolume = filtVolumetria.reduce((acc, curr) => acc + (Number(curr.quantidade || curr.Quantidade) || 0), 0);
    
    // Prioridades: tabela volumetriaPrioridades marcados como SIM
    const filtPrio = filterSupabase(volumetriaPrioridades);
    const prioVolume = filtPrio.reduce((acc, curr) => {
      const isSim = (curr.prioridade || '').trim().toLowerCase() === 'sim';
      return isSim ? acc + (Number(curr.quantidade || curr.Quantidade) || 0) : acc;
    }, 0);
    const prioPercent = totalVolume > 0 ? ((prioVolume / totalVolume) * 100).toFixed(1).replace('.', ',') : '0,0';

    const totalMonitorias = filteredMonitoring.reduce((acc, curr) => acc + (Number(curr.Quantidade) || 1), 0);
    const prioMonitoriaPercent = prioVolume > 0 
      ? ((totalMonitorias / prioVolume) * 100).toFixed(1).replace('.', ',') 
      : '0,0';

    // Pendências: tabela volumetriaPendencias
    const filtPend = filterSupabase(volumetriaPendencias);
    const pendentesCount = filtPend.reduce((acc, curr) => acc + (Number(curr.quantidade || curr.Quantidade) || 0), 0);

    // Reprovas: tabela volumetriaReprovas
    const filtReprova = filterSupabase(volumetriaReprovas);
    const reprovadosCount = filtReprova.reduce((acc, curr) => acc + (Number(curr.quantidade || curr.Quantidade) || 0), 0);

    const pendReprovTotal = pendentesCount + reprovadosCount;
    const pendReprovPercent = totalVolume > 0 
      ? ((pendReprovTotal / totalVolume) * 100).toFixed(1).replace('.', ',') 
      : '0,0';

    // Average TMO per analyst / item (apuracaoDeTempo / sum(quantidade))
    const itemsWithTmo = filteredProd.filter(p => p.TmoMinutos !== undefined && p.TmoMinutos > 0);
    const totalApuracaoTempo = itemsWithTmo.reduce((acc, curr) => acc + ((curr.TmoMinutos || 0) * (Number(curr.Quantidade) || 1)), 0);
    const totalQtyWithTmo = itemsWithTmo.reduce((acc, curr) => acc + (Number(curr.Quantidade) || 1), 0);
    const tmoAvg = totalQtyWithTmo > 0 ? (totalApuracaoTempo / totalQtyWithTmo).toFixed(1).replace('.', ',') : '0,0';

    // Pico de Produção: tabela volumetria (dia com a maior produtividade)
    const dayMap: Record<string, number> = {};
    filtVolumetria.forEach(p => {
      const d = p.data || p.Data;
      if (d) {
        dayMap[d] = (dayMap[d] || 0) + (Number(p.quantidade || p.Quantidade) || 0);
      }
    });

    let peakDay = 'N/D';
    let peakVol = 0;
    Object.entries(dayMap).forEach(([dateStr, vol]) => {
      if (vol > peakVol) {
        peakVol = vol;
        if (/^\\d{4}-\\d{2}-\\d{2}$/.test(dateStr)) {
          const [y, m, day] = dateStr.split('-');
          peakDay = \`\${day}/\${m}/\${y}\`;
        } else {
          peakDay = dateStr;
        }
      }
    });

    return {
      totalVolume,
      prioVolume,
      prioPercent,
      totalMonitorias,
      prioMonitoriaPercent,
      pendReprovTotal,
      pendReprovPercent,
      pendentesCount,
      reprovadosCount,
      tmoAvg,
      peakDay,
      peakVol
    };
  }, [volumetria, volumetriaPrioridades, volumetriaPendencias, volumetriaReprovas, filteredProd, filteredMonitoring, startDate, endDate, selectedEsteira]);`;

content = content.replace(oldKpisBlock, newKpisBlock);

fs.writeFileSync('src/pages/OperacaoPage.tsx', content);
