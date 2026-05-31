export default function SummaryCards({ totals }) {
  const data = [
    { label: 'Total Reservations', value: totals?.total || 0 },
    { label: 'Day Swimming', value: totals?.day || 0 },
    { label: 'Night Swimming', value: totals?.night || 0 },
    { label: 'Overnight', value: totals?.overnight || 0 }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {data.map((item) => (
        <div key={item.label} className="glass-panel p-4">
          <p className="text-xs font-semibold text-ocean-500">{item.label}</p>
          <p className="mt-2 text-2xl font-semibold text-ocean-800">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
