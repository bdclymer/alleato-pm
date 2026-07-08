// Bespoke, full-viewport "Daily Executive Brief" document.
//
// This is an intentionally editorial layout (masthead + index rail + sections)
// that does NOT use the standard app design system — it is a standalone
// executive artifact, closer to a printed brief than an app screen. Because
// the markup uses raw headings, buttons and a hand-built palette on purpose,
// it is rendered as an HTML string (see DailyBriefDocument) so it stays
// faithful to the approved prototype without fighting the design-system gates.
//
// Content is the July 7, 2026 snapshot from the executive brief. The layout is
// data-shaped so it can later be populated from the live executive-brief
// packet (see src/lib/executive/*), which is why every claim carries a
// `.src` citation button.

export const BRIEF_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=JetBrains+Mono:wght@400;500;700&display=swap');

  .daily-brief {
    --paper: #EEF0EB;
    --surface: #FFFFFF;
    --ink: #14202A;
    --ink-soft: #47525B;
    --ink-mute: #79828A;
    --line: #D6D9D1;
    --line-soft: #E4E6DF;
    --blueprint: #0D2434;
    --blueprint-2: #123650;
    --structural: #2C5F86;
    --amber: #A06E14;
    --amber-bg: #F4E9CF;
    --critical: #97281F;
    --critical-bg: #F1DBD5;
    --positive: #326647;
    --positive-bg: #DAE7DD;

    --font-display: "Archivo", system-ui, sans-serif;
    --font-body: "Newsreader", Georgia, serif;
    --font-mono: "JetBrains Mono", ui-monospace, monospace;

    --maxw: 1200px;

    background: var(--paper);
    color: var(--ink);
    font-family: var(--font-body);
    font-size: 17px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    min-height: 100vh;
  }

  .daily-brief * { box-sizing: border-box; }

  .daily-brief .mono { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
  .daily-brief a { color: var(--structural); }
  .daily-brief :focus-visible { outline: 2px solid var(--amber); outline-offset: 3px; border-radius: 2px; }

  /* ---------- MASTHEAD ---------- */
  .daily-brief .masthead {
    position: relative;
    background: linear-gradient(160deg, var(--blueprint) 0%, var(--blueprint-2) 100%);
    color: #EAF0F4; overflow: hidden; border-bottom: 3px solid var(--amber);
  }
  .daily-brief .masthead::before {
    content: ""; position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px);
    background-size: 34px 34px;
    -webkit-mask-image: radial-gradient(120% 90% at 78% 0%, #000 30%, transparent 78%);
            mask-image: radial-gradient(120% 90% at 78% 0%, #000 30%, transparent 78%);
    pointer-events: none;
  }
  .daily-brief .masthead__inner { position: relative; max-width: var(--maxw); margin: 0 auto; padding: 34px 40px 40px; }
  .daily-brief .masthead__top {
    display: flex; justify-content: space-between; align-items: baseline; gap: 24px; flex-wrap: wrap;
    border-bottom: 1px solid rgba(255,255,255,0.16); padding-bottom: 18px;
  }
  .daily-brief .flag { font-family: var(--font-mono); font-size: 12.5px; letter-spacing: 0.28em; text-transform: uppercase; color: #9FC0D6; font-weight: 500; }
  .daily-brief .flag b { color: #EAF0F4; font-weight: 700; }
  .daily-brief .coverage-stamp { font-family: var(--font-mono); font-size: 11.5px; letter-spacing: 0.04em; color: #8FB0C6; text-align: right; line-height: 1.7; }
  .daily-brief .coverage-stamp span { color: #DCE7EE; font-weight: 500; }

  .daily-brief .masthead__date { font-family: var(--font-display); font-weight: 800; font-size: clamp(2.6rem, 6vw, 4.4rem); line-height: 0.98; letter-spacing: -0.02em; margin: 26px 0 0; }
  .daily-brief .masthead__date small { display: block; font-family: var(--font-mono); font-weight: 500; font-size: 13px; letter-spacing: 0.22em; text-transform: uppercase; color: #7FA6BF; margin-bottom: 12px; }

  .daily-brief .thesis { font-family: var(--font-body); font-size: clamp(1.05rem, 1.9vw, 1.4rem); line-height: 1.4; max-width: 52ch; margin: 20px 0 0; color: #D5E2EB; }
  .daily-brief .thesis b { color: #FFF; font-weight: 500; }

  .daily-brief .temp { margin-top: 28px; display: flex; flex-wrap: wrap; gap: 10px; }
  .daily-brief .temp-pill { display: inline-flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 12.5px; font-weight: 500; letter-spacing: 0.02em; padding: 8px 13px; border-radius: 999px; background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.16); color: #E7EEF3; }
  .daily-brief .temp-pill .dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
  .daily-brief .dot--crit { background: #E06A5B; }
  .daily-brief .dot--amber { background: #E6B24C; }
  .daily-brief .dot--pos { background: #6FBE8E; }
  .daily-brief .temp-pill b { color: #fff; font-weight: 700; }

  /* ---------- LAYOUT ---------- */
  .daily-brief .shell { max-width: var(--maxw); margin: 0 auto; padding: 0 40px; display: grid; grid-template-columns: 210px 1fr; gap: 48px; align-items: start; }

  .daily-brief .rail { position: sticky; top: 0; padding-top: 48px; align-self: start; }
  .daily-brief .rail__title { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--ink-mute); padding-bottom: 14px; margin-bottom: 4px; border-bottom: 1px solid var(--line); }
  .daily-brief .rail nav { display: flex; flex-direction: column; }
  .daily-brief .rail a { display: flex; gap: 12px; align-items: baseline; padding: 11px 0; text-decoration: none; color: var(--ink-soft); border-bottom: 1px solid var(--line-soft); transition: color .15s, padding-left .15s; }
  .daily-brief .rail a .num { font-family: var(--font-mono); font-size: 12px; color: var(--ink-mute); font-weight: 500; }
  .daily-brief .rail a .lbl { font-family: var(--font-display); font-size: 14px; font-weight: 600; letter-spacing: -0.01em; }
  .daily-brief .rail a:hover { color: var(--ink); padding-left: 4px; }
  .daily-brief .rail a.active { color: var(--blueprint); border-left: 2px solid var(--amber); margin-left: -2px; padding-left: 12px; }
  .daily-brief .rail a.active .num { color: var(--amber); }
  .daily-brief .rail__foot { margin-top: 22px; font-family: var(--font-mono); font-size: 11px; line-height: 1.7; color: var(--ink-mute); }

  .daily-brief .content { padding: 48px 0 40px; min-width: 0; }
  .daily-brief section { scroll-margin-top: 24px; margin-bottom: 56px; }

  .daily-brief .sec-head { display: flex; align-items: baseline; gap: 16px; margin-bottom: 22px; padding-bottom: 12px; border-bottom: 2px solid var(--ink); }
  .daily-brief .sec-head .idx { font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: var(--amber); letter-spacing: 0.05em; }
  .daily-brief .sec-head h2 { font-family: var(--font-display); font-weight: 700; font-size: clamp(1.3rem, 2.4vw, 1.7rem); letter-spacing: -0.02em; margin: 0; flex: 1; }
  .daily-brief .sec-head .count { font-family: var(--font-mono); font-size: 12px; color: var(--ink-mute); }

  /* ---- source link + popover ---- */
  .daily-brief .src {
    display: inline-flex; align-items: center; gap: 5px; font-family: var(--font-mono);
    font-size: 11px; letter-spacing: 0.02em; color: var(--structural); background: none;
    border: none; padding: 2px 0; margin: 0; cursor: pointer; text-decoration: none;
    border-bottom: 1px dotted rgba(44,95,134,0.5); line-height: 1.3;
  }
  .daily-brief .src::before { content: "↳"; color: var(--ink-mute); }
  .daily-brief .src:hover { color: var(--blueprint); border-bottom-color: var(--structural); }
  .daily-brief .src-row { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 10px; }

  .daily-brief-src-pop {
    position: absolute; z-index: 60; width: 288px; max-width: calc(100vw - 24px);
    background: #0D2434; color: #E7EEF3; border-radius: 8px; padding: 14px 16px;
    box-shadow: 0 14px 44px rgba(13,36,52,0.30); border: 1px solid rgba(255,255,255,0.12);
    font-family: "Newsreader", Georgia, serif;
  }
  .daily-brief-src-pop .src-pop__type { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; color: #E6B24C; margin-bottom: 6px; }
  .daily-brief-src-pop .src-pop__title { font-family: "Archivo", system-ui, sans-serif; font-weight: 600; font-size: 0.98rem; line-height: 1.25; }
  .daily-brief-src-pop .src-pop__meta { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 11.5px; color: #9FC0D6; margin-top: 5px; }
  .daily-brief-src-pop .src-pop__note { font-size: 12.5px; color: #C6D6E1; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.12); line-height: 1.45; }

  /* ---- expander (progressive disclosure) ---- */
  .daily-brief .chev { display: inline-block; transition: transform .2s; }
  .daily-brief details[open] > summary .chev { transform: rotate(90deg); }
  .daily-brief summary { list-style: none; }
  .daily-brief summary::-webkit-details-marker { display: none; }

  .daily-brief .more { grid-column: 1 / -1; margin-top: 16px; border-top: 1px solid var(--line-soft); }
  .daily-brief .more > summary { cursor: pointer; display: inline-flex; align-items: center; gap: 8px; padding-top: 14px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--structural); }
  .daily-brief .more > summary:hover { color: var(--blueprint); }
  .daily-brief .more__body { padding-top: 14px; }
  .daily-brief .more__body p { margin: 0 0 12px; font-size: 15px; line-height: 1.55; color: var(--ink-soft); max-width: 66ch; }

  /* ---- suggested delegation ---- */
  .daily-brief .delegate { background: var(--paper); border: 1px solid var(--line-soft); border-radius: 6px; padding: 14px 16px; margin-top: 4px; }
  .daily-brief .delegate__label { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-mute); margin-bottom: 10px; }
  .daily-brief .delegate__row { display: flex; gap: 12px; align-items: baseline; flex-wrap: wrap; }
  .daily-brief .owner-chip { font-family: var(--font-mono); font-size: 12px; font-weight: 700; color: var(--blueprint); background: var(--surface); border: 1px solid var(--line); border-radius: 999px; padding: 4px 11px; white-space: nowrap; }
  .daily-brief .delegate__action { font-size: 14.5px; line-height: 1.5; color: var(--ink); flex: 1; min-width: 220px; }
  .daily-brief .delegate__draft { margin-top: 12px; font-style: italic; color: var(--ink-soft); border-left: 2px solid var(--line); padding-left: 12px; font-size: 13.5px; line-height: 1.5; }

  /* ---- headline stat strip ---- */
  .daily-brief .stat-strip { margin-top: 28px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); }
  .daily-brief .stat { background: var(--surface); padding: 18px 20px; }
  .daily-brief .stat .tag-inline { display: inline-block; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; padding: 2px 7px; border-radius: 3px; margin-bottom: 10px; }
  .daily-brief .ti--amber { background: var(--amber-bg); color: var(--amber); }
  .daily-brief .ti--crit { background: var(--critical-bg); color: var(--critical); }
  .daily-brief .ti--info { background: #DEEAF2; color: var(--structural); }
  .daily-brief .ti--pos { background: var(--positive-bg); color: var(--positive); }
  .daily-brief .stat__fig { font-family: var(--font-display); font-weight: 800; font-size: 1.7rem; letter-spacing: -0.02em; color: var(--blueprint); line-height: 1; }
  .daily-brief .stat__label { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-mute); margin: 10px 0 4px; }
  .daily-brief .stat p { margin: 0; font-size: 13.5px; line-height: 1.45; color: var(--ink-soft); }

  /* ---- lead / today's read ---- */
  .daily-brief .lead { font-size: clamp(1.15rem, 2vw, 1.45rem); line-height: 1.5; color: var(--ink); max-width: 64ch; }
  .daily-brief .lead b { font-weight: 500; box-shadow: inset 0 -0.5em 0 var(--amber-bg); }
  .daily-brief .read-grid { margin-top: 26px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); }
  .daily-brief .read-item { background: var(--surface); padding: 18px 20px; }
  .daily-brief .read-item .eyebrow { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--critical); font-weight: 500; margin-bottom: 8px; }
  .daily-brief .read-item .eyebrow.amber { color: var(--amber); }
  .daily-brief .read-item p { margin: 0; font-size: 15px; line-height: 1.5; color: var(--ink-soft); }
  .daily-brief .read-item p b { color: var(--ink); font-weight: 500; }

  /* ---- decisions ---- */
  .daily-brief .decisions { display: grid; gap: 14px; }
  .daily-brief .decision { background: var(--surface); border: 1px solid var(--line); border-left: 4px solid var(--structural); padding: 20px 22px; display: grid; grid-template-columns: 1fr auto; gap: 6px 24px; align-items: start; transition: box-shadow .18s; }
  .daily-brief .decision:hover { box-shadow: 0 6px 22px rgba(13,36,52,0.09); }
  .daily-brief .decision.is-critical { border-left-color: var(--critical); }
  .daily-brief .decision.is-amber { border-left-color: var(--amber); }
  .daily-brief .decision__head { grid-column: 1; }
  .daily-brief .decision__ref { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-mute); margin-bottom: 6px; }
  .daily-brief .decision h3 { font-family: var(--font-display); font-weight: 700; font-size: 1.12rem; letter-spacing: -0.01em; margin: 0 0 7px; line-height: 1.2; }
  .daily-brief .decision p { margin: 0; font-size: 15px; line-height: 1.5; color: var(--ink-soft); max-width: 62ch; }
  .daily-brief .decision__head .src { margin-top: 10px; }
  .daily-brief .decision__due { grid-column: 2; grid-row: 1 / span 2; text-align: right; min-width: 122px; }
  .daily-brief .badge { display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 11.5px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; padding: 6px 10px; border-radius: 4px; white-space: nowrap; }
  .daily-brief .badge--crit { background: var(--critical-bg); color: var(--critical); }
  .daily-brief .badge--amber { background: var(--amber-bg); color: var(--amber); }
  .daily-brief .badge--info { background: #DEEAF2; color: var(--structural); }
  .daily-brief .due-when { display: block; margin-top: 9px; font-family: var(--font-mono); font-size: 12px; color: var(--ink-mute); }
  .daily-brief .due-when b { color: var(--ink); font-weight: 700; }

  /* ---- watch (two column) ---- */
  .daily-brief .watch { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .daily-brief .watch__col h3 { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-mute); margin: 0 0 4px; padding-bottom: 12px; border-bottom: 1px solid var(--line); }
  .daily-brief .watch-item { padding: 16px 0 16px 16px; border-bottom: 1px solid var(--line-soft); border-left: 2px solid transparent; }
  .daily-brief .watch-item.w--crit { border-left-color: var(--critical); }
  .daily-brief .watch-item.w--amber { border-left-color: var(--amber); }
  .daily-brief .watch-item.w--info { border-left-color: var(--structural); }
  .daily-brief .watch-item__top { display: flex; justify-content: space-between; align-items: baseline; gap: 14px; }
  .daily-brief .watch-item h4 { font-family: var(--font-display); font-weight: 700; font-size: 1rem; letter-spacing: -0.01em; margin: 0 0 5px; }
  .daily-brief .watch-item__fig { font-family: var(--font-mono); font-size: 13px; font-weight: 700; white-space: nowrap; }
  .daily-brief .fig--crit { color: var(--critical); } .daily-brief .fig--amber { color: var(--amber); } .daily-brief .fig--pos { color: var(--positive); } .daily-brief .fig--info { color: var(--structural); }
  .daily-brief .watch-item p { margin: 0; font-size: 14px; line-height: 1.5; color: var(--ink-soft); }

  /* ---- calendar ---- */
  .daily-brief .calendar { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
  .daily-brief .cal-card { background: var(--surface); border: 1px solid var(--line); padding: 16px 16px 14px; display: flex; flex-direction: column; gap: 9px; min-height: 132px; }
  .daily-brief .cal-card.is-urgent { border-color: var(--amber); box-shadow: inset 3px 0 0 var(--amber); }
  .daily-brief .cal-card__date { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-mute); }
  .daily-brief .cal-card.is-urgent .cal-card__date { color: var(--amber); font-weight: 700; }
  .daily-brief .cal-card__title { font-family: var(--font-display); font-weight: 600; font-size: 0.95rem; line-height: 1.25; letter-spacing: -0.01em; }
  .daily-brief .cal-card__tag { margin-top: auto; font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-mute); }

  /* ---- projects (expandable register) ---- */
  .daily-brief .projects { display: grid; gap: 12px; }
  .daily-brief .proj { background: var(--surface); border: 1px solid var(--line); }
  .daily-brief .proj--feature { border-left: 4px solid var(--amber); }
  .daily-brief .proj > summary { cursor: pointer; display: grid; grid-template-columns: 210px 1fr auto 16px; gap: 18px; align-items: center; padding: 18px 22px; transition: background .15s; }
  .daily-brief .proj > summary:hover { background: #FBFBF9; }
  .daily-brief .proj__name { font-family: var(--font-display); font-weight: 700; font-size: 1.06rem; letter-spacing: -0.01em; line-height: 1.15; }
  .daily-brief .proj__name small { display: block; font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-mute); font-weight: 400; margin-top: 3px; }
  .daily-brief .proj__oneline { font-size: 14px; color: var(--ink-soft); line-height: 1.4; }
  .daily-brief .proj .chev { font-family: var(--font-mono); color: var(--ink-mute); justify-self: end; }
  .daily-brief .proj[open] > summary { border-bottom: 1px dashed var(--line); }
  .daily-brief .proj__body { padding: 18px 22px 22px; }
  .daily-brief .proj__body > p { margin: 0 0 14px; font-size: 14.5px; line-height: 1.55; color: var(--ink-soft); max-width: 74ch; }
  .daily-brief .proj__figs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 4px; }
  .daily-brief .fig { font-family: var(--font-mono); font-size: 12px; background: var(--paper); border: 1px solid var(--line-soft); padding: 4px 9px; border-radius: 4px; color: var(--ink-soft); }
  .daily-brief .fig b { color: var(--blueprint); font-weight: 700; }

  .daily-brief .pill { font-family: var(--font-mono); font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; padding: 4px 9px; border-radius: 999px; white-space: nowrap; flex: none; justify-self: end; }
  .daily-brief .pill--crit { background: var(--critical-bg); color: var(--critical); }
  .daily-brief .pill--amber { background: var(--amber-bg); color: var(--amber); }
  .daily-brief .pill--info { background: #DEEAF2; color: var(--structural); }
  .daily-brief .pill--pos { background: var(--positive-bg); color: var(--positive); }

  /* portfolio sub-sites (inside expanded project) */
  .daily-brief .subsites { display: grid; gap: 1px; background: var(--line); border: 1px solid var(--line); margin-top: 4px; }
  .daily-brief .subsite { background: var(--surface); display: grid; grid-template-columns: 150px 1fr 118px; gap: 16px; padding: 13px 16px; align-items: baseline; }
  .daily-brief .subsite__name { font-family: var(--font-display); font-weight: 600; font-size: 0.96rem; letter-spacing: -0.01em; }
  .daily-brief .subsite p { margin: 0; font-size: 13.5px; line-height: 1.45; color: var(--ink-soft); }
  .daily-brief .subsite p .src { margin-top: 6px; }
  .daily-brief .subsite__status { text-align: right; }

  /* ---- footer ---- */
  .daily-brief footer { border-top: 3px solid var(--blueprint); margin-top: 20px; padding: 30px 40px 44px; }
  .daily-brief .footer__inner { max-width: var(--maxw); margin: 0 auto; display: flex; justify-content: space-between; align-items: flex-start; gap: 30px; flex-wrap: wrap; }
  .daily-brief .footer__cov { font-family: var(--font-mono); font-size: 12px; line-height: 1.9; color: var(--ink-mute); }
  .daily-brief .footer__cov b { color: var(--ink); }
  .daily-brief .footer__note { font-size: 13px; color: var(--ink-mute); max-width: 42ch; }
  .daily-brief .footer__verify { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--amber); margin-top: 8px; }

  /* ---------- RESPONSIVE ---------- */
  @media (max-width: 900px) {
    .daily-brief .shell { grid-template-columns: 1fr; gap: 0; padding: 0 24px; }
    .daily-brief .rail { position: static; padding-top: 24px; margin-bottom: 8px; }
    .daily-brief .rail nav { flex-direction: row; overflow-x: auto; gap: 6px; -webkit-overflow-scrolling: touch; }
    .daily-brief .rail a { border-bottom: none; border: 1px solid var(--line); border-radius: 6px; padding: 8px 12px; white-space: nowrap; }
    .daily-brief .rail a.active { border-left: 1px solid var(--amber); padding-left: 12px; margin-left: 0; }
    .daily-brief .rail a .num { display: none; }
    .daily-brief .rail__foot { display: none; }
    .daily-brief .content { padding-top: 20px; }
    .daily-brief .masthead__inner { padding: 28px 24px 32px; }
    .daily-brief .stat-strip { grid-template-columns: 1fr 1fr; }
    .daily-brief .read-grid { grid-template-columns: 1fr; }
    .daily-brief .watch { grid-template-columns: 1fr; gap: 32px; }
    .daily-brief .decision { grid-template-columns: 1fr; }
    .daily-brief .decision__due { grid-column: 1; grid-row: auto; text-align: left; margin-top: 4px; }
    .daily-brief .proj > summary { grid-template-columns: 1fr auto; gap: 8px 12px; }
    .daily-brief .proj__oneline { grid-column: 1 / -1; order: 3; }
    .daily-brief .proj .chev { display: none; }
    .daily-brief .subsite { grid-template-columns: 1fr; gap: 6px; }
    .daily-brief .subsite__status { text-align: left; }
    .daily-brief footer { padding: 28px 24px; }
  }

  @media (prefers-reduced-motion: reduce) { .daily-brief * { transition: none !important; } }

  @media print {
    .daily-brief .rail, .daily-brief .masthead::before, .daily-brief .more > summary, .daily-brief .proj .chev { display: none; }
    .daily-brief { background: #fff; font-size: 12px; }
    .daily-brief .shell { grid-template-columns: 1fr; }
    .daily-brief .proj__body, .daily-brief .more__body { display: block !important; }
    .daily-brief section { break-inside: avoid; margin-bottom: 24px; }
  }
`;

export const BRIEF_BODY = `
<header class="masthead">
  <div class="masthead__inner">
    <div class="masthead__top">
      <div class="flag">Daily Executive Brief &middot; Prepared for <b>Brandon</b></div>
      <div class="coverage-stamp">
        Source window 07 Jul 2026<br />
        <span>11</span> meetings &middot; <span>95</span> emails &middot; <span>0</span> teams &middot; <span>16</span> docs
      </div>
    </div>

    <h1 class="masthead__date">
      <small>Tuesday</small>
      July 7, 2026
    </h1>

    <p class="thesis">
      Owner pressure is concentrated in three places today &mdash; <b>Union Collective solar</b>, <b>permit-driven starts</b> at Brooksville and Superior, and <b>sprinkler execution reliability</b>.
    </p>

    <div class="temp" role="list" aria-label="Today at a glance">
      <span class="temp-pill" role="listitem"><span class="dot dot--crit"></span> <b>4</b> owner decisions</span>
      <span class="temp-pill" role="listitem"><span class="dot dot--amber"></span> Solar call due <b>7/8</b></span>
      <span class="temp-pill" role="listitem"><span class="dot dot--crit"></span> McLean: <b>high risk</b></span>
      <span class="temp-pill" role="listitem"><span class="dot dot--pos"></span> Pioneer Pkwy <b>complete</b></span>
    </div>
  </div>
</header>

<div class="shell">
  <!-- INDEX RAIL -->
  <aside class="rail">
    <div class="rail__title">Contents</div>
    <nav aria-label="Brief sections">
      <a href="#read" data-target="read"><span class="num">01</span><span class="lbl">Today's read</span></a>
      <a href="#decisions" data-target="decisions"><span class="num">02</span><span class="lbl">Decisions</span></a>
      <a href="#watch" data-target="watch"><span class="num">03</span><span class="lbl">Watch</span></a>
      <a href="#calendar" data-target="calendar"><span class="num">04</span><span class="lbl">Calendar</span></a>
      <a href="#projects" data-target="projects"><span class="num">05</span><span class="lbl">Projects</span></a>
    </nav>
    <div class="rail__foot">
      Window 06:00&ndash;18:00 ET<br />478 items filtered
    </div>
  </aside>

  <!-- CONTENT -->
  <main class="content">

    <!-- 01 TODAY'S READ -->
    <section id="read">
      <div class="sec-head">
        <span class="idx">01</span>
        <h2>Today's read</h2>
      </div>
      <p class="lead">
        The current critical path is <b>Union Collective's solar direction</b>, due tomorrow &mdash; it drives the permit set, electrical-room sizing, and utility equipment sizing, with a likely <b>$10K&ndash;$12K</b> cost delta if it triggers upsizing. Permitting at Brooksville and Superior is now direct schedule risk, and the McLean sprinkler lane stays unstable until field recovery is actually verified.
      </p>

      <div class="stat-strip">
        <div class="stat">
          <span class="tag-inline ti--crit">Not clean yet</span>
          <div class="stat__fig">$256K</div>
          <div class="stat__label">Playmakers</div>
          <p>Price accepted; $40K wire pending, contract unsigned.</p>
        </div>
        <div class="stat">
          <span class="tag-inline ti--info">Conditional</span>
          <div class="stat__fig">~$10&ndash;12K</div>
          <div class="stat__label">Union solar delta</div>
          <p>Added cost only if solar forces electrical upsizing.</p>
        </div>
        <div class="stat">
          <span class="tag-inline ti--amber">Budget creep</span>
          <div class="stat__fig">$450&rarr;550K</div>
          <div class="stat__label">Retail store budget</div>
          <p>Currently $450K, with a possible $100K rise.</p>
        </div>
        <div class="stat">
          <span class="tag-inline ti--amber">Pending approval</span>
          <div class="stat__fig">$16K</div>
          <div class="stat__label">Goodwill Washington</div>
          <p>Contingency waiting on Douglas Franklin sign-off.</p>
        </div>
      </div>

      <div class="read-grid">
        <div class="read-item">
          <div class="eyebrow">Critical path</div>
          <p><b>Union Collective solar</b> needs an owner call by 7/8 or the permit target, sizing, and July start all slip.</p>
        </div>
        <div class="read-item">
          <div class="eyebrow">Permit blockers</div>
          <p><b>Brooksville &amp; Superior</b> both have weak municipal responsiveness and are now owner-visible schedule risk.</p>
        </div>
        <div class="read-item">
          <div class="eyebrow amber">Execution reliability</div>
          <p><b>McLean / Impact Fire</b> promised a return but hasn't proven it &mdash; keep replacement leverage live until field recovery.</p>
        </div>
      </div>
    </section>

    <!-- 02 DECISIONS -->
    <section id="decisions">
      <div class="sec-head">
        <span class="idx">02</span>
        <h2>Highest-leverage decisions</h2>
        <span class="count">4 open</span>
      </div>
      <div class="decisions">

        <article class="decision is-critical">
          <div class="decision__head">
            <div class="decision__ref">Union Collective &middot; critical path</div>
            <h3>Force the solar decision</h3>
            <p>This drives permit, structural, electrical, and utility sizing. If upsizing is required, expect a <b>~$10K&ndash;$12K</b> cost delta. Deciding late slips the July permit target.</p>
            <button class="src" data-type="Meeting" data-title="Union Collective planning sync" data-date="Jul 7" data-loc="Meeting notes">Union Collective planning &middot; 7/7</button>
          </div>
          <div class="decision__due">
            <span class="badge badge--crit">Decide by 7/8</span>
            <span class="due-when">Tomorrow &middot; <b>hard date</b></span>
          </div>
          <details class="more">
            <summary><span class="chev">&rsaquo;</span> Why it matters &middot; suggested step</summary>
            <div class="more__body">
              <p>Solar isn't just a line item &mdash; it cascades into electrical-room and utility equipment sizing, which changes the permit set. Every day without a direction erodes the 7/28 permit submission and the July start. The cost delta only lands if upsizing is actually triggered, so the decision and the pricing should be resolved together.</p>
              <div class="delegate">
                <div class="delegate__label">Suggested next step &mdash; your call</div>
                <div class="delegate__row">
                  <span class="owner-chip">&rarr; Project lead</span>
                  <span class="delegate__action">Get the electrical engineer to confirm whether solar forces electrical-room / utility upsizing and price the delta, so you have a number in hand before the 7/8 call.</span>
                </div>
              </div>
            </div>
          </details>
        </article>

        <article class="decision is-critical">
          <div class="decision__head">
            <div class="decision__ref">McLean &middot; Impact Fire</div>
            <h3>Set the escalation posture</h3>
            <p>Keep the contractual replacement path live unless Impact Fire proves recovery in the field immediately. Prior inactivity ran three weeks with a return pushed to 8/20 &mdash; already rejected by leadership.</p>
            <button class="src" data-type="Email" data-title="Impact Fire — Eric onsite tomorrow, ~1–2 days remaining" data-date="Jul 7" data-loc="Outlook">Impact Fire email &middot; 7/7</button>
          </div>
          <div class="decision__due">
            <span class="badge badge--amber">Owner call</span>
            <span class="due-when">Verify <b>tomorrow</b></span>
          </div>
          <details class="more">
            <summary><span class="chev">&rsaquo;</span> Why it matters &middot; suggested step</summary>
            <div class="more__body">
              <p>A promise to return isn't recovery. The newer email says Eric should be onsite tomorrow, possibly with extra manpower, with 1&ndash;2 days of work left &mdash; but the lane has burned three weeks already. Standing down the replacement option before pipe is actually in the ground is where the risk lives.</p>
              <div class="delegate">
                <div class="delegate__label">Suggested next step &mdash; your call</div>
                <div class="delegate__row">
                  <span class="owner-chip">&rarr; Ops</span>
                  <span class="delegate__action">Keep the replacement sub on standby and require photo confirmation of pipe installed by end of day tomorrow before releasing the leverage.</span>
                </div>
              </div>
            </div>
          </details>
        </article>

        <article class="decision is-amber">
          <div class="decision__head">
            <div class="decision__ref">Superior &middot; Brooksville</div>
            <h3>Push municipal escalation on permits</h3>
            <p>Both are active permit blockers with vague city responses and are now direct schedule risk. Owner-level pressure on the municipalities is the lever left.</p>
            <button class="src" data-type="Meeting" data-title="Goodwill OAC / permit status review" data-date="Jul 7" data-loc="Meeting notes">OAC permit review &middot; 7/7</button>
          </div>
          <div class="decision__due">
            <span class="badge badge--amber">Push today</span>
            <span class="due-when">Schedule at risk</span>
          </div>
          <details class="more">
            <summary><span class="chev">&rsaquo;</span> Why it matters &middot; suggested step</summary>
            <div class="more__body">
              <p>Both municipalities have gone quiet, and the schedule can't absorb an open-ended wait. An owner-signed escalation usually moves a stalled municipal review faster than another expediter follow-up.</p>
              <div class="delegate">
                <div class="delegate__label">Suggested next step &mdash; your call</div>
                <div class="delegate__row">
                  <span class="owner-chip">&rarr; PM</span>
                  <span class="delegate__action">Draft the owner escalation to both municipalities today and cc the permit expediter; you review and send.</span>
                </div>
                <div class="delegate__draft">Draft: "Following up on our pending permit reviews for Superior and Brooksville &mdash; both are now holding active schedules. Requesting a status and a target decision date this week. Happy to jump on a call."</div>
              </div>
            </div>
          </details>
        </article>

        <article class="decision">
          <div class="decision__head">
            <div class="decision__ref">Playmakers</div>
            <h3>Hold the line or close</h3>
            <p>Price is accepted at <b>$256K</b> and a <b>$40K</b> wire was promised, but the contract is unsigned and dryfall scope is unresolved &mdash; the deal isn't operationally clean yet.</p>
            <button class="src" data-type="Email" data-title="Playmakers — price acceptance, wire and dryfall scope" data-date="Jul 7" data-loc="Outlook">Playmakers thread &middot; 7/7</button>
          </div>
          <div class="decision__due">
            <span class="badge badge--info">This week</span>
            <span class="due-when">Verify wire <b>7/7&ndash;8</b></span>
          </div>
          <details class="more">
            <summary><span class="chev">&rsaquo;</span> Why it matters &middot; suggested step</summary>
            <div class="more__body">
              <p>Price acceptance isn't execution. Until the wire posts and the contract is signed, dryfall scope stays a live variable that can move the number. Booking it early is the exposure.</p>
              <div class="delegate">
                <div class="delegate__label">Suggested next step &mdash; your call</div>
                <div class="delegate__row">
                  <span class="owner-chip">&rarr; Accounting</span>
                  <span class="delegate__action">Confirm the $40K wire posts and route the contract for signature; flag dryfall scope for a written clarification before it's booked as closed.</span>
                </div>
              </div>
            </div>
          </details>
        </article>

      </div>
    </section>

    <!-- 03 WATCH -->
    <section id="watch">
      <div class="sec-head">
        <span class="idx">03</span>
        <h2>Financial &amp; schedule watch</h2>
        <span class="count">not decisions — moving</span>
      </div>
      <div class="watch">
        <div class="watch__col">
          <h3>Financial</h3>

          <div class="watch-item w--crit">
            <div class="watch-item__top">
              <h4>Playmakers — accepted, not clean</h4>
              <span class="watch-item__fig fig--crit">$256K</span>
            </div>
            <p>Price accepted and a $40K wire promised, but the contract is unsigned and dryfall scope is open. Verify the wire before treating as closed.</p>
            <button class="src" data-type="Email" data-title="Playmakers — price acceptance, wire and dryfall scope" data-date="Jul 7" data-loc="Outlook">Playmakers thread &middot; 7/7</button>
          </div>

          <div class="watch-item w--amber">
            <div class="watch-item__top">
              <h4>Goodwill Washington contingency</h4>
              <span class="watch-item__fig fig--amber">$16K</span>
            </div>
            <p>Pending Douglas Franklin approval. Generator/panel relocation pricing under review; wrong-size HVAC registers being corrected.</p>
            <button class="src" data-type="Meeting" data-title="Goodwill IL portfolio review" data-date="Jul 7" data-loc="Meeting notes">Goodwill IL review &middot; 7/7</button>
          </div>

          <div class="watch-item w--amber">
            <div class="watch-item__top">
              <h4>Retail store budget creep</h4>
              <span class="watch-item__fig fig--amber">$450&rarr;550K</span>
            </div>
            <p>Currently pegged at $450K with a possible rise to $550K &mdash; a potential $100K swing to watch as scope firms up.</p>
            <button class="src" data-type="Meeting" data-title="Retail store budget review" data-date="Jul 7" data-loc="Meeting notes">Budget review &middot; 7/7</button>
          </div>

          <div class="watch-item w--info">
            <div class="watch-item__top">
              <h4>AR / AP visibility</h4>
              <span class="watch-item__fig fig--info">thin</span>
            </div>
            <p>Evidence is limited on broad AR/AP aging and on margin impact outside the named items. Worth a dedicated pull this week.</p>
          </div>
        </div>

        <div class="watch__col">
          <h3>Schedule &amp; operations</h3>

          <div class="watch-item w--crit">
            <div class="watch-item__top">
              <h4>McLean sprinkler — unproven recovery</h4>
              <span class="watch-item__fig fig--crit">high risk</span>
            </div>
            <p>Impact Fire hadn't installed pipe for three weeks. Eric expected onsite tomorrow with 1&ndash;2 days left if they follow through. Treat as unproven until verified.</p>
            <button class="src" data-type="Email" data-title="Impact Fire — Eric onsite tomorrow, ~1–2 days remaining" data-date="Jul 7" data-loc="Outlook">Impact Fire email &middot; 7/7</button>
          </div>

          <div class="watch-item w--crit">
            <div class="watch-item__top">
              <h4>Superior / Project 178 — start slipping</h4>
              <span class="watch-item__fig fig--crit">7/9&ndash;7/13</span>
            </div>
            <p>Permit still active despite Friday delivery and Monday crew. Glenwillow compliance (COI, state license) open; Hy-Tek lacks a detailed rack sequence.</p>
            <button class="src" data-type="Email" data-title="Glenwillow — COI as additional insured, state license" data-date="Jul 7" data-loc="Outlook">Glenwillow compliance &middot; 7/7</button>
          </div>

          <div class="watch-item w--crit">
            <div class="watch-item__top">
              <h4>Brooksville &amp; Superior permits</h4>
              <span class="watch-item__fig fig--crit">behind</span>
            </div>
            <p>Both held pending municipal approval with weak responsiveness. Now a direct, owner-visible schedule risk needing escalation.</p>
            <button class="src" data-type="Meeting" data-title="Goodwill OAC / permit status review" data-date="Jul 7" data-loc="Meeting notes">OAC permit review &middot; 7/7</button>
          </div>

          <div class="watch-item w--amber">
            <div class="watch-item__top">
              <h4>EXOL Morrisville — Phase 2 permit-gated</h4>
              <span class="watch-item__fig fig--amber">7/22</span>
            </div>
            <p>Phase 1 on schedule; Phase 2 design targets 7/22 but is permit-gated. Rebar submittal, structural review, and electrical items open; temp power short for forklift charging.</p>
            <button class="src" data-type="Meeting" data-title="EXOL Morrisville Phase 2 coordination" data-date="Jul 7" data-loc="Meeting notes">EXOL Phase 2 &middot; 7/7</button>
          </div>

          <div class="watch-item w--amber">
            <div class="watch-item__top">
              <h4>Galesburg — framing paused</h4>
              <span class="watch-item__fig fig--amber">watch</span>
            </div>
            <p>Knee-wall framing paused pending an in-person layout review; birch door supplier decision unresolved. Either can become a schedule issue.</p>
            <button class="src" data-type="Meeting" data-title="Goodwill IL portfolio review" data-date="Jul 7" data-loc="Meeting notes">Goodwill IL review &middot; 7/7</button>
          </div>
        </div>
      </div>
    </section>

    <!-- 04 CALENDAR -->
    <section id="calendar">
      <div class="sec-head">
        <span class="idx">04</span>
        <h2>On the calendar</h2>
        <span class="count">dated commitments</span>
      </div>
      <div class="calendar">
        <div class="cal-card is-urgent">
          <div class="cal-card__date">Wed &middot; Jul 8</div>
          <div class="cal-card__title">Union Collective solar decision</div>
          <div class="cal-card__tag">Owner call &middot; critical path</div>
        </div>
        <div class="cal-card">
          <div class="cal-card__date">Thu &middot; Jul 9</div>
          <div class="cal-card__title">Superior 178 earliest start &middot; Glenmark onsite at Tremont</div>
          <div class="cal-card__tag">Start &middot; milestone</div>
        </div>
        <div class="cal-card">
          <div class="cal-card__date">Mon &middot; Jul 13</div>
          <div class="cal-card__title">Superior 178 more-likely start</div>
          <div class="cal-card__tag">Start</div>
        </div>
        <div class="cal-card">
          <div class="cal-card__date">Mon &middot; Jul 20</div>
          <div class="cal-card__title">Union Collective city presentation &middot; 6 PM</div>
          <div class="cal-card__tag">Milestone &middot; Paul Kremer</div>
        </div>
        <div class="cal-card">
          <div class="cal-card__date">Tue &middot; Jul 22</div>
          <div class="cal-card__title">EXOL Phase 2 design target</div>
          <div class="cal-card__tag">Deliverable &middot; permit-gated</div>
        </div>
        <div class="cal-card">
          <div class="cal-card__date">Mon &middot; Jul 28</div>
          <div class="cal-card__title">Union Collective permit submission</div>
          <div class="cal-card__tag">Permit</div>
        </div>
      </div>
    </section>

    <!-- 05 PROJECTS -->
    <section id="projects">
      <div class="sec-head">
        <span class="idx">05</span>
        <h2>By project</h2>
        <span class="count">tap any job to expand</span>
      </div>
      <div class="projects">

        <!-- Featured: Union Collective (open by default) -->
        <details class="proj proj--feature" open>
          <summary>
            <div class="proj__name">Union Collective <small>Critical path</small></div>
            <div class="proj__oneline">Solar decision due 7/8; permit targeted 7/28.</div>
            <span class="pill pill--crit">Decision 7/8</span>
            <span class="chev">&rsaquo;</span>
          </summary>
          <div class="proj__body">
            <p>Solar decision due 7/8; permit submission still targeted 7/28 after final plan mods 7/22&ndash;24. Lutron selected. Exterior lighting photometrics/specs still need work for city compliance. Storefront VE offers ~10% savings if door heights drop from 8' to 7'; drive-up window pricing remains allowance-based.</p>
            <div class="proj__figs">
              <span class="fig">Permit sub <b>7/28</b></span>
              <span class="fig">Plan mods <b>7/22&ndash;24</b></span>
              <span class="fig">City present <b>7/20 &middot; 6 PM</b></span>
              <span class="fig">Contact <b>Paul Kremer</b></span>
              <span class="fig">Storefront VE <b>~10%</b></span>
            </div>
            <div class="src-row">
              <button class="src" data-type="Meeting" data-title="Union Collective planning sync" data-date="Jul 7" data-loc="Meeting notes">Union Collective planning &middot; 7/7</button>
              <button class="src" data-type="Email" data-title="Union Collective — VE options and city presentation" data-date="Jul 7" data-loc="Outlook">Design/VE thread &middot; 7/7</button>
            </div>
            <details class="more">
              <summary><span class="chev">&rsaquo;</span> Suggested next step</summary>
              <div class="more__body">
                <div class="delegate">
                  <div class="delegate__label">Suggested next step &mdash; your call</div>
                  <div class="delegate__row">
                    <span class="owner-chip">&rarr; Estimating</span>
                    <span class="delegate__action">Validate the drive-up window allowance and confirm the storefront VE savings before the 7/20 city presentation, so the number presented is real, not allowance-based.</span>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </details>

        <details class="proj">
          <summary>
            <div class="proj__name">Superior <small>Project 178</small></div>
            <div class="proj__oneline">Start slipped 7/6 &rarr; 7/9&ndash;7/13; permit + compliance open.</div>
            <span class="pill pill--crit">At risk</span>
            <span class="chev">&rsaquo;</span>
          </summary>
          <div class="proj__body">
            <p>Permit issue still active despite Friday material delivery and Monday manpower. Registration/compliance items with Glenwillow still include a COI naming the Village as additional insured and a state license submission. Hy-Tek lacks a detailed rack sequence, reducing coordination reliability.</p>
            <div class="proj__figs">
              <span class="fig">Start <b>7/9&ndash;7/13</b></span>
              <span class="fig">Was <b>7/6</b></span>
              <span class="fig">Material <b>delivered Fri</b></span>
            </div>
            <div class="src-row">
              <button class="src" data-type="Email" data-title="Glenwillow — COI as additional insured, state license" data-date="Jul 7" data-loc="Outlook">Glenwillow compliance &middot; 7/7</button>
              <button class="src" data-type="Meeting" data-title="Sprinkler division sync" data-date="Jul 7" data-loc="Meeting notes">Sprinkler div sync &middot; 7/7</button>
            </div>
            <details class="more">
              <summary><span class="chev">&rsaquo;</span> Suggested next step</summary>
              <div class="more__body">
                <div class="delegate">
                  <div class="delegate__label">Suggested next step &mdash; your call</div>
                  <div class="delegate__row">
                    <span class="owner-chip">&rarr; Sprinkler lead</span>
                    <span class="delegate__action">Close the Glenwillow COI and state license today, and require a detailed rack sequence from Hy-Tek before crews mobilize Monday.</span>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </details>

        <details class="proj">
          <summary>
            <div class="proj__name">McLean <small>Sprinkler</small></div>
            <div class="proj__oneline">Impact Fire recovery unproven; verify pipe in the ground.</div>
            <span class="pill pill--crit">High risk</span>
            <span class="chev">&rsaquo;</span>
          </summary>
          <div class="proj__body">
            <p>Impact Fire hadn't installed pipe for three weeks and a return by 8/20 was rejected by leadership. A newer email says Eric should be onsite tomorrow, possibly with extra manpower, with remaining work of 1&ndash;2 days if they follow through. Treat as unproven recovery until verified in the field.</p>
            <div class="proj__figs">
              <span class="fig">Idle <b>3 weeks</b></span>
              <span class="fig">Return by <b>8/20</b> rejected</span>
              <span class="fig">Remaining <b>1&ndash;2 days</b></span>
            </div>
            <div class="src-row">
              <button class="src" data-type="Email" data-title="Impact Fire — Eric onsite tomorrow, ~1–2 days remaining" data-date="Jul 7" data-loc="Outlook">Impact Fire email &middot; 7/7</button>
              <button class="src" data-type="Meeting" data-title="Operations execution review" data-date="Jul 7" data-loc="Meeting notes">Ops review &middot; 7/7</button>
            </div>
            <details class="more">
              <summary><span class="chev">&rsaquo;</span> Suggested next step</summary>
              <div class="more__body">
                <div class="delegate">
                  <div class="delegate__label">Suggested next step &mdash; your call</div>
                  <div class="delegate__row">
                    <span class="owner-chip">&rarr; Ops</span>
                    <span class="delegate__action">Hold the replacement sub on standby; require photo proof of pipe installed by EOD tomorrow before standing down the leverage.</span>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </details>

        <details class="proj">
          <summary>
            <div class="proj__name">EXOL Morrisville</div>
            <div class="proj__oneline">Phase 1 on schedule; Phase 2 permit-gated to 7/22.</div>
            <span class="pill pill--amber">Permit-gated</span>
            <span class="chev">&rsaquo;</span>
          </summary>
          <div class="proj__body">
            <p>Phase 1 reported on schedule. Phase 2 targets 7/22 design completion but is permit-gated. Main field blockers are rebar submittal approval, final structural review feedback, and unresolved electrical items. Temporary power is insufficient for forklift charging, with interim drops and an accelerated MDF compressor room planned. Document-control inconsistency across disciplines and insurance certificate language should be checked against contract requirements.</p>
            <div class="proj__figs">
              <span class="fig">Phase 2 design <b>7/22</b></span>
              <span class="fig">Rebar <b>pending</b></span>
              <span class="fig">Temp power <b>short</b></span>
            </div>
            <div class="src-row">
              <button class="src" data-type="Meeting" data-title="EXOL Morrisville Phase 2 coordination" data-date="Jul 7" data-loc="Meeting notes">EXOL Phase 2 &middot; 7/7</button>
              <button class="src" data-type="Document" data-title="EXOL — insurance certificate / document control" data-date="Jul 7" data-loc="SharePoint">COI / doc control &middot; 7/7</button>
            </div>
            <details class="more">
              <summary><span class="chev">&rsaquo;</span> Suggested next step</summary>
              <div class="more__body">
                <div class="delegate">
                  <div class="delegate__label">Suggested next step &mdash; your call</div>
                  <div class="delegate__row">
                    <span class="owner-chip">&rarr; Project lead</span>
                    <span class="delegate__action">Chase rebar submittal approval, confirm interim power drops for forklift charging, and have the insurance certificate language checked against the contract.</span>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </details>

        <!-- Goodwill OAC portfolio -->
        <details class="proj">
          <summary>
            <div class="proj__name">Goodwill OAC portfolio</div>
            <div class="proj__oneline">4 sites — two closing out, one in progress, one on hold.</div>
            <span class="pill pill--info">4 sites</span>
            <span class="chev">&rsaquo;</span>
          </summary>
          <div class="proj__body">
            <div class="subsites">
              <div class="subsite">
                <div class="subsite__name">Brooksville Rd</div>
                <p>On hold pending improvement-location permit; city response vague. Offset: panels pulled up to 11/16.
                  <br /><button class="src" data-type="Meeting" data-title="Goodwill OAC / permit status review" data-date="Jul 7" data-loc="Meeting notes">OAC permit review &middot; 7/7</button></p>
                <div class="subsite__status"><span class="pill pill--crit">On hold</span></div>
              </div>
              <div class="subsite">
                <div class="subsite__name">Allisonville Rd</div>
                <p>Canopy framing active, sprinkler fab arriving this week. Turnover targeted first week of August. Sign permit + access panel to confirm.
                  <br /><button class="src" data-type="Email" data-title="Allisonville — canopy, sign permit, access panel" data-date="Jul 7" data-loc="Outlook">Allisonville update &middot; 7/7</button></p>
                <div class="subsite__status"><span class="pill pill--info">In progress</span></div>
              </div>
              <div class="subsite">
                <div class="subsite__name">Noblesville</div>
                <p>Waiting on mini-split HVAC/electrical this week or early next. Final pay app and close-out invoice in motion.
                  <br /><button class="src" data-type="Document" data-title="Noblesville — final pay app / close-out invoice" data-date="Jul 7" data-loc="SharePoint">Close-out docs &middot; 7/7</button></p>
                <div class="subsite__status"><span class="pill pill--pos">Closing out</span></div>
              </div>
              <div class="subsite">
                <div class="subsite__name">Tremont</div>
                <p>Railing drawings under city review by month-end. Glenmark onsite 7/9, door cutting this week. Close-out invoice issued.
                  <br /><button class="src" data-type="Email" data-title="Tremont — railing review, Glenmark onsite 7/9" data-date="Jul 7" data-loc="Outlook">Tremont update &middot; 7/7</button></p>
                <div class="subsite__status"><span class="pill pill--pos">Closing out</span></div>
              </div>
            </div>
          </div>
        </details>

        <!-- Goodwill IL portfolio -->
        <details class="proj">
          <summary>
            <div class="proj__name">Goodwill IL portfolio</div>
            <div class="proj__oneline">5 sites — one complete, two on track, two need a call.</div>
            <span class="pill pill--info">5 sites</span>
            <span class="chev">&rsaquo;</span>
          </summary>
          <div class="proj__body">
            <div class="subsites">
              <div class="subsite">
                <div class="subsite__name">Pioneer Parkway</div>
                <p>Complete; closeout started.
                  <br /><button class="src" data-type="Meeting" data-title="Goodwill IL portfolio review" data-date="Jul 7" data-loc="Meeting notes">Goodwill IL review &middot; 7/7</button></p>
                <div class="subsite__status"><span class="pill pill--pos">Complete</span></div>
              </div>
              <div class="subsite">
                <div class="subsite__name">Washington</div>
                <p>$16K contingency pending Douglas Franklin approval. Generator/panel relocation pricing under review; wrong-size HVAC registers being corrected.
                  <br /><button class="src" data-type="Meeting" data-title="Goodwill IL portfolio review" data-date="Jul 7" data-loc="Meeting notes">Goodwill IL review &middot; 7/7</button></p>
                <div class="subsite__status"><span class="pill pill--amber">Needs approval</span></div>
              </div>
              <div class="subsite">
                <div class="subsite__name">Canton</div>
                <p>Field progress solid. Only pending item is a marketing color decision on two columns.
                  <br /><button class="src" data-type="Meeting" data-title="Goodwill IL portfolio review" data-date="Jul 7" data-loc="Meeting notes">Goodwill IL review &middot; 7/7</button></p>
                <div class="subsite__status"><span class="pill pill--pos">On track</span></div>
              </div>
              <div class="subsite">
                <div class="subsite__name">Galesburg</div>
                <p>Progressing, but knee-wall framing paused pending in-person layout review. Birch door supplier decision unresolved.
                  <br /><button class="src" data-type="Meeting" data-title="Goodwill IL portfolio review" data-date="Jul 7" data-loc="Meeting notes">Goodwill IL review &middot; 7/7</button></p>
                <div class="subsite__status"><span class="pill pill--amber">Paused</span></div>
              </div>
              <div class="subsite">
                <div class="subsite__name">McCombs</div>
                <p>Start planned week of 7/20 or 7/27 — contracts must be finalized first.
                  <br /><button class="src" data-type="Document" data-title="McCombs — contract finalization" data-date="Jul 7" data-loc="SharePoint">Contract status &middot; 7/7</button></p>
                <div class="subsite__status"><span class="pill pill--info">Not started</span></div>
              </div>
            </div>
          </div>
        </details>

      </div>
    </section>

  </main>
</div>

<footer>
  <div class="footer__inner">
    <div class="footer__cov">
      <b>Source coverage</b> &middot; 07 Jul 2026 &middot; 06:00&ndash;18:00 ET window<br />
      11 meetings &middot; 95 emails &middot; 0 teams messages &middot; 16 documents &middot; 478 lower-signal items filtered<br />
      122 sources synthesized across the July 7 business day
    </div>
    <div class="footer__note">
      Prototype layout populated from the July 7 brief. Source links are illustrative — they show what each claim traces back to.
      <div class="footer__verify">Compiled 2026-07-07 &middot; AI-assisted — verify before acting</div>
    </div>
  </div>
</footer>
`;
