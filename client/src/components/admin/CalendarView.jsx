import { useMemo } from 'react';

const buildDateMap = (reservations) => {
  const map = new Map();

  reservations.forEach((reservation) => {
    const start = new Date(reservation.date_start);
    const end = new Date(reservation.date_end || reservation.date_start);
    const current = new Date(start);

    while (current <= end) {
      const key = current.toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + 1);
      current.setDate(current.getDate() + 1);
    }
  });

  return map;
};

export default function CalendarView({ reservations }) {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('en-US', { month: 'long' });

  const dateMap = useMemo(() => buildDateMap(reservations), [reservations]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, index) => {
    if (index < firstDay) return null;
    const day = index - firstDay + 1;
    const dateKey = new Date(year, month, day).toISOString().slice(0, 10);
    return { day, count: dateMap.get(dateKey) || 0 };
  });

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl text-ocean-800">Calendar View</h3>
        <span className="text-xs font-semibold text-ocean-500">
          {monthName} {year}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-2 text-xs text-ocean-600">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
          <div key={label} className="text-center font-semibold">
            {label}
          </div>
        ))}
        {cells.map((cell, index) => (
          <div
            key={index}
            className={`min-h-[56px] rounded-2xl p-2 text-center ${
              cell
                ? 'bg-white/80 shadow'
                : 'border border-dashed border-ocean-100'
            }`}
          >
            {cell && (
              <div>
                <p className="text-sm font-semibold text-ocean-700">
                  {cell.day}
                </p>
                {cell.count > 0 && (
                  <p className="mt-1 rounded-full bg-aqua-100 px-2 py-1 text-[10px] font-semibold text-ocean-700">
                    {cell.count} bookings
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
