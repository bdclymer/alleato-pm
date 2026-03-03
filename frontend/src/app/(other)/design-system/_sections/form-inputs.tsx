"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

export function FormInputsSection() {
  return (
    <section id="form-inputs" className="scroll-mt-8">
      <h2 className="text-lg font-semibold tracking-tight text-foreground">
        Form Inputs
      </h2>
      <p className="mt-1 mb-8 text-sm text-muted-foreground">
        All form elements from shadcn/ui with consistent height (h-9), border
        (border-input), and focus ring (ring-ring/50).
      </p>

      <div className="grid gap-8 sm:grid-cols-2">
        {/* Text Input */}
        <div className="space-y-2">
          <Label htmlFor="demo-input">Text Input</Label>
          <Input id="demo-input" placeholder="Enter text..." />
        </div>

        {/* Disabled Input */}
        <div className="space-y-2">
          <Label htmlFor="demo-disabled">Disabled Input</Label>
          <Input
            id="demo-disabled"
            placeholder="Disabled..."
            disabled
            value="Cannot edit"
          />
        </div>

        {/* Select */}
        <div className="space-y-2">
          <Label>Select</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Choose an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="budget">Budget</SelectItem>
              <SelectItem value="commitments">Commitments</SelectItem>
              <SelectItem value="direct-costs">Direct Costs</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Textarea */}
        <div className="space-y-2">
          <Label htmlFor="demo-textarea">Textarea</Label>
          <Textarea
            id="demo-textarea"
            placeholder="Enter description..."
            rows={3}
          />
        </div>

        {/* Checkbox */}
        <div className="space-y-4">
          <Label>Checkboxes</Label>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox id="check-1" defaultChecked />
              <Label htmlFor="check-1" className="font-normal">
                Include subtotals
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="check-2" />
              <Label htmlFor="check-2" className="font-normal">
                Show archived items
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="check-3" disabled />
              <Label htmlFor="check-3" className="font-normal text-muted-foreground">
                Disabled option
              </Label>
            </div>
          </div>
        </div>

        {/* Radio Group */}
        <div className="space-y-4">
          <Label>Radio Group</Label>
          <RadioGroup defaultValue="option-1">
            <div className="flex items-center gap-2">
              <RadioGroupItem value="option-1" id="radio-1" />
              <Label htmlFor="radio-1" className="font-normal">
                Lump Sum
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="option-2" id="radio-2" />
              <Label htmlFor="radio-2" className="font-normal">
                Unit Price
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="option-3" id="radio-3" />
              <Label htmlFor="radio-3" className="font-normal">
                Time & Materials
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Switch */}
        <div className="space-y-4">
          <Label>Switch</Label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="switch-1" className="font-normal">
                Enable notifications
              </Label>
              <Switch id="switch-1" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="switch-2" className="font-normal">
                Auto-save drafts
              </Label>
              <Switch id="switch-2" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="switch-3" className="font-normal text-muted-foreground">
                Disabled
              </Label>
              <Switch id="switch-3" disabled />
            </div>
          </div>
        </div>

        {/* Slider */}
        <div className="space-y-4">
          <Label>Slider</Label>
          <Slider defaultValue={[65]} max={100} step={1} />
          <p className="text-xs text-muted-foreground">
            Default value: 65%
          </p>
        </div>
      </div>
    </section>
  );
}
