import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/40 bg-white/80 backdrop-blur">
      <div className="mx-auto flex items-center justify-between px-6 py-4 sm:px-10 lg:px-20">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/caribbean%20logo.jpg"
            alt="Caribbean Waves logo"
            className="h-12 w-12 rounded-full border border-white shadow"
          />
          <div>
            <p className="font-display text-lg text-ocean-700">
              Caribbean Waves
            </p>
            <p className="text-xs font-semibold text-ocean-500">
              Waterpark Resort
            </p>
          </div>
        </Link>

        <div className="hidden items-center gap-8 text-sm font-semibold text-ocean-700 lg:flex">
          <Link to="/booking" className="hover:text-ocean-500">
            Book Now
          </Link>
          <Link to="/booking/overview" className="hover:text-ocean-500">
            Booking Process
          </Link>
          <a href="/booking#accommodations" className="hover:text-ocean-500">
            Rooms & Cottages
          </a>
          <a href="/booking#policies" className="hover:text-ocean-500">
            Policies
          </a>
          <Link to="/admin/login" className="hover:text-ocean-500">
            Admin
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/booking" className="btn-primary">
            Reserve
          </Link>
        </div>
      </div>
    </header>
  );
}
