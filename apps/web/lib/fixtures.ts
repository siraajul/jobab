/**
 * Demo data — mirrors /jobab-data.js so the inbox is browsable without a live
 * backend. Swap to `api.*` once the backend has rows.
 */
import type { ConversationDetail, ConversationListItem, Order } from './types';

const NOW = new Date('2026-05-29T10:35:00Z').toISOString();

export const demoConversations: ConversationListItem[] = [
  {
    id: 'nusrat',
    pageId: 'p1',
    externalUserId: 'fb_nusrat',
    customerName: 'Nusrat Jahan',
    customerPhone: null,
    customerAddress: null,
    status: 'needs_human',
    lastCustomerMessageAt: NOW,
    createdAt: NOW,
    messages: [
      {
        id: 'm-nusrat-last',
        content: 'apa amar order ta vul ashche 😡 ferot dibo',
        sender: 'customer',
        createdAt: NOW,
      },
    ],
  },
  {
    id: 'tahmina',
    pageId: 'p1',
    externalUserId: 'fb_tahmina',
    customerName: 'Tahmina Akter',
    customerPhone: '01713-456789',
    customerAddress: null,
    status: 'bot',
    lastCustomerMessageAt: NOW,
    createdAt: NOW,
    messages: [
      {
        id: 'm-tahmina-last',
        content: 'haa korbo. Dhaka te delivery koto?',
        sender: 'customer',
        createdAt: NOW,
      },
    ],
  },
  {
    id: 'rumana',
    pageId: 'p1',
    externalUserId: 'fb_rumana',
    customerName: 'Rumana Haque',
    customerPhone: null,
    customerAddress: null,
    status: 'human',
    lastCustomerMessageAt: NOW,
    createdAt: NOW,
    messages: [
      {
        id: 'm-rumana-last',
        content: 'apa ektu wait korun, dekhe bolchi',
        sender: 'human',
        createdAt: NOW,
      },
    ],
  },
  {
    id: 'sadia',
    pageId: 'p1',
    externalUserId: 'fb_sadia',
    customerName: 'Sadia Islam',
    customerPhone: '01911-223344',
    customerAddress: 'House 14, Road 7, Dhanmondi, Dhaka-1209',
    status: 'bot',
    lastCustomerMessageAt: NOW,
    createdAt: NOW,
    messages: [
      {
        id: 'm-sadia-last',
        content: 'Order ready · 2 items · ৳2,940',
        sender: 'agent',
        createdAt: NOW,
      },
    ],
  },
  {
    id: 'farzana',
    pageId: 'p1',
    externalUserId: 'fb_farzana',
    customerName: 'Farzana Kabir',
    customerPhone: null,
    customerAddress: null,
    status: 'bot',
    lastCustomerMessageAt: NOW,
    createdAt: NOW,
    messages: [
      {
        id: 'm-farzana-last',
        content: 'Payment confirmed · bKash ✓',
        sender: 'agent',
        createdAt: NOW,
      },
    ],
  },
];

const tahminaThread: ConversationDetail = {
  ...demoConversations[1],
  messages: [
    { id: 't1', conversationId: 'tahmina', direction: 'in', sender: 'customer', content: 'Assalamu alaikum apa 🙂', createdAt: NOW },
    { id: 't2', conversationId: 'tahmina', direction: 'in', sender: 'customer', content: 'ei lal shari ta ki ache? amar medium lagbe', createdAt: NOW },
    { id: 't3', conversationId: 'tahmina', direction: 'out', sender: 'agent', content: 'ওয়ালাইকুম সালাম! 🌸 জি আপা, Lal Jamdani Shari টা stock-এ আছে। দাম ৳১,৬৫০, ডেলিভারি চার্জ আলাদা।', createdAt: NOW },
    { id: 't4', conversationId: 'tahmina', direction: 'out', sender: 'agent', content: 'Medium size available. আপনি কি order টা confirm করতে চান?', createdAt: NOW },
    { id: 't5', conversationId: 'tahmina', direction: 'in', sender: 'customer', content: 'haa korbo. Dhaka te delivery koto?', createdAt: NOW },
    { id: 't6', conversationId: 'tahmina', direction: 'out', sender: 'agent', content: 'Dhaka city-তে ডেলিভারি ৳৮০, ২–৩ দিনে পৌঁছে যাবে। আপনার নাম, phone আর ঠিকানা দিলে order place করে দিচ্ছি।', createdAt: NOW },
    { id: 't7', conversationId: 'tahmina', direction: 'in', sender: 'customer', content: 'Tahmina Akter, 01713-456789', createdAt: NOW },
    { id: 't8', conversationId: 'tahmina', direction: 'out', sender: 'agent', content: 'ধন্যবাদ আপা! 🙏 শুধু delivery ঠিকানা টা পেলেই order টা confirm করে ফেলবো।', createdAt: NOW },
  ],
  orders: [],
};

export const demoThreads: Record<string, ConversationDetail> = {
  tahmina: tahminaThread,
};

export const demoOrders: Record<string, Order | null> = {
  tahmina: {
    id: 'o-tahmina',
    conversationId: 'tahmina',
    items: [{ product_id: 'p_lal', variant_id: 'v_med', qty: 1, price: 1650 }],
    customerName: 'Tahmina Akter',
    customerPhone: '01713-456789',
    customerAddress: '',
    total: 1730,
    currency: 'BDT',
    paymentStatus: 'pending',
    paymentLink: null,
    status: 'created',
    createdAt: NOW,
  },
};

export const productCatalog: Record<string, { title: string; variant: string }> = {
  p_lal: { title: 'Lal Jamdani Shari', variant: 'Medium · Red' },
};
