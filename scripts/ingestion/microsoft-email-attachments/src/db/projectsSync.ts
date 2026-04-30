import { getPool } from "./pool";

export interface ProjectSyncRecord {
  id: string;
  projectId: number;
  projectName: string;
  projectNumber: string | null;
  matchMethod: string;
}

interface ProjectRow {
  id: string | number;
  name: string | null;
  project_number: string | null;
}

export async function resolveProjectSync(
  ...parts: Array<string | null | undefined>
): Promise<ProjectSyncRecord | null> {
  const text = parts.filter(Boolean).join("\n");

  const explicit = /\b(?:PROJ|PROJECT)-(\d{1,18})\b/i.exec(text);
  if (explicit) {
    const project = await findProjectById(Number(explicit[1]), "proj_token");
    if (project) return getOrCreateProjectSync(project);
  }

  const byNumber = await findProjectByProjectNumber(text);
  if (byNumber) return getOrCreateProjectSync(byNumber);

  const byName = await findProjectByName(text);
  if (byName) return getOrCreateProjectSync(byName);

  return null;
}

async function getOrCreateProjectSync(project: ProjectSyncRecord): Promise<ProjectSyncRecord> {
  const result = await getPool().query<{ id: string }>(
    `
      insert into projects_sync (id, external_project_id, name)
      values (gen_random_uuid(), $1, $2)
      on conflict (external_project_id)
      do update set name = excluded.name
      returning id
    `,
    [project.projectId, project.projectName],
  );

  return { ...project, id: result.rows[0].id };
}

async function findProjectById(id: number, matchMethod: string): Promise<ProjectSyncRecord | null> {
  const result = await getPool().query<ProjectRow>(
    `select id, name, project_number from projects where id = $1 limit 1`,
    [id],
  );
  return result.rows[0] ? toProject(result.rows[0], matchMethod) : null;
}

async function findProjectByProjectNumber(text: string): Promise<ProjectSyncRecord | null> {
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
  return result.rows[0] ? toProject(result.rows[0], "project_number") : null;
}

async function findProjectByName(text: string): Promise<ProjectSyncRecord | null> {
  const normalizedText = normalize(text);
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
    if (normalize(row.name).length >= 5 && normalizedText.includes(normalize(row.name))) {
      return toProject(row, "project_name");
    }
  }
  return null;
}

function toProject(row: ProjectRow, matchMethod: string): ProjectSyncRecord {
  return {
    id: "",
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
