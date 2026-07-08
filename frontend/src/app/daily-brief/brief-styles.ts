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
  /* Heading + body fonts come from the design system (Inter, loaded by the root
     layout as --font-sans). Only the monospace figure/label face is fetched, and
     that matches the app's --font-mono (JetBrains Mono). No serif/display webfont
     is fetched anymore — this both aligns the brief with the product typeface and
     removes a render-blocking external font request that hurt mobile load. */
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap');

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

    /* Design-system typeface (Inter) for both display + body; JetBrains Mono for
       figures/labels. --font-sans / --font-mono are provided by the root layout. */
    --font-display: var(--font-sans, "Inter", system-ui, sans-serif);
    --font-body: var(--font-sans, "Inter", system-ui, sans-serif);
    --font-mono: "JetBrains Mono", ui-monospace, monospace;

    --maxw: 1200px;

    background: var(--paper);
    color: var(--ink);
    font-family: var(--font-body);
    font-size: 16px;
    line-height: 1.55;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    min-height: 100vh;
    /* Guard against any child (mono figure, long source label) forcing a
       horizontal scroll on narrow screens. */
    width: 100%;
    max-width: 100vw;
    overflow-x: hidden;
    overflow-wrap: anywhere;
    word-break: break-word;
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
  .daily-brief .shell { max-width: var(--maxw); margin: 0 auto; padding: 0 40px; display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: 48px; align-items: start; }

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
  .daily-brief .stat-strip { margin-top: 28px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; background: var(--line); border: 1px solid var(--line); }
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
  .daily-brief .read-grid { margin-top: 26px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; background: var(--line); border: 1px solid var(--line); }
  .daily-brief .read-item { background: var(--surface); padding: 18px 20px; }
  .daily-brief .read-item .eyebrow { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--critical); font-weight: 500; margin-bottom: 8px; }
  .daily-brief .read-item .eyebrow.amber { color: var(--amber); }
  .daily-brief .read-item p { margin: 0; font-size: 15px; line-height: 1.5; color: var(--ink-soft); }
  .daily-brief .read-item p b { color: var(--ink); font-weight: 500; }

  /* ---- decisions ---- */
  .daily-brief .decisions { display: grid; gap: 14px; }
  .daily-brief .decision { background: var(--surface); border: 1px solid var(--line); border-left: 4px solid var(--structural); padding: 20px 22px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px 24px; align-items: start; transition: box-shadow .18s; }
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
  .daily-brief .watch { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 40px; }
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

  /* ---- projects (expandable register) ---- */
  .daily-brief .projects { display: grid; gap: 12px; }
  .daily-brief .proj { background: var(--surface); border: 1px solid var(--line); }
  .daily-brief .proj--feature { border-left: 4px solid var(--amber); }
  .daily-brief .proj > summary { cursor: pointer; display: grid; grid-template-columns: 210px minmax(0, 1fr) auto 16px; gap: 18px; align-items: center; padding: 18px 22px; transition: background .15s; }
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
  .daily-brief .subsite { background: var(--surface); display: grid; grid-template-columns: 150px minmax(0, 1fr) 118px; gap: 16px; padding: 13px 16px; align-items: baseline; }
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
  /* Tablet + small laptop: collapse the two-column shell, turn the index rail into
     a horizontal chip bar, and stack every internal grid. */
  @media (max-width: 900px) {
    .daily-brief .shell { grid-template-columns: minmax(0, 1fr); gap: 0; padding: 0 24px; }
    .daily-brief .rail { position: static; padding-top: 24px; margin-bottom: 8px; }
    .daily-brief .rail nav { flex-direction: row; overflow-x: auto; gap: 6px; -webkit-overflow-scrolling: touch; padding-bottom: 2px; }
    .daily-brief .rail a { border-bottom: none; border: 1px solid var(--line); border-radius: 6px; padding: 8px 12px; white-space: nowrap; }
    .daily-brief .rail a.active { border-left: 1px solid var(--amber); padding-left: 12px; margin-left: 0; }
    .daily-brief .rail a .num { display: none; }
    .daily-brief .rail__foot { display: none; }
    .daily-brief .content { padding-top: 20px; }
    .daily-brief .masthead__inner { padding: 28px 24px 32px; }
    .daily-brief .stat-strip { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
    .daily-brief .read-grid { grid-template-columns: minmax(0, 1fr); }
    .daily-brief .watch { grid-template-columns: minmax(0, 1fr); gap: 32px; }
    .daily-brief .decision { grid-template-columns: minmax(0, 1fr); }
    .daily-brief .decision__due { grid-column: 1; grid-row: auto; text-align: left; margin-top: 4px; }
    .daily-brief .proj > summary { grid-template-columns: minmax(0, 1fr) auto; gap: 8px 12px; }
    .daily-brief .proj__oneline { grid-column: 1 / -1; order: 3; }
    .daily-brief .proj .chev { display: none; }
    .daily-brief .subsite { grid-template-columns: minmax(0, 1fr); gap: 6px; }
    .daily-brief .subsite__status { text-align: left; }
    .daily-brief footer { padding: 28px 24px; }
  }

  /* Phone: single-column everything, tighter gutters, and controls sized for
     touch. This is the band that was previously breaking. */
  @media (max-width: 560px) {
    .daily-brief { font-size: 15.5px; }
    .daily-brief .shell { padding: 0 16px; }
    .daily-brief .masthead__inner { padding: 24px 16px 26px; }
    .daily-brief .masthead__top { gap: 12px; }
    .daily-brief .coverage-stamp { text-align: left; }
    .daily-brief .masthead__date { font-size: clamp(2.1rem, 11vw, 2.8rem); }
    .daily-brief .thesis { font-size: 1.05rem; }
    .daily-brief .stat-strip { grid-template-columns: 1fr; }
    .daily-brief .sec-head { flex-wrap: wrap; gap: 6px 12px; }
    .daily-brief .sec-head h2 { flex: 1 1 100%; }
    .daily-brief .content { padding: 16px 0 32px; }
    .daily-brief section { margin-bottom: 40px; }
    .daily-brief .watch { gap: 24px; }
    .daily-brief .proj > summary { padding: 16px; }
    .daily-brief footer { padding: 24px 16px; }
    .daily-brief .footer__inner { flex-direction: column; gap: 18px; }
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
  .daily-brief .meeting-row { background: var(--surface); display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px 16px; padding: 14px 16px; align-items: baseline; }
  .daily-brief .meeting-row__title { font-family: var(--font-display); font-weight: 600; font-size: 0.98rem; letter-spacing: -0.01em; }
  .daily-brief .meeting-row__title a { color: var(--ink); text-decoration: none; }
  .daily-brief .meeting-row__title a:hover { color: var(--structural); }
  .daily-brief .meeting-row__meta { font-family: var(--font-mono); font-size: 11.5px; color: var(--ink-mute); white-space: nowrap; }
  .daily-brief .meeting-row p { grid-column: 1 / -1; margin: 0; font-size: 13.5px; line-height: 1.45; color: var(--ink-soft); }

  /* ---- calendar (7-day week strip) ---- */
  /* Horizontal, scroll-snapping strip: reads as a week at a glance on desktop and
     swipes cleanly on a phone. Each day shows its meetings + any due items. */
  .daily-brief .cal-strip {
    display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr);
    gap: 1px; background: var(--line); border: 1px solid var(--line);
    overflow-x: auto; -webkit-overflow-scrolling: touch; scroll-snap-type: x proximity;
  }
  .daily-brief .cal-day { background: var(--surface); padding: 12px 12px 14px; min-height: 132px; display: flex; flex-direction: column; gap: 8px; scroll-snap-align: start; }
  .daily-brief .cal-day.is-today { background: #FBFBF7; box-shadow: inset 0 3px 0 var(--amber); }
  .daily-brief .cal-day.is-weekend { background: #F4F5F1; }
  .daily-brief .cal-day__head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--line-soft); }
  .daily-brief .cal-day__dow { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-mute); }
  .daily-brief .cal-day.is-today .cal-day__dow { color: var(--amber); font-weight: 700; }
  .daily-brief .cal-day__num { font-family: var(--font-display); font-weight: 700; font-size: 1.05rem; color: var(--blueprint); line-height: 1; }
  .daily-brief .cal-event { display: block; font-size: 12.5px; line-height: 1.3; color: var(--ink); text-decoration: none; padding: 5px 0; border-bottom: 1px dotted var(--line-soft); }
  .daily-brief a.cal-event:hover { color: var(--structural); }
  .daily-brief .cal-event:last-child { border-bottom: none; }
  .daily-brief .cal-event__time { font-family: var(--font-mono); font-size: 10.5px; color: var(--ink-mute); display: block; }
  .daily-brief .cal-event.is-due { color: var(--critical); }
  .daily-brief .cal-day__empty { font-size: 12px; color: var(--ink-mute); font-style: italic; margin-top: 2px; }

  /* ---- action list (checkable rollup of every recommended/next action) ---- */
  .daily-brief .actions { display: grid; gap: 1px; background: var(--line); border: 1px solid var(--line); }
  .daily-brief .action-item { background: var(--surface); display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 14px; padding: 15px 18px; align-items: start; }
  .daily-brief .action-item.is-done { opacity: 0.55; }
  .daily-brief .action-item.is-done .action-item__text { text-decoration: line-through; text-decoration-color: var(--ink-mute); }
  .daily-brief .action-check { appearance: none; -webkit-appearance: none; width: 18px; height: 18px; margin-top: 2px; border: 1.5px solid var(--line); border-radius: 4px; background: var(--surface); cursor: pointer; position: relative; flex: none; transition: border-color .15s, background .15s; }
  .daily-brief .action-check:hover { border-color: var(--structural); }
  .daily-brief .action-check:checked { background: var(--positive); border-color: var(--positive); }
  .daily-brief .action-check:checked::after { content: "✓"; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; font-weight: 700; }
  .daily-brief .action-item__body { min-width: 0; }
  .daily-brief .action-item__text { font-size: 14.5px; line-height: 1.45; color: var(--ink); }
  .daily-brief .action-item__owner { font-family: var(--font-mono); font-size: 11px; color: var(--ink-mute); margin-top: 5px; }
  .daily-brief .action-item__owner b { color: var(--blueprint); font-weight: 700; }
  .daily-brief .action-item__meta { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }

  /* ---- cross-day carryover ("still open from yesterday") ---- */
  .daily-brief #carryover .sec-head { border-bottom-color: var(--amber); }
  .daily-brief .carryover { display: grid; gap: 10px; }
  .daily-brief .carry-item { background: var(--amber-bg); border: 1px solid #E8D9B4; border-left: 3px solid var(--amber); border-radius: 4px; padding: 14px 16px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 16px; align-items: start; }
  .daily-brief .carry-item__ref { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--amber); grid-column: 1 / -1; }
  .daily-brief .carry-item h4 { font-family: var(--font-display); font-weight: 700; font-size: 1rem; margin: 0; letter-spacing: -0.01em; }
  .daily-brief .carry-item p { margin: 4px 0 0; font-size: 13.5px; line-height: 1.45; color: var(--ink-soft); }
  .daily-brief .carry-item__age { font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--amber); white-space: nowrap; }

  /* ---- feedback control (feeds the AI learning loop) ---- */
  /* Deliberately quiet: a single low-contrast trigger per item that opens a small
     accurate / inaccurate / done menu. Marking an item writes an ai_feedback_events
     row and visually settles the item. */
  .daily-brief .fb { position: relative; display: inline-flex; align-items: center; margin-left: 6px; vertical-align: middle; }
  .daily-brief .fb-trigger { appearance: none; background: none; border: none; cursor: pointer; padding: 3px 6px; border-radius: 4px; color: var(--ink-mute); font-family: var(--font-mono); font-size: 12px; line-height: 1; letter-spacing: 0.04em; }
  .daily-brief .fb-trigger:hover { color: var(--structural); background: var(--paper); }
  .daily-brief .fb-menu { position: absolute; top: calc(100% + 4px); right: 0; z-index: 40; display: none; background: var(--surface); border: 1px solid var(--line); border-radius: 6px; box-shadow: 0 10px 30px rgba(13,36,52,0.14); padding: 4px; min-width: 168px; }
  .daily-brief .fb.is-open .fb-menu { display: block; }
  .daily-brief .fb-btn { display: flex; width: 100%; align-items: center; gap: 8px; background: none; border: none; cursor: pointer; text-align: left; padding: 8px 10px; border-radius: 4px; font-family: var(--font-body); font-size: 13px; color: var(--ink); }
  .daily-brief .fb-btn:hover { background: var(--paper); }
  .daily-brief .fb-btn .fb-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
  .daily-brief .fb-btn[data-signal="positive"] .fb-dot { background: var(--positive); }
  .daily-brief .fb-btn[data-signal="negative"] .fb-dot { background: var(--critical); }
  .daily-brief .fb-btn[data-signal="completed"] .fb-dot { background: var(--structural); }
  .daily-brief [data-fb-item].is-flagged { position: relative; }
  .daily-brief [data-fb-item].is-flagged::after { content: attr(data-fb-label); position: absolute; top: 8px; right: 10px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; padding: 2px 7px; border-radius: 3px; }
  .daily-brief [data-fb-item].is-flagged.fb--positive::after { background: var(--positive-bg); color: var(--positive); }
  .daily-brief [data-fb-item].is-flagged.fb--negative::after { background: var(--critical-bg); color: var(--critical); }
  .daily-brief [data-fb-item].is-flagged.fb--completed { opacity: 0.6; }
  .daily-brief [data-fb-item].is-flagged.fb--completed::after { background: #DEEAF2; color: var(--structural); }
  .daily-brief .fb-trigger.is-busy { opacity: 0.5; pointer-events: none; }

  /* Phone calendar: wide, swipeable day cards instead of 7 cramped columns.
     Placed last so it wins over the base .cal-strip rule at equal specificity. */
  @media (max-width: 560px) {
    .daily-brief .cal-strip { grid-auto-columns: 82%; }
    .daily-brief .cal-day { min-height: 116px; }
  }
`;
