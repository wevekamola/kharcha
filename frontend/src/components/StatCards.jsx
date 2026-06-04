import { formatINR, groupIndian } from '../utils/format.js';

export default function StatCards({ summary }) {
  const { totalDebit = 0, totalCredit = 0, count = 0 } = summary || {};
  const net = totalCredit - totalDebit;

  const cards = [
    { label: 'Total Spent',    value: formatINR(totalDebit),                      sub: count + ' debits',   cls: 'debit',   accent: 'var(--debit)' },
    { label: 'Total Received', value: formatINR(totalCredit),                     sub: count + ' credits',  cls: 'credit',  accent: 'var(--credit)' },
    { label: 'Net',            value: (net >= 0 ? '+' : '−') + formatINR(Math.abs(net)), sub: net >= 0 ? 'surplus' : 'deficit', cls: net >= 0 ? 'credit' : 'debit', accent: net >= 0 ? 'var(--credit)' : 'var(--debit)' },
    { label: 'Transactions',   value: groupIndian(count),                         sub: 'in period',          cls: 'neutral', accent: 'var(--accent)' },
  ];

  return (
    <div className="stat-row">
      {cards.map((c, i) => (
        <div className="stat-card glass" key={i}>
          <div className="stat-label">{c.label}</div>
          <div className={'stat-value ' + c.cls}>{c.value}</div>
          <div className="stat-sub"><span className="stat-pip" style={{ background: c.accent }} />{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
