"use client";

import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCreateProjectDevConfigOptional } from "@/components/project/create-project-dev-config";
import {
  formSections,
  PROJECT_TEMPLATE_OPTIONS,
  FieldControl,
  FormLayoutMode,
  getFieldControlOptions,
  isControlAllowedForField,
} from "@/lib/create-project/form";

export function DeveloperFormConfigPanel() {
  const ctx = useCreateProjectDevConfigOptional();

  if (!ctx || !ctx.isDevAdmin || !ctx.isCreateProjectRoute) {
    return null;
  }

  const {
    selectedTemplate,
    setSelectedTemplate,
    activeTemplateConfig,
    updateActiveTemplateConfig,
    resetActiveTemplateConfig,
    clearAllDevFormConfigs,
  } = ctx;

  return (
    <>
      <Separator />
      <Card className="border-dashed">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Developer Form Config
              </CardTitle>
              <CardDescription>
                Mesh template overrides without touching the live UI.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label className="text-xs text-muted-foreground" htmlFor="dev-template">
              Template Preset
            </Label>
            <Select
              value={selectedTemplate}
              onValueChange={(value) => setSelectedTemplate(value)}
            >
              <SelectTrigger id="dev-template" className="h-8">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_TEMPLATE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground" htmlFor="dev-layout">
              Page Layout
            </Label>
            <Select
              value={activeTemplateConfig.layout}
              onValueChange={(value) =>
                updateActiveTemplateConfig((config) => ({
                  ...config,
                  layout: value as FormLayoutMode,
                }))
              }
            >
              <SelectTrigger id="dev-layout" className="h-8">
                <SelectValue placeholder="Select layout" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cards">Cards</SelectItem>
                <SelectItem value="sections">Section Blocks</SelectItem>
                <SelectItem value="single-column">Single Column</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button type="button" variant="outline" onClick={resetActiveTemplateConfig}>
              Reset Template
            </Button>
            <Button type="button" variant="ghost" onClick={clearAllDevFormConfigs}>
              Reset All
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {formSections.map((section) => {
            const sectionOverride = activeTemplateConfig.sections[section.id] ?? {};
            return (
              <div key={`dev-section-${section.id}`} className="rounded-md border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    {section.title}
                  </h4>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={!sectionOverride.hidden}
                      onCheckedChange={(checked) =>
                        updateActiveTemplateConfig((config) => ({
                          ...config,
                          sections: {
                            ...config.sections,
                            [section.id]: {
                              ...config.sections[section.id],
                              hidden: !Boolean(checked),
                            },
                          },
                        }))
                      }
                    />
                    Show section
                  </label>
                </div>

                <div className="mt-4 space-y-3">
                  {section.fields.map((field) => {
                    const fieldOverride = activeTemplateConfig.fields[field.name] ?? {};
                    const allowedControls = getFieldControlOptions(field);
                    const selectedControl =
                      fieldOverride.control &&
                      isControlAllowedForField(field, fieldOverride.control)
                        ? fieldOverride.control
                        : field.control;

                    return (
                      <div
                        key={`dev-field-${section.id}-${field.name}`}
                        className="rounded-md bg-muted/40 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-medium text-foreground">
                            {field.label}
                          </p>
                          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                            <Checkbox
                              checked={!fieldOverride.hidden}
                              onCheckedChange={(checked) =>
                                updateActiveTemplateConfig((config) => ({
                                  ...config,
                                  fields: {
                                    ...config.fields,
                                    [field.name]: {
                                      ...config.fields[field.name],
                                      hidden: !Boolean(checked),
                                    },
                                  },
                                }))
                              }
                            />
                            Show field
                          </label>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div>
                            <Label className="text-xs">Field Type</Label>
                            <Select
                              value={selectedControl}
                              onValueChange={(value) =>
                                updateActiveTemplateConfig((config) => ({
                                  ...config,
                                  fields: {
                                    ...config.fields,
                                    [field.name]: {
                                      ...config.fields[field.name],
                                      control: value as FieldControl,
                                    },
                                  },
                                }))
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="Choose field type" />
                              </SelectTrigger>
                              <SelectContent>
                                {allowedControls.map((control) => (
                                  <SelectItem key={control} value={control}>
                                    {control}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <label className="inline-flex items-center gap-2 text-xs text-muted-foreground pt-6">
                            <Checkbox
                              checked={fieldOverride.colSpan === "full"}
                              onCheckedChange={(checked) =>
                                updateActiveTemplateConfig((config) => ({
                                  ...config,
                                  fields: {
                                    ...config.fields,
                                    [field.name]: {
                                      ...config.fields[field.name],
                                      colSpan: Boolean(checked) ? "full" : undefined,
                                    },
                                  },
                                }))
                              }
                            />
                            Full width field
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
    </>
  );
}
