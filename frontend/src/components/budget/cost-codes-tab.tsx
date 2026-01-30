"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CostCode {
  id: string;
  division_id: string;
  division_title: string | null;
  title: string | null;
  description?: string;
}

interface CostCodesTabProps {
  projectId: string;
}

export function CostCodesTab({ projectId }: CostCodesTabProps) {
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  const [selectedCostCodes, setSelectedCostCodes] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const supabase = createClient();

        // Fetch all cost codes
        const { data: codesData, error: codesError } = await supabase
          .from("cost_codes")
          .select("id, division_id, division_title, title")
          .order("division_id", { ascending: true })
          .order("id", { ascending: true });

        if (codesError) throw codesError;

        // Fetch project cost codes (selected ones)
        const { data: projectCodesData, error: projectCodesError } =
          await supabase
            .from("project_cost_codes")
            .select("cost_code_id")
            .eq("project_id", parseInt(projectId, 10))
            .eq("is_active", true);

        if (projectCodesError) throw projectCodesError;

        setCostCodes(codesData || []);
        setSelectedCostCodes(
          new Set((projectCodesData || []).map((pc) => pc.cost_code_id)),
        );
      } catch (error) {
        toast.error("Failed to load cost codes");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  // Group cost codes by division
  const groupedCostCodes = costCodes.reduce(
    (acc, code) => {
      const divisionKey = code.division_title || "No Division";
      if (!acc[divisionKey]) {
        acc[divisionKey] = [];
      }
      acc[divisionKey].push(code);
      return acc;
    },
    {} as Record<string, CostCode[]>,
  );

  // Filter by search query and sort alphabetically
  const filteredDivisions = Object.entries(groupedCostCodes)
    .filter(([division, codes]) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        division.toLowerCase().includes(query) ||
        codes.some(
          (code) =>
            code.id.toLowerCase().includes(query) ||
            code.title?.toLowerCase().includes(query),
        )
      );
    })
    .sort(([divisionA], [divisionB]) => divisionA.localeCompare(divisionB));

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

  const toggleCostCode = (costCodeId: string) => {
    setSelectedCostCodes((prev) => {
      const next = new Set(prev);
      if (next.has(costCodeId)) {
        next.delete(costCodeId);
      } else {
        next.add(costCodeId);
      }
      return next;
    });
  };

  const selectAllInDivision = (codes: CostCode[], select: boolean) => {
    setSelectedCostCodes((prev) => {
      const next = new Set(prev);
      codes.forEach((code) => {
        if (select) {
          next.add(code.id);
        } else {
          next.delete(code.id);
        }
      });
      return next;
    });
  };

  const selectAll = (select: boolean) => {
    if (select) {
      setSelectedCostCodes(new Set(costCodes.map((code) => code.id)));
    } else {
      setSelectedCostCodes(new Set());
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const supabase = createClient();
      const projectIdNum = parseInt(projectId, 10);

      // Get current project cost codes
      const { data: currentProjectCodes, error: fetchError } = await supabase
        .from("project_cost_codes")
        .select("id, cost_code_id")
        .eq("project_id", projectIdNum);

      if (fetchError) throw fetchError;

      const currentCodeIds = new Set(
        (currentProjectCodes || []).map((pc) => pc.cost_code_id),
      );

      // Determine what to add and what to remove
      const toAdd = Array.from(selectedCostCodes).filter(
        (id) => !currentCodeIds.has(id),
      );
      const toRemove = Array.from(currentCodeIds).filter(
        (id) => !selectedCostCodes.has(id),
      );

      // Add new cost codes
      if (toAdd.length > 0) {
        const { error: insertError } = await supabase
          .from("project_cost_codes")
          .insert(
            toAdd.map((costCodeId) => ({
              project_id: projectIdNum,
              cost_code_id: costCodeId,
              is_active: true,
            })),
          );

        if (insertError) throw insertError;
      }

      // Remove unselected cost codes
      if (toRemove.length > 0) {
        const idsToDelete = (currentProjectCodes || [])
          .filter((pc) => toRemove.includes(pc.cost_code_id))
          .map((pc) => pc.id);

        const { error: deleteError } = await supabase
          .from("project_cost_codes")
          .delete()
          .in("id", idsToDelete);

        if (deleteError) throw deleteError;
      }

      toast.success(
        `Successfully updated project cost codes (${selectedCostCodes.size} selected)`,
      );
    } catch (error) {
      toast.error("Failed to save cost codes");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading cost codes...</p>
      </div>
    );
  }

  const allCodesSelected =
    costCodes.length > 0 && selectedCostCodes.size === costCodes.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Project Cost Codes</h2>
          <p className="text-sm text-foreground">
            Select which cost codes are active for this project (
            {selectedCostCodes.size} selected)
          </p>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Search Cost Codes</h4>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by code or title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-8"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                      type="button"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            onClick={() => selectAll(!allCodesSelected)}
          >
            {allCodesSelected ? "Deselect All" : "Select All"}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Cost Codes List */}
      <div className="space-y-0.5">
        {filteredDivisions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No cost codes found matching your search
          </div>
        ) : (
          filteredDivisions.map(([division, codes], index) => {
            const isExpanded = expandedDivisions.has(division);
            const allSelected = codes.every((code) =>
              selectedCostCodes.has(code.id),
            );
            const isEvenDivision = index % 2 === 0;

            return (
              <div
                key={division}
                className={isEvenDivision ? "bg-muted/50" : "bg-background"}
              >
                <div className="flex items-center justify-between py-2 px-3 hover:bg-muted/50">
                  <button
                    className="flex items-center gap-2 cursor-pointer flex-1 text-left"
                    onClick={() => toggleDivision(division)}
                    type="button"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-foreground" />
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {division}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({codes.filter((c) => selectedCostCodes.has(c.id)).length}
                      /{codes.length})
                    </span>
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => selectAllInDivision(codes, !allSelected)}
                    className="h-7 text-xs"
                  >
                    {allSelected ? "Deselect All" : "Select All"}
                  </Button>
                </div>

                {isExpanded && (
                  <div className="px-3 pb-2 space-y-0.5">
                    {codes.map((code) => {
                      const isSelected = selectedCostCodes.has(code.id);

                      return (
                        <button
                          key={code.id}
                          type="button"
                          className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/70 cursor-pointer w-full text-left"
                          onClick={() => toggleCostCode(code.id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleCostCode(code.id)}
                          />
                          <div className="flex-1 text-sm text-foreground">
                            <span className="font-medium">{code.id}</span>
                            {code.title && (
                              <span className="text-foreground">
                                {" "}
                                - {code.title}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
