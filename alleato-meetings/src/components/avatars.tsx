import { avatarColor, initials } from "@/lib/format";

export function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const color = avatarColor(name);
  return (
    <span
      title={name}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-600 ring-2 ring-ink-850"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `${color}22`,
        color,
        border: `1px solid ${color}55`,
      }}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names, max = 4 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((n, i) => (
          <Avatar key={`${n}-${i}`} name={n} />
        ))}
      </div>
      {extra > 0 && (
        <span className="ml-2 text-xs text-faint">+{extra}</span>
      )}
    </div>
  );
}
