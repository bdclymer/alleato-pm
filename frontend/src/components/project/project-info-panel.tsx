"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { EditableDetailField } from "@/components/ds";
import { apiFetch } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";
import { useCompanies } from "@/hooks/use-companies";
import type { Database } from "@/types/database.types";
import {
  STAGE_OPTIONS,
  PHASE_OPTIONS,
  WORK_SCOPE_OPTIONS,
  PROJECT_SECTOR_OPTIONS,
  DELIVERY_METHOD_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  TIMEZONE_OPTIONS,
  COUNTRY_OPTIONS,
  REGION_OPTIONS,
  OFFICE_OPTIONS,
  US_STATE_OPTIONS,
} from "@/lib/create-project/form";

type Project = Database["public"]["Tables"]["projects"]["Row"];

interface ProjectInfoPanelProps {
  project: Project;
}

const stringOptions = (values: readonly string[]) =>
  values.map((value) => ({ value, label: value }));

const str = (value: unknown): string =>
  typeof value === "string"
    ? value
    : typeof value === "number"
      ? String(value)
      : "";

const dateValue = (value: unknown): string => str(value).slice(0, 10);

/**
 * Inline-editable Project Info panel for the project home right rail.
 * Mirrors every field on the Edit Project form (`edit-project-sidebar.tsx`)
 * so a value set on the form can always be seen and changed here. Each field
 * saves in place via PATCH /api/projects/[projectId] — no redirect to an edit page.
 */
export function ProjectInfoPanel({ project }: ProjectInfoPanelProps) {
  const router = useRouter();
  const [local, setLocal] = React.useState<Project>(project);
  const { options: companyOptions } = useCompanies();

  // Re-sync when the server component re-renders with fresh data.
  React.useEffect(() => setLocal(project), [project]);

  const record = local as unknown as Record<string, unknown>;
  const meta =
    (local.summary_metadata as Record<string, unknown> | null) ?? {};

  const companyLabel = companyOptions.find(
    (option) => option.value === local.company_id,
  )?.label;

  // Persist one or more real DB columns, then optimistically update + refresh.
  const patchColumns = React.useCallback(
    async (columns: Record<string, unknown>) => {
      await apiFetch(`/api/projects/${local.id}`, {
        method: "PATCH",
        body: JSON.stringify(columns),
      });
      setLocal((prev) => ({ ...prev, ...columns }) as Project);
      router.refresh();
    },
    [local.id, router],
  );

  // Persist a single key inside the summary_metadata JSONB blob (merge, never replace).
  const patchMeta = React.useCallback(
    async (key: string, value: unknown) => {
      const merged = { ...meta, [key]: value };
      await apiFetch(`/api/projects/${local.id}`, {
        method: "PATCH",
        body: JSON.stringify({ summary_metadata: merged }),
      });
      setLocal((prev) => ({ ...prev, summary_metadata: merged }) as Project);
      router.refresh();
    },
    [local.id, meta, router],
  );

  const blankToNull = (value: string) => (value.trim() === "" ? null : value);

  return (
    <div className="space-y-3">
      {/* ── General ── */}
      <EditableDetailField
        label="Project Name"
        value={str(local.name)}
        onSave={(v) => patchColumns({ name: v })}
      />
      <EditableDetailField
        label="Job Number"
        value={str(record["job number"]) || str(local.project_number)}
        emptyPlaceholder="Set job #"
        onSave={(v) => patchColumns({ "job number": blankToNull(v) })}
      />
      <EditableDetailField
        label="Status"
        type="select"
        value={str(local.stage)}
        options={stringOptions(STAGE_OPTIONS)}
        emptyPlaceholder="Set status"
        onSave={(v) => patchColumns({ stage: blankToNull(v) })}
      />
      <EditableDetailField
        label="Phase"
        type="select"
        value={str(local.phase)}
        options={stringOptions(PHASE_OPTIONS)}
        emptyPlaceholder="Set phase"
        onSave={(v) => patchColumns({ phase: blankToNull(v) })}
      />
      <EditableDetailField
        label="Client"
        type="select"
        value={str(local.company_id)}
        display={companyLabel ?? (local.company_id ? "—" : undefined)}
        options={companyOptions}
        emptyPlaceholder="Set client"
        onSave={(v) => patchColumns({ company_id: blankToNull(v) })}
      />
      <EditableDetailField
        label="Type"
        type="select"
        value={str(local.type) || str(local.category)}
        options={stringOptions(PROJECT_TYPE_OPTIONS)}
        emptyPlaceholder="Set type"
        onSave={(v) =>
          patchColumns({ type: blankToNull(v), category: blankToNull(v) })
        }
      />
      <EditableDetailField
        label="Work Scope"
        type="select"
        value={str(local.work_scope)}
        options={stringOptions(WORK_SCOPE_OPTIONS)}
        emptyPlaceholder="Set scope"
        onSave={(v) => patchColumns({ work_scope: blankToNull(v) })}
      />
      <EditableDetailField
        label="Project Sector"
        type="select"
        value={str(local.project_sector)}
        options={stringOptions(PROJECT_SECTOR_OPTIONS)}
        emptyPlaceholder="Set sector"
        onSave={(v) => patchColumns({ project_sector: blankToNull(v) })}
      />
      <EditableDetailField
        label="Delivery Method"
        type="select"
        value={str(local.delivery_method)}
        options={stringOptions(DELIVERY_METHOD_OPTIONS)}
        emptyPlaceholder="Set method"
        onSave={(v) => patchColumns({ delivery_method: blankToNull(v) })}
      />
      <EditableDetailField
        label="Description"
        type="textarea"
        value={str(local.summary)}
        emptyPlaceholder="Add description"
        onSave={(v) => patchColumns({ summary: blankToNull(v) })}
      />

      {/* ── Metrics ── */}
      <EditableDetailField
        label="Square Footage"
        type="number"
        value={str(meta.square_footage)}
        emptyPlaceholder="Set sq ft"
        onSave={(v) =>
          patchMeta(
            "square_footage",
            v.trim() === "" ? null : Number(v.replace(/[$,]/g, "")),
          )
        }
      />
      <EditableDetailField
        label="Total Value"
        type="number"
        value={str(record["est revenue"])}
        display={
          record["est revenue"] != null
            ? formatCurrency(Number(record["est revenue"]))
            : undefined
        }
        emptyPlaceholder="Set value"
        onSave={(v) =>
          patchColumns({
            "est revenue":
              v.trim() === "" ? null : Number(v.replace(/[$,]/g, "")),
          })
        }
      />

      {/* ── Location ── */}
      <EditableDetailField
        label="Office"
        type="select"
        value={str(meta.office)}
        options={OFFICE_OPTIONS}
        emptyPlaceholder="Set office"
        onSave={(v) => patchMeta("office", blankToNull(v))}
      />
      <EditableDetailField
        label="Country"
        type="select"
        value={str(meta.country)}
        options={COUNTRY_OPTIONS}
        emptyPlaceholder="Set country"
        onSave={(v) => patchMeta("country", blankToNull(v))}
      />
      <EditableDetailField
        label="Street Address"
        value={str(local.address)}
        emptyPlaceholder="Set address"
        onSave={(v) => patchColumns({ address: blankToNull(v) })}
      />
      <EditableDetailField
        label="City"
        value={str(meta.city)}
        emptyPlaceholder="Set city"
        onSave={(v) => patchMeta("city", blankToNull(v))}
      />
      <EditableDetailField
        label="State"
        type="select"
        value={str(local.state)}
        display={
          US_STATE_OPTIONS.find((o) => o.value === local.state)?.label ??
          undefined
        }
        options={US_STATE_OPTIONS}
        emptyPlaceholder="Set state"
        onSave={(v) => patchColumns({ state: blankToNull(v) })}
      />
      <EditableDetailField
        label="Zip Code"
        value={str(meta.postal_code)}
        emptyPlaceholder="Set zip"
        onSave={(v) => patchMeta("postal_code", blankToNull(v))}
      />
      <EditableDetailField
        label="Timezone"
        type="select"
        value={str(meta.timezone)}
        display={
          TIMEZONE_OPTIONS.find((o) => o.value === meta.timezone)?.label ??
          undefined
        }
        options={TIMEZONE_OPTIONS}
        emptyPlaceholder="Set timezone"
        onSave={(v) => patchMeta("timezone", blankToNull(v))}
      />
      <EditableDetailField
        label="Phone"
        value={str(meta.phone)}
        emptyPlaceholder="Set phone"
        onSave={(v) => patchMeta("phone", blankToNull(v))}
      />
      <EditableDetailField
        label="Region"
        type="select"
        value={str(meta.region)}
        options={REGION_OPTIONS}
        emptyPlaceholder="Set region"
        onSave={(v) => patchMeta("region", blankToNull(v))}
      />

      {/* ── Dates ── */}
      <EditableDetailField
        label="Start Date"
        type="date"
        value={dateValue(record["start date"])}
        display={
          record["start date"]
            ? formatDate(str(record["start date"]))
            : undefined
        }
        emptyPlaceholder="Set date"
        onSave={(v) => patchColumns({ "start date": blankToNull(v) })}
      />
      <EditableDetailField
        label="Completion Date"
        type="date"
        value={dateValue(record["est completion"])}
        display={
          record["est completion"]
            ? formatDate(str(record["est completion"]))
            : undefined
        }
        emptyPlaceholder="Set date"
        onSave={(v) => patchColumns({ "est completion": blankToNull(v) })}
      />

      {/* ── Status & Flags ── */}
      <EditableDetailField
        label="Active"
        type="boolean"
        value={local.archived ? "false" : "true"}
        display={local.archived ? "No" : "Yes"}
        onSave={(v) => patchColumns({ archived: v !== "true" })}
      />
      <EditableDetailField
        label="ERP Sync"
        type="boolean"
        value={meta.erp_sync === false ? "false" : "true"}
        display={meta.erp_sync === false ? "No" : "Yes"}
        onSave={(v) => patchMeta("erp_sync", v === "true")}
      />
      <EditableDetailField
        label="Test Project"
        type="boolean"
        value={meta.test_project === true ? "true" : "false"}
        display={meta.test_project === true ? "Yes" : "No"}
        onSave={(v) => patchMeta("test_project", v === "true")}
      />
    </div>
  );
}
