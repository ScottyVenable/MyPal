// Custom React hooks for MyPal Mobile

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import BackendService from '../services/BackendService';

// Type-safe dispatch hook
export const useAppDispatch = () => useDispatch<AppDispatch>();

// Type-safe selector hook
export const useAppSelector = useSelector.withTypes<RootState>();

// Hook to check backend health
export function useBackendHealth() {
  const [isHealthy, setIsHealthy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    const checkHealth = async () => {
      const healthy = await BackendService.checkHealth();
      if (mounted) {
        setIsHealthy(healthy);
        setChecking(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { isHealthy, checking };
}

// Hook to manage profile state
export function useCurrentProfile() {
  const currentProfile = useAppSelector((state) => state.profile.currentProfile);
  return currentProfile;
}

// Hook to manage stats refreshing
export function useStatsRefresh(autoRefresh = false, interval = 5000) {
  const dispatch = useAppDispatch();
  const stats = useAppSelector((state) => state.stats.stats);

  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      // Auto-refresh stats
      dispatch({ type: 'stats/fetchStats' });
    }, interval);

    return () => clearInterval(timer);
  }, [autoRefresh, interval, dispatch]);

  return stats;
}
