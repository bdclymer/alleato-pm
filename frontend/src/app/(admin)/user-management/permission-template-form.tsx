"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ALL_GRANULAR_FLAGS,
  GRANULAR_FLAG_LABELS,
} from "@/lib/permissions-shared";
import type {
  PermissionModule,
  PermissionLevel,
  PermissionTemplate,
  GranularFlag,
} from "@/lib/permissions-shared";

const MODULES: { key: PermissionModule; label: string }[] = [
  { key: "directory",     label: "Directory" },
  { key: "budget",        label: "Budget" },
  { key: "contracts",     label: "Contracts" },
  { key: "documents",     label: "Documents" },
  { key: "schedule",      label: "Schedule" },
  { key: "submittals",    label: "Submittals" },
  { key: "rfis",          label: "RFIs" },
  { key: "change_orders", label: "Change Orders" },
];

const LEVELS: PermissionLevel[] = ["none", "read", "write", "admin"];

type RulesState = Record<PermissionModule, PermissionLevel[]>;

function defaultRules(): RulesState {
  return Object.fromEntries(
    MODULES.map(({ key }) => [key, ["read"]])
  ) as RulesState;
}

function templateToRulesState(rules_json: Record<PermissionModule, PermissionLevel[]>): RulesState {
  return Object.fromEntries(
    MODULES.map(({ key }) => [key, rules_json[key] ?? ["read"]])
  ) as RulesState;
}

interface Props {
  template?: PermissionTemplate;
  onSave: (data: {
    name: string;
    description: string;
    rules_json: RulesState;
    granular_flags: GranularFlag[];
  }) => Promise<void>;
  onCancel: () => void;
}

export function PermissionTemplateForm({ template, onSave, onCancel }: Props) {
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [rules, setRules] = useState<RulesState>(
    template ? templateToRulesState(template.rules_json) : defaultRules()
  );
  const [granularFlags, setGranularFlags] = useState<Set<GranularFlag>>(
    new Set(template?.granular_flags ?? [])
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getHighestLevel(module: PermissionModule): PermissionLevel {
    const levels = rules[module];
    if (levels.includes("admin")) return "admin";
    if (levels.includes("write")) return "write";
    if (levels.includes("read")) return "read";
    return "none";
  }

  function setHighestLevel(module: PermissionModule, level: PermissionLevel) {
    const expansion: Record<PermissionLevel, PermissionLevel[]> = {
      none:  ["none"],
      read:  ["read"],
      write: ["read", "write"],
      admin: ["read", "write", "admin"],
    };
    setRules((prev) => ({ ...prev, [module]: expansion[level] }));
  }

  function toggleFlag(flag: GranularFlag) {
    setGranularFlags((prev) => {
      const next = new Set(prev);
      if (next.has(flag)) {
        next.delete(flag);
      } else {
        next.add(flag);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        rules_json: rules,
        granular_flags: Array.from(granularFlags),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="tpl-name">Name</Label>
          <Input
            id="tpl-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Site Superintendent"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tpl-desc">Description</Label>
          <Textarea
            id="tpl-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe who this template is for..."
            rows={2}
          />
        </div>
      </div>

      {/* Module access */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Module Access</p>
        <div className="rounded-md border border-border divide-y divide-border">
          {MODULES.map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between px-4 py-3"
            >
              <span className="text-sm text-foreground">{label}</span>
              <Select
                value={getHighestLevel(key)}
                onValueChange={(v) => setHighestLevel(key, v as PermissionLevel)}
              >
                <SelectTrigger className="w-32 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      {/* Granular flags */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Granular Access</p>
        <p className="text-xs text-muted-foreground">
          Fine-grained capabilities layered on top of module access levels.
        </p>
        <div className="rounded-md border border-border divide-y divide-border">
          {ALL_GRANULAR_FLAGS.map((flag) => (
            <label
              key={flag}
              className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                checked={granularFlags.has(flag)}
                onCheckedChange={() => toggleFlag(flag)}
              />
              <span className="text-sm text-foreground">
                {GRANULAR_FLAG_LABELS[flag]}
              </span>
            </label>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : template ? "Save Changes" : "Create Template"}
        </Button>
      </div>
    </form>
  );
}
