import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import BookingOverview from './pages/BookingOverview.jsx';
import BookingPage from './pages/BookingPage.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import ReservationSuccess from './pages/ReservationSuccess.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/booking/overview" element={<BookingOverview />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/success" element={<ReservationSuccess />} />
      </Routes>
    </BrowserRouter>
  );
}
