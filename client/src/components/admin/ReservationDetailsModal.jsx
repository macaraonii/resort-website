import { formatCurrency } from '../../utils/pricing.js';

export default function ReservationDetailsModal({ reservation, onClose }) {
  if (!reservation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="glass-panel max-w-2xl p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl text-ocean-800">
            Reservation Details
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-ocean-500"
          >
            Close
          </button>
        </div>
        <div className="mt-4 grid gap-4 text-sm text-ocean-700 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-ocean-500">Reference</p>
            <p>{reservation.reference}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-ocean-500">Guest Name</p>
            <p>{reservation.full_name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-ocean-500">Contact</p>
            <p>{reservation.contact_number}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-ocean-500">Email</p>
            <p>{reservation.email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-ocean-500">Stay Type</p>
            <p>{reservation.stay_type}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-ocean-500">Dates</p>
            <p>
              {reservation.date_start}
              {reservation.date_end && reservation.date_end !== reservation.date_start
                ? ` to ${reservation.date_end}`
                : ''}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-ocean-500">Guests</p>
            <p>{reservation.total_guests}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-ocean-500">
              Room/Cottage
            </p>
            <p>{reservation.accommodation_name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-ocean-500">Payment Method</p>
            <p>{reservation.payment_method}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-ocean-500">Total Amount</p>
            <p>{formatCurrency(reservation.total_amount)}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-ocean-500">Address</p>
            <p>{reservation.address}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-ocean-500">
              Special Requests
            </p>
            <p>{reservation.special_requests || 'None'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
