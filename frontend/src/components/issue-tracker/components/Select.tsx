import React, { ReactNode } from "react";
import * as RadixSelect from "@radix-ui/react-select";
import classnames from "classnames";
import { ChevronUpIcon } from "@/components/issue-tracker/icons/ChevronUpIcon";
import { ChevronDownIcon } from "@/components/issue-tracker/icons/ChevronDownIcon";
import { CheckIcon } from "@/components/issue-tracker/icons/CheckIcon";

type Props = {
  id: string;
  value: string;
  items: { id: string; jsx: ReactNode; text?: string; disabled?: boolean }[];
  adjustFirstItem?: "split" | "hide";
  onValueChange: (value: string) => void;
};

export function Select({
  id,
  onValueChange,
  value,
  items,
  adjustFirstItem,
}: Props) {
  const [firstItem, ...otherItems] = items;
  const itemList =
    adjustFirstItem === "split" || adjustFirstItem === "hide"
      ? otherItems
      : items;

  const current = items.find((item) => item.id === value);

  return (
    <RadixSelect.Root onValueChange={onValueChange} value={value}>
      <RadixSelect.Trigger
        aria-label={id}
        className="flex items-center gap-1.5 bg-transparent border-0 h-7 px-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-muted/60 appearance-none data-[state=open]:bg-muted/60 text-sm w-full text-left"
      >
        {current ? current.text || current.jsx : <RadixSelect.Value />}
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          className="overflow-hidden bg-popover dark:bg-popover rounded-lg border border-border dark:border-border shadow-sm z-[200] min-w-[160px]"
          position="popper"
          sideOffset={4}
          align="start"
          avoidCollisions={true}
        >
          <RadixSelect.ScrollUpButton className="flex items-center justify-center h-[25px] bg-white cursor-default">
            <ChevronUpIcon className="w-4 h-4" />
          </RadixSelect.ScrollUpButton>
          <RadixSelect.Viewport>
            {adjustFirstItem === "split" ? (
              <RadixSelect.Group className="border-b p-1">
                <RadixSelect.Item
                  key={firstItem.id}
                  value={firstItem.id}
                  className={classnames(
                    "text-sm leading-none flex items-center h-7 pr-8 pl-2 relative select-none data-[disabled]:pointer-events-none data-[highlighted]:outline-none hover:bg-muted/70 rounded-sm"
                  )}
                >
                  <RadixSelect.ItemText>{firstItem.jsx}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="absolute right-0 w-[25px] inline-flex items-center justify-center">
                    <CheckIcon className="w-4 h-4" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              </RadixSelect.Group>
            ) : null}
            <RadixSelect.Group className="p-1">
              {itemList.map((item) => (
                <RadixSelect.Item
                  key={item.id}
                  value={item.id}
                  className={classnames(
                    "text-sm leading-none flex items-center h-7 pr-8 pl-2 relative select-none data-[disabled]:pointer-events-none data-[highlighted]:outline-none hover:bg-muted/70 rounded-sm data-[disabled]:opacity-40"
                  )}
                  disabled={item.disabled}
                >
                  <RadixSelect.ItemText>{item.jsx}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="absolute right-0 w-[25px] inline-flex items-center justify-center">
                    <CheckIcon className="w-4 h-4" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Group>
          </RadixSelect.Viewport>
          <RadixSelect.ScrollDownButton className="flex items-center justify-center h-[25px] bg-white cursor-default">
            <ChevronDownIcon className="w-4 h-4" />
          </RadixSelect.ScrollDownButton>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
