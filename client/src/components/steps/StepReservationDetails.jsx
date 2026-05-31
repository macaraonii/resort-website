import { STAY_TYPES, getRates } from '../../utils/pricing.js';

const GuestCounter = ({ label, value, onChange, hint, priceLabel }) => {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/80 p-4 shadow">
      <div>
        <p className="text-sm font-semibold text-ocean-700">{label}</p>
        <p className="text-xs text-ocean-500">
          {hint} {priceLabel && `(${priceLabel})`}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(value - 1, 0))}
          className="h-8 w-8 rounded-full border border-ocean-200 text-ocean-700"
        >
          -
        </button>
        <span className="min-w-[24px] text-center text-sm font-semibold">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="h-8 w-8 rounded-full bg-ocean-500 text-white"
        >
          +
        </button>
      </div>
    </div>
  );
};

export default function StepReservationDetails({
  stayType,
  setStayType,
  dateStart,
  dateEnd,
  setDateStart,
  setDateEnd,
  guests,
  setGuests
}) {
  const rates = getRates(stayType);
  const isOvernight = stayType === 'Overnight Swimming';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-xl text-ocean-800">
          Step 1: Select reservation details
        </h3>
        <p className="text-sm text-ocean-600">
          Choose your stay type, dates, and guest counts. PWD and 2 years old
          below enter for free.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {STAY_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => setStayType(type.value)}
            className={`rounded-2xl border p-4 text-left transition ${
              stayType === type.value
                ? 'border-ocean-500 bg-ocean-50 shadow'
                : 'border-white/60 bg-white/80'
            }`}
          >
            <p className="text-xs font-semibold text-ocean-500">{type.time}</p>
            <p className="mt-2 font-semibold text-ocean-800">{type.label}</p>
            <p className="mt-1 text-xs text-ocean-600">{type.description}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-white/80 p-4 shadow">
          <label className="text-xs font-semibold text-ocean-500">
            {isOvernight ? 'Check-in date' : 'Select date'}
          </label>
          <input
            type="date"
            value={dateStart}
            onChange={(event) => setDateStart(event.target.value)}
            className="mt-2 w-full rounded-xl border border-ocean-100 p-2 text-sm"
          />
        </div>
        <div className="rounded-2xl bg-white/80 p-4 shadow">
          <label className="text-xs font-semibold text-ocean-500">
            {isOvernight ? 'Check-out date' : 'Same day exit'}
          </label>
          <input
            type="date"
            value={isOvernight ? dateEnd : dateStart}
            onChange={(event) => setDateEnd(event.target.value)}
            disabled={!isOvernight}
            className="mt-2 w-full rounded-xl border border-ocean-100 p-2 text-sm"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <GuestCounter
          label="Adults"
          hint="11-59 yrs old"
          priceLabel={`PHP ${rates.adult}`}
          value={guests.adults}
          onChange={(value) => setGuests({ ...guests, adults: value })}
        />
        <GuestCounter
          label="Kids"
          hint="3-10 yrs old"
          priceLabel={`PHP ${rates.kids}`}
          value={guests.kids}
          onChange={(value) => setGuests({ ...guests, kids: value })}
        />
        <GuestCounter
          label="Seniors"
          hint="60 yrs old above"
          priceLabel={`PHP ${rates.senior}`}
          value={guests.seniors}
          onChange={(value) => setGuests({ ...guests, seniors: value })}
        />
        <GuestCounter
          label="PWD / 2 yrs old below"
          hint="Free entrance"
          priceLabel="Free"
          value={guests.pwd}
          onChange={(value) => setGuests({ ...guests, pwd: value })}
        />
      </div>
    </div>
  );
}
