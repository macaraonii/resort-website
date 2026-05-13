import { Link } from 'react-router-dom';

const steps = [
  {
    label: 'Reservation Details',
    description: 'Choose stay type, dates, and guest counts with live pricing.'
  },
  {
    label: 'Room or Cottage',
    description: 'Pick a room for overnight stays or a cottage for day/night.'
  },
  {
    label: 'Guest Details',
    description: 'Share contact info, special requests, and vehicle count.'
  },
  {
    label: 'Payment (Prototype)',
    description: 'Select your payment option and generate a receipt.'
  }
];

export default function BookingProcessHighlights() {
  return (
    <section className="section">
      <div className="glass-panel relative overflow-hidden p-8">
        <div className="absolute -left-16 -top-16 h-32 w-32 rounded-full bg-aqua-200/60 blur-2xl" />
        <div className="absolute -right-20 -bottom-20 h-36 w-36 rounded-full bg-sun-200/60 blur-2xl" />
        <div className="absolute inset-0 bg-wave-pattern opacity-20" />
        <div className="relative">
          <span className="tag">Booking Process</span>
          <h2 className="mt-4 font-display text-3xl text-ocean-800">
            Plan your Caribbean Waves day in four easy steps
          </h2>
          <p className="mt-3 text-sm text-ocean-700">
            This prototype shows the full customer flow from selecting a stay
            type to printing a reservation receipt.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {steps.map((step, index) => (
              <div key={step.label} className="rounded-2xl bg-white/80 p-4 shadow">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ocean-500 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <p className="text-sm font-semibold text-ocean-800">
                    {step.label}
                  </p>
                </div>
                <p className="mt-2 text-xs text-ocean-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link to="/booking" className="btn-primary">
              Start Booking
            </Link>
            <Link to="/booking/overview" className="btn-secondary">
              View Full Process
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
