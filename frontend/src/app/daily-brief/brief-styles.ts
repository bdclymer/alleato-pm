// Styles for the bespoke, full-viewport "Daily Executive Brief" document.
//
// This is an intentionally editorial layout (masthead + index rail + sections)
// that does NOT use the standard app design system — it is a standalone
// executive artifact, closer to a printed brief than an app screen. Because
// the markup uses raw headings, links and a hand-built palette on purpose, the
// body HTML is built from the live brief packet in build-brief.ts and rendered
// as an HTML string (see DailyBriefDocument) so it stays faithful to the design
// without fighting the design-system gates that target standard app screens.
//
// The body is populated from the real executive-brief packet, so every `.src`
// citation is a real link to its source (Fireflies meeting, Outlook email,
// document, or the in-app meeting page).

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

  /* ---- real-data additions ---- */
  /* A source with no resolvable link renders muted and non-interactive. */
  .daily-brief .src--plain { color: var(--ink-mute); border-bottom-color: transparent; cursor: default; }
  .daily-brief .src--plain:hover { color: var(--ink-mute); }
  .daily-brief a.src { text-decoration: none; }

  /* Empty / thin-brief state */
  .daily-brief .brief-empty { max-width: 60ch; margin: 0 auto; padding: 96px 24px; text-align: center; }
  .daily-brief .brief-empty h2 { font-family: var(--font-display); font-weight: 700; font-size: 1.5rem; letter-spacing: -0.01em; color: var(--blueprint); margin: 0 0 12px; }
  .daily-brief .brief-empty p { color: var(--ink-soft); font-size: 15px; line-height: 1.6; margin: 0; }

  /* Today's meetings — direct links to each transcript */
  .daily-brief .meetings { display: grid; gap: 1px; background: var(--line); border: 1px solid var(--line); }
  .daily-brief .meeting-row { background: var(--surface); display: grid; grid-template-columns: 1fr auto; gap: 6px 16px; padding: 14px 16px; align-items: baseline; }
  .daily-brief .meeting-row__title { font-family: var(--font-display); font-weight: 600; font-size: 0.98rem; letter-spacing: -0.01em; }
  .daily-brief .meeting-row__title a { color: var(--ink); text-decoration: none; }
  .daily-brief .meeting-row__title a:hover { color: var(--structural); }
  .daily-brief .meeting-row__meta { font-family: var(--font-mono); font-size: 11.5px; color: var(--ink-mute); white-space: nowrap; }
  .daily-brief .meeting-row p { grid-column: 1 / -1; margin: 0; font-size: 13.5px; line-height: 1.45; color: var(--ink-soft); }
`;
