import { getPool } from "./pool";

export interface ProjectSyncRecord {
  id: string;
  externalProjectId: bigint;
  projectId: number;
  projectName: string;
  projectNumber: string | null;
  matchMethod: string;
}

export async function resolveProjectSync(
  ...parts: Array<string | null | undefined>
): Promise<ProjectSyncRecord | null> {
  const text = parts.filter(Boolean).join("\n");
  const explicitProjectId = extractExplicitProjectId(text);

  if (explicitProjectId !== null) {
    const project = await findProjectById(toProjectId(explicitProjectId), "proj_token");
    if (project) {
      return getOrCreateProjectSync(project);
    }
  }

  const projectNumberMatch = await findProjectByProjectNumber(text);
  if (projectNumberMatch) {
    return getOrCreateProjectSync(projectNumberMatch);
  }

  const projectNameMatch = await findProjectByName(text);
  if (projectNameMatch) {
    return getOrCreateProjectSync(projectNameMatch);
  }

  return null;
}

export async function getOrCreateProjectSync(project: ProjectMatch): Promise<ProjectSyncRecord> {
  const externalProjectId = BigInt(project.projectId);
  const result = await getPool().query<{ id: string; external_project_id: string }>(
    `
      insert into projects_sync (id, external_project_id, name)
      values (gen_random_uuid(), $1, $2)
      on conflict (external_project_id)
      do update set name = coalesce(projects_sync.name, excluded.name)
      returning id, external_project_id
    `,
    [externalProjectId.toString(), project.projectName],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error(`Unable to resolve projects_sync row for PROJ-${externalProjectId.toString()}.`);
  }

  return {
    id: row.id,
    externalProjectId: BigInt(row.external_project_id),
    projectId: project.projectId,
    projectName: project.projectName,
    projectNumber: project.projectNumber,
    matchMethod: project.matchMethod,
  };
}

interface ProjectMatch {
  projectId: number;
  projectName: string;
  projectNumber: string | null;
  matchMethod: string;
}

async function findProjectById(
  projectId: number,
  matchMethod: string,
): Promise<ProjectMatch | null> {
  const result = await getPool().query<ProjectRow>(
    `
      select id, name, project_number
      from projects
      where id = $1
      limit 1
    `,
    [projectId],
  );

  const row = result.rows[0];
  return row ? toProjectMatch(row, matchMethod) : null;
}

async function findProjectByProjectNumber(text: string): Promise<ProjectMatch | null> {
  const result = await getPool().query<ProjectRow>(
    `
      select id, name, project_number
      from projects
      where project_number is not null
        and project_number <> ''
        and position(lower(project_number) in lower($1)) > 0
      order by length(project_number) desc
      limit 1
    `,
    [text],
  );

  const row = result.rows[0];
  return row ? toProjectMatch(row, "project_number") : null;
}

async function findProjectByName(text: string): Promise<ProjectMatch | null> {
  const normalizedText = normalize(text);
  if (!normalizedText) {
    return null;
  }

  const result = await getPool().query<ProjectRow>(
    `
      select id, name, project_number
      from projects
      where name is not null
        and length(trim(name)) >= 5
      order by length(name) desc
    `,
  );

  for (const row of result.rows) {
    const normalizedName = normalize(row.name);
    if (normalizedName.length >= 5 && normalizedText.includes(normalizedName)) {
      return toProjectMatch(row, "project_name");
    }
  }

  return null;
}

function toProjectId(externalProjectId: bigint): number {
  if (externalProjectId > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(
      `External project id ${externalProjectId.toString()} cannot be safely written to project_emails.project_id integer.`,
    );
  }
  return Number(externalProjectId);
}

function extractExplicitProjectId(text: string): bigint | null {
  const match = /\bPROJ-(\d{1,18})\b/i.exec(text);
  return match ? BigInt(match[1]) : null;
}

function toProjectMatch(row: ProjectRow, matchMethod: string): ProjectMatch {
  return {
    projectId: Number(row.id),
    projectName: row.name || row.project_number || `Project ${row.id}`,
    projectNumber: row.project_number,
    matchMethod,
  };
}

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface ProjectRow {
  id: string | number;
  name: string | null;
  project_number: string | null;
}
