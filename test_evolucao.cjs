const mode = 'week';
const dates = ['2026-01-02', '2026-01-05', '2026-01-08', '2026-02-01'];

const getGroup = (dateStr, mode) => {
  const [y, m, d] = dateStr.split('-');
  if (mode === 'day') return { key: dateStr, label: `${d}/${m}/${y}` };
  if (mode === 'week') {
    const dateObj = new Date(Number(y), Number(m)-1, Number(d));
    const day = dateObj.getDay();
    const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(Number(y), Number(m)-1, diff);
    const wsY = weekStart.getFullYear();
    const wsM = String(weekStart.getMonth()+1).padStart(2, '0');
    const wsD = String(weekStart.getDate()).padStart(2, '0');
    return { key: `${wsY}-${wsM}-${wsD}`, label: `Sem. ${wsD}/${wsM}` };
  }
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return { key: `${y}-${m}`, label: `${months[Number(m)-1]}/${y}` };
};

dates.forEach(d => console.log(d, getGroup(d, 'week')));
