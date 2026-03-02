"use client";

import * as React from "react";
import { FormField } from "./FormField";
import { cn } from "@/lib/utils";
import { Bold, Italic, Underline, List, ListOrdered, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface RichTextFieldProps {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  fullWidth?: boolean;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

export function RichTextField({
  label,
  value = "",
  onChange,
  error,
  hint,
  required = false,
  fullWidth = false,
  className,
  disabled = false,
  placeholder,
}: RichTextFieldProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange?.(editorRef.current.innerHTML);
    }
  };

  React.useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  return (
    <FormField
      label={label}
      error={error}
      hint={hint}
      required={required}
      fullWidth={fullWidth}
    >
      <div
        className={cn(
          "rounded-md border",
          error && "border-red-300",
          disabled && "opacity-50",
          className,
        )}
      >
        <div className="flex items-center gap-1 border-b p-2">
          <Button
            size="sm"
            variant="ghost"
            type="button"
            onClick={() => execCommand("bold")}
            disabled={disabled}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            type="button"
            onClick={() => execCommand("italic")}
            disabled={disabled}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            type="button"
            onClick={() => execCommand("underline")}
            disabled={disabled}
          >
            <Underline className="h-4 w-4" />
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button
            size="sm"
            variant="ghost"
            type="button"
            onClick={() => execCommand("insertUnorderedList")}
            disabled={disabled}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            type="button"
            onClick={() => execCommand("insertOrderedList")}
            disabled={disabled}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
        </div>
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          className="min-h-[120px] p-4 focus:outline-none"
          data-placeholder={placeholder}
          suppressContentEditableWarning={true}
        />
      </div>
    </FormField>
  );
}
