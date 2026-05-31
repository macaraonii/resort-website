import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';

const stayFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric'
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit'
});

const initialAssignments = [
  {
    id: 'WB-230',
    guestName: 'Amara Cruz',
    age: 9,
    stayStart: '2026-05-18',
    stayEnd: '2026-05-18',
    wristbandNumber: 'CW-014',
    status: 'Active',
    assignedAt: '2026-05-18T09:12:00',
    lastSeen: '2026-05-18T10:14:00'
  },
  {
    id: 'WB-231',
    guestName: 'Luis Mateo',
    age: 14,
    stayStart: '2026-05-18',
    stayEnd: '2026-05-19',
    wristbandNumber: 'CW-082',
    status: 'Active',
    assignedAt: '2026-05-18T09:25:00',
    lastSeen: '2026-05-18T10:02:00'
  },
  {
    id: 'WB-232',
    guestName: 'Hana Park',
    age: 6,
    stayStart: '2026-05-18',
    stayEnd: '2026-05-18',
    wristbandNumber: 'CW-031',
    status: 'Returned',
    assignedAt: '2026-05-18T08:40:00',
    lastSeen: '2026-05-18T09:30:00'
  }
];

const initialAlerts = [
  {
    id: 'AL-201',
    severity: 'Critical',
    wristbandNumber: 'CW-014',
    guestName: 'Amara Cruz',
    message: 'Submersion detected for 12 seconds',
    time: '10:16 AM',
    status: 'Open'
  },
  {
    id: 'AL-202',
    severity: 'Warning',
    wristbandNumber: 'CW-082',
    guestName: 'Luis Mateo',
    message: 'Boundary breach near deep zone',
    time: '10:03 AM',
    status: 'Acknowledged'
  },
  {
    id: 'AL-203',
    severity: 'Advisory',
    wristbandNumber: 'CW-031',
    guestName: 'Hana Park',
    message: 'Band signal lost for 45 seconds',
    time: '09:31 AM',
    status: 'Resolved'
  }
];

const severityStyles = {
  Critical: 'bg-coral-500 text-white',
  Warning: 'bg-sun-400 text-slate-900',
  Advisory: 'bg-aqua-200 text-slate-800'
};

const alertStatusStyles = {
  Open: 'bg-coral-300/20 text-coral-500',
  Acknowledged: 'bg-sun-200/70 text-sun-500',
  Resolved: 'bg-aqua-200/70 text-ocean-700'
};

const assignmentStatusStyles = {
  Active: 'bg-aqua-200 text-ocean-800',
  Returned: 'bg-slate-200 text-slate-600'
};

const formatStayRange = (start, end) => {
  if (!start || !end) {
    return 'Stay pending';
  }

  const startLabel = stayFormatter.format(new Date(`${start}T00:00:00`));
  const endLabel = stayFormatter.format(new Date(`${end}T00:00:00`));
  return start === end ? startLabel : `${startLabel} - ${endLabel}`;
};

const formatTime = (value) => {
  if (!value) {
    return '---';
  }

  return timeFormatter.format(new Date(value));
};

export default function AdminDashboard() {
  const token = localStorage.getItem('cw_admin_token');
  const [assignments, setAssignments] = useState(initialAssignments);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    guestName: '',
    age: '',
    stayStart: '',
    stayEnd: '',
    wristbandNumber: ''
  });
  const [formError, setFormError] = useState('');
  const [lastSync] = useState(() => new Date().toISOString());

  const activeAssignments = useMemo(
    () => assignments.filter((item) => item.status === 'Active'),
    [assignments]
  );

  const filteredAssignments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return activeAssignments;
    }

    return activeAssignments.filter((item) =>
      `${item.guestName} ${item.wristbandNumber}`
        .toLowerCase()
        .includes(term)
    );
  }, [activeAssignments, search]);

  const totals = useMemo(() => {
    const active = assignments.filter((item) => item.status === 'Active').length;
    const returned = assignments.filter((item) => item.status === 'Returned')
      .length;
    const openAlerts = alerts.filter(
      (alert) => alert.status !== 'Resolved'
    ).length;
    const criticalAlerts = alerts.filter(
      (alert) =>
        alert.status !== 'Resolved' && alert.severity === 'Critical'
    ).length;
    const acknowledged = alerts.filter(
      (alert) => alert.status === 'Acknowledged'
    ).length;

    return {
      active,
      returned,
      openAlerts,
      criticalAlerts,
      acknowledged
    };
  }, [assignments, alerts]);

  const handleAssign = (event) => {
    event.preventDefault();
    setFormError('');

    const guestName = form.guestName.trim();
    const wristbandNumber = form.wristbandNumber.trim().toUpperCase();
    const ageValue = Number(form.age);

    if (
      !guestName ||
      !form.age ||
      !form.stayStart ||
      !form.stayEnd ||
      !wristbandNumber
    ) {
      setFormError('Complete all fields before assigning a wristband.');
      return;
    }

    if (Number.isNaN(ageValue) || ageValue <= 0) {
      setFormError('Enter a valid age for the guest.');
      return;
    }

    if (new Date(form.stayEnd) < new Date(form.stayStart)) {
      setFormError('Stay end must be on or after the start date.');
      return;
    }

    if (
      assignments.some(
        (item) =>
          item.wristbandNumber === wristbandNumber &&
          item.status === 'Active'
      )
    ) {
      setFormError('That wristband is already assigned to an active guest.');
      return;
    }

    const now = new Date();
    const newAssignment = {
      id: `WB-${now.getTime()}`,
      guestName,
      age: ageValue,
      stayStart: form.stayStart,
      stayEnd: form.stayEnd,
      wristbandNumber,
      status: 'Active',
      assignedAt: now.toISOString(),
      lastSeen: now.toISOString()
    };

    setAssignments((prev) => [newAssignment, ...prev]);
    setForm({
      guestName: '',
      age: '',
      stayStart: '',
      stayEnd: '',
      wristbandNumber: ''
    });
  };

  const handleReturn = (id) => {
    setAssignments((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'Returned' } : item
      )
    );
  };

  const handleAlertStatus = (id, status) => {
    setAlerts((prev) =>
      prev.map((alert) =>
        alert.id === id ? { ...alert, status } : alert
      )
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('cw_admin_token');
    window.location.href = '/login';
  };

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex flex-wrap items-center justify-between gap-4 px-6 py-4 sm:px-10 lg:px-20">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500">
              Caribbean Waves Safety Operations
            </p>
            <h1 className="font-display text-2xl text-slate-900">
              Wristband Monitoring Center
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="flex h-2 w-2 rounded-full bg-aqua-300 animate-pulse" />
              Firebase feed connected - Last sync {formatTime(lastSync)}
            </div>
          </div>
          <button type="button" onClick={handleLogout} className="btn-secondary">
            Logout
          </button>
        </div>
      </header>

      <main className="section space-y-8">
        <section className="grid gap-6 lg:grid-cols-4">
          <div className="glass-panel signal-grid relative overflow-hidden p-6 rise-in">
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-aqua-200/70 blur-2xl" />
            <p className="text-xs font-semibold text-slate-500">
              Active wristbands
            </p>
            <p className="mt-4 font-display text-3xl text-slate-900">
              {totals.active}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {assignments.length} total assignments tracked
            </p>
          </div>
          <div className="glass-panel signal-grid relative overflow-hidden p-6 rise-in rise-delay-1">
            <div className="absolute -right-6 -top-10 h-20 w-20 rounded-full bg-sun-200/60 blur-2xl" />
            <p className="text-xs font-semibold text-slate-500">Open alerts</p>
            <p className="mt-4 font-display text-3xl text-slate-900">
              {totals.openAlerts}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {totals.criticalAlerts} critical right now
            </p>
          </div>
          <div className="glass-panel signal-grid relative overflow-hidden p-6 rise-in rise-delay-2">
            <div className="absolute -right-10 -top-8 h-24 w-24 rounded-full bg-coral-300/40 blur-2xl" />
            <p className="text-xs font-semibold text-slate-500">
              Acknowledged alerts
            </p>
            <p className="mt-4 font-display text-3xl text-slate-900">
              {totals.acknowledged}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Waiting for resolution updates
            </p>
          </div>
          <div className="glass-panel signal-grid relative overflow-hidden p-6 rise-in rise-delay-3">
            <div className="absolute -right-10 -top-8 h-24 w-24 rounded-full bg-ocean-100/70 blur-2xl" />
            <p className="text-xs font-semibold text-slate-500">
              Wristbands returned
            </p>
            <p className="mt-4 font-display text-3xl text-slate-900">
              {totals.returned}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Completed guest check-outs
            </p>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.05fr_1.35fr]">
          <div className="space-y-6">
            <div className="glass-panel p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Assign wristband
                  </p>
                  <h2 className="mt-2 font-display text-2xl text-slate-900">
                    Manual guest assignment
                  </h2>
                  <p className="mt-2 text-xs text-slate-500">
                    Add new guest details and set the wristband number manually.
                  </p>
                </div>
                <div className="status-chip bg-slate-900/5 text-slate-600">
                  Admin entry
                </div>
              </div>

              <form
                onSubmit={handleAssign}
                className="mt-6 grid gap-4 sm:grid-cols-2"
              >
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-500">
                    Guest name
                  </label>
                  <input
                    type="text"
                    value={form.guestName}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        guestName: event.target.value
                      }))
                    }
                    className="input-field"
                    placeholder="Guest full name"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">
                    Age
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form.age}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        age: event.target.value
                      }))
                    }
                    className="input-field"
                    placeholder="9"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">
                    Wristband number
                  </label>
                  <input
                    type="text"
                    value={form.wristbandNumber}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        wristbandNumber: event.target.value
                      }))
                    }
                    className="input-field"
                    placeholder="CW-000"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">
                    Stay start
                  </label>
                  <input
                    type="date"
                    value={form.stayStart}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        stayStart: event.target.value
                      }))
                    }
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">
                    Stay end
                  </label>
                  <input
                    type="date"
                    value={form.stayEnd}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        stayEnd: event.target.value
                      }))
                    }
                    className="input-field"
                  />
                </div>
                {formError && (
                  <div className="sm:col-span-2 rounded-2xl border border-coral-300 bg-white/80 p-3 text-xs text-coral-500">
                    {formError}
                  </div>
                )}
                <button type="submit" className="btn-primary sm:col-span-2">
                  Assign Wristband
                </button>
              </form>
            </div>

            <div className="glass-panel p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Active wristbands
                  </p>
                  <h2 className="mt-2 font-display text-2xl text-slate-900">
                    Guests currently monitored
                  </h2>
                </div>
                <div className="w-full sm:w-auto">
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="input-field"
                    placeholder="Search name or wristband"
                  />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {filteredAssignments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                    No active wristbands match your search.
                  </div>
                ) : (
                  filteredAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="rounded-2xl border border-slate-200/60 bg-white/80 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {assignment.guestName}
                            <span className="ml-2 text-xs text-slate-500">
                              Age {assignment.age}
                            </span>
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Band {assignment.wristbandNumber} - Stay{' '}
                            {formatStayRange(
                              assignment.stayStart,
                              assignment.stayEnd
                            )}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Last ping {formatTime(assignment.lastSeen)} -{' '}
                            signal captured
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`status-chip ${
                              assignmentStatusStyles[assignment.status]
                            }`}
                          >
                            {assignment.status}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleReturn(assignment.id)}
                            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                          >
                            Mark returned
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Alert logs
                  </p>
                  <h2 className="mt-2 font-display text-2xl text-slate-900">
                    Live wristband alerts
                  </h2>
                  <p className="mt-2 text-xs text-slate-500">
                    Streaming from Firebase and prioritized by severity.
                  </p>
                </div>
                <div className="status-chip bg-slate-900/5 text-slate-600">
                  Live feed
                </div>
              </div>

              {alerts.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  No alerts yet. Wristband events will appear here.
                </div>
              ) : (
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="text-xs uppercase text-slate-400">
                      <tr>
                        <th className="pb-3 pr-4">Severity</th>
                        <th className="pb-3 pr-4">Guest</th>
                        <th className="pb-3 pr-4">Alert</th>
                        <th className="pb-3 pr-4">Time</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-600">
                      {alerts.map((alert) => (
                        <tr
                          key={alert.id}
                          className="border-t border-slate-200/60"
                        >
                          <td className="py-3 pr-4">
                            <span
                              className={`status-chip ${
                                severityStyles[alert.severity]
                              }`}
                            >
                              {alert.severity}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <p className="text-sm font-semibold text-slate-900">
                              {alert.guestName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {alert.wristbandNumber}
                            </p>
                          </td>
                          <td className="py-3 pr-4 text-xs text-slate-600">
                            {alert.message}
                          </td>
                          <td className="py-3 pr-4 text-xs text-slate-600">
                            {alert.time}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`status-chip ${
                                alertStatusStyles[alert.status]
                              }`}
                            >
                              {alert.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            {alert.status !== 'Resolved' ? (
                              <div className="flex justify-end gap-2">
                                {alert.status === 'Open' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleAlertStatus(
                                        alert.id,
                                        'Acknowledged'
                                      )
                                    }
                                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                  >
                                    Acknowledge
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAlertStatus(alert.id, 'Resolved')
                                  }
                                  className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-700"
                                >
                                  Resolve
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">
                                Resolved
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
