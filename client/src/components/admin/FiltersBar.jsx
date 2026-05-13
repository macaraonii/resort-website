const statusOptions = [
  'All',
  'Pending',
  'Confirmed',
  'Cancelled',
  'Checked In',
  'Checked Out'
];

const stayOptions = [
  'All',
  'Day Swimming',
  'Night Swimming',
  'Overnight Swimming'
];

export default function FiltersBar({ filters, setFilters }) {
  const updateFilter = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="grid gap-4 rounded-3xl bg-white/80 p-4 shadow lg:grid-cols-4">
      <input
        type="text"
        value={filters.search}
        onChange={(event) => updateFilter('search', event.target.value)}
        placeholder="Search by guest or reference"
        className="rounded-2xl border border-ocean-100 p-2 text-sm"
      />
      <input
        type="date"
        value={filters.date}
        onChange={(event) => updateFilter('date', event.target.value)}
        className="rounded-2xl border border-ocean-100 p-2 text-sm"
      />
      <select
        value={filters.stayType}
        onChange={(event) => updateFilter('stayType', event.target.value)}
        className="rounded-2xl border border-ocean-100 p-2 text-sm"
      >
        {stayOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <select
        value={filters.status}
        onChange={(event) => updateFilter('status', event.target.value)}
        className="rounded-2xl border border-ocean-100 p-2 text-sm"
      >
        {statusOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
