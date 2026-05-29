import { PROBLEM_HANDOFF_CATEGORIES } from '@jobab/shared';
import type { HandoffCategory } from './types';

/** Short, merchant-facing labels for each handoff category. */
export const HANDOFF_LABELS: Record<HandoffCategory, string> = {
  complaint: 'Complaint',
  refund: 'Refund',
  payment_dispute: 'Payment dispute',
  low_confidence: 'AI unsure',
  asked_for_human: 'Asked for human',
  other: 'Needs review',
};

const PROBLEMS = new Set<string>(PROBLEM_HANDOFF_CATEGORIES);

/** complaint / refund / payment_dispute — the "customer reported a problem"
 *  categories that populate the Complaints section. */
export function isProblemCategory(category: string | null | undefined): boolean {
  return !!category && PROBLEMS.has(category);
}

export function handoffLabel(category: string | null | undefined): string {
  return (category && HANDOFF_LABELS[category as HandoffCategory]) || 'Needs review';
}
