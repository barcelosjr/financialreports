import { useSessao } from '../context/SessaoContext';

// Cores de grade/eixo/cursor do Recharts, consistentes com o tema
// light/dark do design system (--color-sand-*). Antes duplicadas em
// Dashboard.jsx e admin/Uso.jsx.
export function useChartTheme() {
  const { tema } = useSessao();
  const isDark = tema === 'dark';
  return {
    isDark,
    corGrade: isDark ? '#3B3730' : '#E5E1D6',
    corEixo: isDark ? '#B0A891' : '#8B8371',
    corCursor: isDark ? '#262421' : '#F4F3EE',
  };
}
