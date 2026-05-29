/* Jobab — app shell: design canvas + theme context + tweaks. */
const { DesignCanvas, DCSection, DCArtboard, DCPostIt } = window;
const { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor } = window;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "#1F6E47",
  "bubbleStyle": "tinted",
  "pillStyle": "soft",
  "orderPanel": "stacked"
}/*EDITMODE-END*/;

function Frame({ t, children }) {
  // theme + variant classes + accent override, fills the artboard
  return (
    <div className={`jobab theme-${t.theme} bub-${t.bubbleStyle}`}
      style={{ height: '100%', width: '100%', ['--accent']: t.accent }}>
      {children}
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const dark = t.theme === 'dark';

  return (
    <window.JobabCtx.Provider value={t}>
      <DesignCanvas style={{ background: dark ? '#100d09' : '#f0eee9' }}>
        <DCSection id="inbox" title="Inbox" subtitle="The heart of Jobab — where the merchant watches the AI sell, and steps in.">

          <DCArtboard id="desktop" label="Desktop · Inbox (list · thread · live order)" width={1320} height={880}>
            <Frame t={t}><window.DesktopInbox /></Frame>
          </DCArtboard>

          <DCArtboard id="mobile" label="Mobile · Conversation detail" width={470} height={918}
            style={{ background: 'transparent', boxShadow: 'none' }}>
            <Frame t={t}>
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <window.IOSDevice dark={dark}>
                  <window.MobileConversation />
                </window.IOSDevice>
              </div>
            </Frame>
          </DCArtboard>

        </DCSection>
      </DesignCanvas>

      <TweaksPanel>
        <TweakSection label="Theme" />
        <TweakRadio label="Mode" value={t.theme} options={['light', 'dark']}
          onChange={(v) => setTweak('theme', v)} />
        <TweakColor label="Accent" value={t.accent}
          options={['#1F6E47', '#15613C', '#2C7A53', '#137A6B']}
          onChange={(v) => setTweak('accent', v)} />

        <TweakSection label="Message bubbles" />
        <TweakRadio label="Style" value={t.bubbleStyle} options={['tinted', 'bordered', 'badged']}
          onChange={(v) => setTweak('bubbleStyle', v)} />

        <TweakSection label="Status & order" />
        <TweakRadio label="Status pill" value={t.pillStyle} options={['soft', 'solid', 'dot']}
          onChange={(v) => setTweak('pillStyle', v)} />
        <TweakRadio label="Order panel" value={t.orderPanel} options={['stacked', 'compact']}
          onChange={(v) => setTweak('orderPanel', v)} />
      </TweaksPanel>
    </window.JobabCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
