"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import {
  createRoadmapItemSchema,
  type CreateRoadmapItemInput,
  type RoadmapItem,
  ROADMAP_PHASES,
  PHASE_META,
} from "@/lib/schemas/roadmap-schema";

// RHF needs input types (with optionals), not the output type (with defaults resolved)
type RoadmapItemFormValues = z.input<typeof createRoadmapItemSchema>;

interface RoadmapItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPhase?: CreateRoadmapItemInput["phase"];
  existingItem?: RoadmapItem;
  onSubmit: (data: CreateRoadmapItemInput) => Promise<void>;
  isPending: boolean;
}

export function RoadmapItemForm({
  open,
  onOpenChange,
  defaultPhase = "immediate",
  existingItem,
  onSubmit,
  isPending,
}: RoadmapItemFormProps) {
  const form = useForm<RoadmapItemFormValues, unknown, CreateRoadmapItemInput>({
    resolver: zodResolver(createRoadmapItemSchema),
    defaultValues: {
      phase: defaultPhase,
      title: "",
      description: "",
      bullet_points: [],
    },
  });

  const bulletPoints = form.watch("bullet_points") ?? [];

  useEffect(() => {
    if (open) {
      form.reset({
        phase: existingItem?.phase ?? defaultPhase,
        title: existingItem?.title ?? "",
        description: existingItem?.description ?? "",
        bullet_points: existingItem?.bullet_points ?? [],
      });
    }
  }, [open, existingItem, defaultPhase, form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit(data);
    onOpenChange(false);
  });

  const addBullet = () => {
    form.setValue("bullet_points", [...bulletPoints, ""]);
  };

  const removeBullet = (index: number) => {
    form.setValue(
      "bullet_points",
      bulletPoints.filter((_, i) => i !== index)
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{existingItem ? "Edit Feature" : "Add Feature"}</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
            <FormField
              control={form.control}
              name="phase"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phase</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select phase" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROADMAP_PHASES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {PHASE_META[p].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Feature name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What does this feature do and why does it matter?"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-2">
              <FormLabel>Key Details</FormLabel>
              {bulletPoints.map((_, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    {...form.register(`bullet_points.${index}`)}
                    placeholder={`Detail ${index + 1}`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeBullet(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1 w-fit"
                onClick={addBullet}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add detail
              </Button>
            </div>

            <SheetFooter className="mt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : existingItem ? "Save Changes" : "Add Feature"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
