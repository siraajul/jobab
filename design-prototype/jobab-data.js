/* Jobab — sample data (merchant: Rongdhonu Boutique, Dhaka).
   Realistic Bangla / Banglish / English. Attached to window. */
(function () {
  // avatar palette (warm, muted)
  const AV = ['#C8794F', '#5E8A6B', '#9B6A8C', '#4E7A93', '#B0743C', '#7B6FA8', '#A85C5C'];
  const initials = (n) => n.split(' ').slice(0, 2).map((x) => x[0]).join('');
  const avColor = (n) => AV[n.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length];

  // ---- conversation list ----
  const conversations = [
    {
      id: 'nusrat', name: 'Nusrat Jahan', page: 'Rongdhonu Boutique',
      status: 'needs', snippet: 'apa amar order ta vul ashche 😡 ferot dibo',
      when: '2m', unread: 3, reason: 'Complaint · refund',
    },
    {
      id: 'tahmina', name: 'Tahmina Akter', page: 'Rongdhonu Boutique',
      status: 'ai', snippet: 'haa korbo. Dhaka te delivery koto?',
      when: '4m', unread: 1,
    },
    {
      id: 'rumana', name: 'Rumana Haque', page: 'Rongdhonu Boutique',
      status: 'you', snippet: 'You: apa ektu wait korun, dekhe bolchi',
      when: '12m', unread: 0,
    },
    {
      id: 'sadia', name: 'Sadia Islam', page: 'Rongdhonu Boutique',
      status: 'ai', snippet: 'Order ready · 2 items · ৳2,940', orderHint: true,
      when: '31m', unread: 0,
    },
    {
      id: 'farzana', name: 'Farzana Kabir', page: 'Rongdhonu Boutique',
      status: 'paid', snippet: 'Payment confirmed · bKash ✓',
      when: '1h', unread: 0,
    },
    {
      id: 'maliha', name: 'Maliha Rahman', page: 'Rongdhonu Boutique',
      status: 'ai', snippet: 'Assalamu alaikum, kichu jinis dekhte chai',
      when: '1h', unread: 0,
    },
    {
      id: 'shumi', name: 'Shumi Begum', page: 'Rongdhonu Boutique',
      status: 'ai', snippet: 'thik ache apa, dhonnobad 🙏',
      when: '2h', unread: 0,
    },
  ];

  // ---- the open thread (Tahmina, asking about a red saree) ----
  const tahminaThread = [
    { who: 'cust', t: '10:32', text: 'Assalamu alaikum apa 🙂' },
    { who: 'cust', t: '10:32', image: 'customer photo · lal shari', text: 'ei lal shari ta ki ache? amar medium lagbe',
      match: { name: 'Lal Jamdani Shari', conf: 92 } },
    { who: 'ai', t: '10:32', text: 'ওয়ালাইকুম সালাম! 🌸 জি আপা, Lal Jamdani Shari টা stock-এ আছে। দাম ৳১,৬৫০, ডেলিভারি চার্জ আলাদা।' },
    { who: 'ai', t: '10:33', text: 'Medium size available. আপনি কি order টা confirm করতে চান?' },
    { who: 'cust', t: '10:34', text: 'haa korbo. Dhaka te delivery koto?' },
    { who: 'ai', t: '10:34', text: 'Dhaka city-তে ডেলিভারি ৳৮০, ২–৩ দিনে পৌঁছে যাবে। আপনার নাম, phone আর ঠিকানা দিলে order place করে দিচ্ছি।' },
    { who: 'cust', t: '10:35', text: 'Tahmina Akter, 01713-456789' },
    { who: 'ai', t: '10:35', text: 'ধন্যবাদ আপা! 🙏 শুধু delivery ঠিকানা টা পেলেই order টা confirm করে ফেলবো।' },
  ];

  // a calmer thread with NO assembled order yet (for empty order-panel state)
  const malihaThread = [
    { who: 'cust', t: '11:02', text: 'Assalamu alaikum, kichu jinis dekhte chai' },
    { who: 'ai', t: '11:02', text: 'ওয়ালাইকুম সালাম আপা! 🌸 Rongdhonu Boutique-এ স্বাগতম। আপনি কী ধরনের পোশাক খুঁজছেন — শাড়ি, থ্রি-পিস, নাকি কুর্তি?' },
    { who: 'cust', t: '11:03', text: 'three-piece, ektu festive type' },
    { who: 'ai', t: '11:03', text: 'দারুণ! আমাদের নতুন Eid collection-এ সুন্দর কিছু festive three-piece আছে — ৳১,৮৫০ থেকে শুরু। কোন রঙ পছন্দ করবেন? 🎨' },
  ];

  // ---- live order (Tahmina) ----
  const tahminaOrder = {
    status: 'collecting', // collecting | ready | created | paid
    items: [
      { name: 'Lal Jamdani Shari', variant: 'Medium · Red', qty: 1, price: 1650, thumb: 'Lal Jamdani' },
    ],
    delivery: 80,
    customer: { name: 'Tahmina Akter', phone: '01713-456789', address: null },
    payment: null,
  };

  // ready/created order (Sadia) — fuller, with payment link sent
  const sadiaOrder = {
    status: 'created',
    items: [
      { name: 'Karchupi Three-Piece', variant: 'Large · Teal', qty: 1, price: 1850, thumb: 'Karchupi 3pc' },
      { name: 'Cotton Kurti', variant: 'Medium · Mustard', qty: 1, price: 990, thumb: 'Cotton Kurti' },
    ],
    delivery: 100,
    customer: { name: 'Sadia Islam', phone: '01911-223344', address: 'House 14, Road 7, Dhanmondi, Dhaka-1209' },
    payment: { method: 'bKash', state: 'link sent' },
  };

  window.JOBAB = {
    initials, avColor,
    conversations,
    threads: { tahmina: tahminaThread, maliha: malihaThread },
    orders: { tahmina: tahminaOrder, sadia: sadiaOrder },
    shop: 'Rongdhonu Boutique',
  };
})();
