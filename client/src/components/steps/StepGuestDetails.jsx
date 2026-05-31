export default function StepGuestDetails({ guestDetails, setGuestDetails }) {
  const updateField = (field, value) => {
    setGuestDetails((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-xl text-ocean-800">
          Step 3: Guest details
        </h3>
        <p className="text-sm text-ocean-600">
          Tell us who to contact. We will use this for confirmation updates.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-white/80 p-4 shadow">
          <label className="text-xs font-semibold text-ocean-500">Full Name</label>
          <input
            type="text"
            value={guestDetails.fullName}
            onChange={(event) => updateField('fullName', event.target.value)}
            placeholder="Juan Dela Cruz"
            className="mt-2 w-full rounded-xl border border-ocean-100 p-2 text-sm"
          />
        </div>
        <div className="rounded-2xl bg-white/80 p-4 shadow">
          <label className="text-xs font-semibold text-ocean-500">Email</label>
          <input
            type="email"
            value={guestDetails.email}
            onChange={(event) => updateField('email', event.target.value)}
            placeholder="juan@email.com"
            className="mt-2 w-full rounded-xl border border-ocean-100 p-2 text-sm"
          />
        </div>
        <div className="rounded-2xl bg-white/80 p-4 shadow">
          <label className="text-xs font-semibold text-ocean-500">
            Contact Number
          </label>
          <input
            type="text"
            value={guestDetails.contactNumber}
            onChange={(event) => updateField('contactNumber', event.target.value)}
            placeholder="09XXXXXXXXX"
            className="mt-2 w-full rounded-xl border border-ocean-100 p-2 text-sm"
          />
        </div>
        <div className="rounded-2xl bg-white/80 p-4 shadow">
          <label className="text-xs font-semibold text-ocean-500">Address</label>
          <input
            type="text"
            value={guestDetails.address}
            onChange={(event) => updateField('address', event.target.value)}
            placeholder="City / Province"
            className="mt-2 w-full rounded-xl border border-ocean-100 p-2 text-sm"
          />
        </div>
        <div className="rounded-2xl bg-white/80 p-4 shadow md:col-span-2">
          <label className="text-xs font-semibold text-ocean-500">
            Special Requests
          </label>
          <textarea
            value={guestDetails.specialRequests}
            onChange={(event) =>
              updateField('specialRequests', event.target.value)
            }
            placeholder="Any special request for your stay"
            rows="3"
            className="mt-2 w-full rounded-xl border border-ocean-100 p-2 text-sm"
          />
        </div>
        <div className="rounded-2xl bg-white/80 p-4 shadow">
          <label className="text-xs font-semibold text-ocean-500">
            Number of Vehicles
          </label>
          <input
            type="number"
            min="0"
            value={guestDetails.vehicles}
            onChange={(event) => updateField('vehicles', event.target.value)}
            className="mt-2 w-full rounded-xl border border-ocean-100 p-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-4 shadow">
          <input
            type="checkbox"
            checked={guestDetails.termsAccepted}
            onChange={(event) =>
              updateField('termsAccepted', event.target.checked)
            }
            className="h-4 w-4 rounded border-ocean-300"
          />
          <label className="text-xs text-ocean-600">
            I agree to the Caribbean Waves resort terms and policies.
          </label>
        </div>
      </div>
    </div>
  );
}
