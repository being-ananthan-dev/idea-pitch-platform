'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { logViolation, updateViolationCount } from '@/lib/firestore';

interface UseAntiCheatOptions {
  uid: string;
  name: string;
  onViolation: (type: 'tab_switch' | 'fullscreen_exit', totalViolations: number) => void;
  onAutoSubmit: (reason: string) => void;
  maxViolations?: number;
  enabled?: boolean;
}

interface AntiCheatState {
  tabSwitchCount: number;
  fullscreenExitCount: number;
  lastViolationType: 'tab_switch' | 'fullscreen_exit' | null;
  showBanner: boolean;
}

export function useAntiCheat({
  uid,
  name,
  onViolation,
  onAutoSubmit,
  maxViolations = 3,
  enabled = true,
}: UseAntiCheatOptions) {
  const [state, setState] = useState<AntiCheatState>({
    tabSwitchCount: 0,
    fullscreenExitCount: 0,
    lastViolationType: null,
    showBanner: false,
  });

  const tabSwitchRef = useRef(0);
  const fullscreenExitRef = useRef(0);
  const autoSubmittedRef = useRef(false);

  const getTotalViolations = useCallback(() => {
    return tabSwitchRef.current + fullscreenExitRef.current;
  }, []);

  const handleViolation = useCallback(
    async (type: 'tab_switch' | 'fullscreen_exit') => {
      if (!enabled || autoSubmittedRef.current) return;

      if (type === 'tab_switch') tabSwitchRef.current++;
      else fullscreenExitRef.current++;

      const total = getTotalViolations();

      // Log to Firestore (Atomic)
      try {
        await logViolation(uid, name, type);
        await updateViolationCount(uid, type); // This handles atomic increment and penalty
      } catch (e) {
        console.error('Failed to log violation', e);
      }

      setState((prev) => ({
        ...prev,
        tabSwitchCount: tabSwitchRef.current,
        fullscreenExitCount: fullscreenExitRef.current,
        lastViolationType: type,
        showBanner: true,
      }));

      onViolation(type, total);

      if (total >= maxViolations) {
        autoSubmittedRef.current = true;
        const reason = `Auto-submitted after ${maxViolations} violations (last: ${type})`;
        try {
          await logViolation(uid, name, 'auto_submit', reason);
        } catch (e) {
          console.error('Failed to log auto_submit', e);
        }
        onAutoSubmit(reason);
      }
    },
    [enabled, uid, name, onViolation, onAutoSubmit, maxViolations, getTotalViolations]
  );

  const dismissBanner = useCallback(() => {
    setState((prev) => ({ ...prev, showBanner: false }));
  }, []);

  // Tab visibility listener
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleViolation('tab_switch');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, handleViolation]);

  // Fullscreen exit listener
  useEffect(() => {
    if (!enabled) return;

    let hasBeenFullscreen = !!document.fullscreenElement;

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      
      if (hasBeenFullscreen && !isCurrentlyFullscreen) {
        handleViolation('fullscreen_exit');
      }
      
      if (isCurrentlyFullscreen) {
        hasBeenFullscreen = true;
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [enabled, handleViolation]);

  // Initialise counts from existing submission on mount
  const initCounts = useCallback(
    (tabs: number, fullscreens: number) => {
      tabSwitchRef.current = tabs;
      fullscreenExitRef.current = fullscreens;
      setState((prev) => ({
        ...prev,
        tabSwitchCount: tabs,
        fullscreenExitCount: fullscreens,
      }));
    },
    []
  );

  return {
    tabSwitchCount: state.tabSwitchCount,
    fullscreenExitCount: state.fullscreenExitCount,
    lastViolationType: state.lastViolationType,
    showBanner: state.showBanner,
    dismissBanner,
    initCounts,
    totalViolations: state.tabSwitchCount + state.fullscreenExitCount,
  };
}
