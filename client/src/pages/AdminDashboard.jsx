import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onValue, push, ref, set, update } from 'firebase/database';
import { db } from '../config/firebase';

const stayFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric'
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit'
});

// ---------------------------------------------------------------------------
// Alert severity model
//
//   Minor    - Camera / wristband signals disagree, or a benign explanation
//              (post-exercise heart rate) accounts for the reading.
//   Major    - Camera and wristband both report abnormal signals together,
//              OR the wristband alone reports a sustained abnormal reading
//              while the camera view can't corroborate it.
//   Critical - The wristband has confirmed an actual drowning event and
//              deployed the CO2 airbag. Always treated as a real emergency,
//              camera visibility is irrelevant.
// ---------------------------------------------------------------------------

const severityStyles = {
  Critical: 'bg-coral-500 text-white',
  Major: 'bg-orange-400 text-white',
  Minor: 'bg-sun-400 text-slate-900'
};

const severityOrder = { Critical: 0, Major: 1, Minor: 2 };

const tabActiveStyles = {
  All: 'bg-slate-900 text-white border-slate-900',
  Minor: 'bg-sun-400 text-slate-900 border-sun-400',
  Major: 'bg-orange-400 text-white border-orange-400',
  Critical: 'bg-coral-500 text-white border-coral-500'
};

const tabBadgeStyles = {
  All: 'bg-white/20 text-white',
  Minor: 'bg-slate-900/10 text-slate-900',
  Major: 'bg-white/25 text-white',
  Critical: 'bg-white/25 text-white'
};

const inactiveTabBadgeStyles = {
  All: 'bg-slate-100 text-slate-500',
  Minor: 'bg-sun-100 text-sun-600',
  Major: 'bg-orange-100 text-orange-600',
  Critical: 'bg-coral-100 text-coral-600'
};

const assignmentStatusStyles = {
  Active: 'bg-aqua-200 text-ocean-800',
  Returned: 'bg-slate-200 text-slate-600'
};

const severityTabs = ['All', 'Minor', 'Major', 'Critical'];

const mainTabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'wristbands', label: 'Wristband Management' },
  { id: 'alerts', label: 'Alert Logs' }
];

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

const firebasePushChars = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';

const firebaseKeyToDate = (key) => {
  if (!key || key.length < 8) {
    return null;
  }

  let timestamp = 0;

  for (let index = 0; index < 8; index += 1) {
    const charIndex = firebasePushChars.indexOf(key[index]);
    if (charIndex === -1) {
      return null;
    }

    timestamp = timestamp * 64 + charIndex;
  }

  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatAlertTime = (alert) => {
  const rawTime = alert.readAt ?? alert.enteredAt ?? alert.createdAt ?? alert.timestamp ?? alert.time;
  if (rawTime) {
    return formatTime(rawTime);
  }

  const derivedTime = firebaseKeyToDate(alert.alertID ?? alert.id);
  return derivedTime ? timeFormatter.format(derivedTime) : '---';
};

const getAlertSortTime = (alert) => {
  const rawTime = alert.readAt ?? alert.enteredAt ?? alert.createdAt ?? alert.timestamp ?? alert.time;
  if (rawTime) {
    const timeValue = new Date(rawTime).getTime();
    return Number.isNaN(timeValue) ? 0 : timeValue;
  }

  const derivedTime = firebaseKeyToDate(alert.alertID ?? alert.id);
  return derivedTime ? derivedTime.getTime() : 0;
};

const normalizeAlertRecord = (id, value, readAt) => {
  const alertID = value?.alertID ?? id;
  const alertLevel = value?.alertLevel ?? value?.severity ?? 'Unknown';

  return {
    id: alertID,
    alertID,
    alertLevel,
    guestName: value?.guestName ?? '',
    cause: value?.cause ?? value?.message ?? '',
    readAt,
    enteredAt: value?.enteredAt ?? value?.createdAt ?? value?.timestamp ?? value?.time ?? null,
    ...value
  };
};

// Firebase Realtime Database stores each collection as an object keyed by
// its push id (or whatever key it was written under), not as an array.
// This turns { key1: {...}, key2: {...} } into [{ id: key1, ... }, ...],
// and returns an empty array when the path is empty/null.
const snapshotToArray = (snapshotValue, readAt = new Date().toISOString()) => {
  if (!snapshotValue) {
    return [];
  }

  return Object.entries(snapshotValue).map(([id, value]) =>
    normalizeAlertRecord(id, value, readAt)
  );
};

const persistMissingAlertReadTimes = async (snapshotValue, readAt) => {
  if (!snapshotValue) {
    return;
  }

  const missingReadTimes = Object.entries(snapshotValue).filter(([, value]) => !value?.readAt);

  if (missingReadTimes.length === 0) {
    return;
  }

  await Promise.all(
    missingReadTimes.map(([id]) => update(ref(db, `alerts/${id}`), { readAt }))
  );
};

export default function AdminDashboard() {
  const token = localStorage.getItem('cw_admin_token');
  const [assignments, setAssignments] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [search, setSearch] = useState('');
  const [activeAlertTab, setActiveAlertTab] = useState('All');
  const [activeMainTab, setActiveMainTab] = useState('dashboard');
  const [form, setForm] = useState({
    guestName: '',
    age: '',
    stayStart: '',
    stayEnd: '',
    wristbandNumber: ''
  });
  const [formError, setFormError] = useState('');
  const [lastSync, setLastSync] = useState(() => new Date().toISOString());

  // Live listener: /assignments
  useEffect(() => {
    const assignmentsRef = ref(db, 'assignments');
    const unsubscribe = onValue(assignmentsRef, (snapshot) => {
      setAssignments(snapshotToArray(snapshot.val()));
      setLastSync(new Date().toISOString());
    });

    return () => unsubscribe();
  }, []);

  // Live listener: /alerts
  useEffect(() => {
    const alertsRef = ref(db, 'alerts');
    const unsubscribe = onValue(alertsRef, (snapshot) => {
      const readAt = new Date().toISOString();
      const snapshotValue = snapshot.val();

      setAlerts(snapshotToArray(snapshotValue, readAt));
      void persistMissingAlertReadTimes(snapshotValue, readAt);
      setLastSync(new Date().toISOString());
    });

    return () => unsubscribe();
  }, []);

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
    const minorAlerts = alerts.filter((alert) => alert.alertLevel === 'Minor').length;
    const majorAlerts = alerts.filter((alert) => alert.alertLevel === 'Major').length;
    const criticalAlerts = alerts.filter((alert) => alert.alertLevel === 'Critical').length;

    return {
      active,
      returned,
      totalAlerts: alerts.length,
      minorAlerts,
      majorAlerts,
      criticalAlerts,
    };
  }, [assignments, alerts]);

  const alertCounts = useMemo(() => {
    return {
      All: alerts.length,
      Minor: alerts.filter((alert) => alert.alertLevel === 'Minor').length,
      Major: alerts.filter((alert) => alert.alertLevel === 'Major').length,
      Critical: alerts.filter((alert) => alert.alertLevel === 'Critical').length
    };
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    const scopedAlerts = activeAlertTab === 'All'
      ? alerts
      : alerts.filter((alert) => alert.alertLevel === activeAlertTab);

    return [...scopedAlerts].sort((a, b) => getAlertSortTime(b) - getAlertSortTime(a));
  }, [alerts, activeAlertTab]);

  const openAlertsPreview = useMemo(() => {
    return [...alerts].sort(
      (a, b) => getAlertSortTime(b) - getAlertSortTime(a)
    );
  }, [alerts]);

  const handleAssign = async (event) => {
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
      guestName,
      age: ageValue,
      stayStart: form.stayStart,
      stayEnd: form.stayEnd,
      wristbandNumber,
      status: 'Active',
      assignedAt: now.toISOString(),
      lastSeen: now.toISOString()
    };

    try {
      const assignmentsRef = ref(db, 'assignments');
      const newAssignmentRef = push(assignmentsRef);
      await set(newAssignmentRef, newAssignment);

      setForm({
        guestName: '',
        age: '',
        stayStart: '',
        stayEnd: '',
        wristbandNumber: ''
      });
    } catch (error) {
      setFormError('Could not save the assignment to Firebase. Try again.');
    }
  };

  const handleReturn = async (id) => {
    try {
      await update(ref(db, `assignments/${id}`), { status: 'Returned' });
    } catch (error) {
      // Live listener is the source of truth, so on failure the UI simply
      // stays in sync with whatever is actually in the database.
      console.error('Failed to mark assignment as returned:', error);
    }
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

      {/* Top-level tab navigation */}
      <nav className="sticky top-0 z-10 border-b border-white/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex flex-wrap gap-1 px-6 sm:px-10 lg:px-20">
          {mainTabs.map((tab) => {
            const isActive = activeMainTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveMainTab(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-3.5 text-sm font-semibold transition ${
                  isActive
                    ? 'text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                {tab.id === 'alerts' && totals.openAlerts > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      totals.criticalAlerts > 0
                        ? 'bg-coral-500 text-white'
                        : 'bg-sun-400 text-slate-900'
                    }`}
                  >
                    {totals.openAlerts}
                  </span>
                )}
                <span
                  className={`absolute inset-x-3 -bottom-px h-0.5 rounded-full transition ${
                    isActive ? 'bg-slate-900' : 'bg-transparent'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </nav>

      <main className="section space-y-8">
        {activeMainTab === 'dashboard' && (
          <>
            <section className="grid gap-6 lg:grid-cols-4">
              <div className="glass-panel signal-grid relative overflow-hidden p-6 rise-in">
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-aqua-200/70 blur-2xl" />
                <p className="text-xs font-semibold text-slate-500">
                  Total alerts
                </p>
                <p className="mt-4 font-display text-3xl text-slate-900">
                  {totals.totalAlerts}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Read from the Firebase alerts table
                </p>
              </div>
              <div className="glass-panel signal-grid relative overflow-hidden p-6 rise-in rise-delay-1">
                <div className="absolute -right-6 -top-10 h-20 w-20 rounded-full bg-sun-200/60 blur-2xl" />
                <p className="text-xs font-semibold text-slate-500">Minor alerts</p>
                <p className="mt-4 font-display text-3xl text-slate-900">
                  {totals.minorAlerts}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Lowest severity level in the feed
                </p>
              </div>
              <div className="glass-panel signal-grid relative overflow-hidden p-6 rise-in rise-delay-2">
                <div className="absolute -right-10 -top-8 h-24 w-24 rounded-full bg-coral-300/40 blur-2xl" />
                <p className="text-xs font-semibold text-slate-500">Major alerts</p>
                <p className="mt-4 font-display text-3xl text-slate-900">
                  {totals.majorAlerts}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Mid-level alerts in the log
                </p>
              </div>
              <div className="glass-panel signal-grid relative overflow-hidden p-6 rise-in rise-delay-3">
                <div className="absolute -right-10 -top-8 h-24 w-24 rounded-full bg-ocean-100/70 blur-2xl" />
                <p className="text-xs font-semibold text-slate-500">Critical alerts</p>
                <p className="mt-4 font-display text-3xl text-slate-900">
                  {totals.criticalAlerts}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Highest severity level in the feed
                </p>
              </div>
            </section>

            <section className="glass-panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Quick overview
                  </p>
                  <h2 className="mt-2 font-display text-2xl text-slate-900">
                    Latest alerts from Firebase
                  </h2>
                  <p className="mt-2 text-xs text-slate-500">
                    Sorted by severity and pulled directly from the alerts table.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveMainTab('alerts')}
                  className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  View alert log
                </button>
              </div>

              <div className="mt-6 space-y-3">
                {openAlertsPreview.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                    No alerts in Firebase yet.
                  </div>
                ) : (
                  openAlertsPreview.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200/60 bg-white/80 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`status-chip ${
                            severityStyles[alert.alertLevel]
                          }`}
                        >
                          {alert.alertLevel}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {alert.guestName}
                            <span className="ml-2 text-xs font-normal text-slate-500">
                              {alert.alertID}
                            </span>
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            {alert.cause}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">
                        {formatAlertTime(alert)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}

        {activeMainTab === 'wristbands' && (
          <section className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
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
          </section>
        )}

        {activeMainTab === 'alerts' && (
          <section className="glass-panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  Alert logs
                </p>
                <h2 className="mt-2 font-display text-2xl text-slate-900">
                  Firebase alert table
                </h2>
                <p className="mt-2 text-xs text-slate-500">
                  Displaying alertID, alertLevel, cause, guestName, and the row timestamp.
                </p>
              </div>
              <div className="status-chip bg-slate-900/5 text-slate-600">
                Live feed
              </div>
            </div>

            {/* Severity filter tabs */}
            <div className="mt-5 flex flex-wrap gap-2">
              {severityTabs.map((tab) => {
                const isActive = activeAlertTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveAlertTab(tab)}
                    className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? tabActiveStyles[tab]
                        : 'border-slate-200 bg-white/70 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {tab}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        isActive
                          ? tabBadgeStyles[tab]
                          : inactiveTabBadgeStyles[tab]
                      }`}
                    >
                      {alertCounts[tab]}
                    </span>
                  </button>
                );
              })}
            </div>

            {filteredAlerts.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                No {activeAlertTab !== 'All' ? activeAlertTab.toLowerCase() : ''}{' '}
                alerts to show right now.
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-xs uppercase text-slate-400">
                    <tr>
                      <th className="pb-3 pr-4">Alert ID</th>
                      <th className="pb-3 pr-4">Severity</th>
                      <th className="pb-3 pr-4">Guest</th>
                      <th className="pb-3 pr-4">Cause</th>
                      <th className="pb-3 pr-4">Time</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600">
                    {filteredAlerts.map((alert) => (
                      <tr
                        key={alert.id}
                        className="border-t border-slate-200/60"
                      >
                        <td className="py-3 pr-4 align-top">
                          <p className="text-sm font-semibold text-slate-900">
                            {alert.alertID}
                          </p>
                        </td>
                        <td className="py-3 pr-4 align-top">
                          <span
                            className={`status-chip ${
                              severityStyles[alert.alertLevel]
                            }`}
                          >
                            {alert.alertLevel}
                          </span>
                        </td>
                        <td className="py-3 pr-4 align-top">
                          <p className="text-sm font-semibold text-slate-900">
                            {alert.guestName}
                          </p>
                        </td>
                        <td className="py-3 pr-4 align-top text-xs text-slate-600">
                          <p title={alert.cause}>{alert.cause}</p>
                        </td>
                        <td className="py-3 pr-4 align-top text-xs text-slate-600">
                          {formatAlertTime(alert)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}