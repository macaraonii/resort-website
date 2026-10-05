# Caribbean Waves Waterpark Resort Reservation System

A full-stack prototype reservation system with a tropical, family-friendly UI,
customer booking flow, and an admin dashboard for managing reservations.

## Tech Stack

- Frontend: React + Tailwind CSS (Vite)
- Backend: Node.js + Express
- Database: SQLite (prototype)
- Authentication: Simple admin login only
- Payment: Prototype only (no real payment gateway)

## Project Structure

- client/ - React frontend
- server/ - Express API + SQLite database
- res/ - Assets (includes the Caribbean Waves logo)

## Getting Started
### 1) Backend API

```bash
cd server
npm install
npm run dev
```

The API will run on http://localhost:4000.

### 2) Frontend Client

```bash
cd client
npm install
npm run dev
```

Visit http://localhost:5173 to view the prototype.

## Admin Login (Prototype)

- Username: admin
- Password: waves2026

Credentials can be changed in server/.env (see server/.env.example).

## Notes

- The Vite config exposes the logo from res/ using public assets.
- The database is created automatically in server/data/ on first run.
- Sample rooms, cottages, and reservations are seeded for testing.
- Payment processing is a prototype only and does not charge real users.
