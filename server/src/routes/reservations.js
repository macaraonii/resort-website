import { Router } from 'express';
import { getDb } from '../db.js';
import { buildReference } from '../utils/reference.js';

const router = Router();
const allowedStatuses = [
  'Pending',
  'Confirmed',
  'Cancelled',
  'Checked In',
  'Checked Out'
];

router.get('/', async (req, res) => {
  const db = getDb();
  const { status, stayType, date } = req.query;
  const filters = [];
  const params = [];

  if (status) {
    filters.push('r.status = ?');
    params.push(status);
  }

  if (stayType) {
    filters.push('r.stay_type = ?');
    params.push(stayType);
  }

  if (date) {
    filters.push('r.date_start <= ? AND r.date_end >= ?');
    params.push(date, date);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const reservations = await db.all(
    `
      SELECT
        r.*,
        g.full_name,
        g.email,
        g.contact_number,
        g.address,
        g.special_requests,
        g.vehicles,
        p.method AS payment_method
      FROM reservations r
      LEFT JOIN guests g ON g.reservation_id = r.id
      LEFT JOIN payments p ON p.reservation_id = r.id
      ${whereClause}
      ORDER BY r.created_at DESC
    `,
    params
  );

  res.json({ data: reservations });
});

router.get('/:id', async (req, res) => {
  const db = getDb();
  const reservation = await db.get(
    `
      SELECT
        r.*,
        g.full_name,
        g.email,
        g.contact_number,
        g.address,
        g.special_requests,
        g.vehicles,
        p.method AS payment_method,
        p.status AS payment_status
      FROM reservations r
      LEFT JOIN guests g ON g.reservation_id = r.id
      LEFT JOIN payments p ON p.reservation_id = r.id
      WHERE r.id = ?
    `,
    [req.params.id]
  );

  if (!reservation) {
    return res.status(404).json({ message: 'Reservation not found' });
  }

  return res.json({ data: reservation });
});

router.post('/', async (req, res) => {
  const db = getDb();
  const { reservation, guest, payment } = req.body || {};
  const errors = [];

  if (!reservation?.stayType) errors.push('Stay type is required');
  if (!reservation?.dateStart) errors.push('Start date is required');
  if (!guest?.fullName) errors.push('Guest name is required');
  if (!guest?.email) errors.push('Guest email is required');
  if (!guest?.contactNumber) errors.push('Guest contact number is required');
  if (!payment?.method) errors.push('Payment method is required');

  if (errors.length) {
    return res.status(400).json({ message: 'Validation error', errors });
  }

  const dateStart = reservation.dateStart;
  const dateEnd = reservation.dateEnd || reservation.dateStart;
  const guests = reservation.guests || {};
  const adults = Number(guests.adults || 0);
  const kids = Number(guests.kids || 0);
  const seniors = Number(guests.seniors || 0);
  const pwd = Number(guests.pwd || 0);
  const totalGuests = adults + kids + seniors + pwd;
  const accommodation = reservation.accommodation || {};
  const accommodationType = reservation.accommodationType || accommodation.type || '';
  const accommodationId = reservation.accommodationId || accommodation.id || null;
  const accommodationName =
    reservation.accommodationName || accommodation.name || 'Not Selected';
  const accommodationPrice = Number(
    reservation.accommodationPrice || accommodation.price || 0
  );
  const entranceSubtotal = Number(reservation.entranceSubtotal || 0);
  const accommodationSubtotal = Number(
    reservation.accommodationSubtotal || accommodationPrice || 0
  );
  const totalAmount = Number(
    reservation.totalAmount || entranceSubtotal + accommodationSubtotal
  );

  const createdAt = new Date().toISOString();
  const result = await db.run(
    `INSERT INTO reservations (
      stay_type,
      date_start,
      date_end,
      adults,
      kids,
      seniors,
      pwd,
      total_guests,
      accommodation_type,
      accommodation_id,
      accommodation_name,
      accommodation_price,
      entrance_subtotal,
      accommodation_subtotal,
      total_amount,
      status,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      reservation.stayType,
      dateStart,
      dateEnd,
      adults,
      kids,
      seniors,
      pwd,
      totalGuests,
      accommodationType,
      accommodationId,
      accommodationName,
      accommodationPrice,
      entranceSubtotal,
      accommodationSubtotal,
      totalAmount,
      'Pending',
      createdAt
    ]
  );

  const reference = buildReference(result.lastID);
  await db.run('UPDATE reservations SET reference = ? WHERE id = ?', [
    reference,
    result.lastID
  ]);

  await db.run(
    `INSERT INTO guests (
      reservation_id,
      full_name,
      email,
      contact_number,
      address,
      special_requests,
      vehicles
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      result.lastID,
      guest.fullName,
      guest.email,
      guest.contactNumber,
      guest.address || 'N/A',
      guest.specialRequests || '',
      Number(guest.vehicles || 0)
    ]
  );

  await db.run(
    `INSERT INTO payments (
      reservation_id,
      method,
      amount,
      status,
      note,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      result.lastID,
      payment.method,
      totalAmount,
      'Pending',
      'Prototype only - no real payment gateway.',
      createdAt
    ]
  );

  res.status(201).json({
    reservationId: result.lastID,
    reference,
    message: 'Reservation created'
  });
});

router.patch('/:id/status', async (req, res) => {
  const db = getDb();
  const { status } = req.body || {};

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  const existing = await db.get('SELECT id FROM reservations WHERE id = ?', [
    req.params.id
  ]);

  if (!existing) {
    return res.status(404).json({ message: 'Reservation not found' });
  }

  await db.run('UPDATE reservations SET status = ? WHERE id = ?', [
    status,
    req.params.id
  ]);

  return res.json({ message: 'Status updated' });
});

export default router;
