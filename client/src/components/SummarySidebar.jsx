import { formatCurrency } from '../utils/pricing.js';

export default function SummarySidebar({ summary }) {
  if (!summary) return null;

  const {
    stayType,
    dateLabel,
    guests,
    accommodation,
    entranceSubtotal,
    accommodationSubtotal,
    totalAmount
  } = summary;

  const totalGuests =
    Number(guests.adults || 0) +
    Number(guests.kids || 0) +
    Number(guests.seniors || 0) +
    Number(guests.pwd || 0);

  return (
    <div className="glass-panel p-6">
      <h3 className="font-display text-xl text-ocean-800">Booking Summary</h3>
      <div className="mt-4 space-y-3 text-sm text-ocean-700">
        <div>
          <p className="text-xs font-semibold text-ocean-500">Stay Type</p>
          <p>{stayType}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-ocean-500">Dates</p>
          <p>{dateLabel}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-ocean-500">Guests</p>
          <p>
            {totalGuests} total (Adults: {guests.adults || 0}, Kids:{' '}
            {guests.kids || 0}, Seniors: {guests.seniors || 0}, PWD:{' '}
            {guests.pwd || 0})
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-ocean-500">
            Room / Cottage
          </p>
          <p>{accommodation?.name || 'Not selected yet'}</p>
        </div>
        <div className="border-t border-ocean-100 pt-3">
          <div className="flex items-center justify-between">
            <span>Entrance subtotal</span>
            <span>{formatCurrency(entranceSubtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Accommodation</span>
            <span>{formatCurrency(accommodationSubtotal)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-base font-semibold text-ocean-800">
            <span>Estimated total</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
