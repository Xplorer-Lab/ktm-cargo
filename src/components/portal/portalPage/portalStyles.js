/* Shared CSS for the KTM Client Portal */
export const PORTAL_CSS = `
  .mm { font-family: 'Noto Sans Myanmar', 'Pyidaungsu', sans-serif; }
  .gold-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 22px; font-size: 13px; font-weight: 500;
    background: linear-gradient(135deg, #E8C968 0%, #C9A030 50%, #9A6E10 100%);
    color: #FFFFFF; letter-spacing: 0.05em; border: none; cursor: pointer;
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    transition: filter 0.15s;
  }
  .gold-btn:hover { filter: brightness(1.12); }
  .outline-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 22px; font-size: 13px; letter-spacing: 0.05em;
    background: transparent; color: #9A8060;
    border: 1px solid rgba(201,168,76,0.25); cursor: pointer;
    clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    transition: all 0.15s;
  }
  .outline-btn:hover { border-color: rgba(201,168,76,0.6); color: #111827; }
  .service-card { background: #FAFAFA; border: 1px solid rgba(201,168,76,0.1); transition: border-color 0.2s; }
  .service-card:hover { border-color: rgba(201,168,76,0.3); }
  .faq-item summary::-webkit-details-marker { display: none; }
  .faq-item[open] .faq-arrow { transform: rotate(90deg); }
  .faq-arrow { transition: transform 0.2s; }
  .gold-rule { height: 1px; background: linear-gradient(90deg, #D4A63A 0%, rgba(212,166,58,0.08) 100%); }
  .step-num {
    font-family: 'Oswald', sans-serif; font-weight: 700; font-style: italic;
    font-size: 64px; line-height: 1; color: rgba(212,166,58,0.15);
    position: absolute; right: 12px; top: 8px; pointer-events: none; user-select: none;
  }
  @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  .hero-in { animation: slideUp 0.55s ease forwards; }
  .hero-in-2 { animation: slideUp 0.55s 0.1s ease both; }
  .hero-in-3 { animation: slideUp 0.55s 0.2s ease both; }
`;
