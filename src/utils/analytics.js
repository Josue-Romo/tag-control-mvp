const REMOTE_TRACKING_ENABLED = false;

const EVENTS_KEY = 'tag_control_analytics_events';
const LEADS_KEY = 'tag_control_alert_leads';
const SESSION_KEY = 'tag_control_session_id';
const LIVE_MODE_KEY = 'tag_control_remote_tracking_live';
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mqpqykke';
const CRITICAL_REMOTE_EVENTS = new Set(['trip_completed', 'alert_subscribed']);

let fallbackSessionId = null;

/**
 * Checks whether remote Formspree telemetry is active.
 * Defaults to REMOTE_TRACKING_ENABLED (false for internal review) and can be
 * dynamically enabled for the current tab via ?live=1 (persisted in sessionStorage).
 */
export function isRemoteTrackingEnabled() {
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const liveParam = params.get('live');
      if (liveParam === '1') {
        window.sessionStorage.setItem(LIVE_MODE_KEY, '1');
        return true;
      }
      if (liveParam === '0') {
        window.sessionStorage.removeItem(LIVE_MODE_KEY);
        return false;
      }
      if (window.sessionStorage.getItem(LIVE_MODE_KEY) === '1') {
        return true;
      }
    } catch {
      // Ignore URL or sessionStorage access errors
    }
  }

  return REMOTE_TRACKING_ENABLED;
}

/**
 * Returns a persistent sessionId for the current browser tab/session
 * so Formspree rows from the same driver flow can be grouped together.
 */
export function getSessionId() {
  if (typeof window !== 'undefined') {
    try {
      const existing = window.sessionStorage.getItem(SESSION_KEY);
      if (existing) return existing;

      const generated = `sess_${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      window.sessionStorage.setItem(SESSION_KEY, generated);
      return generated;
    } catch {
      // Fall back to in-memory session id if sessionStorage is unavailable
    }
  }

  if (!fallbackSessionId) {
    fallbackSessionId = `sess_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  }
  return fallbackSessionId;
}

/**
 * Ensures all payload fields are clean top-level primitives for Formspree columns.
 */
function flattenPayload(payload = {}) {
  const flat = {};
  if (!payload || typeof payload !== 'object') return flat;

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value === null || typeof value !== 'object') {
      flat[key] = value;
    } else {
      try {
        flat[key] = JSON.stringify(value);
      } catch {
        flat[key] = String(value);
      }
    }
  });

  return flat;
}

/**
 * Sends telemetry silently to Formspree without ever throwing or blocking UX.
 */
async function sendToFormspree(body) {
  if (typeof fetch !== 'function') return;

  try {
    await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    // Silent fail on poor highway signal or offline mode
  }
}

/**
 * Tracks a product event:
 * 1. Always persists a local copy in localStorage (for offline P2 diagnostics/export).
 * 2. Sends to Formspree ONLY when remote tracking is enabled (REMOTE_TRACKING_ENABLED
 *    or ?live=1 in URL/sessionStorage) AND the event is critical for P2 validation
 *    ('trip_completed' or 'alert_subscribed').
 */
export function trackEvent(eventName, payload = {}) {
  const timestamp = new Date().toISOString();
  const sessionId = getSessionId();
  const flatPayload = flattenPayload(payload);

  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    event: eventName,
    eventName,
    timestamp,
    sessionId,
    payload: flatPayload,
  };

  try {
    const existing = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
    const updated = [...existing.slice(-199), entry];
    localStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors in private browsing
  }

  const formspreePayload = {
    eventName,
    timestamp,
    sessionId,
    ...flatPayload,
  };

  const remoteEnabled = isRemoteTrackingEnabled();
  const shouldSendRemote = remoteEnabled && CRITICAL_REMOTE_EVENTS.has(eventName);

  if (shouldSendRemote) {
    void sendToFormspree(formspreePayload);
    if (import.meta.env.DEV) {
      console.info('[Analytics Remoto -> Formspree]', formspreePayload);
    }
  } else {
    console.info('[Analytics Local]', formspreePayload);
  }

  // Hook ready for external analytics SDKs if added later
  if (typeof window !== 'undefined') {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, flatPayload);
    }
    if (window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(eventName, flatPayload);
    }
  }

  return entry;
}

export function getTrackedEvents() {
  try {
    return JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveAlertLead({ contact, patente, profile, budget, monthlySpent, source }) {
  const lead = {
    id: `lead-${Date.now()}`,
    contact: contact.trim(),
    patente: patente.trim().toUpperCase(),
    profile,
    budget,
    monthlySpent,
    source,
    createdAt: new Date().toISOString(),
  };

  try {
    const existing = JSON.parse(localStorage.getItem(LEADS_KEY) || '[]');
    localStorage.setItem(LEADS_KEY, JSON.stringify([lead, ...existing]));
  } catch {
    // Ignore storage errors
  }

  trackEvent('alert_subscribed', {
    contact: lead.contact,
    patente: lead.patente || '',
    contactType: lead.contact.includes('@') ? 'email' : 'whatsapp',
    profile,
    monthlyBudget: budget,
    monthlySpent,
    source,
  });

  return lead;
}

export function getSavedAlertLeads() {
  try {
    return JSON.parse(localStorage.getItem(LEADS_KEY) || '[]');
  } catch {
    return [];
  }
}
