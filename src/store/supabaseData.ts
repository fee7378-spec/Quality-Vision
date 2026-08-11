import { supabase } from '../lib/supabase';
import { normalizeDateStr } from './useStore';

const fetchAllRows = async (tableName: string) => {
  let allRows: any[] = [];
  let from = 0;
  const step = 1000;
  while (true) {
    const { data, error } = await supabase.from(tableName).select('*').range(from, from + step - 1);
    if (error || !data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < step) break;
    from += step;
  }
  return allRows;
};

export const fetchAllSupabaseData = async () => {
  const [
    volumetriaAnalistas,
    monitorias,
    monitoriaErros,
    volumetriaPrioridades,
    volumetriaPendencias,
    volumetriaReprovas,
    volumetria,
    volumetriaTipoDeDemanda,
    volumetriaMediaTmo,
    volumetriaStatus
  ] = await Promise.all([
    fetchAllRows('volumetriaAnalistas'),
    fetchAllRows('monitorias'),
    fetchAllRows('monitoriaErros'),
    fetchAllRows('volumetriaPrioridades'),
    fetchAllRows('volumetriaPendencias'),
    fetchAllRows('volumetriaReprovas'),
    fetchAllRows('volumetria'),
    fetchAllRows('volumetriaTipoDeDemanda'),
    fetchAllRows('volumetriaMediaTmo'),
    fetchAllRows('volumetriaStatus')
  ]);

  const mapData = (arr: any[]) => arr ? arr.map(item => {
    const dataKey = Object.keys(item).find(k => k.toLowerCase() === 'data');
    return {
      ...item,
      data: dataKey ? normalizeDateStr(item[dataKey]) : ''
    };
  }) : [];

  return {
    volumetriaAnalistas: mapData(volumetriaAnalistas || []),
    monitorias: mapData(monitorias || []),
    monitoriaErros: mapData(monitoriaErros || []),
    volumetriaPrioridades: mapData(volumetriaPrioridades || []),
    volumetriaPendencias: mapData(volumetriaPendencias || []),
    volumetriaReprovas: mapData(volumetriaReprovas || []),
    volumetria: mapData(volumetria || []),
    volumetriaTipoDeDemanda: mapData(volumetriaTipoDeDemanda || []),
    volumetriaMediaTmo: mapData(volumetriaMediaTmo || []),
    volumetriaStatus: mapData(volumetriaStatus || [])
  };
};
