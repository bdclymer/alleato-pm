interface DateDividerProps {
  label: string;
}

export function DateDivider({ label }: DateDividerProps) {
  return (
    <div className="relative flex items-center justify-center my-4">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-[hsl(var(--chat-border))]" />
      </div>
      <div className="relative px-4 bg-[hsl(var(--chat-bg))]">
        <span className="text-xs font-semibold text-[hsl(var(--chat-muted))] uppercase tracking-wider">
          {label}
        </span>
      </div>
    </div>
  );
}
