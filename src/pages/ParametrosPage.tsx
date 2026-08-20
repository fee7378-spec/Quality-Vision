import { useMemo } from 'react';
import { Settings, Clock, Users, Calendar, Save, RotateCcw } from 'lucide-react';
import { useStore, KNOWN_ESTEIRAS, formatSecondsToHHMMSS, parseHHMMSSToSeconds } from '../store/useStore';

export const ParametrosPage = () => {
  const { 
    data, 
    productivityData, 
    esteiraParams, 
    setEsteiraParam 
  } = useStore();

  // Get list of all distinct esteiras from datasets & defaults
  const esteirasList = useMemo(() => {
    const setE = new Set<string>();
    
    // Default known esteiras
    Object.keys(esteiraParams).forEach(e => {
      if (e !== 'Geral') setE.add(e);
    });
    
    data.forEach(item => { if (item.Esteira) setE.add(item.Esteira); });
    productivityData.forEach(item => { if (item.Esteira) setE.add(item.Esteira); });

    return Array.from(setE).sort();
  }, [data, productivityData, esteiraParams]);

  const handleContratadosChange = (esteira: string, val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setEsteiraParam(esteira, { contratados: num });
  };

  const handleTmoChange = (esteira: string, hhmmss: string) => {
    const secs = parseHHMMSSToSeconds(hhmmss);
    setEsteiraParam(esteira, { tmoAlvoSegundos: secs });
  };

  const handleHorasChange = (esteira: string, val: string) => {
    const num = Math.max(1, parseFloat(val) || 8);
    setEsteiraParam(esteira, { horasTrabalhoDia: num });
  };

  const handleMetaChange = (esteira: string, val: string) => {
    const num = Math.max(1, parseInt(val, 10) || 1);
    setEsteiraParam(esteira, { metaDiaria: num });
  };

  const handleDiasUteisChange = (esteira: string, val: string) => {
    const num = Math.max(1, parseInt(val, 10) || 22);
    setEsteiraParam(esteira, { diasUteisMes: num });
  };

  return (
    <div className="p-3 sm:p-4 space-y-4 bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-white w-full max-w-full text-xs animate-in fade-in duration-200">
      
      {/* Title block */}
      <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 p-4 rounded-lg shadow-2xs space-y-1">
        <h3 className="text-xs font-bold text-[#001E62] dark:text-white uppercase tracking-wider">
          PARÂMETROS DAS ESTEIRAS
        </h3>
        <p className="text-[10px] text-gray-400">Configure as metas operacionais, equipe disponível e TMO alvo para modelagem de capacidade produtiva</p>
      </div>

      {/* Main Parameters Table */}
      <div className="bg-white dark:bg-[#131b2e] border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#001E62] dark:bg-[#192238] text-white font-bold border-b border-gray-200 dark:border-gray-800 text-[10px] uppercase tracking-wider">
                <th className="py-2.5 px-3 font-extrabold">Esteira Operacional</th>
                <th className="py-2.5 px-3 font-extrabold text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Users size={12} />
                    Contratados
                  </div>
                </th>
                <th className="py-2.5 px-3 font-extrabold text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Clock size={12} />
                    TMO (HH:MM:SS)
                  </div>
                </th>
                <th className="py-2.5 px-3 font-extrabold text-center">Horas/Dia</th>
                <th className="py-2.5 px-3 font-extrabold text-center">Meta Diária/Analista</th>
                <th className="py-2.5 px-3 font-extrabold text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Calendar size={12} />
                    Dias Úteis/Mês
                  </div>
                </th>
                <th className="py-2.5 px-3 font-extrabold text-right bg-[#001c5c] dark:bg-[#151c2e]">Capacidade Dia</th>
                <th className="py-2.5 px-3 font-extrabold text-right bg-[#001547] dark:bg-[#111726]">Capacidade Mês</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800 font-medium">
              {esteirasList.map((esteira, idx) => {
                const param = esteiraParams[esteira] || {
                  esteira,
                  contratados: 10,
                  tmoAlvoSegundos: 1800,
                  horasTrabalhoDia: 8,
                  metaDiaria: 40,
                  diasUteisMes: 22
                };

                const contratados = param.contratados ?? 10;
                const tmoSegs = param.tmoAlvoSegundos ?? 1800;
                const horasDia = param.horasTrabalhoDia ?? 8;
                const metaDiaria = param.metaDiaria ?? 40;
                const diasUteis = param.diasUteisMes ?? 22;

                const capDia = tmoSegs > 0 
                  ? Math.round((contratados * horasDia * 3600) / tmoSegs)
                  : contratados * metaDiaria;
                const capMes = capDia * diasUteis;

                return (
                  <tr key={esteira} className="hover:bg-gray-50 dark:hover:bg-[#192238]/40 transition-colors even:bg-gray-50/30 dark:even:bg-[#192238]/10">
                    <td className="py-2 px-3 font-bold text-gray-900 dark:text-white max-w-[200px] truncate uppercase text-[11px]">{esteira}</td>
                    <td className="py-2 px-3 text-center">
                      <input 
                        type="number"
                        min="0"
                        value={contratados}
                        onChange={(e) => handleContratadosChange(esteira, e.target.value)}
                        className="w-16 bg-gray-50 dark:bg-[#192238] border border-gray-300 dark:border-gray-700 rounded px-1.5 py-1 text-center font-bold text-gray-900 dark:text-white outline-none focus:border-[#001E62] dark:focus:border-blue-500 transition-colors text-xs"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input 
                        type="text"
                        placeholder="HH:MM:SS"
                        value={formatSecondsToHHMMSS(tmoSegs)}
                        onChange={(e) => handleTmoChange(esteira, e.target.value)}
                        className="w-20 bg-gray-50 dark:bg-[#192238] border border-gray-300 dark:border-gray-700 rounded px-1.5 py-1 text-center font-bold text-[#001E62] dark:text-blue-400 outline-none focus:border-[#001E62] dark:focus:border-blue-500 transition-colors text-xs"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input 
                        type="number"
                        min="1"
                        max="24"
                        value={horasDia}
                        onChange={(e) => handleHorasChange(esteira, e.target.value)}
                        className="w-14 bg-gray-50 dark:bg-[#192238] border border-gray-300 dark:border-gray-700 rounded px-1.5 py-1 text-center font-semibold text-gray-700 dark:text-gray-300 outline-none focus:border-[#001E62] dark:focus:border-blue-500 transition-colors text-xs"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input 
                        type="number"
                        min="1"
                        value={metaDiaria}
                        onChange={(e) => handleMetaChange(esteira, e.target.value)}
                        className="w-16 bg-gray-50 dark:bg-[#192238] border border-gray-300 dark:border-gray-700 rounded px-1.5 py-1 text-center font-semibold text-gray-700 dark:text-gray-300 outline-none focus:border-[#001E62] dark:focus:border-blue-500 transition-colors text-xs"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input 
                        type="number"
                        min="1"
                        max="31"
                        value={diasUteis}
                        onChange={(e) => handleDiasUteisChange(esteira, e.target.value)}
                        className="w-14 bg-gray-50 dark:bg-[#192238] border border-gray-300 dark:border-gray-700 rounded px-1.5 py-1 text-center font-semibold text-gray-700 dark:text-gray-300 outline-none focus:border-[#001E62] dark:focus:border-blue-500 transition-colors text-xs"
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-extrabold text-[#001E62] dark:text-blue-300 bg-gray-50/50 dark:bg-[#151c2e]/60 text-[11px]">
                      {capDia.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2 px-3 text-right font-extrabold text-emerald-600 dark:text-emerald-400 bg-gray-50/50 dark:bg-[#111726]/60 text-[11px]">
                      {capMes.toLocaleString('pt-BR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
