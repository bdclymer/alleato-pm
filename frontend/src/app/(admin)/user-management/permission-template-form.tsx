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
  PermissionLevel,
  PermissionTemplate,
  GranularFlag,
} from "@/lib/permissions-shared";
import {
  PERMISSION_TEMPLATE_GROUPS,
  PERMISSION_TEMPLATE_MODULES,
  getPermissionTemplateToolsByGroup,
} from "./permission-template-config";

const LEVELS: PermissionLevel[] = ["none", "read", "write", "admin"];

type RulesState = PermissionTemplate["rules_json"];

function defaultRules(): RulesState {
  return Object.fromEntries(
    PERMISSION_TEMPLATE_MODULES.map(({ moduleKey }) => [moduleKey, ["read"]])
  ) as RulesState;
}

function templateToRulesState(rules_json: PermissionTemplate["rules_json"]): RulesState {
  return Object.fromEntries(
    PERMISSION_TEMPLATE_MODULES.map(({ moduleKey }) => [
      moduleKey,
      rules_json[moduleKey] ?? ["read"],
    ])
  ) as RulesState;
}

interface Props {
  template?: PermissionTemplate;
  includeAccessControls?: boolean;
  onSave: (data: {
    name: string;
    description: string;
    rules_json: RulesState;
    granular_flags: GranularFlag[];
  }) => Promise<void>;
  onCancel: () => void;
}

export function PermissionTemplateForm({
  template,
  includeAccessControls = true,
  onSave,
  onCancel,
}: Props) {
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

  function getHighestLevel(module: keyof RulesState): PermissionLevel {
    const levels = rules[module];
    if (levels.includes("admin")) return "admin";
    if (levels.includes("write")) return "write";
    if (levels.includes("read")) return "read";
    return "none";
  }

  function setHighestLevel(module: keyof RulesState, level: PermissionLevel) {
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

      {includeAccessControls ? (
        <>
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">Tool Access</p>
            {PERMISSION_TEMPLATE_GROUPS.map((group) => {
              const groupModules = getPermissionTemplateToolsByGroup(group.key).filter(
                (tool) => tool.kind === "module",
              );

              return (
                <div key={group.key} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="rounded-md border border-border divide-y divide-border">
                    {groupModules.map((tool) => (
                      <div
                        key={tool.id}
                        className="flex items-center justify-between gap-4 px-4 py-3"
                      >
                        <span className="text-sm text-foreground">{tool.label}</span>
                        <Select
                          value={getHighestLevel(tool.moduleKey)}
                          onValueChange={(value) =>
                            setHighestLevel(
                              tool.moduleKey,
                              value as PermissionLevel,
                            )
                          }
                        >
                          <SelectTrigger className="h-8 w-32 text-sm">
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
              );
            })}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Granular Access</p>
            <div className="rounded-md border border-border divide-y divide-border">
              {ALL_GRANULAR_FLAGS.map((flag) => (
                <label
                  key={flag}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
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
        </>
      ) : null}

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
