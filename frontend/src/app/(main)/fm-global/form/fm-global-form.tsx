"use client";

import type { ReactElement } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ds/text";

/**
 * Form state for FM Global specs input.
 */
export interface FormState {
  asrsType: string;
  systemType: string;
  ceilingHeight: string;
  commodityClass: string;
  kFactor: string;
  tolerance: string;
  containerType: string;
  storageHeight: string;
  rackRowDepth: string;
  buildingHeated: boolean;
}

/**
 * Default form values for FM Global specs input.
 */
export const defaultFormState: FormState = {
  asrsType: "Shuttle",
  systemType: "wet",
  ceilingHeight: "",
  commodityClass: "",
  kFactor: "",
  tolerance: "5",
  containerType: "unspecified",
  storageHeight: "",
  rackRowDepth: "",
  buildingHeated: false,
};

const asrsOptions = [
  { value: "Shuttle", label: "Shuttle" },
  { value: "Mini-Load", label: "Mini-Load" },
  { value: "Top-Loading", label: "Top-Loading" },
  { value: "Vertically-Enclosed", label: "Vertically-Enclosed" },
  { value: "All", label: "All" },
];

const systemOptions = [
  { value: "wet", label: "Wet" },
  { value: "dry", label: "Dry" },
  { value: "preaction", label: "Preaction" },
  { value: "both", label: "Both" },
];

const containerOptions = [
  { value: "unspecified", label: "Not specified" },
  { value: "Closed-Top", label: "Closed-Top" },
  { value: "Open-Top", label: "Open-Top" },
  { value: "Noncombustible", label: "Noncombustible" },
  { value: "Plastic", label: "Plastic" },
  { value: "Mixed", label: "Mixed" },
];

interface FmGlobalFormProps {
  formState: FormState;
  onFormChange: (state: FormState) => void;
  onSubmit: () => void;
  isPending: boolean;
  errorMessage: string | null;
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

interface InputFieldProps {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  type?: "text" | "number";
  min?: string;
  step?: string;
  onChange: (value: string) => void;
}

type FormStateKey = keyof FormState;

const selectFieldDefinitions = [
  {
    id: "asrsType",
    label: "ASRS Type",
    placeholder: "Select ASRS type",
    options: asrsOptions,
    stateKey: "asrsType",
  },
  {
    id: "systemType",
    label: "System Type",
    placeholder: "Select system type",
    options: systemOptions,
    stateKey: "systemType",
  },
  {
    id: "containerType",
    label: "Container Type",
    placeholder: "Select container type",
    options: containerOptions,
    stateKey: "containerType",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  placeholder: string;
  options: { value: string; label: string }[];
  stateKey: FormStateKey;
}>;

const inputFieldDefinitions = [
  {
    id: "ceilingHeight",
    label: "Ceiling Height (ft)",
    type: "number",
    min: "1",
    stateKey: "ceilingHeight",
  },
  {
    id: "commodityClass",
    label: "Commodity Class",
    placeholder: "Class 1-4, Plastic, etc.",
    stateKey: "commodityClass",
  },
  {
    id: "kFactor",
    label: "K-Factor (optional)",
    type: "number",
    min: "0",
    step: "0.1",
    stateKey: "kFactor",
  },
  {
    id: "tolerance",
    label: "Height Tolerance (ft)",
    type: "number",
    min: "0",
    stateKey: "tolerance",
  },
  {
    id: "storageHeight",
    label: "Storage Height (ft)",
    type: "number",
    min: "0",
    stateKey: "storageHeight",
  },
  {
    id: "rackRowDepth",
    label: "Rack Row Depth (ft)",
    type: "number",
    min: "0",
    stateKey: "rackRowDepth",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  placeholder?: string;
  type?: "text" | "number";
  min?: string;
  step?: string;
  stateKey: FormStateKey;
}>;

function SelectField({
  id,
  label,
  value,
  placeholder,
  options,
  onChange,
}: SelectFieldProps): ReactElement {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function InputField({
  id,
  label,
  value,
  placeholder,
  type = "text",
  min,
  step,
  onChange,
}: InputFieldProps): ReactElement {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        min={min}
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function HeatedToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}): ReactElement {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-4">
      <div>
        <Label className="text-sm">Building Heated</Label>
        <Text size="sm" tone="muted">
          Enable if building is heated (wet systems allowed)
        </Text>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ErrorBanner({ message }: { message: string | null }): ReactElement | null {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}

function getSelectFields(
  formState: FormState,
  onFormChange: (state: FormState) => void,
): SelectFieldProps[] {
  return selectFieldDefinitions.map((definition) => ({
    id: definition.id,
    label: definition.label,
    value: formState[definition.stateKey] as string,
    placeholder: definition.placeholder,
    options: definition.options,
    onChange: (value) =>
      onFormChange({ ...formState, [definition.stateKey]: value }),
  }));
}

function getInputFields(
  formState: FormState,
  onFormChange: (state: FormState) => void,
): InputFieldProps[] {
  return inputFieldDefinitions.map((definition) => {
    const field: InputFieldProps = {
      id: definition.id,
      label: definition.label,
      value: formState[definition.stateKey] as string,
      onChange: (value) =>
        onFormChange({ ...formState, [definition.stateKey]: value }),
    };

    if ('placeholder' in definition) {
      field.placeholder = definition.placeholder;
    }
    if ('type' in definition) {
      field.type = definition.type;
    }
    if ('min' in definition) {
      field.min = definition.min;
    }
    if ('step' in definition) {
      field.step = definition.step;
    }

    return field;
  });
}

function FormFields({
  selectFields,
  inputFields,
  formState,
  onFormChange,
  errorMessage,
  isPending,
  onSubmit,
}: {
  selectFields: SelectFieldProps[];
  inputFields: InputFieldProps[];
  formState: FormState;
  onFormChange: (state: FormState) => void;
  errorMessage: string | null;
  isPending: boolean;
  onSubmit: () => void;
}): ReactElement {
  return (
    <CardContent className="grid gap-4">
      {selectFields.slice(0, 2).map((field) => (
        <SelectField key={field.id} {...field} />
      ))}
      {inputFields.slice(0, 4).map((field) => (
        <InputField key={field.id} {...field} />
      ))}
      <SelectField {...selectFields[2]} />
      {inputFields.slice(4).map((field) => (
        <InputField key={field.id} {...field} />
      ))}
      <HeatedToggle
        checked={formState.buildingHeated}
        onChange={(value) =>
          onFormChange({ ...formState, buildingHeated: value })
        }
      />
      <ErrorBanner message={errorMessage} />
      <Button onClick={onSubmit} disabled={isPending} className="w-full">
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Matching...
          </>
        ) : (
          "Find FM Global Requirements"
        )}
      </Button>
    </CardContent>
  );
}

/**
 * FM Global specification input form.
 */
export function FmGlobalForm({
  formState,
  onFormChange,
  onSubmit,
  isPending,
  errorMessage,
}: FmGlobalFormProps): ReactElement {
  const selectFields = getSelectFields(formState, onFormChange);
  const inputFields = getInputFields(formState, onFormChange);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Building Specifications</CardTitle>
      </CardHeader>
      <FormFields
        selectFields={selectFields}
        inputFields={inputFields}
        formState={formState}
        onFormChange={onFormChange}
        errorMessage={errorMessage}
        isPending={isPending}
        onSubmit={onSubmit}
      />
    </Card>
  );
}
