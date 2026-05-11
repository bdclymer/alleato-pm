"use client";

import type { ChatStatus } from "ai";
import { Loader2Icon, SendIcon, SquareIcon, XIcon } from "lucide-react";
import React, {
  Children,
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ComponentProps, HTMLAttributes, KeyboardEventHandler } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type PromptInputContextType = {
  isLoading: boolean;
  value: string;
  setValue: (value: string) => void;
  maxHeight: number | string;
  onSubmit?: () => void;
  disabled?: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
};

const PromptInputContext = createContext<PromptInputContextType>({
  isLoading: false,
  value: "",
  setValue: () => {},
  maxHeight: 240,
  onSubmit: undefined,
  disabled: false,
  textareaRef: React.createRef<HTMLTextAreaElement>(),
});

function usePromptInput() {
  return useContext(PromptInputContext);
}

export type PromptInputProps = {
  isLoading?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  maxHeight?: number | string;
  onSubmit?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
} & Omit<React.ComponentProps<"div">, "onSubmit">;

export function PromptInput({
  className,
  isLoading = false,
  maxHeight = 240,
  value,
  onValueChange,
  onSubmit,
  children,
  disabled = false,
  onClick,
  ...props
}: PromptInputProps) {
  const [internalValue, setInternalValue] = useState(value || "");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (newValue: string) => {
    setInternalValue(newValue);
    onValueChange?.(newValue);
  };

  const handleClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
    if (!disabled) textareaRef.current?.focus();
    onClick?.(event);
  };

  return (
    <TooltipProvider>
      <PromptInputContext.Provider
        value={{
          isLoading,
          value: value ?? internalValue,
          setValue: onValueChange ?? handleChange,
          maxHeight,
          onSubmit,
          disabled,
          textareaRef,
        }}
      >
        <div
          onClick={handleClick}
          className={cn(
            "border-input bg-background cursor-text rounded-3xl border p-2 shadow-xs",
            disabled && "cursor-not-allowed opacity-60",
            className,
          )}
          {...props}
        >
          {children}
        </div>
      </PromptInputContext.Provider>
    </TooltipProvider>
  );
}

export type PromptInputTextareaProps = {
  disableAutosize?: boolean;
  disableAutoResize?: boolean;
  minHeight?: number;
  maxHeight?: number;
  resizeOnNewLinesOnly?: boolean;
} & ComponentProps<typeof Textarea>;

export function PromptInputTextarea({
  className,
  onChange,
  onKeyDown,
  disableAutosize = false,
  disableAutoResize = false,
  minHeight,
  maxHeight,
  resizeOnNewLinesOnly = false,
  style,
  ...props
}: PromptInputTextareaProps) {
  const context = usePromptInput();
  const shouldDisableAutosize =
    disableAutosize || disableAutoResize || resizeOnNewLinesOnly;
  const effectiveMaxHeight = maxHeight ?? context.maxHeight;

  const adjustHeight = (el: HTMLTextAreaElement | null) => {
    if (!el || shouldDisableAutosize) return;

    el.style.height = "auto";

    if (typeof effectiveMaxHeight === "number") {
      el.style.height = `${Math.min(el.scrollHeight, effectiveMaxHeight)}px`;
    } else {
      el.style.height = `min(${el.scrollHeight}px, ${effectiveMaxHeight})`;
    }
  };

  const handleRef = (el: HTMLTextAreaElement | null) => {
    context.textareaRef.current = el;
    adjustHeight(el);
  };

  useLayoutEffect(() => {
    if (!context.textareaRef.current || shouldDisableAutosize) return;
    adjustHeight(context.textareaRef.current);
  }, [context.value, effectiveMaxHeight, shouldDisableAutosize]);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    adjustHeight(event.target);
    context.setValue(event.target.value);
    onChange?.(event);
  };

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    if (event.key === "Enter") {
      if (event.nativeEvent.isComposing) return;
      if (event.shiftKey) return;

      event.preventDefault();
      context.onSubmit?.();
    }
    onKeyDown?.(event);
  };

  return (
    <Textarea
      ref={handleRef}
      value={context.value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={cn(
        "text-primary min-h-[44px] w-full resize-none border-none bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
        className,
      )}
      rows={1}
      disabled={context.disabled}
      style={{
        minHeight: minHeight ? `${minHeight}px` : undefined,
        ...style,
      }}
      {...props}
    />
  );
}

export type PromptInputActionsProps = HTMLAttributes<HTMLDivElement>;

export function PromptInputActions({
  children,
  className,
  ...props
}: PromptInputActionsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      {children}
    </div>
  );
}

export type PromptInputActionProps = {
  className?: string;
  tooltip: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
} & ComponentProps<typeof Tooltip>;

export function PromptInputAction({
  tooltip,
  children,
  className,
  side = "top",
  ...props
}: PromptInputActionProps) {
  const { disabled } = usePromptInput();

  return (
    <Tooltip {...props}>
      <TooltipTrigger
        asChild
        disabled={disabled}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className={className}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export type PromptInputToolbarProps = HTMLAttributes<HTMLDivElement>;

export function PromptInputToolbar({
  className,
  ...props
}: PromptInputToolbarProps) {
  return (
    <div
      className={cn("flex items-center justify-between p-1", className)}
      {...props}
    />
  );
}

export type PromptInputToolsProps = HTMLAttributes<HTMLDivElement>;

export function PromptInputTools({ className, ...props }: PromptInputToolsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1",
        "[&_button:first-child]:rounded-bl-xl",
        className,
      )}
      {...props}
    />
  );
}

export type PromptInputButtonProps = ComponentProps<typeof Button>;

export function PromptInputButton({
  variant = "ghost",
  className,
  size,
  ...props
}: PromptInputButtonProps) {
  const newSize =
    (size ?? Children.count(props.children) > 1) ? "default" : "icon";

  return (
    <Button
      className={cn(
        "shrink-0 gap-2 rounded-lg",
        variant === "ghost" && "text-muted-foreground",
        newSize === "default" && "px-4",
        className,
      )}
      size={newSize}
      type="button"
      variant={variant}
      {...props}
    />
  );
}

export type PromptInputSubmitProps = ComponentProps<typeof Button> & {
  status?: ChatStatus;
};

export function PromptInputSubmit({
  className,
  variant = "default",
  size = "icon",
  status,
  children,
  onClick,
  ...props
}: PromptInputSubmitProps) {
  const { onSubmit } = usePromptInput();
  let Icon = <SendIcon />;

  if (status === "submitted") {
    Icon = <Loader2Icon className="size-4 animate-spin" />;
  } else if (status === "streaming") {
    Icon = <SquareIcon />;
  } else if (status === "error") {
    Icon = <XIcon />;
  }

  return (
    <Button
      className={cn("gap-2 rounded-lg", className)}
      size={size}
      type="button"
      variant={variant}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onSubmit?.();
      }}
      {...props}
    >
      {children ?? Icon}
    </Button>
  );
}

export type PromptInputModelSelectProps = ComponentProps<typeof Select>;

export const PromptInputModelSelect = (props: PromptInputModelSelectProps) => (
  <Select {...props} />
);

export type PromptInputModelSelectTriggerProps = ComponentProps<
  typeof SelectTrigger
>;

export const PromptInputModelSelectTrigger = ({
  className,
  ...props
}: PromptInputModelSelectTriggerProps) => (
  <SelectTrigger
    className={cn(
      "border-none bg-transparent font-medium text-muted-foreground shadow-none transition-colors",
      "hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground",
      "h-auto px-2 py-1.5",
      className,
    )}
    {...props}
  />
);

export type PromptInputModelSelectContentProps = ComponentProps<
  typeof SelectContent
>;

export const PromptInputModelSelectContent = ({
  className,
  ...props
}: PromptInputModelSelectContentProps) => (
  <SelectContent className={cn(className)} {...props} />
);

export type PromptInputModelSelectItemProps = ComponentProps<typeof SelectItem>;

export const PromptInputModelSelectItem = ({
  className,
  ...props
}: PromptInputModelSelectItemProps) => (
  <SelectItem className={cn(className)} {...props} />
);

export type PromptInputModelSelectValueProps = ComponentProps<
  typeof SelectValue
>;

export const PromptInputModelSelectValue = ({
  className,
  ...props
}: PromptInputModelSelectValueProps) => (
  <SelectValue className={cn(className)} {...props} />
);
