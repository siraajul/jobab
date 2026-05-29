'use client';

import { useEffect, useState } from 'react';
import { AnalyticsClient } from './AnalyticsClient';
import { api } from '@/lib/api';
import type { AnalyticsSummary } from '@/lib/types';

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  useEffect(() => {
    api.analytics(7).then(setSummary).catch(() => setSummary(null));
  }, []);
  return <AnalyticsClient initial={summary} />;
}
