export const STAY_TYPES = [
  {
    value: 'Day Swimming',
    label: 'Day Swimming',
    time: '8AM - 5PM',
    description: 'Bright, family-friendly day access to pools and slides.'
  },
  {
    value: 'Night Swimming',
    label: 'Night Swimming',
    time: '6PM - 12MN',
    description: 'Cool evening dip with lights, music, and wave pool fun.'
  },
  {
    value: 'Overnight Swimming',
    label: 'Overnight Swimming',
    time: '2PM - 11AM Next Day',
    description: 'Stay in resort rooms with late-night pool access.'
  }
];

export const PRICING = {
  'Day Swimming': { adult: 250, kids: 200, senior: 200 },
  'Night Swimming': { adult: 250, kids: 200, senior: 200 },
  'Overnight Swimming': { adult: 300, kids: 250, senior: 250 }
};

export const getRates = (stayType) => PRICING[stayType] || PRICING['Day Swimming'];

export const calculateEntranceSubtotal = (stayType, guests) => {
  const rates = getRates(stayType);
  const adults = Number(guests.adults || 0);
  const kids = Number(guests.kids || 0);
  const seniors = Number(guests.seniors || 0);

  return adults * rates.adult + kids * rates.kids + seniors * rates.senior;
};

export const formatCurrency = (amount) => {
  const safe = Number(amount || 0);
  return `PHP ${safe.toLocaleString('en-US')}`;
};
