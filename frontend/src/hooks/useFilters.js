import { useState, useMemo } from 'react';
import { isoDate } from '../utils/format.js';

const NOW = new Date();

function startOfMonth(d, back = 0) { return new Date(d.getFullYear(), d.getMonth() - back, 1); }
function endOfMonth(d)             { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }

export const PRESETS = [
  ['this_month', 'This Month'],
  ['last_month', 'Last Month'],
  ['last_3',     'Last 3 Months'],
  ['last_6',     'Last 6 Months'],
  ['this_year',  'This Year'],
];

export function presetRange(preset) {
  switch (preset) {
    case 'this_month': return [startOfMonth(NOW), NOW];
    case 'last_month': { const s = startOfMonth(NOW, 1); return [s, endOfMonth(s)]; }
    case 'last_3':     return [startOfMonth(NOW, 2), NOW];
    case 'last_6':     return [startOfMonth(NOW, 5), NOW];
    case 'this_year':  return [new Date(NOW.getFullYear(), 0, 1), NOW];
    default:           return [startOfMonth(NOW, 5), NOW];
  }
}

export function useFilters() {
  const [filters, setFilters] = useState({ preset: 'last_6', account: 'all', category: 'all' });

  const range = useMemo(() => {
    if (filters.preset === 'custom') return [new Date(filters.from), new Date(filters.to)];
    return presetRange(filters.preset);
  }, [filters]);

  const apiParams = useMemo(() => {
    const p = { startDate: isoDate(range[0]), endDate: isoDate(range[1]) };
    if (filters.account  !== 'all') p.accountId = filters.account;
    if (filters.category !== 'all') p.category  = filters.category;
    return p;
  }, [range, filters]);

  return { filters, setFilters, range, apiParams };
}
