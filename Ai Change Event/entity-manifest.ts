/**
 * entity-manifest.ts
 * ------------------------------------------------------------------
 * Single source of truth for AI-guided entity creation.
 *
 * One manifest per entity type (change_event, prime_contract, budget_modification, ...).
 * The SAME manifest is consumed by three things — write the data once:
 *   1. The React form renderer (the generative-UI card the user edits)
 *   2. The runtime validator (buildZodSchema below)
 *   3. The agent (propose_entity tool + guided-creation skill read field
 *      metadata to know what to ask and why)
 *
 * Adding a new entity = author one manifest JSON + one skill resource doc.
 * Zero new tool code, zero new validation code.
 * ------------------------------------------------------------------
 */

import { z } from 'zod';

/** What kind of attention each field needs from the agent. */
export type FieldPriority =
  | 'required'     // entity cannot be created without it; agent must collect
  | 'recommended'  // not enforced, but the agent ACTIVELY pursues it (the fix
                   // for "it didn't even try the optionals")
  | 'optional'     // agent names it as available, does not push
  | 'system';      // derived/auto (number, status, created_by_id) — agent NEVER
                   // asks, never shows as an editable card field

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'currency'
  | 'integer'
  | 'select'
  | 'date'
  | 'boolean'
  | 'reference'; // FK picker (commitment, contract, vendor, cost code...)

/** How a `system` or pre-fillable field is populated without asking the user. */
export type DerivationSource =
  | 'sequence'      // next number in series, e.g. CE-014  (uses numberPrefix)
  | 'auth.user'     // current user id  -> created_by_id
  | 'default'       // manifest-provided default (status -> 'open')
  | 'project'       // inherited from active project context
  | 'computed';     // derived from other field values (see `computeFrom`)

export interface ReferenceConfig {
  /** DB table the picker reads from. */
  table: string;
  /** Column shown to the human. */
  labelField: string;
  /** Column written to the FK. */
  valueField: string;
  /** Optional filter applied to the options (e.g. scope to active project). */
  scopeToProject?: boolean;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  /** For text: min length. */
  minLength?: number;
  maxLength?: number;
  /** Regex source string (kept as string so the manifest stays JSON-safe). */
  pattern?: string;
  /** Custom human-readable message on failure. */
  message?: string;
}

export interface EntityFieldDef {
  /** Object key in the payload AND the DB column (see `column` to override). */
  key: string;
  /** DB column if it differs from `key`. */
  column?: string;
  label: string;
  type: FieldType;
  priority: FieldPriority;

  /** Shown under the field in the card. Renderer-facing help. */
  description?: string;
  placeholder?: string;
  unit?: string; // 'days', '$', '%'

  /**
   * Agent-facing rationale. This is what makes the difference between an
   * agent that collects required fields and stops, and one that knows WHY a
   * recommended field matters and can make the case to the user in one line.
   * The guided-creation skill surfaces this verbatim when pursuing a field.
   */
  whyItMatters?: string;

  /** For priority:'system' or pre-fillable fields. */
  derivedFrom?: DerivationSource;
  default?: string | number | boolean;
  computeFrom?: string[]; // keys this value is computed from

  /** type:'select' */
  options?: Array<{ value: string; label: string }>;
  /** type:'reference' */
  reference?: ReferenceConfig;

  /** Only ask/show when this predicate field is truthy. */
  dependsOn?: string;

  validation?: FieldValidation;
}

export interface EntitySection {
  id: string;
  title: string;
  description?: string;
  fieldKeys: string[];
}

export type PostCreateMode =
  | 'insight'          // terminal entity (change event): close with analysis
  | 'insight+route';   // workflow-start entity (RFI, submittal): analyze + kick

export interface InsightQuery {
  /** Which RAG/analytics surface to hit. Maps to existing python tools. */
  source:
    | 'search_all_knowledge'
    | 'search_decisions'
    | 'search_risks'
    | 'structured_analytics_query';
  /** Templated query; {{field}} interpolates the committed payload. */
  query: string;
  /** One-line framing for how the result is presented back. */
  framing: string;
}

export interface RouteConfig {
  /** Workflow to start once the entity is committed (RFI/submittal only). */
  workflow: string;
  assigneeFrom?: string; // field key holding the assignee, or 'default'
}

export interface EntityManifest {
  entityType: string;        // 'change_event'
  label: string;             // 'Change Event'
  table: string;             // 'change_events'
  /** Prefix for sequence-derived numbers: 'CE' -> CE-014. */
  numberPrefix?: string;
  /** Field key used as the entity's display title. */
  titleField: string;

  fields: EntityFieldDef[];
  sections: EntitySection[];

  postCreate: PostCreateMode;
  insightQueries?: InsightQuery[];
  route?: RouteConfig;

  /**
   * Honest record of fields the PRODUCT/agent should capture but the current
   * DB schema cannot store. The agent reads this and refuses to silently drop
   * such data; the team reads this as a migration backlog. Keeps the manifest
   * truthful instead of pretending columns exist.
   */
  schemaGaps?: Array<{ field: string; reason: string; suggestedColumn: string }>;
}

/* ------------------------------------------------------------------ *
 * Runtime validation generated FROM the manifest. Write-once.
 * ------------------------------------------------------------------ */

function fieldToZod(f: EntityFieldDef): z.ZodTypeAny {
  let base: z.ZodTypeAny;

  switch (f.type) {
    case 'number':
    case 'currency':
    case 'integer': {
      let n = z.number({ message: `${f.label} must be a number` });
      if (f.type === 'integer') n = n.int();
      if (f.validation?.min != null) n = n.min(f.validation.min);
      if (f.validation?.max != null) n = n.max(f.validation.max);
      base = n;
      break;
    }
    case 'boolean':
      base = z.boolean();
      break;
    case 'select':
      base = f.options?.length
        ? z.enum(f.options.map((o) => o.value) as [string, ...string[]])
        : z.string();
      break;
    case 'reference':
    case 'date':
    case 'text':
    case 'textarea':
    default: {
      let s = z.string();
      if (f.validation?.minLength != null) s = s.min(f.validation.minLength);
      if (f.validation?.maxLength != null) s = s.max(f.validation.maxLength);
      if (f.validation?.pattern) s = s.regex(new RegExp(f.validation.pattern));
      base = s;
      break;
    }
  }

  if (f.validation?.message) {
    // attach message at the field level where supported
    base = base.describe(f.validation.message);
  }

  // Only 'required' is enforced. 'system' fields are derived server-side and
  // excluded from the human-editable schema. Everything else is optional.
  if (f.priority === 'required') return base;
  return base.optional();
}

/** Build the zod object the card validates against (excludes system fields). */
export function buildZodSchema(manifest: EntityManifest) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of manifest.fields) {
    if (f.priority === 'system') continue;
    shape[f.key] = fieldToZod(f);
  }
  return z.object(shape);
}

/* ------------------------------------------------------------------ *
 * Adapter to the EXISTING create-project form renderer.
 * That renderer already reads { label, required, description, type } and
 * calls renderFieldControl(field). This maps manifest fields onto that shape
 * so the human page and the agent card render from one source — no second
 * renderer, no drift. (Note: replace create-project's amber statusHint with a
 * design-system color; amber violates the green/blue/red status palette.)
 * ------------------------------------------------------------------ */

export interface RenderableField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  description?: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  reference?: ReferenceConfig;
  /** Visual tier so the card can group required > recommended > optional. */
  tier: Exclude<FieldPriority, 'system'>;
}

export function toRenderableFields(manifest: EntityManifest): RenderableField[] {
  return manifest.fields
    .filter((f) => f.priority !== 'system')
    .map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.priority === 'required',
      description: f.description,
      placeholder: f.placeholder,
      options: f.options,
      reference: f.reference,
      tier: f.priority as Exclude<FieldPriority, 'system'>,
    }));
}

/** Fields the agent should pursue after required ones are satisfied. */
export function recommendedKeys(manifest: EntityManifest): string[] {
  return manifest.fields
    .filter((f) => f.priority === 'recommended')
    .map((f) => f.key);
}
