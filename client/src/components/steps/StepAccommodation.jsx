export default function StepAccommodation({
  stayType,
  accommodations,
  selectedAccommodation,
  onSelect,
  loading,
  error
}) {
  const isOvernight = stayType === 'Overnight Swimming';
  const label = isOvernight ? 'Rooms' : 'Cottages';
  const helper = isOvernight
    ? 'Overnight stays require a room selection.'
    : 'Day and night swimming require a cottage selection.';

  return (
    <div className="space-y-6" id="accommodations">
      <div>
        <h3 className="font-display text-xl text-ocean-800">
          Step 2: Select your {label.toLowerCase()}
        </h3>
        <p className="text-sm text-ocean-600">{helper}</p>
      </div>

      {loading && (
        <div className="rounded-2xl bg-white/80 p-4 text-sm text-ocean-600 shadow">
          Loading {label.toLowerCase()} options...
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-coral-300 bg-white/80 p-4 text-sm text-coral-500 shadow">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {accommodations.map((item) => {
          const selected = selectedAccommodation?.id === item.id;
          return (
            <div
              key={item.id}
              className={`overflow-hidden rounded-2xl border bg-white/80 shadow transition ${
                selected ? 'border-ocean-500 ring-2 ring-ocean-200' : 'border-white'
              }`}
            >
              <div
                className="h-36 bg-cover bg-center"
                style={{ backgroundImage: `url(${item.image_url})` }}
              />
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ocean-800">
                      {item.name}
                    </p>
                    <p className="text-xs text-ocean-500">{item.capacity}</p>
                  </div>
                  <span className="tag">Available</span>
                </div>
                <p className="mt-2 text-xs text-ocean-600">{item.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-ocean-800">
                    PHP {item.price}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      onSelect({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        capacity: item.capacity,
                        description: item.description,
                        imageUrl: item.image_url,
                        type: isOvernight ? 'room' : 'cottage'
                      })
                    }
                    className={selected ? 'btn-secondary' : 'btn-primary'}
                  >
                    {selected ? 'Selected' : 'Select'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
