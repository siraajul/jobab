/* Jobab — Desktop Inbox (nav rail · conversation list · thread · live order). */
function DesktopInbox() {
  const J = window.JOBAB;
  const [sel, setSel] = React.useState('tahmina');
  const [filter, setFilter] = React.useState('all');
  const [modes, setModes] = React.useState({ rumana: 'you' }); // per-conv takeover state
  const threadRef = React.useRef(null);

  const conv = J.conversations.find((c) => c.id === sel);
  const baseStatus = conv.status;
  const mode = modes[sel] || (baseStatus === 'you' ? 'you' : 'ai');
  const effStatus = mode === 'you' ? 'you' : (baseStatus === 'needs' ? 'needs' : baseStatus === 'paid' ? 'paid' : 'ai');

  const thread = J.threads[sel] || [
    { who: 'cust', t: conv.when, text: conv.snippet.replace(/^You:\s*/, '') },
  ];
  const order = J.orders[sel];

  const setMode = (m) => setModes((x) => ({ ...x, [sel]: m }));

  const filters = [
    { k: 'all', label: 'All' }, { k: 'needs', label: 'Needs you' },
    { k: 'ai', label: 'AI handling' }, { k: 'you', label: 'You' }, { k: 'unread', label: 'Unread' },
  ];
  const list = J.conversations.filter((c) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return c.unread > 0;
    return c.status === filter;
  });

  React.useEffect(() => { if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; }, [sel]);

  const NAV = [
    { ic: Icon.inbox, label: 'Inbox', active: true, badge: true },
    { ic: Icon.receipt, label: 'Orders' },
    { ic: Icon.grid, label: 'Catalog' },
    { ic: Icon.home, label: 'Home' },
  ];

  return (
    <div className="row" style={{ height: '100%', width: '100%', overflow: 'hidden' }}>

      {/* ── nav rail ── */}
      <div className="nav-rail">
        <div className="av" style={{ width: 40, height: 40, background: 'var(--accent)', fontSize: 17, borderRadius: 12, marginBottom: 10 }}>র</div>
        {NAV.map((n) => (
          <div key={n.label} className={`nav-item${n.active ? ' active' : ''}`} title={n.label}>
            <n.ic size={22} />{n.badge && <span className="badge" />}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div className="nav-item" title="Settings"><Icon.settings size={22} /></div>
        <Avatar name="Rafiq Owner" size={36} style={{ marginTop: 6 }} />
      </div>

      {/* ── conversation list ── */}
      <div className="col" style={{ width: 340, flex: '0 0 340px', borderRight: '1px solid var(--border)', height: '100%' }}>
        <div className="col" style={{ padding: '18px 16px 12px', gap: 13 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="display" style={{ fontSize: 23, fontWeight: 700 }}>Inbox</div>
            <div className="row" style={{ gap: 2 }}>
              <button className="iconbtn"><Icon.bell size={20} /></button>
              <button className="iconbtn"><Icon.filter size={20} /></button>
            </div>
          </div>
          <div className="search"><Icon.search size={18} /><input placeholder="Search conversations…" /></div>
          <div className="row" style={{ gap: 7, overflowX: 'auto', paddingBottom: 2 }}>
            {filters.map((f) => (
              <button key={f.k} className={`fchip${filter === f.k ? ' on' : ''}`} onClick={() => setFilter(f.k)}>
                {f.label}{f.k === 'needs' ? ' · 1' : ''}
              </button>
            ))}
          </div>
        </div>
        <div className="col" style={{ flex: 1, overflowY: 'auto', padding: '0 10px 14px', gap: 2 }}>
          {list.map((c) => (
            <div key={c.id} className={`conv${c.id === sel ? ' active' : ''}${c.status === 'needs' ? ' needs' : ''}`} onClick={() => setSel(c.id)}>
              <Avatar name={c.name} />
              <div className="col" style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
                  <span className="nm">{c.name}</span>
                  <span className="when num">{c.when}</span>
                </div>
                <div className="snippet">{c.snippet}</div>
                <div className="row" style={{ justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
                  <StatusPill status={c.id === sel ? effStatus : c.status} />
                  {c.unread > 0 && <span className="unread num">{c.unread}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── thread ── */}
      <div className="col" style={{ flex: 1, minWidth: 0, height: '100%', background: 'var(--bg)' }}>
        {/* thread header */}
        <div className="row" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', gap: 14, background: 'var(--surface)' }}>
          <Avatar name={conv.name} size={42} />
          <div className="col" style={{ flex: 1, gap: 3 }}>
            <div className="row" style={{ gap: 9 }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{conv.name}</span>
              <StatusPill status={effStatus} />
            </div>
            <div className="faint row" style={{ gap: 6, fontSize: 12.5 }}>
              <Icon.inbox size={13} /> {conv.page}
              {conv.reason && <span style={{ color: 'var(--amber)', fontWeight: 600 }}>· {conv.reason}</span>}
            </div>
          </div>
          <TakeoverToggle mode={mode} onChange={setMode} />
          <button className="iconbtn"><Icon.more size={20} /></button>
        </div>

        {/* messages */}
        <div ref={threadRef} className="col" style={{ flex: 1, overflowY: 'auto', padding: '18px 20px', gap: 10 }}>
          <div className="daysep"><span>Today</span></div>
          {effStatus === 'needs' && (
            <div className="row" style={{ gap: 9, padding: '11px 14px', background: 'var(--amber-bg)', borderRadius: 12, color: 'var(--amber)', fontSize: 13, fontWeight: 600 }}>
              <Icon.alert size={17} /> Handed to you — customer raised a complaint. AI paused.
            </div>
          )}
          {thread.map((m, i) => <Bubble key={i} m={{ ...m, custName: conv.name }} animate={i >= thread.length - 1} />)}
          {mode === 'ai' && effStatus === 'ai' && (
            <div className="msg row-ai"><div className="bubble b-ai" style={{ opacity: .85 }}>
              <span className="ai-tag"><Icon.spark size={13} /> AI agent</span>
              <span className="typing"><i></i><i></i><i></i></span>
            </div></div>
          )}
        </div>

        {/* composer */}
        <div className="composer">
          {mode === 'you' || effStatus === 'needs' ? (
            <div className="composer-input">
              <button className="iconbtn" style={{ width: 32, height: 32 }}><Icon.image size={20} /></button>
              <input placeholder="Reply as yourself…" defaultValue="" />
              <button className="send"><Icon.send size={18} /></button>
            </div>
          ) : (
            <div className="composer-ai">
              <Icon.spark size={16} style={{ color: 'var(--accent)' }} />
              AI is handling this conversation
              <button className="fchip" style={{ marginLeft: 6 }} onClick={() => setMode('you')}>Take over</button>
            </div>
          )}
        </div>
      </div>

      {/* ── live order panel ── */}
      <div className="col" style={{ width: 360, flex: '0 0 360px', borderLeft: '1px solid var(--border)', height: '100%', background: 'var(--surface)' }}>
        {order ? (
          <div key={sel} className="panel-reveal col" style={{ padding: 20, overflowY: 'auto', height: '100%' }}>
            <OrderPanel order={order} />
          </div>
        ) : (
          <div className="col" style={{ height: '100%', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 32, gap: 14 }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}>
              <Icon.box size={30} />
            </div>
            <div className="col" style={{ gap: 5, maxWidth: 220 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>No order yet</div>
              <div className="muted" style={{ fontSize: 13.5 }}>The AI is still chatting. As soon as it picks up items and details, the order assembles here automatically.</div>
            </div>
            <div className="pill pill-soft t-ai pulse" style={{ marginTop: 4 }}><span className="dot" />Listening</div>
          </div>
        )}
      </div>
    </div>
  );
}
window.DesktopInbox = DesktopInbox;
