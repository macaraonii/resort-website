import { Link, useLocation } from 'react-router-dom';
import { formatCurrency } from '../utils/pricing.js';
import { formatDateRange } from '../utils/dates.js';

export default function ReservationSuccess() {
  const location = useLocation();
  const state = location.state;

  if (!state) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-ocean-50 via-white to-sun-100 px-6 py-16">
        <div className="mx-auto max-w-xl glass-panel p-8 text-center">
          <h1 className="font-display text-2xl text-ocean-800">
            Reservation not found
          </h1>
          <p className="mt-2 text-sm text-ocean-600">
            Please return to the booking page to create a reservation.
          </p>
          <Link to="/" className="btn-primary mt-6">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const { reference, reservation } = state;
  const dateLabel = formatDateRange(
    reservation.dateStart,
    reservation.dateEnd
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-50 via-white to-sun-100 px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="glass-panel p-8 text-center">
          <h1 className="font-display text-3xl text-ocean-800">
            Reservation Confirmed
          </h1>
          <p className="mt-2 text-sm text-ocean-600">
            Reference Number: <strong>{reference}</strong>
          </p>
          <p className="mt-3 text-sm text-ocean-600">
            Prototype only - payment processing is not yet implemented.
          </p>
        </div>

        <div className="glass-panel p-8">
          <h2 className="font-display text-2xl text-ocean-800">
            Printable Reservation Receipt
          </h2>
          <div className="mt-4 grid gap-4 text-sm text-ocean-700 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-ocean-500">Guest Name</p>
              <p>{reservation.guestDetails.fullName}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-ocean-500">Stay Type</p>
              <p>{reservation.stayType}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-ocean-500">Dates</p>
              <p>{dateLabel}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-ocean-500">Payment Method</p>
              <p>{reservation.paymentMethod}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-ocean-500">Room/Cottage</p>
              <p>{reservation.accommodation?.name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-ocean-500">Estimated Total</p>
              <p>{formatCurrency(reservation.totalAmount)}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-4">
            <button type="button" onClick={() => window.print()} className="btn-primary">
              Print Receipt
            </button>
            <Link to="/" className="btn-secondary">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
