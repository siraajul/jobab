/**
 * Re-export of shared types from @jobab/shared so legacy `@/lib/types`
 * imports keep working without touching every component.
 *
 * NEW code should import from `@jobab/shared` directly.
 */
export type {
  ConversationStatus,
  HandoffCategory,
  MessageSender,
  MessageDirection,
  OrderStatus,
  PaymentStatus,
  Platform,
  PageStatus,
  CatalogSource,
  OrgStatus,
  Conversation,
  ConversationListItem,
  ConversationDetail,
  ConversationActivityItem,
  AgentRunToolCall,
  Tag,
  TagColor,
  ConversationTag,
  Note,
  Message,
  MessageAttachments,
  MatchCandidate,
  Order,
  OrderItem,
  OrderListItem,
  Product,
  ProductVariant,
  AnalyticsSummary,
  OnboardingStatus,
  SettingsPayload,
} from '@jobab/shared';
