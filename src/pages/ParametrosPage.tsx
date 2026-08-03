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
    <div className="w-full p-4 sm:p-6 md:p-8 bg-black text-zinc-100 space-y-6">
      {/* Main Parameters Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-bold border-b border-zinc-700">
                <th className="py-3.5 px-4 font-extrabold uppercase tracking-wider">Esteiras</th>
                <th className="py-3.5 px-4 font-extrabold uppercase tracking-wider text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Users size={14} className="text-amber-500" />
                    Contratados
                  </div>
                </th>
                <th className="py-3.5 px-4 font-extrabold uppercase tracking-wider text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Clock size={14} className="text-amber-500" />
                    TMO (HH:MM:SS)
                  </div>
                </th>
                <th className="py-3.5 px-4 font-extrabold uppercase tracking-wider text-center">Horas/Dia</th>
                <th className="py-3.5 px-4 font-extrabold uppercase tracking-wider text-center">Meta Diária/Analista</th>
                <th className="py-3.5 px-4 font-extrabold uppercase tracking-wider text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Calendar size={14} className="text-amber-500" />
                    Dias Úteis/Mês
                  </div>
                </th>
                <th className="py-3.5 px-4 font-extrabold uppercase tracking-wider text-right bg-zinc-950 text-amber-500">Capacidade Dia</th>
                <th className="py-3.5 px-4 font-extrabold uppercase tracking-wider text-right bg-zinc-950 text-emerald-400">Capacidade Mês</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
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
                  <tr key={esteira} className={idx % 2 === 0 ? 'bg-zinc-900/60 hover:bg-zinc-800/50' : 'bg-black/40 hover:bg-zinc-800/50'}>
                    <td className="py-3 px-4 font-bold text-white max-w-[200px] truncate">{esteira}</td>
                    <td className="py-3 px-4 text-center">
                      <input 
                        type="number"
                        min="0"
                        value={contratados}
                        onChange={(e) => handleContratadosChange(esteira, e.target.value)}
                        className="w-20 bg-black border border-zinc-700 rounded px-2 py-1 text-center font-bold text-white outline-none focus:border-amber-600"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input 
                        type="text"
                        placeholder="HH:MM:SS"
                        value={formatSecondsToHHMMSS(tmoSegs)}
                        onChange={(e) => handleTmoChange(esteira, e.target.value)}
                        className="w-24 bg-black border border-zinc-700 rounded px-2 py-1 text-center font-bold text-amber-500 outline-none focus:border-amber-600"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input 
                        type="number"
                        min="1"
                        max="24"
                        value={horasDia}
                        onChange={(e) => handleHorasChange(esteira, e.target.value)}
                        className="w-16 bg-black border border-zinc-700 rounded px-2 py-1 text-center font-semibold text-zinc-300 outline-none focus:border-amber-600"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input 
                        type="number"
                        min="1"
                        value={metaDiaria}
                        onChange={(e) => handleMetaChange(esteira, e.target.value)}
                        className="w-20 bg-black border border-zinc-700 rounded px-2 py-1 text-center font-semibold text-zinc-300 outline-none focus:border-amber-600"
                      />
                    </td>
                    <td className="py-3 px-4 text-center">
                      <input 
                        type="number"
                        min="1"
                        max="31"
                        value={diasUteis}
                        onChange={(e) => handleDiasUteisChange(esteira, e.target.value)}
                        className="w-16 bg-black border border-zinc-700 rounded px-2 py-1 text-center font-semibold text-zinc-300 outline-none focus:border-amber-600"
                      />
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-amber-500 bg-zinc-950/80">
                      {capDia.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-emerald-400 bg-zinc-950/80">
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
