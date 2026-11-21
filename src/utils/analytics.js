const EVENTS_KEY = 'tag_control_analytics_events';
const LEADS_KEY = 'tag_control_alert_leads';

/**
 * Analytics tracker ready to connect to GA4 / PostHog / Mixpanel.
 * Stores events locally for P2 field test validation and diagnostics.
 */
export function trackEvent(eventName, payload = {}) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    event: eventName,
    timestamp: new Date().toISOString(),
    payload,
  };

  try {
    const existing = JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
    const updated = [...existing.slice(-199), entry];
    localStorage.setItem(EVENTS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors in private browsing
  }

  // Hook ready for external analytics SDKs
  if (typeof window !== 'undefined') {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, payload);
    }
    if (window.posthog && typeof window.posthog.capture === 'function') {
      window.posthog.capture(eventName, payload);
    }
  }

  if (import.meta.env.DEV) {
    console.info('[TAG Control Analytics]', eventName, payload);
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

  trackEvent('weekly_alert_signup', {
    source,
    hasPatente: Boolean(lead.patente),
    contactType: lead.contact.includes('@') ? 'email' : 'whatsapp',
    profile,
    budget,
    monthlySpent,
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
