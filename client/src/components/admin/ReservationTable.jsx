import { formatCurrency } from '../../utils/pricing.js';

const statusOptions = [
  'Pending',
  'Confirmed',
  'Cancelled',
  'Checked In',
  'Checked Out'
];

export default function ReservationTable({
  reservations,
  onViewDetails,
  onStatusChange
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-white/80 shadow">
      <table className="w-full text-left text-sm">
        <thead className="bg-ocean-50 text-xs uppercase text-ocean-600">
          <tr>
            <th className="px-4 py-3">Reservation ID</th>
            <th className="px-4 py-3">Guest Name</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">Dates</th>
            <th className="px-4 py-3">Stay Type</th>
            <th className="px-4 py-3">Guests</th>
            <th className="px-4 py-3">Room/Cottage</th>
            <th className="px-4 py-3">Total Amount</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((item) => (
            <tr key={item.id} className="border-t border-ocean-100">
              <td className="px-4 py-3 font-semibold text-ocean-700">
                {item.reference}
              </td>
              <td className="px-4 py-3">{item.full_name}</td>
              <td className="px-4 py-3">{item.contact_number}</td>
              <td className="px-4 py-3">
                {item.date_start}
                {item.date_end && item.date_end !== item.date_start
                  ? ` to ${item.date_end}`
                  : ''}
              </td>
              <td className="px-4 py-3">{item.stay_type}</td>
              <td className="px-4 py-3">{item.total_guests}</td>
              <td className="px-4 py-3">{item.accommodation_name}</td>
              <td className="px-4 py-3">
                {formatCurrency(item.total_amount)}
              </td>
              <td className="px-4 py-3">
                <select
                  value={item.status}
                  onChange={(event) =>
                    onStatusChange(item.id, event.target.value)
                  }
                  className="rounded-xl border border-ocean-100 p-2 text-xs"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onViewDetails(item)}
                  className="text-xs font-semibold text-ocean-500"
                >
                  View
                </button>
              </td>
            </tr>
          ))}
          {reservations.length === 0 && (
            <tr>
              <td
                className="px-4 py-6 text-center text-sm text-ocean-500"
                colSpan="10"
              >
                No reservations found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
