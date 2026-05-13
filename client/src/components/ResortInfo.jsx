export default function ResortInfo() {
  return (
    <section className="section" id="resort-info">
      <div className="text-center">
        <span className="tag">Resort Information</span>
        <h2 className="mt-4 font-display text-3xl text-ocean-800">
          Tropical comforts, family-first service
        </h2>
        <p className="mt-3 text-sm text-ocean-700">
          Caribbean Waves Waterpark Resort is located in Mahabang Parang,
          Sitio Abo, Pulong Sampaloc, Dona Remedios Trinidad, Bulacan.
        </p>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <div className="glass-panel p-6">
          <p className="text-xs font-semibold text-ocean-500">Location</p>
          <p className="mt-2 text-sm text-ocean-700">
            Mahabang Parang, Sitio Abo, Pulong Sampaloc, Dona Remedios Trinidad,
            Bulacan
          </p>
        </div>
        <div className="glass-panel p-6">
          <p className="text-xs font-semibold text-ocean-500">Operating Hours</p>
          <p className="mt-2 text-sm text-ocean-700">
            Day Swim: 8AM - 5PM<br />
            Night Swim: 6PM - 12MN<br />
            Overnight: 2PM - 11AM Next Day
          </p>
        </div>
        <div className="glass-panel p-6">
          <p className="text-xs font-semibold text-ocean-500">Reminders</p>
          <p className="mt-2 text-sm text-ocean-700">
            Rooms require a PHP 700 refundable security deposit. Entrance fees
            are separate from room or cottage fees.
          </p>
        </div>
      </div>
    </section>
  );
}
