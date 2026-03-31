import { AnimatedBackground } from "@/components/motion/animated-background";

export function SegmentedControl() {
  return (
    <div className="rounded-[8px] bg-muted p-[2px] dark:bg-zinc-800">
      <AnimatedBackground
        defaultValue="Day"
        className="rounded-lg bg-background dark:bg-zinc-700"
        transition={{
          ease: "easeInOut",
          duration: 0.2,
        }}
      >
        {["Day", "Week", "Month", "Year"].map((label, index) => {
          return (
            // eslint-disable-next-line design-system/no-design-violations -- animated segmented control requires raw button for AnimatedBackground
            <button
              key={index}
              data-id={label}
              type="button"
              aria-label={`${label} view`}
              className="inline-flex w-20 items-center justify-center text-center text-foreground transition-transform active:scale-[0.98]"
            >
              {label}
            </button>
          );
        })}
      </AnimatedBackground>
    </div>
  );
}
