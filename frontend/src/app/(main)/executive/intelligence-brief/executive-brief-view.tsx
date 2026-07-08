import type {
  BriefSeverity,
  DecisionItem,
  ExecutiveBriefViewModel,
  InlineSegment,
  MoneyStat,
  OperationRow,
  ProjectCard,
  ReadItem,
} from "@/lib/daily-briefs/brief-view-model";

import { BriefScrollSpy } from "./brief-scroll-spy";

// Maps a severity to the class-name suffix each element family uses.
const DOT_CLASS: Record<"critical" | "amber" | "positive", string> = {
  critical: "dot--crit",
  amber: "dot--amber",
  positive: "dot--pos",
};
const BADGE_CLASS: Record<BriefSeverity, string> = {
  critical: "badge--crit",
  amber: "badge--amber",
  positive: "badge--pos",
  info: "badge--info",
};
const DECISION_CLASS: Record<BriefSeverity, string> = {
  critical: "is-critical",
  amber: "is-amber",
  positive: "is-positive",
  info: "",
};
const READ_EYEBROW_CLASS: Record<BriefSeverity, string> = {
  critical: "",
  amber: "amber",
  positive: "pos",
  info: "info",
};
const TAG_INLINE_CLASS: Record<BriefSeverity, string> = {
  critical: "ti--crit",
  amber: "ti--amber",
  positive: "ti--pos",
  info: "ti--info",
};
const STATUS_DOT_CLASS: Record<BriefSeverity, string> = {
  critical: "sd--crit",
  amber: "sd--amber",
  positive: "sd--pos",
  info: "sd--info",
};
const OP_TAG_CLASS: Record<BriefSeverity, string> = {
  critical: "t--crit",
  amber: "t--amber",
  positive: "t--pos",
  info: "t--info",
};
const PILL_CLASS: Record<BriefSeverity, string> = {
  critical: "pill--crit",
  amber: "pill--amber",
  positive: "pill--pos",
  info: "pill--info",
};

function Inline({ segments }: { segments: InlineSegment[] }) {
  return (
    <>
      {segments.map((segment, index) =>
        segment.bold ? (
          <b key={index}>{segment.text}</b>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}

type SectionMeta = { id: string; index: string; label: string };

function SectionHead({
  meta,
  count,
}: {
  meta: SectionMeta;
  count?: string | null;
}) {
  return (
    <div className="sec-head">
      <span className="idx">{meta.index}</span>
      <div className="sec-title" role="heading" aria-level={2}>
        {meta.label}
      </div>
      {count ? <span className="count">{count}</span> : null}
    </div>
  );
}

export function ExecutiveBriefView({
  model,
  fontClassName,
}: {
  model: ExecutiveBriefViewModel;
  fontClassName: string;
}) {
  const sections: SectionMeta[] = [];
  if (model.read.lead.length || model.read.items.length)
    sections.push({ id: "read", index: "01", label: "Today's read" });
  if (model.decisions.length)
    sections.push({ id: "decisions", index: "02", label: "Decisions needed" });
  if (model.money.length)
    sections.push({ id: "money", index: "03", label: "Money watch" });
  if (model.operations.length)
    sections.push({ id: "ops", index: "04", label: "Operations & schedule" });
  if (model.projects.length)
    sections.push({ id: "projects", index: "05", label: "Projects" });

  const metaById = Object.fromEntries(sections.map((section) => [section.id, section]));

  return (
    <div className={`exec-brief ${fontClassName}`}>
      <BriefScrollSpy />

      <header className="masthead">
        <div className="masthead__inner">
          <div className="masthead__top">
            <div className="flag">
              Daily Executive Brief · Prepared for <b>{model.preparedFor}</b>
            </div>
            <div className="coverage-stamp">
              Source window {model.sourceWindowLabel}
              <br />
              <span>{model.counts.meetings}</span> meetings ·{" "}
              <span>{model.counts.emails}</span> emails ·{" "}
              <span>{model.counts.teams}</span> teams ·{" "}
              <span>{model.counts.documents}</span> docs
            </div>
          </div>

          <h1 className="masthead__date">
            {model.weekday ? <small>{model.weekday}</small> : null}
            {model.dateLabel}
          </h1>

          {model.thesis ? <p className="thesis">{model.thesis}</p> : null}

          {model.temperature.length ? (
            <div className="temp" role="list" aria-label="Today at a glance">
              {model.temperature.map((pill, index) => (
                <span className="temp-pill" role="listitem" key={index}>
                  <span className={`dot ${DOT_CLASS[pill.tone]}`} />
                  {pill.emphasis ? <b>{pill.emphasis}</b> : null} {pill.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <div className="shell">
        <aside className="rail">
          <div className="rail__title">Contents</div>
          <nav aria-label="Brief sections">
            {sections.map((section) => (
              <a key={section.id} href={`#${section.id}`} data-target={section.id}>
                <span className="num">{section.index}</span>
                <span className="lbl">{section.label}</span>
              </a>
            ))}
          </nav>
          <div className="rail__foot">
            {model.asOfLabel ? (
              <>
                As of {model.asOfLabel}
                <br />
              </>
            ) : null}
            {model.filteredCount != null
              ? `${model.filteredCount} items filtered`
              : null}
          </div>
        </aside>

        <main className="content">
          {metaById.read ? (
            <section id="read">
              <SectionHead meta={metaById.read} />
              {model.read.lead.length ? (
                <p className="lead">
                  <Inline segments={model.read.lead} />
                </p>
              ) : null}
              {model.read.supporting.map((paragraph, index) => (
                <p className="read-sub" key={index}>
                  <Inline segments={paragraph} />
                </p>
              ))}
              {model.read.items.length ? (
                <div className="read-grid">
                  {model.read.items.map((item, index) => (
                    <ReadItemCard key={index} item={item} />
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {metaById.decisions ? (
            <section id="decisions">
              <SectionHead
                meta={metaById.decisions}
                count={`${model.decisions.length} open`}
              />
              <div className="decisions">
                {model.decisions.map((decision, index) => (
                  <DecisionCard key={index} decision={decision} />
                ))}
              </div>
            </section>
          ) : null}

          {metaById.money ? (
            <section id="money">
              <SectionHead meta={metaById.money} />
              <div className="stat-grid">
                {model.money.map((stat, index) => (
                  <MoneyStatCard key={index} stat={stat} />
                ))}
              </div>
            </section>
          ) : null}

          {metaById.ops ? (
            <section id="ops">
              <SectionHead
                meta={metaById.ops}
                count={`${model.operations.length} items`}
              />
              <div className="ops">
                {model.operations.map((row, index) => (
                  <OperationRowItem key={index} row={row} />
                ))}
              </div>
            </section>
          ) : null}

          {metaById.projects ? (
            <section id="projects">
              <SectionHead
                meta={metaById.projects}
                count={`${model.projects.length} active`}
              />
              <div className="projects">
                {model.projects.map((project, index) => (
                  <ProjectCardItem key={index} project={project} />
                ))}
              </div>
            </section>
          ) : null}
        </main>
      </div>

      <footer className="brief-footer">
        <div className="footer__inner">
          <div className="footer__cov">
            <b>Source coverage</b> · {model.sourceWindowLabel} window
            <br />
            {model.counts.meetings} meetings · {model.counts.emails} emails ·{" "}
            {model.counts.teams} teams messages · {model.counts.documents} documents
            {model.filteredCount != null ? (
              <>
                <br />
                {model.filteredCount} lower-signal items filtered out
              </>
            ) : null}
          </div>
          <div className="footer__note">
            Compiled from the canonical daily-executive-brief packet. Figures and
            status reflect the source window above.
          </div>
        </div>
      </footer>
    </div>
  );
}

function ReadItemCard({ item }: { item: ReadItem }) {
  return (
    <div className="read-item">
      <div className={`eyebrow ${READ_EYEBROW_CLASS[item.tone]}`}>{item.eyebrow}</div>
      <p>
        <Inline segments={item.body} />
      </p>
    </div>
  );
}

function DecisionCard({ decision }: { decision: DecisionItem }) {
  return (
    <article className={`decision ${DECISION_CLASS[decision.severity]}`}>
      <div className="decision__head">
        {decision.reference ? (
          <div className="decision__ref">{decision.reference}</div>
        ) : null}
        <div className="decision__title" role="heading" aria-level={3}>
          {decision.title}
        </div>
        {decision.body.length ? (
          <p>
            <Inline segments={decision.body} />
          </p>
        ) : null}
      </div>
      <div className="decision__due">
        <span className={`badge ${BADGE_CLASS[decision.severity]}`}>
          {decision.badge}
        </span>
        {decision.due ? (
          <span className="due-when">
            {decision.due.label} {decision.due.value ? <b>{decision.due.value}</b> : null}
          </span>
        ) : null}
      </div>
    </article>
  );
}

function MoneyStatCard({ stat }: { stat: MoneyStat }) {
  return (
    <div className="stat">
      <span className={`tag-inline ${TAG_INLINE_CLASS[stat.severity]}`}>{stat.tag}</span>
      <div className="stat__top">
        <span className="stat__label">{stat.label}</span>
        <span className="stat__fig mono">{stat.figure}</span>
      </div>
      <p>
        <Inline segments={stat.body} />
      </p>
    </div>
  );
}

function OperationRowItem({ row }: { row: OperationRow }) {
  return (
    <div className="op-row">
      <span className={`status-dot ${STATUS_DOT_CLASS[row.severity]}`} />
      <div className="op-row__body">
        <div className="op-title" role="heading" aria-level={3}>
          {row.title}
        </div>
        {row.body.length ? (
          <p>
            <Inline segments={row.body} />
          </p>
        ) : null}
      </div>
      <div className={`op-row__tag ${OP_TAG_CLASS[row.severity]}`}>{row.tag}</div>
    </div>
  );
}

function ProjectCardItem({ project }: { project: ProjectCard }) {
  return (
    <div className="project">
      <div className="project__top">
        <div className="project__name" role="heading" aria-level={3}>
          {project.name}
          {project.subtitle ? <small>{project.subtitle}</small> : null}
        </div>
        <span className={`pill ${PILL_CLASS[project.severity]}`}>{project.pill}</span>
      </div>
      {project.body.length ? (
        <p>
          <Inline segments={project.body} />
        </p>
      ) : null}
      {project.figures.length ? (
        <div className="project__figs">
          {project.figures.map((figure, index) => (
            <span className="fig" key={index}>
              <Inline segments={figure.label} />
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
