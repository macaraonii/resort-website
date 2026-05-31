import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { buildReference } from './utils/reference.js';

let db;

const createSchema = async (database) => {
  await database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      capacity TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cottages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      capacity TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference TEXT,
      stay_type TEXT NOT NULL,
      date_start TEXT NOT NULL,
      date_end TEXT NOT NULL,
      adults INTEGER NOT NULL,
      kids INTEGER NOT NULL,
      seniors INTEGER NOT NULL,
      pwd INTEGER NOT NULL,
      total_guests INTEGER NOT NULL,
      accommodation_type TEXT NOT NULL,
      accommodation_id INTEGER,
      accommodation_name TEXT NOT NULL,
      accommodation_price INTEGER NOT NULL,
      entrance_subtotal INTEGER NOT NULL,
      accommodation_subtotal INTEGER NOT NULL,
      total_amount INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS guests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservation_id INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      contact_number TEXT NOT NULL,
      address TEXT NOT NULL,
      special_requests TEXT,
      vehicles INTEGER NOT NULL,
      FOREIGN KEY (reservation_id) REFERENCES reservations (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservation_id INTEGER NOT NULL,
      method TEXT NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL,
      note TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (reservation_id) REFERENCES reservations (id) ON DELETE CASCADE
    );
  `);
};

const seedData = async (database) => {
  const roomCount = await database.get('SELECT COUNT(*) as count FROM rooms');
  if (roomCount.count === 0) {
    const rooms = [
      {
        name: 'Hotel Room',
        price: 3000,
        capacity: '2-3 pax',
        description: 'Cozy hotel room with a breezy garden view.',
        image_url:
          'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=900&q=80'
      },
      {
        name: 'Balistada Room',
        price: 3000,
        capacity: '4 pax',
        description: 'Open layout room with tropical textures and comfort.',
        image_url:
          'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=900&q=80'
      },
      {
        name: 'Queen Room',
        price: 6000,
        capacity: '10 pax',
        description: 'Spacious suite ideal for big families and barkadas.',
        image_url:
          'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=900&q=80'
      }
    ];

    for (const room of rooms) {
      await database.run(
        'INSERT INTO rooms (name, price, capacity, description, image_url) VALUES (?, ?, ?, ?, ?)',
        [room.name, room.price, room.capacity, room.description, room.image_url]
      );
    }
  }

  const cottageCount = await database.get('SELECT COUNT(*) as count FROM cottages');
  if (cottageCount.count === 0) {
    const cottages = [
      {
        name: 'Cottage A',
        price: 700,
        capacity: '3-8 pax',
        description: 'Shaded cottage with fans and nearby splash zone access.',
        image_url:
          'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=900&q=80'
      },
      {
        name: 'Cottage B',
        price: 1000,
        capacity: '10 pax',
        description: 'Bigger cottage with picnic table and storage shelves.',
        image_url:
          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80'
      },
      {
        name: 'Cottage C',
        price: 1500,
        capacity: '15 pax',
        description: 'Family cottage close to the wave pool and snack bar.',
        image_url:
          'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=80'
      },
      {
        name: 'Cottage D',
        price: 2500,
        capacity: '20-25 pax',
        description: 'Large barkada cottage with exclusive chill-out area.',
        image_url:
          'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=900&q=80'
      }
    ];

    for (const cottage of cottages) {
      await database.run(
        'INSERT INTO cottages (name, price, capacity, description, image_url) VALUES (?, ?, ?, ?, ?)',
        [
          cottage.name,
          cottage.price,
          cottage.capacity,
          cottage.description,
          cottage.image_url
        ]
      );
    }
  }

  const reservationCount = await database.get(
    'SELECT COUNT(*) as count FROM reservations'
  );
  if (reservationCount.count === 0) {
    const samples = [
      {
        stay_type: 'Day Swimming',
        date_start: '2026-06-14',
        date_end: '2026-06-14',
        adults: 2,
        kids: 1,
        seniors: 0,
        pwd: 0,
        accommodation_type: 'cottage',
        accommodation_id: 1,
        accommodation_name: 'Cottage A',
        accommodation_price: 700,
        entrance_subtotal: 700,
        accommodation_subtotal: 700,
        total_amount: 1400,
        status: 'Confirmed',
        guest: {
          full_name: 'Alyssa Cruz',
          email: 'alyssa.cruz@email.com',
          contact_number: '09171234567',
          address: 'Pulong Sampaloc, Bulacan',
          special_requests: 'Near the wave pool if possible',
          vehicles: 1
        },
        payment: {
          method: 'Pay at Resort',
          status: 'Pending'
        }
      },
      {
        stay_type: 'Overnight Swimming',
        date_start: '2026-06-20',
        date_end: '2026-06-21',
        adults: 4,
        kids: 2,
        seniors: 1,
        pwd: 0,
        accommodation_type: 'room',
        accommodation_id: 3,
        accommodation_name: 'Queen Room',
        accommodation_price: 6000,
        entrance_subtotal: 1950,
        accommodation_subtotal: 6000,
        total_amount: 7950,
        status: 'Pending',
        guest: {
          full_name: 'Marco Santos',
          email: 'marco.santos@email.com',
          contact_number: '09998887777',
          address: 'Dona Remedios Trinidad, Bulacan',
          special_requests: 'Need extra towels',
          vehicles: 2
        },
        payment: {
          method: 'GCash',
          status: 'Pending'
        }
      }
    ];

    for (const sample of samples) {
      const createdAt = new Date().toISOString();
      const totalGuests =
        sample.adults + sample.kids + sample.seniors + sample.pwd;
      const reservationResult = await database.run(
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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sample.stay_type,
          sample.date_start,
          sample.date_end,
          sample.adults,
          sample.kids,
          sample.seniors,
          sample.pwd,
          totalGuests,
          sample.accommodation_type,
          sample.accommodation_id,
          sample.accommodation_name,
          sample.accommodation_price,
          sample.entrance_subtotal,
          sample.accommodation_subtotal,
          sample.total_amount,
          sample.status,
          createdAt
        ]
      );

      const reference = buildReference(reservationResult.lastID);
      await database.run('UPDATE reservations SET reference = ? WHERE id = ?', [
        reference,
        reservationResult.lastID
      ]);

      await database.run(
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
          reservationResult.lastID,
          sample.guest.full_name,
          sample.guest.email,
          sample.guest.contact_number,
          sample.guest.address,
          sample.guest.special_requests,
          sample.guest.vehicles
        ]
      );

      await database.run(
        `INSERT INTO payments (
          reservation_id,
          method,
          amount,
          status,
          note,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          reservationResult.lastID,
          sample.payment.method,
          sample.total_amount,
          sample.payment.status,
          'Prototype payment record',
          createdAt
        ]
      );
    }
  }
};

export const initDb = async () => {
  if (db) {
    return db;
  }

  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = await open({
    filename: path.join(dataDir, 'caribbean-waves.db'),
    driver: sqlite3.Database
  });

  await db.exec('PRAGMA foreign_keys = ON;');
  await createSchema(db);
  await seedData(db);

  return db;
};

export const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initDb first.');
  }

  return db;
};
