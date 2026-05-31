import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  calculateEntranceSubtotal,
  formatCurrency
} from '../utils/pricing.js';
import { formatDateRange } from '../utils/dates.js';
import { createReservation, fetchCottages, fetchRooms } from '../api.js';
import StepReservationDetails from './steps/StepReservationDetails.jsx';
import StepAccommodation from './steps/StepAccommodation.jsx';
import StepGuestDetails from './steps/StepGuestDetails.jsx';
import StepPayment from './steps/StepPayment.jsx';
import SummarySidebar from './SummarySidebar.jsx';

const steps = [
  { id: 1, title: 'Reservation Details' },
  { id: 2, title: 'Room or Cottage' },
  { id: 3, title: 'Guest Details' },
  { id: 4, title: 'Payment' }
];

export default function BookingWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [stayType, setStayType] = useState('Day Swimming');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [guests, setGuests] = useState({
    adults: 2,
    kids: 0,
    seniors: 0,
    pwd: 0
  });
  const [accommodations, setAccommodations] = useState([]);
  const [selectedAccommodation, setSelectedAccommodation] = useState(null);
  const [guestDetails, setGuestDetails] = useState({
    fullName: '',
    email: '',
    contactNumber: '',
    address: '',
    specialRequests: '',
    vehicles: 0,
    termsAccepted: false
  });
  const [paymentMethod, setPaymentMethod] = useState('');
  const [loadingAccommodations, setLoadingAccommodations] = useState(false);
  const [accommodationError, setAccommodationError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOvernight = stayType === 'Overnight Swimming';

  useEffect(() => {
    let isMounted = true;
    setSelectedAccommodation(null);
    setAccommodationError('');

    const load = async () => {
      setLoadingAccommodations(true);
      try {
        const response = isOvernight ? await fetchRooms() : await fetchCottages();
        if (isMounted) {
          setAccommodations(response.data || []);
        }
      } catch (error) {
        if (isMounted) {
          setAccommodationError('Unable to load accommodations.');
        }
      } finally {
        if (isMounted) {
          setLoadingAccommodations(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [isOvernight]);

  const entranceSubtotal = useMemo(
    () => calculateEntranceSubtotal(stayType, guests),
    [stayType, guests]
  );

  const accommodationSubtotal = selectedAccommodation
    ? selectedAccommodation.price
    : 0;

  const totalAmount = entranceSubtotal + accommodationSubtotal;
  const dateLabel = formatDateRange(
    dateStart,
    isOvernight ? dateEnd : dateStart
  );

  const summary = {
    stayType,
    dateLabel,
    guests,
    accommodation: selectedAccommodation,
    entranceSubtotal,
    accommodationSubtotal,
    totalAmount
  };

  const totalGuests =
    Number(guests.adults || 0) +
    Number(guests.kids || 0) +
    Number(guests.seniors || 0) +
    Number(guests.pwd || 0);

  const isStep1Valid =
    stayType &&
    dateStart &&
    (!isOvernight || dateEnd) &&
    totalGuests > 0;
  const isStep2Valid = Boolean(selectedAccommodation);
  const isStep3Valid =
    guestDetails.fullName &&
    guestDetails.email &&
    guestDetails.contactNumber &&
    guestDetails.termsAccepted;
  const isStep4Valid = Boolean(paymentMethod);

  const stepValidity = {
    1: isStep1Valid,
    2: isStep2Valid,
    3: isStep3Valid,
    4: isStep4Valid
  };

  const handleNext = () => {
    if (!stepValidity[step]) return;
    setStep((prev) => Math.min(prev + 1, steps.length));
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleConfirm = async () => {
    if (!isStep4Valid || isSubmitting) return;
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const payload = {
        reservation: {
          stayType,
          dateStart,
          dateEnd: isOvernight ? dateEnd : dateStart,
          guests,
          accommodation: selectedAccommodation,
          entranceSubtotal,
          accommodationSubtotal,
          totalAmount
        },
        guest: {
          fullName: guestDetails.fullName,
          email: guestDetails.email,
          contactNumber: guestDetails.contactNumber,
          address: guestDetails.address,
          specialRequests: guestDetails.specialRequests,
          vehicles: guestDetails.vehicles
        },
        payment: {
          method: paymentMethod
        }
      };

      const response = await createReservation(payload);
      navigate('/success', {
        state: {
          reference: response.reference,
          reservation: {
            stayType,
            dateStart,
            dateEnd: isOvernight ? dateEnd : dateStart,
            guests,
            accommodation: selectedAccommodation,
            entranceSubtotal,
            accommodationSubtotal,
            totalAmount,
            guestDetails,
            paymentMethod
          }
        }
      });
    } catch (error) {
      setSubmitError(error.message || 'Unable to confirm reservation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-panel p-6 sm:p-8" id="booking">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-ocean-500">
            Step {step} of {steps.length}
          </p>
          <h2 className="font-display text-2xl text-ocean-800">
            Build your reservation
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {steps.map((item) => (
            <span
              key={item.id}
              className={`rounded-full px-4 py-1 text-xs font-semibold ${
                step === item.id
                  ? 'bg-ocean-500 text-white'
                  : 'bg-ocean-100 text-ocean-600'
              }`}
            >
              {item.title}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          {step === 1 && (
            <StepReservationDetails
              stayType={stayType}
              setStayType={setStayType}
              dateStart={dateStart}
              dateEnd={dateEnd}
              setDateStart={setDateStart}
              setDateEnd={setDateEnd}
              guests={guests}
              setGuests={setGuests}
            />
          )}
          {step === 2 && (
            <StepAccommodation
              stayType={stayType}
              accommodations={accommodations}
              selectedAccommodation={selectedAccommodation}
              onSelect={setSelectedAccommodation}
              loading={loadingAccommodations}
              error={accommodationError}
            />
          )}
          {step === 3 && (
            <StepGuestDetails
              guestDetails={guestDetails}
              setGuestDetails={setGuestDetails}
            />
          )}
          {step === 4 && (
            <StepPayment
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              totalAmount={totalAmount}
              onConfirm={handleConfirm}
              isSubmitting={isSubmitting}
              errorMessage={submitError}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ocean-100 pt-4">
            <button
              type="button"
              onClick={handleBack}
              className="btn-secondary"
              disabled={step === 1}
            >
              Back
            </button>
            <div className="text-xs text-ocean-600">
              Entrance subtotal: {formatCurrency(entranceSubtotal)}
            </div>
            <button
              type="button"
              onClick={handleNext}
              className="btn-primary"
              disabled={step === steps.length || !stepValidity[step]}
            >
              Continue
            </button>
          </div>
        </div>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SummarySidebar summary={summary} />
        </div>
      </div>
    </div>
  );
}
