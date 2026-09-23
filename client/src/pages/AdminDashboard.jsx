import { useEffect, useMemo, useRef, useState } from 'react';
import { onValue, push, ref, set, update } from 'firebase/database';
import { db, firebaseAuthReady } from '../config/firebase';

const stayFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric'
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit'
});

// ---------------------------------------------------------------------------
// Firebase /alerts/{id} schema (normalized at the dashboard boundary):
//   alertID      number | string (optional - raw payload id, display only)
//   alertlevel   "Minor" | "Major" | "Critical"
//   cause        string
//   readAt       string | number
//   status       "Open" | "Resolved"
//
// Legacy fields are mapped into the display shape so the dashboard stays
// live against any source writing into the realtime alert table.
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
  Critical: 'bg-coral-500 text-white border-coral-500',
  Camera: 'bg-ocean-500 text-white border-ocean-500',
  Wristband: 'bg-aqua-200 text-ocean-800 border-aqua-200'
};

// Badge shown when its tab is the active one (sits on top of the solid
// tabActiveStyles background above).
const tabBadgeStyles = {
  All: 'bg-white/20 text-white',
  Minor: 'bg-slate-900/10 text-slate-900',
  Major: 'bg-white/25 text-white',
  Critical: 'bg-red-900 text-white',
  Camera: 'bg-white/20 text-white',
  Wristband: 'bg-ocean-900/10 text-ocean-800'
};

// Badge shown when its tab is NOT active. Critical uses a solid dark-red
// background with white text (rather than the light-bg/dark-text pattern
// used for Minor/Major) so it reads as urgent even at rest, and so it
// doesn't depend on a custom `coral` shade rendering correctly - bg-red-600
// is a built-in Tailwind color, guaranteed to compile.
const inactiveTabBadgeStyles = {
  All: 'bg-slate-100 text-slate-500',
  Minor: 'bg-sun-100 text-sun-600',
  Major: 'bg-orange-100 text-orange-600',
  Critical: 'bg-red-600 text-white',
  Camera: 'bg-ocean-100 text-ocean-700',
  Wristband: 'bg-aqua-100 text-ocean-700'
};

// Only two statuses exist in the Firebase schema - no "Acknowledged" state.
const alertStatusStyles = {
  Open: 'bg-coral-300/20 text-coral-500',
  Resolved: 'bg-aqua-200/70 text-ocean-700'
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

const DEFAULT_WRISTBAND_INVENTORY = 150;
const CRITICAL_ALARM_SRC = '/critical-alarm.mp3';

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

  const parsedValue =
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  const parsedTime =
    typeof parsedValue === 'number'
      ? new Date(parsedValue)
      : new Date(String(parsedValue));

  if (Number.isNaN(parsedTime.getTime())) {
    return String(value);
  }

  return timeFormatter.format(parsedTime);
};

const isCameraAlert = (alert) =>
  String(alert?.cause ?? '')
    .toLowerCase()
    .includes('camera');
const toTimestamp = (value) => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value);
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
  }

  if (value && typeof value.seconds === 'number') {
    return value.seconds * 1000 + Math.floor((value.nanoseconds ?? 0) / 1e6);
  }

  return Number.NEGATIVE_INFINITY;
};

// Formats a raw alertID for display: "#135" for numbers/numeric strings,
// falls back to whatever was provided (still prefixed) for non-numeric ids,
// and returns null when there's nothing to show so callers can skip
// rendering entirely rather than printing "#undefined".
const formatAlertId = (alertID) => {
  if (alertID === null || alertID === undefined || alertID === '') {
    return null;
  }

  return `#${alertID}`;
};

const normalizeAlertRecord = (id, value = {}) => {
  const source = value ?? {};
  const alertlevel =
    source.alertlevel ?? source.alertLevel ?? source.severity ?? 'Minor';
  const cause = source.cause ?? source.message ?? source.reason ?? '';
  const readAt = source.readAt ?? source.time ?? source.readAtMs ?? null;
  const readAtMs = source.readAtMs ?? (readAt ? toTimestamp(readAt) : null);
  const recordId = source.alertID ?? id;

  return {
    storagePath: String(id),
    id: String(recordId),
    ...source,
    alertlevel,
    severity: alertlevel,
    cause,
    message: cause,
    reason: source.reason ?? cause,
    readAt,
    readAtMs,
    time: formatTime(readAt ?? readAtMs),
    status: source.status ?? 'Open'
  };
};

// Newest-first comparator using the realtime readAt value.
const byNewestFirst = (a, b) => {
  const timeDiff = toTimestamp(b.readAt) - toTimestamp(a.readAt);
  if (timeDiff !== 0) {
    return timeDiff;
  }

  return b.id.localeCompare(a.id);
};

// Firebase Realtime Database can store alerts either directly under /alerts
// or nested one level deeper in grouped tables. This flattens both shapes
// into a single array and returns [] when the path is empty/null.
const isAlertLikeRecord = (value) =>
  Boolean(
    value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      ('alertlevel' in value ||
        'alertLevel' in value ||
        'severity' in value ||
        'cause' in value ||
        'message' in value ||
        'reason' in value ||
        'readAt' in value ||
        'time' in value)
  );

const collectAlertRecords = (node, path = []) => {
  if (!node || typeof node !== 'object') {
    return [];
  }

  return Object.entries(node).flatMap(([key, value]) => {
    const nextPath = [...path, key];

    if (isAlertLikeRecord(value)) {
      return [normalizeAlertRecord(nextPath.join('/'), value)];
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return collectAlertRecords(value, nextPath);
    }

    return [];
  });
};

const snapshotToArray = (snapshotValue) => {
  if (!snapshotValue) {
    return [];
  }

  return collectAlertRecords(snapshotValue);
};

// Assignments use a flat shape (no severity/cause fields to hunt for like
// alerts do), so they get their own lightweight parser instead of going
// through collectAlertRecords/normalizeAlertRecord.
const parseAssignments = (snapshotValue) => {
  if (!snapshotValue || typeof snapshotValue !== 'object') {
    return [];
  }

  return Object.entries(snapshotValue).map(([key, value]) => ({
    id: key,
    ...value
  }));
};

const downloadAlertsAsCsv = (rows) => {
  const headers = [
    'Alert ID',
    'Severity',
    'Guest',
    'Wristband',
    'Alert',
    'Reason',
    'Time',
    'Status'
  ];

  const escapeCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

  const csvBody = rows
    .map((alert) =>
      [
        alert.alertID ?? '',
        alert.alertlevel,
        alert.guestName,
        alert.wristbandNumber,
        alert.cause,
        alert.reason,
        formatTime(alert.readAt),
        alert.status
      ]
        .map(escapeCell)
        .join(',')
    )
    .join('\n');

  const csvContent = `${headers.map(escapeCell).join(',')}\n${csvBody}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `alert-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function AdminDashboard() {
  const [assignments, setAssignments] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [totalInventory, setTotalInventory] = useState(
    DEFAULT_WRISTBAND_INVENTORY
  );
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
  // Tracks whether the Firebase write is currently in flight, so the
  // button can't be double-clicked and the UI can distinguish "idle" from
  // "submitting" instead of assuming success the instant you click.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSync, setLastSync] = useState(() => new Date().toISOString());
  const [firebaseStatus, setFirebaseStatus] = useState('connecting');
  const [firebaseError, setFirebaseError] = useState('');

  // --- Audible critical-alarm state -----------------------------------
  const [monitoringStarted, setMonitoringStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef(null);
  const monitoringStartedRef = useRef(false);
  const isMutedRef = useRef(false);
  const backfilledAlertPathsRef = useRef(new Set());
  // null = "haven't seen a snapshot yet" - used so the very first Firebase
  // payload never gets treated as a batch of brand-new critical alerts.
  const previousAlertIdsRef = useRef(null);

  useEffect(() => {
    monitoringStartedRef.current = monitoringStarted;
  }, [monitoringStarted]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Create the Audio element once on mount.
  useEffect(() => {
    audioRef.current = new Audio(CRITICAL_ALARM_SRC);
    audioRef.current.preload = 'auto';
  }, []);

  useEffect(() => {
    let active = true;

    firebaseAuthReady
      .then(() => {
        if (active) {
          setFirebaseStatus('ready');
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setFirebaseStatus('error');
        setFirebaseError(
          error?.code === 'auth/operation-not-allowed'
            ? 'Firebase anonymous auth is disabled. Enable Anonymous sign-in in Firebase Authentication.'
            : 'Firebase authentication failed. Check the Firebase config and database access rules.'
        );
      });

    return () => {
      active = false;
    };
  }, []);

  const playCriticalAlarm = () => {
    const audio = audioRef.current;
    if (!audio || !monitoringStartedRef.current || isMutedRef.current) {
      return;
    }

    audio.currentTime = 0;
    audio.play().catch((error) => {
      console.warn('Critical alarm playback was blocked:', error);
    });
  };

  // Browsers require a user gesture before any audio can play. Clicking
  // "Start Monitoring" plays-then-immediately-pauses the alarm element so
  // the browser registers it as user-initiated; that unlocks unprompted
  // audio.play() calls for the rest of the session.
  const handleStartMonitoring = () => {
    const audio = audioRef.current;
    if (audio) {
      audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
        })
        .catch(() => {
          // If the trial play is still blocked, monitoringStarted still
          // flips - most browsers allow the *next* play() after a click
          // even if this priming attempt was rejected.
        });
    }
    setMonitoringStarted(true);
  };

  // Live listener: /assignments
  useEffect(() => {
    if (firebaseStatus !== 'ready') {
      return undefined;
    }

    const assignmentsRef = ref(db, 'assignments');
    const unsubscribe = onValue(assignmentsRef, (snapshot) => {
      setAssignments(parseAssignments(snapshot.val()));
      setLastSync(new Date().toISOString());
    });

    return () => unsubscribe();
  }, [firebaseStatus]);

  // Live listener: /alerts
  useEffect(() => {
    if (firebaseStatus !== 'ready') {
      return undefined;
    }

    const alertsRef = ref(db, 'alerts');
    const unsubscribe = onValue(alertsRef, (snapshot) => {
      const nowIso = new Date().toISOString();
      const nowMs = Date.now();
      const nextAlerts = snapshotToArray(snapshot.val()).map((alert) => {
        const hasStoredTime = alert.readAt !== null && alert.readAt !== undefined;

        if (hasStoredTime) {
          return alert;
        }

        return {
          ...alert,
          readAt: nowIso,
          readAtMs: nowMs,
          time: formatTime(nowIso)
        };
      });

      const missingTimestampAlerts = nextAlerts.filter(
        (alert) =>
          (alert.readAtMs === nowMs || alert.readAt === nowIso) &&
          !backfilledAlertPathsRef.current.has(alert.storagePath)
      );

      if (missingTimestampAlerts.length > 0) {
        missingTimestampAlerts.forEach((alert) => {
          backfilledAlertPathsRef.current.add(alert.storagePath);
          void update(ref(db, `alerts/${alert.storagePath}`), {
            readAt: nowIso,
            readAtMs: nowMs
          }).catch((error) => {
            console.error('Failed to backfill alert timestamp:', error);
            backfilledAlertPathsRef.current.delete(alert.storagePath);
          });
        });
      }

      setAlerts(nextAlerts);
      setLastSync(nowIso);
    });

    return () => unsubscribe();
  }, [firebaseStatus]);

  // Alarm trigger: diff the previous alerts list against whatever just
  // came in from Firebase. Anything whose id wasn't present last time,
  // with severity "Critical" and status "Open", is a genuinely new
  // critical alert and should sound the alarm.
  useEffect(() => {
    const previousIds = previousAlertIdsRef.current;

    if (previousIds === null) {
      // First payload after mount (or after a refresh) - this is just
      // Firebase handing us the existing history, not new alerts.
      previousAlertIdsRef.current = new Set(alerts.map((alert) => alert.id));
      return;
    }

    const newlyArrivedCriticalAlerts = alerts.filter(
      (alert) =>
        !previousIds.has(alert.id) &&
        alert.alertlevel === 'Critical' &&
        alert.status === 'Open'
    );

    if (newlyArrivedCriticalAlerts.length > 0) {
      playCriticalAlarm();
    }

    previousAlertIdsRef.current = new Set(alerts.map((alert) => alert.id));
  }, [alerts]);

  // Live listener: /inventory/totalWristbands (optional path)
  useEffect(() => {
    if (firebaseStatus !== 'ready') {
      return undefined;
    }

    const inventoryRef = ref(db, 'inventory/totalWristbands');
    const unsubscribe = onValue(inventoryRef, (snapshot) => {
      const value = snapshot.val();
      if (typeof value === 'number' && value > 0) {
        setTotalInventory(value);
      }
    });

    return () => unsubscribe();
  }, [firebaseStatus]);

  const activeAssignments = useMemo(() => {
    const toTime = (value) => {
      const parsed = value ? new Date(value).getTime() : NaN;
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    return assignments
      .filter((item) => item.status === 'Active')
      .sort((a, b) => toTime(b.assignedAt) - toTime(a.assignedAt));
  }, [assignments]);

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
    const openAlerts = alerts.filter((alert) => alert.status === 'Open').length;
    const criticalAlerts = alerts.filter(
      (alert) => alert.status === 'Open' && alert.alertlevel === 'Critical'
    ).length;
    const available = Math.max(totalInventory - active, 0);

    return {
      active,
      returned,
      openAlerts,
      criticalAlerts,
      available
    };
  }, [assignments, alerts, totalInventory]);

  const alertCounts = useMemo(() => {
    return {
      All: alerts.length,
      Minor: alerts.filter((alert) => alert.alertlevel === 'Minor').length,
      Major: alerts.filter((alert) => alert.alertlevel === 'Major').length,
      Critical: alerts.filter((alert) => alert.alertlevel === 'Critical').length,
      Camera: alerts.filter((alert) => isCameraAlert(alert)).length,
      Wristband: alerts.filter((alert) => !isCameraAlert(alert)).length
    };
  }, [alerts]);

  // Alert Logs table: a log history reads strictly newest-first, so
  // severity and alert-type filters only narrow which rows show up.
  const filteredAlerts = useMemo(() => {
    const byFilter =
      activeAlertTab === 'All'
        ? alerts
        : activeAlertTab === 'Camera'
          ? alerts.filter((alert) => isCameraAlert(alert))
          : activeAlertTab === 'Wristband'
            ? alerts.filter((alert) => !isCameraAlert(alert))
            : alerts.filter((alert) => alert.alertlevel === activeAlertTab);

    return [...byFilter].sort(byNewestFirst);
  }, [alerts, activeAlertTab]);

  // Dashboard preview: grouped by severity (Critical, then Major, then
  // Minor), and within each group the newest alert sits on top.
  const openAlertsPreview = useMemo(() => {
    return alerts
      .filter((alert) => alert.status === 'Open')
      .sort((a, b) => {
        const severityDiff =
          severityOrder[a.alertlevel] - severityOrder[b.alertlevel];
        if (severityDiff !== 0) {
          return severityDiff;
        }
        return byNewestFirst(a, b);
      });
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

    if (totals.available <= 0) {
      setFormError('No wristbands available - process a return before assigning.');
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

    // Guard against double submits (e.g. double click) while a write is
    // already in flight.
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const assignmentsRef = ref(db, 'assignments');
      const newAssignmentRef = push(assignmentsRef);

      console.log(
        '[handleAssign] writing to',
        newAssignmentRef.toString(),
        newAssignment
      );
      await set(newAssignmentRef, newAssignment);
      console.log('[handleAssign] write confirmed by server');

      // Only clear the form once the write above has actually resolved
      // successfully - if set() throws, this line never runs and the
      // catch block below takes over instead.
      setForm({
        guestName: '',
        age: '',
        stayStart: '',
        stayEnd: '',
        wristbandNumber: ''
      });
    } catch (error) {
      // This log is the important addition: without it, a
      // PERMISSION_DENIED or network rejection from Firebase fails
      // completely silently in the console while still showing a
      // banner in the UI, which is exactly the symptom that was
      // reported (no console errors, form clears anyway - previously
      // it wouldn't have, but the lack of logging made it look like a
      // React logic bug instead of a Firebase rejection).
      console.error(
        '[handleAssign] Firebase write failed:',
        error?.code ?? '',
        error?.message ?? error
      );
      setFormError(
        error?.code === 'PERMISSION_DENIED'
          ? 'Permission denied - check your Realtime Database security rules.'
          : 'Could not save the assignment to Firebase. Try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturn = async (id) => {
    try {
      await update(ref(db, `assignments/${id}`), { status: 'Returned' });
    } catch (error) {
      console.error('Failed to mark assignment as returned:', error);
    }
  };

  const handleResolveAlert = async (id) => {
    try {
      await update(ref(db, `alerts/${id}`), { status: 'Resolved' });
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const handleExportLogs = () => {
    downloadAlertsAsCsv(filteredAlerts);
  };

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
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-aqua-300 animate-pulse" />
                {firebaseStatus === 'ready'
                  ? `Firebase feed connected - Last sync ${formatTime(lastSync)}`
                  : firebaseStatus === 'error'
                    ? 'Firebase feed unavailable'
                    : 'Connecting to Firebase...'}
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-ocean-700">
                <span className="flex h-2 w-2 rounded-full bg-ocean-500" />
                {totals.available} wristbands available
              </span>
            </div>
            {firebaseError && (
              <p className="mt-2 max-w-2xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {firebaseError}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMuted((prev) => !prev)}
              className="btn-secondary"
              title={
                monitoringStarted
                  ? 'Toggle the audible critical alarm'
                  : 'Start monitoring first to enable audio'
              }
            >
              {isMuted ? 'Unmute Alerts' : 'Mute Alerts'}
            </button>
          </div>
        </div>
      </header>

      {!monitoringStarted && (
        <div className="border-b border-sun-200 bg-sun-50">
          <div className="mx-auto flex flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm text-slate-700 sm:px-10 lg:px-20">
            <p>
              <span className="font-semibold">Enable the critical alarm.</span>{' '}
              Browsers block audio until you interact with the page - click
              Start Monitoring so a Critical alert can sound automatically.
            </p>
            <button
              type="button"
              onClick={handleStartMonitoring}
              className="btn-primary px-4 py-1.5 text-xs"
            >
              Start Monitoring
            </button>
          </div>
        </div>
      )}

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
                {tab.id === 'wristbands' && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      totals.available === 0
                        ? 'bg-coral-100 text-coral-600'
                        : 'bg-aqua-100 text-ocean-700'
                    }`}
                  >
                    {totals.available} left
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
                  Active wristbands
                </p>
                <p className="mt-4 font-display text-3xl text-slate-900">
                  {totals.active}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {totals.available} available of {totalInventory}
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
                  Critical alerts
                </p>
                <p className="mt-4 font-display text-3xl text-slate-900">
                  {totals.criticalAlerts}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Open and unresolved right now
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

            <section className="glass-panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Quick overview
                  </p>
                  <h2 className="mt-2 font-display text-2xl text-slate-900">
                    Live &amp; open emergencies
                  </h2>
                  <p className="mt-2 text-xs text-slate-500">
                    Grouped by severity, newest first within each group. Full
                    history lives in Alert Logs.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveMainTab('alerts')}
                  className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  View all in Alert Logs
                </button>
              </div>

              <div className="mt-6 space-y-3">
                {openAlertsPreview.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                    No open alerts. All clear.
                  </div>
                ) : (
                  openAlertsPreview.map((alert) => {
                    const isCritical = alert.alertlevel === 'Critical';
                    const alertIdLabel = formatAlertId(alert.alertID);
                    return (
                      <div
                        key={alert.id}
                        className={`flex flex-wrap items-start justify-between gap-4 rounded-2xl border p-4 ${
                          isCritical
                            ? 'border-coral-300 bg-[#fee2e2] shadow-sm'
                            : 'border-slate-200/60 bg-white/80'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`status-chip ${
                              severityStyles[alert.alertlevel]
                            }`}
                          >
                            {isCritical && (
                              <span className="relative mr-1 inline-flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                              </span>
                            )}
                            {alert.alertlevel}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {alert.guestName}
                              <span className="ml-2 text-xs font-normal text-slate-500">
                                {alert.wristbandNumber}
                              </span>
                              {alertIdLabel && (
                                <span className="ml-2 text-[10px] font-normal text-slate-400">
                                  {alertIdLabel}
                                </span>
                              )}
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                              {alert.cause}
                            </p>
                            <p className="mt-1 text-[11px] italic text-slate-400">
                              {alert.reason}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span
                            className={`status-chip ${
                              alertStatusStyles[alert.status]
                            }`}
                          >
                            {alert.status}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatTime(alert.readAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })
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
                <div
                  className={`status-chip ${
                    totals.available === 0
                      ? 'bg-coral-100 text-coral-600'
                      : 'bg-slate-900/5 text-slate-600'
                  }`}
                >
                  {totals.available} available
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
                <button
                  type="submit"
                  disabled={totals.available <= 0 || isSubmitting}
                  className="btn-primary sm:col-span-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Assigning…' : 'Assign Wristband'}
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
                  Live wristband alerts
                </h2>
                <p className="mt-2 text-xs text-slate-500">
                  Streaming from Firebase, sorted newest first.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="status-chip bg-slate-900/5 text-slate-600">
                  Live feed
                </div>
                <button
                  type="button"
                  onClick={handleExportLogs}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-3.5 w-3.5"
                  >
                    <path d="M10 12.5a.75.75 0 0 0 .75-.75V4.56l1.72 1.72a.75.75 0 1 0 1.06-1.06l-3-3a.75.75 0 0 0-1.06 0l-3 3a.75.75 0 0 0 1.06 1.06l1.72-1.72v7.19c0 .414.336.75.75.75Z" />
                    <path d="M4.25 10a.75.75 0 0 0-.75.75v4.5c0 .966.784 1.75 1.75 1.75h9.5a1.75 1.75 0 0 0 1.75-1.75v-4.5a.75.75 0 0 0-1.5 0v4.5a.25.25 0 0 1-.25.25h-9.5a.25.25 0 0 1-.25-.25v-4.5a.75.75 0 0 0-.75-.75Z" />
                  </svg>
                  Export Logs (CSV)
                </button>
              </div>
            </div>

            {/* Severity and alert-type filter tabs */}
            <div className="mt-5 flex flex-wrap gap-2">
              {[...severityTabs, 'Camera', 'Wristband'].map((tab) => {
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
                <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-sm">
                  <thead className="text-xs uppercase text-slate-400">
                    <tr>
                      <th className="pb-3 pl-1 pr-4">Severity</th>
                      <th className="pb-3 pr-4">Guest</th>
                      <th className="pb-3 pr-4">Alert</th>
                      <th className="pb-3 pr-4">Time</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600">
                    {filteredAlerts.map((alert) => {
                      const isCritical = alert.alertlevel === 'Critical';
                      const alertIdLabel = formatAlertId(alert.alertID);
                      return (
                        <tr
                          key={alert.id}
                          className={`border-t border-l-4 ${
                            isCritical
                              ? 'border-coral-300 border-l-coral-500 bg-[#fee2e2]'
                              : 'border-slate-200/60 border-l-transparent'
                          }`}
                        >
                          <td className="py-3 pl-1 pr-4 align-top">
                            <span
                              className={`status-chip ${
                                severityStyles[alert.alertlevel]
                              }`}
                            >
                              {isCritical && (
                                <span className="relative mr-1 inline-flex h-2 w-2">
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                                  <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                                </span>
                              )}
                              {alert.alertlevel}
                            </span>
                          </td>
                          <td className="py-3 pr-4 align-top">
                            <p
                              className={`text-sm font-semibold ${
                                isCritical ? 'text-coral-700' : 'text-slate-900'
                              }`}
                            >
                              {alert.guestName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {alert.wristbandNumber}
                            </p>
                            {alertIdLabel && (
                              <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                                {alertIdLabel}
                              </p>
                            )}
                          </td>
                          <td className="py-3 pr-4 align-top text-xs text-slate-600">
                            <p title={alert.reason}>{alert.cause}</p>
                            <p className="mt-1 cursor-help text-[11px] italic text-slate-400">
                              {alert.reason}
                            </p>
                          </td>
                          <td className="py-3 pr-4 align-top text-xs text-slate-600">
                            {formatTime(alert.readAt)}
                          </td>
                          <td className="py-3 pr-4 align-top">
                            <span
                              className={`status-chip ${
                                alertStatusStyles[alert.status]
                              }`}
                            >
                              {alert.status}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right align-top">
                            {alert.status === 'Open' ? (
                              <button
                                type="button"
                                onClick={() => handleResolveAlert(alert.id)}
                                className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-700"
                              >
                                Resolve
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">
                                Resolved
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
