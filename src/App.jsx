import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import porticosData from './data/porticosSantiago.json';
import {
  DEFAULT_CONFIG,
  getCurrentMonthSpent,
  loadTrips,
  loadUserConfig,
  saveTrips,
  saveUserConfig,
} from './utils/storage';
import { detectCurrentHorario } from './utils/format';
import { getSavedAlertLeads, trackEvent } from './utils/analytics';
import PhoneShell from './components/PhoneShell';
import OnboardingModal from './components/OnboardingModal';
import SimulationModal from './components/SimulationModal';
import HomeScreen from './components/HomeScreen';
import ActiveTripScreen from './components/ActiveTripScreen';
import PorticoNotification from './components/PorticoNotification';
import TripSummaryScreen from './components/TripSummaryScreen';
import HistoryScreen from './components/HistoryScreen';

const AUTO_GPS_ROUTE = {
  id: 'auto-gps-santiago',
  nombre: 'Seguimiento automático · Red Santiago',
  nombreCorto: 'Red Santiago (GPS)',
  descripcion: 'Vespucio Norte · Costanera Norte · Autopista Central · Vespucio Sur · Ruta 68',
  porticos: porticosData.rutas.flatMap((r) => r.porticos),
};

export default function App() {
  const [config, setConfig] = useState(() => loadUserConfig());
  const [trips, setTrips] = useState(() => loadTrips());
  const [screen, setScreen] = useState('home');
  const [showSettingsModal, setShowSettingsModal] = useState(
    () => !loadUserConfig().onboardingCompleted
  );
  const [showSimulationModal, setShowSimulationModal] = useState(false);

  const [selectedRouteId, setSelectedRouteId] = useState(
    porticosData.rutas[0].id
  );
  const [selectedHorario, setSelectedHorario] = useState('punta');
  const [activeSession, setActiveSession] = useState(null);

  const [activeNotification, setActiveNotification] = useState(null);
  const [summaryTrip, setSummaryTrip] = useState(null);
  const [summaryFromHistory, setSummaryFromHistory] = useState(false);
  const [hasSubscribedAlerts, setHasSubscribedAlerts] = useState(
    () => getSavedAlertLeads().length > 0
  );

  const notifTimerRef = useRef(null);

  useEffect(() => {
    trackEvent('app_opened', {
      profile: config.profile,
      monthlyBudget: config.monthlyBudget,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const monthlySpent = useMemo(() => getCurrentMonthSpent(trips), [trips]);

  const selectedRoute = useMemo(
    () =>
      porticosData.rutas.find((r) => r.id === selectedRouteId) ||
      porticosData.rutas[0],
    [selectedRouteId]
  );

  const handleSaveConfig = (nextConfig) => {
    const isInitialOnboarding = !config.onboardingCompleted;
    setConfig(nextConfig);
    saveUserConfig(nextConfig);
    setShowSettingsModal(false);
    trackEvent(isInitialOnboarding ? 'onboarding_completed' : 'budget_updated', {
      profile: nextConfig.profile,
      monthlyBudget: nextConfig.monthlyBudget,
    });
  };

  const handleNotificationChange = useCallback((payload) => {
    if (notifTimerRef.current) {
      clearTimeout(notifTimerRef.current);
      notifTimerRef.current = null;
    }
    setActiveNotification(payload);
    if (payload) {
      notifTimerRef.current = setTimeout(() => {
        setActiveNotification(null);
      }, 4600);
    }
  }, []);

  const handleStartAutoGps = () => {
    handleNotificationChange(null);
    const detectedHorario = detectCurrentHorario(new Date());
    setActiveSession({
      route: AUTO_GPS_ROUTE,
      horario: detectedHorario,
      mode: 'gps',
    });
    trackEvent('trip_started', {
      profile: config.profile,
      monthlyBudget: config.monthlyBudget,
      mode: 'gps',
      routeId: AUTO_GPS_ROUTE.id,
      routeName: AUTO_GPS_ROUTE.nombre,
      horario: detectedHorario,
    });
    setScreen('active');
  };

  const handleStartSimulation = (customRoute) => {
    const routeToRun = customRoute || selectedRoute;
    handleNotificationChange(null);
    setShowSimulationModal(false);
    setActiveSession({
      route: routeToRun,
      horario: selectedHorario,
      mode: 'simulation',
    });
    trackEvent('trip_started', {
      profile: config.profile,
      monthlyBudget: config.monthlyBudget,
      mode: 'simulation',
      routeId: routeToRun.id,
      routeName: routeToRun.nombre,
      horario: selectedHorario,
      porticosCount: routeToRun.porticos.length,
    });
    setScreen('active');
  };

  const handleFinishTrip = useCallback(
    (completedTrip) => {
      handleNotificationChange(null);
      setTrips((prev) => {
        const nextTrips = [completedTrip, ...prev];
        saveTrips(nextTrips);
        return nextTrips;
      });
      setSummaryTrip(completedTrip);
      setSummaryFromHistory(false);
      setActiveSession(null);
      setScreen('summary');

      const updatedMonthlySpent =
        monthlySpent + (Number(completedTrip.totalCost) || 0);
      const safeBudget = Math.max(1, Number(config.monthlyBudget) || 60000);
      const budgetPercentage = Math.round(
        (updatedMonthlySpent / safeBudget) * 100
      );

      trackEvent('trip_completed', {
        tripId: completedTrip.id,
        profile: config.profile,
        monthlyBudget: config.monthlyBudget,
        budgetPercentage,
        mode: completedTrip.mode,
        routeId: completedTrip.routeId,
        routeName: completedTrip.routeName,
        horario: completedTrip.horario,
        totalCost: completedTrip.totalCost,
        porticosCount: completedTrip.porticos.length,
        totalDistanceKm: completedTrip.totalDistanceKm,
        durationMin: completedTrip.durationMin,
      });
    },
    [config.monthlyBudget, config.profile, handleNotificationChange, monthlySpent]
  );

  const handleCancelTrip = () => {
    handleNotificationChange(null);
    trackEvent('trip_cancelled', {
      routeId: activeSession?.route?.id || selectedRoute.id,
    });
    setActiveSession(null);
    setScreen('home');
  };

  const handleOpenHistory = () => {
    handleNotificationChange(null);
    trackEvent('history_viewed', { tripsCount: trips.length });
    setScreen('history');
  };

  const handleSelectHistoryTrip = (trip) => {
    setSummaryTrip(trip);
    setSummaryFromHistory(true);
    setScreen('summary');
  };

  const handleToggleSound = () => {
    const next = { ...config, soundEnabled: !config.soundEnabled };
    setConfig(next);
    saveUserConfig(next);
  };

  const handleResetDemo = () => {
    localStorage.removeItem('tag_control_user_config_v1');
    localStorage.removeItem('tag_control_trips_v1');
    localStorage.removeItem('tag_control_analytics_events');
    localStorage.removeItem('tag_control_alert_leads');
    localStorage.removeItem('tag_control_gps_debug_log');
    const freshTrips = loadTrips();
    setConfig(DEFAULT_CONFIG);
    setTrips(freshTrips);
    setHasSubscribedAlerts(false);
    setScreen('home');
    setShowSettingsModal(true);
  };

  const overlay = (
    <>
      {screen === 'active' && activeNotification && (
        <PorticoNotification
          notification={activeNotification}
          onDismiss={() => handleNotificationChange(null)}
        />
      )}

      {showSettingsModal && (
        <OnboardingModal
          config={config}
          isInitial={!config.onboardingCompleted}
          onSave={handleSaveConfig}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {showSimulationModal && (
        <SimulationModal
          selectedRouteId={selectedRouteId}
          selectedHorario={selectedHorario}
          onSelectRoute={setSelectedRouteId}
          onSelectHorario={setSelectedHorario}
          onStartSimulation={handleStartSimulation}
          onClose={() => setShowSimulationModal(false)}
        />
      )}
    </>
  );

  return (
    <PhoneShell overlay={overlay}>
      {screen === 'home' && (
        <HomeScreen
          config={config}
          monthlySpent={monthlySpent}
          tripsCount={trips.length}
          onStartAutoGps={handleStartAutoGps}
          onOpenSimulationModal={() => setShowSimulationModal(true)}
          onOpenSettings={() => setShowSettingsModal(true)}
          onOpenHistory={handleOpenHistory}
        />
      )}

      {screen === 'active' && activeSession && (
        <ActiveTripScreen
          route={activeSession.route}
          horario={activeSession.horario}
          mode={activeSession.mode}
          monthlySpentBeforeTrip={monthlySpent}
          monthlyBudget={config.monthlyBudget}
          soundEnabled={config.soundEnabled}
          onToggleSound={handleToggleSound}
          onNotificationChange={handleNotificationChange}
          onFinishTrip={handleFinishTrip}
          onCancelTrip={handleCancelTrip}
        />
      )}

      {screen === 'summary' && summaryTrip && (
        <TripSummaryScreen
          trip={summaryTrip}
          monthlySpentAfter={monthlySpent}
          monthlyBudget={config.monthlyBudget}
          profile={config.profile}
          isFromHistory={summaryFromHistory}
          hasSubscribedAlerts={hasSubscribedAlerts}
          onDone={() => setScreen(summaryFromHistory ? 'history' : 'home')}
          onViewHistory={handleOpenHistory}
          onAlertSaved={() => setHasSubscribedAlerts(true)}
        />
      )}

      {screen === 'history' && (
        <HistoryScreen
          trips={trips}
          monthlySpent={monthlySpent}
          config={config}
          onBack={() => setScreen('home')}
          onSelectTrip={handleSelectHistoryTrip}
          onAlertSaved={() => setHasSubscribedAlerts(true)}
          onResetDemo={handleResetDemo}
        />
      )}
    </PhoneShell>
  );
}
