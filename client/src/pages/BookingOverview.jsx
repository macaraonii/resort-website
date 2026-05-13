import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';

const steps = [
  {
    title: 'Step 1: Reservation Details',
    details:
      'Select your stay type, dates, and guest counts while the price updates live.'
  },
  {
    title: 'Step 2: Room or Cottage',
    details:
      'Overnight stays require a room. Day and night swimming require a cottage.'
  },
  {
    title: 'Step 3: Guest Details',
    details:
      'Provide contact information, special requests, and number of vehicles.'
  },
  {
    title: 'Step 4: Payment (Prototype)',
    details:
      'Choose a payment option and generate a reservation reference number.'
  }
];

const checklist = [
  'Stay type and dates ready',
  'Guest headcount (adults, kids, seniors, PWD)',
  'Preferred room or cottage option',
  'Contact details for confirmation updates'
];

const reminders = [
  'Entrance fees are separate from room or cottage fees.',
  'Rooms are required for overnight stays.',
  'Corkage fee applies for alcoholic beverages and electric appliances.',
  'All rooms require a PHP 700 refundable security deposit.'
];

export default function BookingOverview() {
  return (
    <div>
      <Navbar />

      <section className="section pt-10">
        <div className="glass-panel relative overflow-hidden p-8 sm:p-10">
          <div className="absolute inset-0 bg-wave-pattern opacity-25" />
          <div className="absolute -left-12 top-6 h-20 w-20 rounded-full bg-aqua-200/70 blur-2xl" />
          <div className="absolute -right-16 -bottom-10 h-28 w-28 rounded-full bg-sun-200/70 blur-2xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <span className="tag">Customer Booking Guide</span>
              <h1 className="mt-4 font-display text-4xl text-ocean-800 sm:text-5xl">
                A clear booking flow for every family adventure
              </h1>
              <p className="mt-4 text-sm text-ocean-700">
                Explore each step of the Caribbean Waves reservation journey and
                see how guests move from stay selection to a printable receipt.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <Link to="/booking" className="btn-primary">
                  Start Reservation
                </Link>
                <a href="/booking#policies" className="btn-secondary">
                  View Resort Policies
                </a>
              </div>
            </div>
            <div className="rounded-3xl bg-white/80 p-6 shadow">
              <p className="text-xs font-semibold text-ocean-500">
                Booking checklist
              </p>
              <h2 className="mt-3 font-display text-2xl text-ocean-800">
                What to prepare before booking
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-ocean-700">
                {checklist.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-coral-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="grid gap-6 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="glass-panel p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ocean-500 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <p className="text-sm font-semibold text-ocean-800">
                  {step.title}
                </p>
              </div>
              <p className="mt-3 text-sm text-ocean-600">{step.details}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="glass-panel grid gap-8 p-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <span className="tag">Prototype Notes</span>
            <h2 className="mt-4 font-display text-3xl text-ocean-800">
              Reminders for smooth reservations
            </h2>
            <p className="mt-3 text-sm text-ocean-700">
              This prototype keeps the process simple while capturing the most
              important booking details needed by the resort team.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {reminders.map((reminder) => (
                <div
                  key={reminder}
                  className="rounded-2xl bg-white/80 p-4 text-sm text-ocean-700 shadow"
                >
                  {reminder}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-white/80 p-6 shadow">
            <p className="text-xs font-semibold text-ocean-500">Fast summary</p>
            <h3 className="mt-3 font-display text-2xl text-ocean-800">
              Booking in 5 minutes or less
            </h3>
            <p className="mt-3 text-sm text-ocean-700">
              Guests can complete the full flow with just four screens, while
              the admin dashboard instantly receives the reservation data.
            </p>
            <div className="mt-6">
              <Link to="/booking" className="btn-primary w-full">
                Go to Booking Page
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
