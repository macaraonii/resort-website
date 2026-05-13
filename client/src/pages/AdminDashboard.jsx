import { useEffect, useMemo, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import {
  fetchReservations,
  fetchSummary,
  updateReservationStatus
} from '../api.js';
import SummaryCards from '../components/admin/SummaryCards.jsx';
import FiltersBar from '../components/admin/FiltersBar.jsx';
import ReservationTable from '../components/admin/ReservationTable.jsx';
import ReservationDetailsModal from '../components/admin/ReservationDetailsModal.jsx';
import CalendarView from '../components/admin/CalendarView.jsx';

export default function AdminDashboard() {
  const token = localStorage.getItem('cw_admin_token');
  const [summary, setSummary] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    date: '',
    stayType: 'All',
    status: 'All'
  });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [summaryResponse, reservationsResponse] = await Promise.all([
          fetchSummary(token),
          fetchReservations()
        ]);
        setSummary(summaryResponse.totals);
        setReservations(reservationsResponse.data || []);
      } catch (error) {
        console.error('Failed to load admin data', error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadData();
    }
  }, [token]);

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  const filteredReservations = useMemo(() => {
    return reservations.filter((item) => {
      const search = filters.search.toLowerCase();
      if (
        search &&
        !`${item.reference} ${item.full_name}`
          .toLowerCase()
          .includes(search)
      ) {
        return false;
      }

      if (filters.stayType !== 'All' && item.stay_type !== filters.stayType) {
        return false;
      }

      if (filters.status !== 'All' && item.status !== filters.status) {
        return false;
      }

      if (filters.date) {
        if (!(item.date_start <= filters.date && item.date_end >= filters.date)) {
          return false;
        }
      }

      return true;
    });
  }, [reservations, filters]);

  const handleStatusChange = async (id, status) => {
    try {
      await updateReservationStatus(id, status);
      setReservations((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status } : item
        )
      );
    } catch (error) {
      console.error('Status update failed', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cw_admin_token');
    window.location.href = '/admin/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-50 via-white to-sun-100">
      <header className="border-b border-white/50 bg-white/70 backdrop-blur">
        <div className="mx-auto flex items-center justify-between px-6 py-4 sm:px-10 lg:px-20">
          <div>
            <p className="text-xs font-semibold text-ocean-500">
              Caribbean Waves Admin
            </p>
            <h1 className="font-display text-2xl text-ocean-800">
              Reservation Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="btn-secondary">
              Back to Site
            </Link>
            <button type="button" onClick={handleLogout} className="btn-primary">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="section space-y-8">
        {loading ? (
          <div className="glass-panel p-6 text-sm text-ocean-600">
            Loading dashboard data...
          </div>
        ) : (
          <>
            <SummaryCards totals={summary} />
            <FiltersBar filters={filters} setFilters={setFilters} />
            <ReservationTable
              reservations={filteredReservations}
              onViewDetails={setSelected}
              onStatusChange={handleStatusChange}
            />
            <CalendarView reservations={reservations} />
          </>
        )}
      </main>

      <ReservationDetailsModal
        reservation={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
