'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getSubmission, getParticipant } from '@/lib/firestore';

type AllowedStep =
  | 'login'
  | 'home'
  | 'details'
  | 'guidelines'
  | 'competition'
  | 'thankyou';

interface UseFlowGuardOptions {
  requiredStep: AllowedStep;
  requirePhone?: boolean;
}

/**
 * Enforces the linear flow:
 * login → home → details → guidelines → competition → thankyou
 * Redirects user to the correct page if they're out of sequence.
 */
export function useFlowGuard({ requiredStep, requirePhone = false }: UseFlowGuardOptions) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const checkedRef = useRef(false);
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (loading || checkedRef.current) return;
    checkedRef.current = true;

    if (!user) {
      if (requiredStep !== 'login') router.replace('/login');
      return;
    }

    // User is logged in
    if (requiredStep === 'login') {
      router.replace('/home');
      return;
    }

    // Fetch participant + submission in PARALLEL
    let [participant, submission] = await Promise.all([
      getParticipant(user.uid),
      getSubmission(user.uid),
    ]);

    // Eventual consistency retry: If we just signed up, the doc might be 200ms away
    if (!participant && requiredStep !== 'login') {
      await new Promise(r => setTimeout(r, 800));
      participant = await getParticipant(user.uid);
    }

    setSubmissionStatus(submission?.status || null);

    const hasPhone = !!(participant?.phone);

    if (!hasPhone && requiredStep !== 'home' && requiredStep !== 'details') {
      router.replace('/details');
      return;
    }

    if (submission?.status === 'submitted' || submission?.status === 'locked') {
      if (requiredStep !== 'thankyou' && requiredStep !== 'home') {
        router.replace('/thankyou');
        return;
      }
      return;
    }

    if (submission?.status === 'in_progress') {
      if (requiredStep !== 'competition') {
        router.replace('/competition');
        return;
      }
      return;
    }

    // No submission yet — must follow guidelines → competition
    if (requiredStep === 'competition') {
      router.replace('/guidelines');
    }
  }, [user, loading, router, requiredStep]);

  useEffect(() => {
    check();
  }, [check]);

  // Disable browser back button
  useEffect(() => {
    const preventBack = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', preventBack);
    return () => window.removeEventListener('popstate', preventBack);
  }, []);

  return { user, loading, submissionStatus };
}
