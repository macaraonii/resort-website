import { useEffect, useMemo, useRef, useState } from 'react';
import { get, onValue, ref, set, update } from 'firebase/database';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  eachDayOfInterval,
  eachHourOfInterval,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  isSameWeek,
  isSameYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear
} from 'date-fns';
import { db } from '../config/firebase';
import { checkEsp32Health } from '../api.js';

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

const tabActiveStyles = {
  All: 'bg-slate-900 text-white border-slate-900',
  Minor: 'bg-sun-400 text-slate-900 border-sun-400',
  Major: 'bg-orange-400 text-white border-orange-400',
  Critical: 'bg-coral-500 text-white border-coral-500',
  Camera: 'bg-ocean-500 text-white border-ocean-500',
  Armband: 'bg-aqua-200 text-ocean-800 border-aqua-200'
};

// Badge shown when its tab is the active one (sits on top of the solid
// tabActiveStyles background above).
const tabBadgeStyles = {
  All: 'bg-white/20 text-white',
  Minor: 'bg-slate-900/10 text-slate-900',
  Major: 'bg-white/25 text-white',
  Critical: 'bg-red-900 text-white',
  Camera: 'bg-white/20 text-white',
  Armband: 'bg-ocean-900/10 text-ocean-800'
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
  Armband: 'bg-aqua-100 text-ocean-700'
};

// Only two statuses exist in the Firebase schema - no "Acknowledged" state.
const alertStatusStyles = {
  Open: 'bg-coral-300/20 text-coral-500',
  Resolved: 'bg-aqua-200/70 text-ocean-700'
};

// Assignment lifecycle: Active -> Offline (no signal for 10+ minutes, but the
// guest still holds the armband) -> Returned. Offline flips back to Active if
// the armband starts reporting again. Only "Returned" frees an armband for a
// new guest.
const assignmentStatusStyles = {
  Active: 'bg-aqua-200 text-ocean-800',
  Offline: 'bg-amber-200 text-amber-900',
  Returned: 'bg-slate-200 text-slate-600'
};

const severityTabs = ['All', 'Minor', 'Major', 'Critical'];

const mainTabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'armbands', label: 'Armband Management' },
  { id: 'alerts', label: 'Alert Logs' }
];

const DEFAULT_ARMBAND_INVENTORY = 150;
const ARMBAND_PREFIX = 'CW';
const CRITICAL_ALARM_SRC = '/critical-alarm.mp3';
const ESP32_POLL_INTERVAL_MS = 10000;
// An Active armband not heard from for longer than this is swept to Offline.
const OFFLINE_THRESHOLD_MS = 10 * 60 * 1000;

// A Critical alert stays pinned to the top of the alert lists for this long
// after it was read. The clock state below ticks so the pin expires live.
const CRITICAL_PIN_WINDOW_MS = 5 * 60 * 1000;
const CLOCK_TICK_MS = 30 * 1000;

// Line colors for the hourly trend chart (hex so Recharts can use them
// directly - Recharts can't read Tailwind class names).
const TREND_COLORS = {
  Minor: '#eab308',
  Major: '#fb923c',
  Critical: '#ef4444'
};

// Blink animation for open Critical alerts. Kept in the component so the
// dashboard works without touching index.css or the Tailwind config.
const CRITICAL_BLINK_CSS = `
@keyframes critical-row-blink {
  0%, 100% { background-color: #fee2e2; }
  50% { background-color: #fca5a5; }
}
@keyframes critical-badge-blink {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.75); }
  50% { opacity: 0.55; box-shadow: 0 0 0 7px rgba(239, 68, 68, 0); }
}
.critical-blink-row {
  animation: critical-row-blink 1s ease-in-out infinite;
}
.critical-blink-badge {
  animation: critical-badge-blink 1s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .critical-blink-row {
    animation: none;
    background-color: #fecaca;
  }
  .critical-blink-badge {
    animation: none;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.5);
  }
}
`;

const formatArmbandId = (index) =>
  `${ARMBAND_PREFIX}${String(index).padStart(3, '0')}`;

const buildArmbandIds = (count = DEFAULT_ARMBAND_INVENTORY) =>
  Array.from({ length: count }, (_, index) => formatArmbandId(index + 1));

// Records written by the old ESP32 poll used status "Inactive" for what is now
// "Offline", so both read as Offline here.
const getAssignmentStatus = (assignment) => {
  const status = assignment.status ?? 'Active';
  return status === 'Inactive' ? 'Offline' : status;
};

// An assignment that is Active or Offline still holds its armband. Only
// "Returned" releases it.
const isHeldAssignment = (assignment) => {
  const status = getAssignmentStatus(assignment);
  return status === 'Active' || status === 'Offline';
};

// Last time the armband was heard from, in ms. Prefers lastSeen (ISO string,
// epoch ms, or epoch seconds from the ESP32) and falls back to assignedAt so
// a brand-new assignment gets a full 10 minutes before it can be swept.
// Returns null when neither field is usable.
const getAssignmentSeenMs = (assignment) => {
  const rawLastSeen = toTimestamp(assignment.lastSeen);
  if (Number.isFinite(rawLastSeen)) {
    return rawLastSeen > 0 && rawLastSeen < 1e11 ? rawLastSeen * 1000 : rawLastSeen;
  }

  const assignedAt = toTimestamp(assignment.assignedAt);
  return Number.isFinite(assignedAt) ? assignedAt : null;
};

const formatLastSeen = (seenMs, nowMs) => {
  if (seenMs === null) {
    return 'never';
  }

  const minutes = Math.floor(Math.max(nowMs - seenMs, 0) / 60000);
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} h ago`;
  }

  return `${Math.floor(hours / 24)} d ago`;
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

// Millisecond timestamp for an alert, preferring readAtMs and falling back
// to readAt. Returns -Infinity when neither can be parsed.
const getAlertMs = (alert) => toTimestamp(alert?.readAtMs ?? alert?.readAt);

// Newest-first comparator using the realtime readAtMs value.
const byNewestFirst = (a, b) => {
  const aMs = getAlertMs(a);
  const bMs = getAlertMs(b);

  if (aMs !== bMs) {
    return bMs > aMs ? 1 : -1;
  }

  return b.id.localeCompare(a.id);
};

// An alert blinks for as long as it is a Critical alert that is still Open.
// Resolving it (status -> "Resolved") is the only thing that stops it.
const isBlinkingAlert = (alert) =>
  alert.alertlevel === 'Critical' && alert.status === 'Open';

// A Critical, Open alert is pinned to the top only while it is younger than
// CRITICAL_PIN_WINDOW_MS. After that it sorts chronologically like the rest.
const isPinnedCritical = (alert, nowMs) =>
  isBlinkingAlert(alert) && nowMs - getAlertMs(alert) < CRITICAL_PIN_WINDOW_MS;

const byPinThenNewest = (nowMs) => (a, b) => {
  const aPinned = isPinnedCritical(a, nowMs);
  const bPinned = isPinnedCritical(b, nowMs);

  if (aPinned !== bPinned) {
    return aPinned ? -1 : 1;
  }

  return byNewestFirst(a, b);
};

// Weeks run Monday to Sunday.
const WEEK_OPTIONS = { weekStartsOn: 1 };

const TREND_RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' }
];

// One entry per dropdown option. Each describes the current period (via
// date-fns), how to split it into X-axis buckets, and how to label them.
//   contains     - is this alert inside the current period?
//   getBuckets   - start date of every bucket in the period
//   keyOf        - maps a date to the bucket it belongs to
//   labelOf      - short X-axis tick label
//   tooltipOf    - longer label shown in the tooltip
//   xAxisInterval- how many ticks to skip so labels never overlap
const TREND_RANGE_CONFIG = {
  today: {
    groupLabel: 'hour',
    periodLabel: 'today',
    xAxisInterval: 2,
    describe: (now) => format(now, 'EEEE, MMM d, yyyy'),
    contains: (date, now) => isSameDay(date, now),
    getBuckets: (now) =>
      eachHourOfInterval({ start: startOfDay(now), end: endOfDay(now) }),
    keyOf: (date) => format(date, 'yyyy-MM-dd-HH'),
    labelOf: (date) => format(date, 'h a'),
    tooltipOf: (date) => format(date, 'MMM d, h a')
  },
  week: {
    groupLabel: 'day',
    periodLabel: 'this week',
    xAxisInterval: 0,
    describe: (now) =>
      `${format(startOfWeek(now, WEEK_OPTIONS), 'MMM d')} - ${format(
        endOfWeek(now, WEEK_OPTIONS),
        'MMM d, yyyy'
      )}`,
    contains: (date, now) => isSameWeek(date, now, WEEK_OPTIONS),
    getBuckets: (now) =>
      eachDayOfInterval({
        start: startOfWeek(now, WEEK_OPTIONS),
        end: endOfWeek(now, WEEK_OPTIONS)
      }),
    keyOf: (date) => format(date, 'yyyy-MM-dd'),
    labelOf: (date) => format(date, 'EEE'),
    tooltipOf: (date) => format(date, 'EEEE, MMM d')
  },
  month: {
    groupLabel: 'day',
    periodLabel: 'this month',
    xAxisInterval: 1,
    describe: (now) => format(now, 'MMMM yyyy'),
    contains: (date, now) => isSameMonth(date, now),
    getBuckets: (now) =>
      eachDayOfInterval({ start: startOfMonth(now), end: endOfMonth(now) }),
    keyOf: (date) => format(date, 'yyyy-MM-dd'),
    labelOf: (date) => format(date, 'd'),
    tooltipOf: (date) => format(date, 'EEEE, MMM d')
  },
  year: {
    groupLabel: 'month',
    periodLabel: 'this year',
    xAxisInterval: 0,
    describe: (now) => format(now, 'yyyy'),
    contains: (date, now) => isSameYear(date, now),
    getBuckets: (now) =>
      eachMonthOfInterval({ start: startOfYear(now), end: endOfYear(now) }),
    keyOf: (date) => format(date, 'yyyy-MM'),
    labelOf: (date) => format(date, 'MMM'),
    tooltipOf: (date) => format(date, 'MMMM yyyy')
  }
};

// Filters alerts to the selected current period and counts Minor / Major /
// Critical per bucket for the trend chart. Buckets that haven't started yet
// stay null so the lines stop at the present instead of dropping to zero.
const buildAlertTrend = (alerts, nowMs, range) => {
  const config = TREND_RANGE_CONFIG[range] ?? TREND_RANGE_CONFIG.today;
  const now = new Date(nowMs);

  const buckets = config.getBuckets(now).map((bucketStart) => {
    const initialCount = isAfter(bucketStart, now) ? null : 0;
    return {
      key: config.keyOf(bucketStart),
      label: config.labelOf(bucketStart),
      tooltipLabel: config.tooltipOf(bucketStart),
      Minor: initialCount,
      Major: initialCount,
      Critical: initialCount
    };
  });

  const bucketsByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  let total = 0;

  alerts.forEach((alert) => {
    const ms = getAlertMs(alert);
    const level = alert.alertlevel;

    if (!Number.isFinite(ms) || !(level in TREND_COLORS)) {
      return;
    }

    const alertDate = new Date(ms);
    if (!config.contains(alertDate, now)) {
      return;
    }

    const bucket = bucketsByKey.get(config.keyOf(alertDate));
    if (!bucket) {
      return;
    }

    bucket[level] = (bucket[level] ?? 0) + 1;
    total += 1;
  });

  return { buckets, total, rangeText: config.describe(now) };
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
    status: value?.status ?? 'Active',
    ...value
  }));
};

const getNextAssignmentId = (currentAssignments) => {
  const highestAssignmentNumber = currentAssignments.reduce((highest, assignment) => {
    const match = String(assignment.id ?? '').match(/^GA(\d+)$/i);
    if (!match) {
      return highest;
    }

    return Math.max(highest, Number(match[1]));
  }, 0);

  return `GA${highestAssignmentNumber + 1}`;
};

const downloadAlertsAsCsv = (rows) => {
  const headers = [
    'Alert ID',
    'Severity',
    'Guest',
    'Armband',
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
        alert.armbandNumber,
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
    DEFAULT_ARMBAND_INVENTORY
  );
  const [search, setSearch] = useState('');
  const [activeAlertTab, setActiveAlertTab] = useState('All');
  const [activeMainTab, setActiveMainTab] = useState('dashboard');
  const [trendRange, setTrendRange] = useState('today');
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    age: '',
    stayStart: '',
    stayEnd: '',
    armbandID: ''
  });
  const [formError, setFormError] = useState('');
  // Tracks whether the Firebase write is currently in flight, so the
  // button can't be double-clicked and the UI can distinguish "idle" from
  // "submitting" instead of assuming success the instant you click.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSync, setLastSync] = useState(() => new Date().toISOString());
  const [firebaseStatus, setFirebaseStatus] = useState('connecting');
  const [firebaseError, setFirebaseError] = useState('');
  // The health poll also reconciles active assignments when the ESP32 is
  // unavailable, so this state reflects the latest connection result.
  const [esp32Status, setEsp32Status] = useState('checking');
  // Live clock. Ticking this state re-renders the component so the 5-minute
  // Critical pin expires while the operator is watching, even if no new
  // Firebase data arrives.
  const [nowMs, setNowMs] = useState(() => Date.now());

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

  // Clock tick: re-render every 30 seconds so time-based sorting and the
  // hourly chart stay current.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, CLOCK_TICK_MS);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    setFirebaseStatus('ready');
  }, []);

  // ESP32 connectivity poll. Display only: it drives the status dot in the
  // header and never writes to Firebase. Per-armband offline detection is the
  // lastSeen sweep further down, so one failed health check can't flip every
  // guest at once.
  useEffect(() => {
    let cancelled = false;

    const pollEsp32 = async () => {
      try {
        const result = await checkEsp32Health();
        const nextStatus =
          result.status === 'online'
            ? 'online'
            : result.status === 'unconfigured'
              ? 'unconfigured'
              : 'offline';

        if (!cancelled) {
          setEsp32Status(nextStatus);
        }
      } catch (error) {
        if (!cancelled) {
          setEsp32Status('offline');
          console.error('ESP32 health poll failed:', error);
        }
      }
    };

    void pollEsp32();
    const intervalId = window.setInterval(pollEsp32, ESP32_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
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

  // Auto-offline sweep. Runs whenever assignments change and on every clock
  // tick. An Active armband with no signal for more than OFFLINE_THRESHOLD_MS
  // is flipped to Offline in Firebase; an Offline one that is reporting again
  // flips back to Active. The writes are idempotent: once statuses match
  // reality there is nothing left to update, so the re-run triggered by the
  // listener is a no-op.
  useEffect(() => {
    if (firebaseStatus !== 'ready') {
      return undefined;
    }

    let cancelled = false;
    const statusUpdates = {};

    assignments.forEach((assignment) => {
      const status = getAssignmentStatus(assignment);
      if (status !== 'Active' && status !== 'Offline') {
        return;
      }

      const seenMs = getAssignmentSeenMs(assignment);
      if (seenMs === null) {
        return;
      }

      const isStale = nowMs - seenMs > OFFLINE_THRESHOLD_MS;

      if (status === 'Active' && isStale) {
        statusUpdates[`assignments/${assignment.id}/status`] = 'Offline';
      } else if (status === 'Offline' && !isStale) {
        statusUpdates[`assignments/${assignment.id}/status`] = 'Active';
      }
    });

    if (Object.keys(statusUpdates).length > 0) {
      update(ref(db), statusUpdates).catch((error) => {
        if (!cancelled) {
          console.error('Offline sweep failed:', error);
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [assignments, nowMs, firebaseStatus]);

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

  // Live listener: /inventory/totalArmbands (optional path)
  useEffect(() => {
    if (firebaseStatus !== 'ready') {
      return undefined;
    }

    const inventoryRef = ref(db, 'inventory/totalArmbands');
    const unsubscribe = onValue(inventoryRef, (snapshot) => {
      const value = snapshot.val();
      if (typeof value === 'number' && value > 0) {
        setTotalInventory(value);
      }
    });

    return () => unsubscribe();
  }, [firebaseStatus]);

  // Every assignment that still holds an armband: Active, or Offline (signal
  // lost but the guest hasn't been marked Returned). Newest first.
  const monitoredAssignments = useMemo(() => {
    const toTime = (value) => {
      const parsed = value ? new Date(value).getTime() : NaN;
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    return assignments
      .filter(isHeldAssignment)
      .sort((a, b) => toTime(b.assignedAt) - toTime(a.assignedAt));
  }, [assignments]);

  const heldAssignmentsByArmband = useMemo(() => {
    return monitoredAssignments.reduce((map, assignment) => {
      const armbandId = String(assignment.armbandID ?? '').trim().toUpperCase();

      if (!armbandId || map.has(armbandId)) {
        return map;
      }

      map.set(armbandId, assignment);
      return map;
    }, new Map());
  }, [monitoredAssignments]);

  const armbandOptions = useMemo(() => {
    return buildArmbandIds().map((armbandID) => {
      const holder = heldAssignmentsByArmband.get(armbandID);
      const guestName = holder
        ? `${holder.fName ?? ''} ${holder.lName ?? ''}`.trim()
        : '';

      return {
        armbandID,
        holder,
        holderStatus: holder ? getAssignmentStatus(holder) : null,
        isHeld: Boolean(holder),
        guestName
      };
    });
  }, [heldAssignmentsByArmband]);

  const selectedArmbandOption = useMemo(() => {
    const normalizedId = form.armbandID.trim().toUpperCase();

    if (!normalizedId) {
      return null;
    }

    return armbandOptions.find((option) => option.armbandID === normalizedId) ?? null;
  }, [armbandOptions, form.armbandID]);

  const availableArmbandOptions = useMemo(
    () => armbandOptions.filter((option) => !option.isHeld),
    [armbandOptions]
  );

  const filteredAssignments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return monitoredAssignments;
    }

    return monitoredAssignments.filter((item) =>
      `${item.fName ?? ''} ${item.lName ?? ''} ${item.armbandID ?? ''}`
        .toLowerCase()
        .includes(term)
    );
  }, [monitoredAssignments, search]);

  // Armbands held by a guest (Active or Offline) are unavailable until the
  // guest is marked Returned.
  const totals = useMemo(() => {
    const active = assignments.filter(
      (item) => getAssignmentStatus(item) === 'Active'
    ).length;
    const offline = assignments.filter(
      (item) => getAssignmentStatus(item) === 'Offline'
    ).length;
    const returned = assignments.filter(
      (item) => getAssignmentStatus(item) === 'Returned'
    ).length;
    const openAlerts = alerts.filter((alert) => alert.status === 'Open').length;
    const criticalAlerts = alerts.filter(
      (alert) => alert.status === 'Open' && alert.alertlevel === 'Critical'
    ).length;
    const available = Math.max(totalInventory - active - offline, 0);

    return {
      active,
      offline,
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
      Armband: alerts.filter((alert) => !isCameraAlert(alert)).length
    };
  }, [alerts]);

  // Alert Logs table: severity and alert-type filters only narrow which rows
  // show up. Ordering is "pinned fresh Criticals first (under 5 minutes old),
  // then strictly newest first". nowMs is a dependency so the pin expires on
  // the clock tick.
  const filteredAlerts = useMemo(() => {
    const byFilter =
      activeAlertTab === 'All'
        ? alerts
        : activeAlertTab === 'Camera'
          ? alerts.filter((alert) => isCameraAlert(alert))
          : activeAlertTab === 'Armband'
            ? alerts.filter((alert) => !isCameraAlert(alert))
            : alerts.filter((alert) => alert.alertlevel === activeAlertTab);

    return [...byFilter].sort(byPinThenNewest(nowMs));
  }, [alerts, activeAlertTab, nowMs]);

  // Dashboard preview: open alerts only, same ordering as the log table.
  const openAlertsPreview = useMemo(() => {
    return alerts
      .filter((alert) => alert.status === 'Open')
      .sort(byPinThenNewest(nowMs));
  }, [alerts, nowMs]);

  // Alerts filtered to the selected period and bucketed for the trend chart.
  // nowMs is a dependency so the chart rolls forward on the clock tick.
  const alertTrend = useMemo(
    () => buildAlertTrend(alerts, nowMs, trendRange),
    [alerts, nowMs, trendRange]
  );
  const trendConfig = TREND_RANGE_CONFIG[trendRange] ?? TREND_RANGE_CONFIG.today;

  // Jumps from a Dashboard preview alert straight to the Alert Logs tab,
  // pre-filtered to that alert's severity.
  const handleViewAlertInLogs = (alertlevel) => {
    setActiveAlertTab(alertlevel);
    setActiveMainTab('alerts');
  };

  const handleAssign = async (event) => {
    event.preventDefault();
    setFormError('');

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const armbandID = form.armbandID.trim().toUpperCase();
    const ageValue = Number(form.age);

    if (
      !firstName ||
      !lastName ||
      !form.age ||
      !form.stayStart ||
      !form.stayEnd ||
      !armbandID
    ) {
      setFormError('Complete all fields before assigning an armband.');
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

    if (!selectedArmbandOption) {
      setFormError('Choose a valid armband from the dropdown.');
      return;
    }

    // Guard against double submits (e.g. double click) while a write is
    // already in flight.
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Validate against a fresh read of /assignments instead of local state,
      // so a stale tab or a second operator can't double-assign an armband or
      // reuse an assignment id.
      const latestSnapshot = await get(ref(db, 'assignments'));
      const latestAssignments = parseAssignments(latestSnapshot.val());

      const currentHolder = latestAssignments.find(
        (item) =>
          isHeldAssignment(item) &&
          String(item.armbandID ?? '').trim().toUpperCase() === armbandID
      );

      if (currentHolder) {
        const holderName = `${currentHolder.fName ?? ''} ${currentHolder.lName ?? ''}`.trim();
        setFormError(
          `${armbandID} is still assigned to ${holderName || 'another guest'} (${getAssignmentStatus(currentHolder)}). Mark that guest as returned first.`
        );
        return;
      }

      const heldCount = latestAssignments.filter(isHeldAssignment).length;
      if (totalInventory - heldCount <= 0) {
        setFormError('No armbands available - process a return before assigning.');
        return;
      }

      const now = new Date();
      const assignmentId = getNextAssignmentId(latestAssignments);
      const newAssignment = {
        assignmentsID: assignmentId,
        age: ageValue,
        assignedAt: now.toISOString(),
        lastSeen: now.toISOString(),
        status: 'Active',
        fName: firstName,
        lName: lastName,
        stayStart: form.stayStart,
        stayEnd: form.stayEnd,
        armbandID
      };
      const newAssignmentRef = ref(db, `assignments/${assignmentId}`);

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
        firstName: '',
        lastName: '',
        age: '',
        stayStart: '',
        stayEnd: '',
        armbandID: ''
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
      <style>{CRITICAL_BLINK_CSS}</style>
      <header className="border-b border-white/60 bg-white/70 backdrop-blur">
        <div className="mx-auto flex flex-wrap items-center justify-between gap-4 px-6 py-4 sm:px-10 lg:px-20">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500">
              Caribbean Waves Safety Operations
            </p>
            <h1 className="font-display text-2xl text-slate-900">
              AquaGuard Monitoring Center
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
                <span
                  className={`flex h-2 w-2 rounded-full ${
                    esp32Status === 'online'
                      ? 'bg-emerald-500'
                      : esp32Status === 'offline'
                        ? 'bg-coral-500'
                        : 'bg-sun-400'
                  }`}
                />
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-ocean-700">
                <span className="flex h-2 w-2 rounded-full bg-ocean-500" />
                {totals.available} armbands available
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
                {tab.id === 'armbands' && (
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
                  Active armbands
                </p>
                <p className="mt-4 font-display text-3xl text-slate-900">
                  {totals.active}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {totals.offline} offline, {totals.available} available of{' '}
                  {totalInventory}
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
                  Armbands returned
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
                    Alert trend
                  </p>
                  <h2 className="mt-2 font-display text-2xl text-slate-900">
                    Incidents by {trendConfig.groupLabel}
                  </h2>
                  <p className="mt-2 text-xs text-slate-500">
                    {alertTrend.rangeText}. Counts every alert received in this
                    period, open or resolved.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="status-chip bg-slate-900/5 text-slate-600">
                    {alertTrend.total} {trendConfig.periodLabel}
                  </div>
                  <div className="relative">
                    <select
                      aria-label="Chart time range"
                      value={trendRange}
                      onChange={(event) => setTrendRange(event.target.value)}
                      className="cursor-pointer appearance-none rounded-full border border-slate-200 bg-white py-1.5 pl-3.5 pr-8 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    >
                      {TREND_RANGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                      className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="mt-6 h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    key={trendRange}
                    data={alertTrend.buckets}
                    margin={{ top: 8, right: 16, bottom: 0, left: -16 }}
                  >
                    <CartesianGrid
                      stroke="#e2e8f0"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      interval={trendConfig.xAxisInterval}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                      allowDecimals={false}
                      domain={[0, (dataMax) => Math.max(dataMax, 3)]}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      labelFormatter={(label, payload) =>
                        payload?.[0]?.payload?.tooltipLabel ?? label
                      }
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        fontSize: 12
                      }}
                    />
                    <Legend
                      iconType="circle"
                      wrapperStyle={{ fontSize: 12 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Minor"
                      stroke={TREND_COLORS.Minor}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Major"
                      stroke={TREND_COLORS.Major}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 5 }}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Critical"
                      stroke={TREND_COLORS.Critical}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {alertTrend.total === 0 && (
                <p className="mt-3 text-center text-xs text-slate-500">
                  No alerts recorded {trendConfig.periodLabel}.
                </p>
              )}
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
                    New Critical alerts stay pinned on top for 5 minutes, then
                    everything sorts newest first. Full history lives in Alert
                    Logs.
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
                    const isBlinking = isBlinkingAlert(alert);
                    const alertIdLabel = formatAlertId(alert.alertID);
                    return (
                      <div
                        key={alert.id}
                        className={`flex flex-wrap items-start justify-between gap-4 rounded-2xl border p-4 ${
                          isCritical
                            ? 'border-coral-300 bg-[#fee2e2] shadow-sm'
                            : 'border-slate-200/60 bg-white/80'
                        } ${isBlinking ? 'critical-blink-row' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`status-chip ${
                              severityStyles[alert.alertlevel]
                            } ${isBlinking ? 'critical-blink-badge' : ''}`}
                          >
                            {isBlinking && (
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
                                {alert.armbandNumber}
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
                          <button
                            type="button"
                            onClick={() => handleViewAlertInLogs(alert.alertlevel)}
                            className={`status-chip cursor-pointer transition hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-400 ${
                              alertStatusStyles[alert.status]
                            }`}
                            title={`View all ${alert.alertlevel} alerts in Alert Logs`}
                          >
                            {alert.status}
                          </button>
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

        {activeMainTab === 'armbands' && (
          <section className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
            <div className="glass-panel p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Assign armband
                  </p>
                  <h2 className="mt-2 font-display text-2xl text-slate-900">
                    Manual guest assignment
                  </h2>
                  <p className="mt-2 text-xs text-slate-500">
                    Add new guest details and set the armband number manually.
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
                <div>
                  <label className="text-xs font-semibold text-slate-500">
                    First name
                  </label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        firstName: event.target.value
                      }))
                    }
                    className="input-field"
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        lastName: event.target.value
                      }))
                    }
                    className="input-field"
                    placeholder="Last name"
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
                    Armband ID
                  </label>
                  <select
                    value={form.armbandID}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        armbandID: event.target.value
                      }))
                    }
                    className="input-field"
                  >
                    <option value="">Select an armband</option>
                    {armbandOptions.map((option) => {
                      const optionLabel = option.isHeld
                        ? `${option.armbandID} - ${option.holderStatus} - ${option.guestName || 'Assigned guest'}`
                        : `${option.armbandID} - Free`;

                      return (
                        <option
                          key={option.armbandID}
                          value={option.armbandID}
                          disabled={option.isHeld}
                        >
                          {optionLabel}
                        </option>
                      );
                    })}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    {availableArmbandOptions.length} armbands are free. An armband
                    assigned to a guest, active or offline, stays disabled until
                    that guest is marked returned.
                  </p>
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
                  disabled={availableArmbandOptions.length === 0 || isSubmitting}
                  className="btn-primary sm:col-span-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? 'Assigning…' : 'Assign Armband'}
                </button>
              </form>
            </div>

            <div className="glass-panel p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    {totals.active} active, {totals.offline} offline
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
                    placeholder="Search name or armband"
                  />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {filteredAssignments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                    No armbands match your search.
                  </div>
                ) : (
                  filteredAssignments.map((assignment) => {
                    const status = getAssignmentStatus(assignment);
                    const isOffline = status === 'Offline';
                    const lastSeenLabel = formatLastSeen(
                      getAssignmentSeenMs(assignment),
                      nowMs
                    );

                    return (
                      <div
                        key={assignment.id}
                        className={`rounded-2xl border p-4 ${
                          isOffline
                            ? 'border-amber-300 border-l-4 border-l-amber-500 bg-amber-50'
                            : 'border-slate-200/60 bg-white/80'
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {assignment.fName} {assignment.lName}
                              <span className="ml-2 text-xs text-slate-500">
                                Age {assignment.age}
                              </span>
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Armband {assignment.armbandID} - Stay{' '}
                              {formatStayRange(
                                assignment.stayStart,
                                assignment.stayEnd
                              )}
                            </p>
                            <p
                              className={`mt-1 flex items-center gap-1.5 text-xs ${
                                isOffline
                                  ? 'font-semibold text-amber-800'
                                  : 'text-slate-500'
                              }`}
                            >
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  isOffline ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                              />
                              {isOffline
                                ? `No signal, last seen ${lastSeenLabel}`
                                : `Last seen ${lastSeenLabel}`}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Assigned at {formatTime(assignment.assignedAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`status-chip ${assignmentStatusStyles[status]}`}
                            >
                              {status}
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
                    );
                  })
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
                  Live armband alerts
                </h2>
                <p className="mt-2 text-xs text-slate-500">
                  Streaming from Firebase, newest first. New Critical alerts
                  stay pinned on top for 5 minutes.
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
              {[...severityTabs, 'Camera', 'Armband'].map((tab) => {
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
                      const isBlinking = isBlinkingAlert(alert);
                      const alertIdLabel = formatAlertId(alert.alertID);
                      return (
                        <tr
                          key={alert.id}
                          className={`border-t border-l-4 ${
                            isCritical
                              ? 'border-coral-300 border-l-coral-500 bg-[#fee2e2]'
                              : 'border-slate-200/60 border-l-transparent'
                          } ${isBlinking ? 'critical-blink-row' : ''}`}
                        >
                          <td className="py-3 pl-1 pr-4 align-top">
                            <span
                              className={`status-chip ${
                                severityStyles[alert.alertlevel]
                              } ${isBlinking ? 'critical-blink-badge' : ''}`}
                            >
                              {isBlinking && (
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
                              {alert.armbandNumber}
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
