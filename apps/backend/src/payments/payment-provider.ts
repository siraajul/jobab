/**
 * Payment provider interface (spec §2). Phase 1 ships a single stub provider
 * that returns a dev URL; bKash / Nagad / SSLCommerz implementations slot in
 * here without touching the order guardrail or agent.
 */

export interface PaymentLinkRequest {
  orderId: string;
  amount: number;
  currency: string;
  description?: string;
  customer?: { name?: string; phone?: string };
}

export interface PaymentLinkResult {
  provider: string;
  link: string;
  externalRef?: string;
}

export interface PaymentProvider {
  readonly name: string;
  createLink(req: PaymentLinkRequest): Promise<PaymentLinkResult>;
}
