const policies = [
  'All public pool transactions are walk-ins and first-come, first-served.',
  'Entrance fees are separate from room or cottage fees.',
  'Rooms are required for overnight stays.',
  'Corkage fee applies for alcoholic beverages and electric appliances.',
  'Super kalan, gas stoves, and explosive materials are prohibited.',
  'All rooms require a PHP 700 refundable security deposit.'
];

export default function Policies() {
  return (
    <section className="section" id="policies">
      <div className="glass-panel p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="tag">Resort Policies</span>
            <h2 className="mt-3 font-display text-3xl text-ocean-800">
              Reminders before you splash in
            </h2>
          </div>
          <div className="rounded-full bg-sun-200 px-4 py-2 text-xs font-semibold text-ocean-700">
            Family-friendly and safety-first
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {policies.map((policy) => (
            <div
              key={policy}
              className="flex items-start gap-3 rounded-2xl bg-white/80 p-4 text-sm text-ocean-700 shadow"
            >
              <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-coral-400" />
              <span>{policy}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
