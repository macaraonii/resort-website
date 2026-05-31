import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import BookingWizard from '../components/BookingWizard.jsx';
import Policies from '../components/Policies.jsx';
import Footer from '../components/Footer.jsx';

const highlights = [
  'Live entrance fee computation by guest type',
  'Room or cottage availability badges',
  'Printable reservation receipt after confirmation',
  'Prototype payment choices for demo purposes'
];

export default function BookingPage() {
  return (
    <div>
      <Navbar />
      <section className="section pt-10">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="tag">Customer Reservation Flow</span>
            <h1 className="mt-4 font-display text-4xl text-ocean-800 sm:text-5xl">
              Reserve your Caribbean Waves getaway
            </h1>
            <p className="mt-4 text-sm text-ocean-700">
              Complete the booking steps below. Your reservation details will be
              saved and shown in the admin dashboard for review.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link to="/booking/overview" className="btn-secondary">
                View Booking Guide
              </Link>
              <a href="#policies" className="btn-primary">
                Resort Policies
              </a>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {highlights.map((item) => (
                <div key={item} className="glass-panel p-4">
                  <p className="text-sm text-ocean-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-aqua-200/70 blur-2xl" />
            <div className="absolute -right-10 bottom-6 h-28 w-28 rounded-full bg-sun-200/70 blur-2xl" />
            <div className="glass-panel relative overflow-hidden p-6">
              <div className="absolute inset-0 bg-wave-pattern opacity-25" />
              <div className="relative space-y-4">
                <p className="text-xs font-semibold text-ocean-500">
                  Quick booking steps
                </p>
                <div className="rounded-2xl bg-white/80 p-4 shadow">
                  <p className="text-sm font-semibold text-ocean-800">
                    1. Select stay type and date
                  </p>
                  <p className="mt-1 text-xs text-ocean-600">
                    Day, night, or overnight swimming options.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/80 p-4 shadow">
                  <p className="text-sm font-semibold text-ocean-800">
                    2. Pick a room or cottage
                  </p>
                  <p className="mt-1 text-xs text-ocean-600">
                    Rooms required for overnight stays.
                  </p>
                </div>
                <div className="rounded-2xl bg-white/80 p-4 shadow">
                  <p className="text-sm font-semibold text-ocean-800">
                    3. Add guest details and pay
                  </p>
                  <p className="mt-1 text-xs text-ocean-600">
                    Receive a reservation reference number.
                  </p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 left-6 flex gap-4">
              <div className="floaty h-10 w-10 rounded-full bg-aqua-200/80" />
              <div className="floaty h-6 w-6 rounded-full bg-sun-200/80" />
            </div>
          </div>
        </div>
        <div className="mt-12 h-16 w-full bg-wave-pattern bg-cover bg-center" />
      </section>

      <section className="section">
        <BookingWizard />
      </section>

      <Policies />
      <Footer />
    </div>
  );
}
