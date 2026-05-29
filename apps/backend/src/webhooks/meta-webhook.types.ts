// Subset of Meta Messenger Platform + Page webhooks payload shape.
// https://developers.facebook.com/docs/messenger-platform/webhooks
// https://developers.facebook.com/docs/graph-api/webhooks/reference/page/

export interface MetaAttachment {
  type: 'image' | 'audio' | 'video' | 'file' | string;
  payload: { url?: string; sticker_id?: number };
}

export interface MetaMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: MetaAttachment[];
    is_echo?: boolean;
  };
  postback?: { title?: string; payload: string };
}

/** "feed" change item — comments, post status, etc. We handle comments only. */
export interface MetaFeedChangeValue {
  item: 'comment' | 'post' | 'status' | string;
  /** Verb describes the action; we react to 'add' for new comments. */
  verb: 'add' | 'edit' | 'remove' | string;
  comment_id?: string;
  post_id?: string;
  parent_id?: string;
  from?: { id: string; name?: string };
  message?: string;
  created_time?: number;
}

export interface MetaFeedChange {
  field: 'feed' | string;
  value: MetaFeedChangeValue;
}

export interface MetaEntry {
  id: string; // page id
  time: number;
  messaging?: MetaMessagingEvent[];
  changes?: MetaFeedChange[];
}

export interface MetaWebhookBody {
  object: 'page' | 'instagram' | string;
  entry: MetaEntry[];
}
