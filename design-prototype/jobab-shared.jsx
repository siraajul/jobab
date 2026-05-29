/* Jobab — shared components. Reads tweaks from JobabCtx. Exports to window. */
const JobabCtx = React.createContext({ theme: 'light', accent: '#1F6E47', bubbleStyle: 'tinted', pillStyle: 'soft', orderPanel: 'stacked' });
window.JobabCtx = JobabCtx;
const useJobab = () => React.useContext(JobabCtx);
const { initials, avColor } = window.JOBAB;

/* ---- Avatar ---- */
function Avatar({ name, size = 44, style }) {
  return (
    <div className="av" style={{ width: size, height: size, fontSize: size * 0.34, background: avColor(name), ...style }}>
      {initials(name)}
    </div>
  );
}

/* ---- striped placeholder (images / product shots) ---- */
function Placeholder({ label, w, h, style }) {
  return (
    <div className="ph" style={{ width: w, height: h, ...style }}>
      {label && <span className="ph-lbl">{label}</span>}
    </div>
  );
}

/* ---- Status pill ---- */
const STATUS = {
  ai:    { tone: 't-ai',    label: 'AI handling',    live: true },
  needs: { tone: 't-needs', label: 'Needs you' },
  you:   { tone: 't-you',   label: "You're handling" },
  paid:  { tone: 't-paid',  label: 'Paid' },
};
function StatusPill({ status, live }) {
  const { pillStyle } = useJobab();
  const s = STATUS[status] || STATUS.ai;
  const showLive = (live ?? s.live) && status === 'ai';
  return (
    <span className={`pill pill-${pillStyle} ${s.tone}${showLive ? ' pulse' : ''}`}>
      <span className="dot" />{s.label}
    </span>
  );
}

/* ---- Take over / hand back toggle ---- */
function TakeoverToggle({ mode, onChange }) {
  // mode: 'ai' (AI handling) | 'you' (you're handling)
  return (
    <div className="takeover" role="tablist">
      <button className={mode === 'ai' ? 'on on-ai' : ''} onClick={() => onChange('ai')}>
        <span className="row" style={{ gap: 6 }}><Icon.spark size={14} /> AI</span>
      </button>
      <button className={mode === 'you' ? 'on on-you' : ''} onClick={() => onChange('you')}>
        <span className="row" style={{ gap: 6 }}><Icon.hand size={14} /> You</span>
      </button>
    </div>
  );
}

/* ---- Message bubble ---- */
function Bubble({ m, animate }) {
  const cls = m.who === 'cust' ? 'b-cust' : m.who === 'ai' ? 'b-ai' : 'b-you';
  const rowCls = m.who === 'cust' ? 'row-cust' : m.who === 'ai' ? 'row-ai' : 'row-you';
  return (
    <div className={`msg ${rowCls}${animate ? ' msg-in' : ''}`}>
      {m.who === 'cust' && <Avatar name={m.custName || 'Customer'} size={30} />}
      <div className={`bubble ${cls}`}>
        {m.who === 'ai' && <span className="ai-tag"><Icon.spark size={13} /> AI agent</span>}
        {m.who === 'you' && <span className="you-tag"><Icon.user size={13} /> You</span>}
        {m.image && (
          <div style={{ marginBottom: m.text ? 8 : 0 }}>
            <Placeholder label={m.image} w={168} h={206} />
            {m.match && (
              <div className="row" style={{ gap: 5, marginTop: 7, flexWrap: 'wrap', fontSize: 12, color: 'var(--accent-ink)', fontWeight: 600 }}>
                <span className="row" style={{ gap: 4, whiteSpace: 'nowrap' }}><Icon.spark size={13} /> Matched</span>
                <span style={{ whiteSpace: 'nowrap' }}>{m.match.name}</span>
                <span className="num" style={{ color: 'var(--ink-3)', fontWeight: 600, whiteSpace: 'nowrap' }}>{m.match.conf}%</span>
              </div>
            )}
          </div>
        )}
        {m.text && <span>{m.text}</span>}
        <span className="time num">{m.t}</span>
      </div>
    </div>
  );
}

/* ---- order status stepper ---- */
const ORDER_STEPS = ['collecting', 'ready', 'created', 'paid'];
const STEP_LABEL = { collecting: 'Collecting', ready: 'Ready', created: 'Created', paid: 'Paid' };
function OrderStepper({ status }) {
  const idx = ORDER_STEPS.indexOf(status);
  return (
    <div className="stepper">
      {ORDER_STEPS.map((s, i) => (
        <React.Fragment key={s}>
          {i > 0 && <span className={`bar${i <= idx ? ' done' : ''}`} />}
          <span className={`step${i < idx ? ' done' : ''}${i === idx ? ' cur' : ''}`}>
            <span className="node" />{STEP_LABEL[s]}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ---- payment chip ---- */
const PAY_COLOR = { bKash: '#E2136E', Nagad: '#EE6123', SSLCommerz: '#1B7A43' };
function PayChip({ method, state }) {
  return (
    <span className="pay">
      <span className="brandmark" style={{ background: PAY_COLOR[method] || 'var(--ink-3)' }} />
      {method}<span className="faint" style={{ fontWeight: 500 }}>· {state}</span>
    </span>
  );
}

const taka = (n) => '৳' + n.toLocaleString('en-US');

/* ---- Order panel (desktop column + mobile sheet body) ---- */
function OrderPanel({ order, compactHeader }) {
  const { orderPanel } = useJobab();
  const compact = orderPanel === 'compact';
  const total = order.items.reduce((a, it) => a + it.price * it.qty, 0) + (order.delivery || 0);
  const c = order.customer;
  const fields = [
    { key: 'name', lbl: 'Name', val: c.name, ic: <Icon.user size={16} /> },
    { key: 'phone', lbl: 'Phone', val: c.phone, ic: <Icon.phone size={16} /> },
    { key: 'address', lbl: 'Delivery address', val: c.address, ic: <Icon.pin size={16} /> },
  ];
  const missing = fields.filter((f) => !f.val).length;

  return (
    <div className="col" style={{ gap: compact ? 12 : 16 }}>
      {!compactHeader && (
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="display" style={{ fontSize: 17, fontWeight: 700 }}>Live order</div>
          {missing > 0
            ? <span className="row" style={{ gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--amber)' }}><Icon.alert size={15} /> {missing} field{missing > 1 ? 's' : ''} missing</span>
            : <span className="row" style={{ gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--paid)' }}><Icon.checkCircle size={15} /> Ready to confirm</span>}
        </div>
      )}

      <OrderStepper status={order.status} />

      {/* line items */}
      <div className="col">
        {order.items.map((it, i) => (
          <div className="order-line" key={i} style={i === 0 ? { borderTop: '1px solid var(--border)' } : null}>
            <Placeholder label="" w={48} h={56} style={{ borderRadius: 9 }} />
            <div className="col" style={{ flex: 1, gap: 2, justifyContent: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>{it.name}</div>
              <div className="muted" style={{ fontSize: 12.5 }}>{it.variant}</div>
            </div>
            <div className="col" style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
              <div className="num" style={{ fontWeight: 600, fontSize: 14 }}>{taka(it.price)}</div>
              <div className="faint num" style={{ fontSize: 12 }}>×{it.qty}</div>
            </div>
          </div>
        ))}
      </div>

      {/* totals */}
      <div className="col" style={{ gap: 6, fontSize: 13.5 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="muted">Delivery</span><span className="num">{taka(order.delivery || 0)}</span>
        </div>
        <div className="row" style={{ justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
          <span>Total</span><span className="num">{taka(total)}</span>
        </div>
      </div>

      {/* customer fields */}
      <div className="col" style={{ gap: 8 }}>
        {fields.map((f) => (
          <div className={`field${f.val ? '' : ' missing'}`} key={f.key}>
            <span className="ic">{f.ic}</span>
            <div className="col" style={{ gap: 1, flex: 1 }}>
              <span className="lbl">{f.lbl}</span>
              <span style={{ fontSize: 14 }}>{f.val || 'Waiting for customer…'}</span>
            </div>
            {!f.val && <Icon.alert size={16} />}
          </div>
        ))}
      </div>

      {/* payment */}
      {order.payment
        ? <PayChip method={order.payment.method} state={order.payment.state} />
        : <div className="faint row" style={{ gap: 7, fontSize: 12.5 }}><Icon.truck size={15} /> Payment link sent once address is confirmed</div>}

      {/* action */}
      <button className={`btn ${missing ? 'btn-ghost' : 'btn-primary'}`} style={{ width: '100%' }} disabled={missing > 0}>
        {missing > 0 ? `Waiting on ${missing} field${missing > 1 ? 's' : ''}` : 'Confirm & send payment link'}
      </button>
    </div>
  );
}

Object.assign(window, { Avatar, Placeholder, StatusPill, TakeoverToggle, Bubble, OrderStepper, OrderPanel, PayChip, taka, useJobab });
