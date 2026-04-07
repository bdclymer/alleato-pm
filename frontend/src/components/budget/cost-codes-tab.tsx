"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Check,
  Loader2,
} from "lucide-react";
import {
  useMasterCostCodes,
  useCostCodeTypes,
  useProjectCostCodes,
  useBulkSyncCostCodes,
  type CostCode,
  type CostCodeType,
} from "@/hooks/use-project-cost-codes";

// =============================================================================
// Types
// =============================================================================

interface CostCodesTabProps {
  projectId: string;
}

/** A cost_code_id + cost_type_id composite key for tracking selections */
type SelectionKey = `${string}::${string}`;

const makeKey = (costCodeId: string, costTypeId: string): SelectionKey =>
  `${costCodeId}::${costTypeId}`;

// =============================================================================
// Sub-components
// =============================================================================

function DivisionGroup({
  divisionTitle,
  codes,
  costTypeId,
  selectedSet,
  onToggleCode,
  onToggleDivision,
  defaultExpanded,
}: {
  divisionTitle: string;
  codes: CostCode[];
  costTypeId: string;
  selectedSet: Set<SelectionKey>;
  onToggleCode: (costCodeId: string, costTypeId: string) => void;
  onToggleDivision: (codes: CostCode[], costTypeId: string, select: boolean) => void;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const selectedCount = codes.filter((c) =>
    selectedSet.has(makeKey(c.id, costTypeId)),
  ).length;
  const allSelected = selectedCount === codes.length;
  const someSelected = selectedCount > 0 && !allSelected;

  return (
    <div>
      <div
        role="row"
        className="flex items-center gap-2 py-2 px-4 hover:bg-muted/50 rounded-md cursor-pointer select-none"
        onClick={() => setExpanded((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((prev) => !prev);
          }
        }}
        tabIndex={0}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <Checkbox
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={(checked) => {
            onToggleDivision(codes, costTypeId, !!checked);
          }}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select all in ${divisionTitle}`}
        />
        <span className="text-sm font-medium text-foreground flex-1">
          {divisionTitle}
        </span>
        <span className="text-xs text-muted-foreground">
          ({selectedCount}/{codes.length})
        </span>
      </div>

      {expanded && (
        <div className="ml-6 pl-4 border-l border-border space-y-0.5 pb-2">
          {codes.map((code) => {
            const isSelected = selectedSet.has(makeKey(code.id, costTypeId));

            return (
              <div
                key={code.id}
                role="row"
                className="flex items-center gap-3 py-1.5 px-2 hover:bg-muted/50 rounded-sm cursor-pointer select-none"
                onClick={() => onToggleCode(code.id, costTypeId)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onToggleCode(code.id, costTypeId);
                  }
                }}
                tabIndex={0}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleCode(code.id, costTypeId)}
                  onClick={(e) => e.stopPropagation()}
                  tabIndex={-1}
                />
                <span className="text-sm">
                  <span className="font-medium text-foreground">{code.id}</span>
                  {code.title && (
                    <span className="text-muted-foreground"> — {code.title}</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SelectedOverviewTab({
  masterCodes,
  costTypes,
  selectedSet,
}: {
  masterCodes: CostCode[];
  costTypes: CostCodeType[];
  selectedSet: Set<SelectionKey>;
}) {
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());

  // Build a map: cost_code_id -> list of cost type codes selected
  const codeToTypes = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const key of selectedSet) {
      const [codeId, typeId] = key.split("::") as [string, string];
      const typeDef = costTypes.find((t) => t.id === typeId);
      if (!map.has(codeId)) map.set(codeId, []);
      map.get(codeId)!.push(typeDef?.code || typeId);
    }
    return map;
  }, [selectedSet, costTypes]);

  // Group selected codes by division
  const selectedCodes = masterCodes.filter((c) => codeToTypes.has(c.id));
  const grouped = useMemo(() => {
    const groups: Record<string, CostCode[]> = {};
    for (const code of selectedCodes) {
      const div = code.division_title || "No Division";
      if (!groups[div]) groups[div] = [];
      groups[div].push(code);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [selectedCodes]);

  const toggleDivision = (division: string) => {
    setExpandedDivisions((prev) => {
      const next = new Set(prev);
      if (next.has(division)) {
        next.delete(division);
      } else {
        next.add(division);
      }
      return next;
    });
  };

  if (selectedSet.size === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p className="text-base font-medium">No cost codes selected</p>
        <p className="text-sm mt-1">
          Use the cost type tabs to select which cost codes to include in this project.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {selectedSet.size} cost code entries across {grouped.length} divisions.
        To edit, use the cost type tabs.
      </p>
      <div className="space-y-3">
        {grouped.map(([division, codes]) => {
          const isExpanded = expandedDivisions.has(division);
          return (
            <div key={division}>
              <button
                type="button"
                className="w-full flex items-center gap-2 px-2 py-1.5 bg-muted/50 rounded-md hover:bg-muted/80 transition-colors text-left"
                onClick={() => toggleDivision(division)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="text-sm font-medium text-foreground flex-1">
                  {division}
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  ({codes.length} code{codes.length !== 1 ? "s" : ""})
                </span>
              </button>
              {isExpanded && (
                <div className="mt-1 space-y-0.5">
                  {codes.map((code) => {
                    const types = codeToTypes.get(code.id) || [];
                    return (
                      <div
                        key={code.id}
                        className="flex items-center justify-between py-1.5 px-3 text-sm"
                      >
                        <span>
                          <span className="font-medium text-foreground">{code.id}</span>
                          {code.title && (
                            <span className="text-muted-foreground"> — {code.title}</span>
                          )}
                        </span>
                        <div className="flex gap-1">
                          {types.sort().map((t) => (
                            <Badge key={t} variant="secondary" className="text-xs px-1.5 py-0">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CostTypePanel({
  costType,
  masterCodes,
  selectedSet,
  searchQuery,
  onToggleCode,
  onToggleDivision,
  onSelectAll,
  onSave,
  isSaving,
  hasChanges,
}: {
  costType: CostCodeType;
  masterCodes: CostCode[];
  selectedSet: Set<SelectionKey>;
  searchQuery: string;
  onToggleCode: (costCodeId: string, costTypeId: string) => void;
  onToggleDivision: (codes: CostCode[], costTypeId: string, select: boolean) => void;
  onSelectAll: (costTypeId: string, select: boolean) => void;
  onSave: (costTypeId: string) => void;
  isSaving: boolean;
  hasChanges: boolean;
}) {
  // Group by division
  const grouped = useMemo(() => {
    const groups: Record<string, CostCode[]> = {};
    for (const code of masterCodes) {
      const div = code.division_title || "No Division";
      if (!groups[div]) groups[div] = [];
      groups[div].push(code);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [masterCodes]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!searchQuery) return grouped;
    const q = searchQuery.toLowerCase();
    return grouped
      .map(([division, codes]) => {
        const matchesDivision = division.toLowerCase().includes(q);
        if (matchesDivision) return [division, codes] as [string, CostCode[]];
        const matchedCodes = codes.filter(
          (c) =>
            c.id.toLowerCase().includes(q) ||
            c.title?.toLowerCase().includes(q),
        );
        return [division, matchedCodes] as [string, CostCode[]];
      })
      .filter(([, codes]) => codes.length > 0);
  }, [grouped, searchQuery]);

  const selectedInType = masterCodes.filter((c) =>
    selectedSet.has(makeKey(c.id, costType.id)),
  ).length;
  const allSelected = selectedInType === masterCodes.length && masterCodes.length > 0;

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selectedInType} of {masterCodes.length} cost codes selected for{" "}
          <span className="font-medium text-foreground">{costType.description}</span>
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectAll(costType.id, !allSelected)}
          >
            {allSelected ? "Deselect All" : "Select All"}
          </Button>
          <Button
            size="sm"
            onClick={() => onSave(costType.id)}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Saving…
              </>
            ) : hasChanges ? (
              "Save Changes"
            ) : (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Saved
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Division list */}
      <div className="space-y-0.5">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No cost codes found matching your search
          </div>
        ) : (
          filtered.map(([division, codes]) => (
            <DivisionGroup
              key={division}
              divisionTitle={division}
              codes={codes}
              costTypeId={costType.id}
              selectedSet={selectedSet}
              onToggleCode={onToggleCode}
              onToggleDivision={onToggleDivision}
              defaultExpanded={false}
            />
          ))
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function CostCodesTab({ projectId }: CostCodesTabProps) {
  const { data: masterCodes, isLoading: loadingCodes } = useMasterCostCodes();
  const { data: costTypes, isLoading: loadingTypes } = useCostCodeTypes();
  const { data: projectCodes, isLoading: loadingProject } = useProjectCostCodes(projectId);
  const bulkSync = useBulkSyncCostCodes(projectId);

  // Track selections as composite keys: "costCodeId::costTypeId"
  const [selectedSet, setSelectedSet] = useState<Set<SelectionKey>>(new Set());
  // Track what was last saved to detect changes per cost type
  const [savedSet, setSavedSet] = useState<Set<SelectionKey>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("selected");
  const [savingTypeId, setSavingTypeId] = useState<string | null>(null);

  // Initialize from server data
  useEffect(() => {
    if (projectCodes) {
      const keys = new Set<SelectionKey>(
        projectCodes
          .filter((pc) => pc.cost_type_id)
          .map((pc) => makeKey(pc.cost_code_id, pc.cost_type_id!)),
      );
      setSelectedSet(keys);
      setSavedSet(new Set(keys));
    }
  }, [projectCodes]);

  const toggleCode = useCallback((costCodeId: string, costTypeId: string) => {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      const key = makeKey(costCodeId, costTypeId);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleDivision = useCallback(
    (codes: CostCode[], costTypeId: string, select: boolean) => {
      setSelectedSet((prev) => {
        const next = new Set(prev);
        for (const code of codes) {
          const key = makeKey(code.id, costTypeId);
          if (select) {
            next.add(key);
          } else {
            next.delete(key);
          }
        }
        return next;
      });
    },
    [],
  );

  const selectAll = useCallback(
    (costTypeId: string, select: boolean) => {
      if (!masterCodes) return;
      setSelectedSet((prev) => {
        const next = new Set(prev);
        for (const code of masterCodes) {
          const key = makeKey(code.id, costTypeId);
          if (select) {
            next.add(key);
          } else {
            next.delete(key);
          }
        }
        return next;
      });
    },
    [masterCodes],
  );

  const hasChangesForType = useCallback(
    (costTypeId: string) => {
      if (!masterCodes) return false;
      for (const code of masterCodes) {
        const key = makeKey(code.id, costTypeId);
        const inSelected = selectedSet.has(key);
        const inSaved = savedSet.has(key);
        if (inSelected !== inSaved) return true;
      }
      return false;
    },
    [masterCodes, selectedSet, savedSet],
  );

  const handleSave = useCallback(
    async (costTypeId: string) => {
      if (!masterCodes) return;
      setSavingTypeId(costTypeId);

      // Collect all cost_code_ids selected for this type
      const costCodeIds: string[] = [];
      for (const code of masterCodes) {
        if (selectedSet.has(makeKey(code.id, costTypeId))) {
          costCodeIds.push(code.id);
        }
      }

      try {
        await bulkSync.mutateAsync({ costTypeId, costCodeIds });
        // Update saved state for this type
        setSavedSet((prev) => {
          const next = new Set(prev);
          // Remove old entries for this type
          for (const key of prev) {
            if (key.endsWith(`::${costTypeId}`)) {
              next.delete(key);
            }
          }
          // Add current selections
          for (const codeId of costCodeIds) {
            next.add(makeKey(codeId, costTypeId));
          }
          return next;
        });
      } finally {
        setSavingTypeId(null);
      }
    },
    [masterCodes, selectedSet, bulkSync],
  );

  const isLoading = loadingCodes || loadingTypes || loadingProject;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!masterCodes || !costTypes) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        Failed to load cost code data
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Project Cost Codes
          </h2>
          <p className="text-sm text-muted-foreground">
            Select cost codes by type to include in this project&apos;s budget
          </p>
        </div>
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search codes or divisions…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-8"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1.5 h-7 w-7 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList variant="line" className="w-full justify-start">
          <TabsTrigger value="selected">
            Selected
            <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">
              {selectedSet.size}
            </Badge>
          </TabsTrigger>
          {costTypes.map((ct) => {
            const count = masterCodes.filter((c) =>
              selectedSet.has(makeKey(c.id, ct.id)),
            ).length;
            return (
              <TabsTrigger key={ct.id} value={ct.id}>
                {ct.description}
                {count > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Selected (read-only) tab */}
        <TabsContent value="selected" className="mt-4">
          <SelectedOverviewTab
            masterCodes={masterCodes}
            costTypes={costTypes}
            selectedSet={selectedSet}
          />
        </TabsContent>

        {/* Cost type tabs */}
        {costTypes.map((ct) => (
          <TabsContent key={ct.id} value={ct.id} className="mt-4">
            <CostTypePanel
              costType={ct}
              masterCodes={masterCodes}
              selectedSet={selectedSet}
              searchQuery={searchQuery}
              onToggleCode={toggleCode}
              onToggleDivision={toggleDivision}
              onSelectAll={selectAll}
              onSave={handleSave}
              isSaving={savingTypeId === ct.id}
              hasChanges={hasChangesForType(ct.id)}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
