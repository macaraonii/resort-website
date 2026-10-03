import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

export default function AdminLogin() {
  const navigate = useNavigate();
  const existingToken = localStorage.getItem('cw_admin_token');
  const [loading, setLoading] = useState(false);

  if (existingToken) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    localStorage.setItem('cw_admin_token', 'demo_admin');
    navigate('/');
  };

  return (
    <div className="min-h-screen px-6 py-16">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="self-center space-y-6">
          <span className="tag">Safety Operations</span>
          <h1 className="font-display text-4xl text-slate-900 sm:text-5xl">
            Armband Monitoring Access
          </h1>
          <p className="text-sm text-slate-600">
            Log in to manage armband assignments, track guest safety, and
            respond to live ESP32 alerts routed through Firebase.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="glass-panel p-4">
              <p className="text-xs font-semibold text-slate-500">
                Live signal feed
              </p>
              <p className="mt-2 text-sm text-slate-700">
                Monitor every alert broadcast from the armbands in real time.
              </p>
            </div>
            <div className="glass-panel p-4">
              <p className="text-xs font-semibold text-slate-500">
                Manual assignments
              </p>
              <p className="mt-2 text-sm text-slate-700">
                Assign armband numbers to guests and manage stays quickly.
              </p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-8">
          <h2 className="font-display text-2xl text-slate-900">
            Admin sign in
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Continue to the monitoring center.
          </p>
          <form onSubmit={handleSubmit} className="mt-6">
            <button type="submit" className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
