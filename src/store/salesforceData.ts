export interface SalesforceCaseHistory {
  data: string;
  usuario: string;
  acao: string;
  detalhes: string;
}

export interface SalesforceCase {
  id: string;
  atividade: string;
  fila: string;
  analista: string;
  status: string;
  prioridade: string;
  sla: 'Normal' | 'Alerta' | 'Violado';
  tempoConclusaoMinutos: number; // tempo médio em minutos
  tempoRestanteAtraso: string; // "+18h32", "01h24 restante", "12h42" etc
  tempoOrdenacaoMinutos: number; // para fins de ordenação ou lógica (atraso positivo, restante negativo)
  dataAbertura: string; // YYYY-MM-DD HH:mm
  ultimaAtualizacao: string; // YYYY-MM-DD HH:mm
  historico: SalesforceCaseHistory[];
}

export const FILAS = [
  'Backoffice',
  'Cadastro',
  'Onboarding',
  'Atendimento',
  'Portal ADM',
  'Contas',
  'Produtos'
];

export const ANALISTAS = [
  'João Silva',
  'Maria Oliveira',
  'Carlos Santos',
  'Ana Souza',
  'Lucas Almeida',
  'Fernanda Costa',
  'Rafael Lima',
  'Juliana Martins',
  'Gabriel Rocha',
  'Camila Ferreira',
  'Bruno Mendes',
  'Larissa Alves'
];

export const ATIVIDADES = [
  'Abertura de conta',
  'Abono',
  'Atualização cadastral',
  'Alteração de officer',
  'Alteração de segmento',
  'Bloqueio',
  'Criação de login Portal ADM',
  'Desbloqueio',
  'Encerramento de conta',
  'Inclusão de mercado',
  'Liberação de termo',
  'Parametrização'
];

export const STATUSES = [
  'Pendenciado',
  'Em Progresso',
  'N2',
  'Triagem',
  'Reaberto'
];

export const PRIORIDADES = [
  'Crítica',
  'Alta',
  'Média',
  'Baixa'
];

// Função determinística para gerar dados realistas baseados no mês atual
export function generateMockSalesforceCases(): SalesforceCase[] {
  const cases: SalesforceCase[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // Vamos gerar exatamente 85 casos distribuídos ao longo do mês atual
  for (let i = 1; i <= 85; i++) {
    const id = `CAS-10${400 + i}`;
    
    // Distribuição determinística dos campos usando restos da divisão de i
    const atividade = ATIVIDADES[i % ATIVIDADES.length];
    const fila = FILAS[i % FILAS.length];
    const analista = ANALISTAS[i % ANALISTAS.length];
    const status = STATUSES[i % STATUSES.length];
    const prioridade = PRIORIDADES[i % PRIORIDADES.length];
    
    // SLA baseado no resto da divisão
    let sla: 'Normal' | 'Alerta' | 'Violado' = 'Normal';
    if (i % 7 === 0) {
      sla = 'Violado';
    } else if (i % 13 === 0) {
      sla = 'Alerta';
    }

    // Gerar dia aleatório mas determinístico no mês corrente
    const day = Math.max(1, Math.min(28, (i * 3) % 28));
    const hour = (i * 7) % 24;
    const min = (i * 13) % 60;

    // Formatar data de abertura
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const hourStr = String(hour).padStart(2, '0');
    const minStr = String(min).padStart(2, '0');
    const dataAbertura = `${currentYear}-${monthStr}-${dayStr} ${hourStr}:${minStr}`;

    // Última atualização posterior à abertura
    const updateHour = (hour + 2) % 24;
    const updateMin = (min + 15) % 60;
    const updateHourStr = String(updateHour).padStart(2, '0');
    const updateMinStr = String(updateMin).padStart(2, '0');
    // Para casos mais antigos, a última atualização é no dia seguinte ou poucas horas depois
    const updateDay = (day + (i % 2)) > 28 ? 28 : (day + (i % 2));
    const updateDayStr = String(updateDay).padStart(2, '0');
    const ultimaAtualizacao = `${currentYear}-${monthStr}-${updateDayStr} ${updateHourStr}:${updateMinStr}`;

    // Tempo de conclusão fictício em minutos
    const tempoConclusaoMinutos = 120 + ((i * 45) % 1800);

    // Ajustar tempo restante / atraso e ordenação de minutos com base no SLA
    let tempoRestanteAtraso = '';
    let tempoOrdenacaoMinutos = 0;

    if (sla === 'Violado') {
      // Tempo de atraso positivo
      const delayHours = Math.max(1, (i * 5) % 48);
      const delayMins = (i * 11) % 60;
      
      if (delayHours >= 24) {
        const days = Math.floor(delayHours / 24);
        const hours = delayHours % 24;
        tempoRestanteAtraso = `+${days}d ${String(hours).padStart(2, '0')}h${String(delayMins).padStart(2, '0')}`;
        tempoOrdenacaoMinutos = (days * 24 * 60) + (hours * 60) + delayMins;
      } else {
        tempoRestanteAtraso = `+${String(delayHours).padStart(2, '0')}h${String(delayMins).padStart(2, '0')}`;
        tempoOrdenacaoMinutos = (delayHours * 60) + delayMins;
      }
    } else if (sla === 'Alerta') {
      // Tempo restante menor que 4 horas
      const restHours = Math.max(0, (i * 2) % 4);
      const restMins = Math.max(1, (i * 17) % 60);
      tempoRestanteAtraso = `${String(restHours).padStart(2, '0')}h${String(restMins).padStart(2, '0')} restante`;
      tempoOrdenacaoMinutos = -((restHours * 60) + restMins); // negativo para ordenar antes
    } else {
      // Normal
      const hours = Math.max(1, (i * 3) % 24);
      const mins = (i * 9) % 60;
      tempoRestanteAtraso = `${String(hours).padStart(2, '0')}h${String(mins).padStart(2, '0')}`;
      tempoOrdenacaoMinutos = -10000 - ((hours * 60) + mins);
    }

    // Histórico de atividades fictício coerente
    const historico: SalesforceCaseHistory[] = [
      {
        data: `${currentYear}-${monthStr}-${dayStr} ${hourStr}:${minStr}`,
        usuario: 'System',
        acao: 'Criação do Caso',
        detalhes: `Caso criado com prioridade ${prioridade} e atribuído automaticamente para a fila ${fila}.`
      }
    ];

    if (status !== 'Triagem') {
      const stepHour = (hour + 1) % 24;
      const stepHourStr = String(stepHour).padStart(2, '0');
      historico.push({
        data: `${currentYear}-${monthStr}-${dayStr} ${stepHourStr}:${minStr}`,
        usuario: 'Triagem Automática',
        acao: 'Mudança de Status',
        detalhes: 'Caso triado com sucesso e encaminhado para análise operacional.'
      });
    }

    if (status === 'Em Progresso' || status === 'Pendenciado' || status === 'N2' || status === 'Reaberto') {
      historico.push({
        data: ultimaAtualizacao,
        usuario: analista,
        acao: status === 'Pendenciado' ? 'Solicitação de Pendência' : 'Início de Análise',
        detalhes: status === 'Pendenciado' 
          ? 'Caso movido para pendenciado aguardando documentação complementar do cliente.' 
          : `Caso assumido pelo analista ${analista} para tratamento.`
      });
    }

    if (status === 'Reaberto') {
      historico.push({
        data: ultimaAtualizacao,
        usuario: 'Supervisor',
        acao: 'Caso Reaberto',
        detalhes: 'Solicitação reaberta devido a inconsistência no processo de fechamento original.'
      });
    }

    cases.push({
      id,
      atividade,
      fila,
      analista,
      status,
      prioridade,
      sla,
      tempoConclusaoMinutos,
      tempoRestanteAtraso,
      tempoOrdenacaoMinutos,
      dataAbertura,
      ultimaAtualizacao,
      historico
    });
  }

  return cases;
}
