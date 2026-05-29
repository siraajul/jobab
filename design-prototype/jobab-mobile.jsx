/* Jobab — Mobile conversation detail (full-screen thread + pull-up order sheet). */
function MobileConversation() {
  const J = window.JOBAB;
  const conv = J.conversations.find((c) => c.id === 'tahmina');
  const thread = J.threads.tahmina;
  const order = J.orders.tahmina;
  const [mode, setMode] = React.useState('ai');
  const [open, setOpen] = React.useState(false);
  const threadRef = React.useRef(null);

  const effStatus = mode === 'you' ? 'you' : 'ai';
  const total = order.items.reduce((a, it) => a + it.price * it.qty, 0) + (order.delivery || 0);
  const itemCount = order.items.reduce((a, it) => a + it.qty, 0);
  const missing = [order.customer.name, order.customer.phone, order.customer.address].filter((v) => !v).length;

  React.useEffect(() => { if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; }, []);

  return (
    <div className="col" style={{ height: '100%', position: 'relative', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* header (clears the dynamic island) */}
      <div className="col" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', paddingTop: 54 }}>
        <div className="row" style={{ padding: '8px 14px 12px', gap: 11 }}>
          <button className="iconbtn" style={{ width: 34, height: 34, marginLeft: -6 }}><Icon.chevL size={22} /></button>
          <Avatar name={conv.name} size={38} />
          <div className="col" style={{ flex: 1, gap: 2, minWidth: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 15.5 }}>{conv.name}</span>
            <StatusPill status={effStatus} />
          </div>
          <button className="iconbtn" style={{ width: 34, height: 34 }}><Icon.more size={20} /></button>
        </div>
        <div className="row" style={{ padding: '0 14px 12px', justifyContent: 'space-between', gap: 10 }}>
          <span className="faint row" style={{ gap: 6, fontSize: 12 }}><Icon.inbox size={13} /> {conv.page}</span>
          <TakeoverToggle mode={mode} onChange={setMode} />
        </div>
      </div>

      {/* thread */}
      <div ref={threadRef} className="col" style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 10px', gap: 9 }}>
        <div className="daysep"><span>Today · 10:32</span></div>
        {thread.map((m, i) => <Bubble key={i} m={{ ...m, custName: conv.name }} animate={i >= thread.length - 1} />)}
        {mode === 'ai' && (
          <div className="msg row-ai"><div className="bubble b-ai" style={{ opacity: .85 }}>
            <span className="ai-tag"><Icon.spark size={13} /> AI agent</span>
            <span className="typing"><i></i><i></i><i></i></span>
          </div></div>
        )}
      </div>

      {/* collapsed order peek */}
      <div className="peekbar" onClick={() => setOpen(true)}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-soft)', color: 'var(--accent-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
          <Icon.box size={18} />
        </div>
        <div className="col" style={{ flex: 1, gap: 1, minWidth: 0 }}>
          <div className="row" style={{ gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13.5 }}>Live order</span>
            <span className="num muted" style={{ fontSize: 13 }}>{taka(total)} · {itemCount} item</span>
          </div>
          {missing > 0
            ? <span className="row" style={{ gap: 5, fontSize: 11.5, fontWeight: 600, color: 'var(--amber)' }}><Icon.alert size={13} /> {missing} field missing — address</span>
            : <span className="faint" style={{ fontSize: 11.5 }}>Ready to confirm</span>}
        </div>
        <Icon.chevUp size={18} style={{ color: 'var(--ink-3)' }} />
      </div>

      {/* composer */}
      <div className="composer" style={{ paddingBottom: 26 }}>
        {mode === 'you' ? (
          <div className="composer-input">
            <button className="iconbtn" style={{ width: 30, height: 30 }}><Icon.image size={19} /></button>
            <input placeholder="Reply as yourself…" />
            <button className="send"><Icon.send size={17} /></button>
          </div>
        ) : (
          <div className="composer-ai" style={{ fontSize: 12.5 }}>
            <Icon.spark size={15} style={{ color: 'var(--accent)' }} /> AI is replying
            <button className="fchip" style={{ marginLeft: 4 }} onClick={() => setMode('you')}>Take over</button>
          </div>
        )}
      </div>

      {/* pull-up order sheet */}
      {open && (
        <>
          <div className="scrim" onClick={() => setOpen(false)} />
          <div className="sheet open" style={{ maxHeight: '82%', display: 'flex', flexDirection: 'column' }}>
            <div className="grabber" />
            <div className="row" style={{ padding: '4px 18px 10px', justifyContent: 'space-between' }}>
              <span className="display" style={{ fontSize: 17, fontWeight: 700 }}>Live order</span>
              <button className="iconbtn" style={{ width: 32, height: 32 }} onClick={() => setOpen(false)}><Icon.chevDown size={20} /></button>
            </div>
            <div style={{ overflowY: 'auto', padding: '0 18px 30px' }}>
              <OrderPanel order={order} compactHeader />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
window.MobileConversation = MobileConversation;
