import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { adminLogin } from '../api.js';

export default function AdminLogin() {
  const navigate = useNavigate();
  const existingToken = localStorage.getItem('cw_admin_token');
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (existingToken) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await adminLogin(form.username, form.password);
      localStorage.setItem('cw_admin_token', response.token);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-50 via-white to-sun-100 px-6 py-16">
      <div className="mx-auto max-w-lg">
        <div className="glass-panel p-8">
          <h1 className="font-display text-3xl text-ocean-800">
            Admin Login
          </h1>
          <p className="mt-2 text-sm text-ocean-600">
            Use the prototype admin credentials to access the dashboard.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-ocean-500">
                Username
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, username: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-ocean-100 p-3 text-sm"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ocean-500">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, password: event.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-ocean-100 p-3 text-sm"
                placeholder="waves2026"
              />
            </div>
            {error && (
              <div className="rounded-2xl border border-coral-300 bg-white/80 p-3 text-sm text-coral-500">
                {error}
              </div>
            )}
            <button type="submit" className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
