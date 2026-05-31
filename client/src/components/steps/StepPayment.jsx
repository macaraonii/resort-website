import { formatCurrency } from '../../utils/pricing.js';

const paymentOptions = [
  {
    id: 'GCash',
    title: 'GCash',
    description: 'Mobile wallet transfer (prototype only).'
  },
  {
    id: 'Maya',
    title: 'Maya',
    description: 'Digital payments for quick confirmation.'
  },
  {
    id: 'Credit/Debit Card',
    title: 'Credit / Debit Card',
    description: 'Card payment placeholder for future integration.'
  },
  {
    id: 'Pay at Resort',
    title: 'Pay at Resort',
    description: 'Settle your bill upon arrival.'
  }
];

export default function StepPayment({
  paymentMethod,
  setPaymentMethod,
  totalAmount,
  onConfirm,
  isSubmitting,
  errorMessage
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-xl text-ocean-800">
          Step 4: Payment (Prototype only)
        </h3>
        <p className="text-sm text-ocean-600">
          Select a payment option. No real payment gateway is connected.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {paymentOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setPaymentMethod(option.id)}
            className={`rounded-2xl border p-4 text-left shadow transition ${
              paymentMethod === option.id
                ? 'border-ocean-500 bg-ocean-50'
                : 'border-white/60 bg-white/80'
            }`}
          >
            <p className="text-sm font-semibold text-ocean-800">
              {option.title}
            </p>
            <p className="mt-1 text-xs text-ocean-600">{option.description}</p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-sun-100/80 p-4 text-sm text-ocean-700">
        Prototype only - payment processing is not yet implemented.
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-coral-300 bg-white/80 p-4 text-sm text-coral-500">
          {errorMessage}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-ocean-500">Estimated Total</p>
          <p className="text-lg font-semibold text-ocean-800">
            {formatCurrency(totalAmount)}
          </p>
        </div>
        <button
          type="button"
          onClick={onConfirm}
          className="btn-primary"
          disabled={!paymentMethod || isSubmitting}
        >
          {isSubmitting ? 'Saving Reservation...' : 'Confirm Reservation'}
        </button>
      </div>
    </div>
  );
}
