import { redirect } from 'next/navigation';

/**
 * OAuth bounce-back route. The backend's `/onboarding/facebook/callback`
 * redirects the browser here with `?fb=connected` (or `?fb=error&reason=…`).
 * We forward the same query string to `/onboarding`, where `ConnectPageStep`'s
 * effect reads it and either opens the page picker or shows an error toast.
 *
 * Kept as a server component so the redirect is instant — no client JS runs.
 */
export default function OnboardingCallback({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (typeof v === 'string') params.set(k, v);
    else if (Array.isArray(v) && v[0]) params.set(k, v[0]);
  }
  const qs = params.toString();
  redirect(`/onboarding${qs ? `?${qs}` : ''}`);
}
