/* Jobab — icon set (stroke-based, 1.7 weight). Exports window.Icon. */
const Icon = (() => {
  const S = ({ d, size = 20, sw = 1.7, fill = 'none', children, vb = 24, style }) => (
    <svg width={size} height={size} viewBox={`0 0 ${vb} ${vb}`} fill={fill} stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {d ? <path d={d} /> : children}
    </svg>
  );
  return {
    search: (p) => <S {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.2-3.2" /></S>,
    send: (p) => <S {...p} d="M4 12l16-8-6 16-3-7-7-1z" />,
    spark: (p) => <S {...p} fill="currentColor" sw={0} d="M12 2l1.9 5.6L19.5 9l-5.6 1.9L12 16l-1.9-5.1L4.5 9l5.6-1.4L12 2z" />,
    user: (p) => <S {...p}><circle cx="12" cy="8" r="3.4" /><path d="M5.5 19a6.5 6.5 0 0113 0" /></S>,
    phone: (p) => <S {...p} d="M6.5 4h3l1.4 4-1.8 1.4a11 11 0 005.5 5.5l1.4-1.8 4 1.4v3a2 2 0 01-2.2 2A15.5 15.5 0 014.5 6.2 2 2 0 016.5 4z" />,
    pin: (p) => <S {...p}><path d="M12 21s6-5.2 6-10a6 6 0 10-12 0c0 4.8 6 10 6 10z" /><circle cx="12" cy="11" r="2.2" /></S>,
    check: (p) => <S {...p} d="M5 12.5l4.5 4.5L19 7" sw={2.1} />,
    checkCircle: (p) => <S {...p}><circle cx="12" cy="12" r="9" /><path d="M8.5 12.2l2.5 2.5 4.5-5" /></S>,
    alert: (p) => <S {...p}><path d="M12 3.5L21 19H3l9-15.5z" /><path d="M12 10v4" /><circle cx="12" cy="16.6" r=".2" fill="currentColor" /></S>,
    box: (p) => <S {...p}><path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5v-9z" /><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9" /></S>,
    image: (p) => <S {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="9" cy="10" r="1.8" /><path d="M5 17l4.5-4 3 2.5L16 11l3.5 4" /></S>,
    plus: (p) => <S {...p} d="M12 5v14M5 12h14" />,
    chevL: (p) => <S {...p} d="M14.5 5l-7 7 7 7" sw={2} />,
    chevR: (p) => <S {...p} d="M9 5l7 7-7 7" sw={2} />,
    chevUp: (p) => <S {...p} d="M5 15l7-7 7 7" sw={2} />,
    chevDown: (p) => <S {...p} d="M5 9l7 7 7-7" sw={2} />,
    more: (p) => <S {...p} fill="currentColor" sw={0}><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></S>,
    inbox: (p) => <S {...p}><path d="M3.5 13.5L6 5.5a2 2 0 012-1.5h8a2 2 0 012 1.5l2.5 8" /><path d="M3.5 13.5H8l1.2 2.5h5.6L16 13.5h4.5v3a2 2 0 01-2 2H5.5a2 2 0 01-2-2v-3z" /></S>,
    receipt: (p) => <S {...p}><path d="M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3v-17z" /><path d="M9 8h6M9 11.5h6M9 15h3.5" /></S>,
    grid: (p) => <S {...p}><rect x="4" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" /></S>,
    home: (p) => <S {...p}><path d="M4 11l8-6.5 8 6.5" /><path d="M6 9.5V19a1 1 0 001 1h10a1 1 0 001-1V9.5" /></S>,
    settings: (p) => <S {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8" sw={1.4} /></S>,
    hand: (p) => <S {...p}><path d="M9 11V5.5a1.5 1.5 0 013 0V11M12 11V4.5a1.5 1.5 0 013 0V11M15 11V6.5a1.5 1.5 0 013 0V14a6 6 0 01-6 6h-1a6 6 0 01-5.3-3.2L6 14.5a1.5 1.5 0 012.6-1.5L9 13.5" /></S>,
    refresh: (p) => <S {...p}><path d="M4 12a8 8 0 0113.7-5.6L20 8M20 4v4h-4" /><path d="M20 12a8 8 0 01-13.7 5.6L4 16M4 20v-4h4" /></S>,
    truck: (p) => <S {...p}><path d="M3 6.5h10v9H3z" /><path d="M13 9h4l3 3v3.5h-7z" /><circle cx="7" cy="17.5" r="1.6" /><circle cx="17" cy="17.5" r="1.6" /></S>,
    filter: (p) => <S {...p} d="M4 6h16M7 12h10M10 18h4" />,
    bell: (p) => <S {...p}><path d="M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6z" /><path d="M10 19a2 2 0 004 0" /></S>,
    edit: (p) => <S {...p}><path d="M4 20h4L18 10l-4-4L4 16v4z" /><path d="M13 5l4 4" /></S>,
    sun: (p) => <S {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.5 4.5l1.8 1.8M17.7 17.7l1.8 1.8M4.5 19.5l1.8-1.8M17.7 6.3l1.8-1.8" sw={1.4} /></S>,
    moon: (p) => <S {...p} d="M20 13.5A8 8 0 119.5 4a6.5 6.5 0 0010.5 9.5z" />,
  };
})();
window.Icon = Icon;
