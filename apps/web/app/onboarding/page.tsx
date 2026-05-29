'use client';

import { useEffect, useState } from 'react';
import { OnboardingClient } from './OnboardingClient';
import { api } from '@/lib/api';
import type { OnboardingStatus } from '@/lib/types';

export default function OnboardingPage() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  useEffect(() => {
    api.onboardingStatus().then(setStatus).catch(() => setStatus(null));
  }, []);
  return <OnboardingClient initial={status} />;
}
