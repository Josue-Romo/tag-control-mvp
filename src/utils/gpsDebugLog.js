export const GPS_DEBUG_LOG_KEY = 'tag_control_gps_debug_log';
const MAX_GPS_LOG_ENTRIES = 2000;

export function loadGpsDebugLog() {
  try {
    const raw = localStorage.getItem(GPS_DEBUG_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGpsDebugLog(entries) {
  try {
    const trimmed =
      entries.length > MAX_GPS_LOG_ENTRIES
        ? entries.slice(-MAX_GPS_LOG_ENTRIES)
        : entries;
    localStorage.setItem(GPS_DEBUG_LOG_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearGpsDebugLog() {
  try {
    localStorage.removeItem(GPS_DEBUG_LOG_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function downloadGpsDebugLog(entriesOverride = null) {
  const entries = entriesOverride || loadGpsDebugLog();
  const payload = {
    exportedAt: new Date().toISOString(),
    app: 'TAG Control MVP',
    totalReadings: entries.length,
    triggeredCount: entries.filter((e) => e.triggered).length,
    readings: entries,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.href = url;
  a.download = `tag-control-gps-log-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
