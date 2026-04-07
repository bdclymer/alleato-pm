import {
  MorphingDialog,
  MorphingDialogTrigger,
  MorphingDialogContent,
  MorphingDialogTitle,
  MorphingDialogImage,
  MorphingDialogSubtitle,
  MorphingDialogClose,
  MorphingDialogDescription,
  MorphingDialogContainer,
} from "@/components/motion/morphing-dialog";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";

export function MorphingDialogBasicOne() {
  return (
    <MorphingDialog
      transition={{
        type: "spring",
        bounce: 0.05,
        duration: 0.25,
      }}
    >
      <MorphingDialogTrigger
        style={{
          borderRadius: "12px",
        }}
        className="flex max-w-xs flex-col overflow-hidden border border-border bg-card"
      >
        <MorphingDialogImage
          src="https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&q=80"
          alt="A desk lamp designed by Edouard Wilfrid Buquet in 1925. It features a double-arm design and is made from nickel-plated brass, aluminium and varnished wood."
          className="h-48 w-full object-cover"
        />
        <div className="flex grow flex-row items-end justify-between px-4 py-2">
          <div>
            <MorphingDialogTitle className="text-foreground">
              EB27
            </MorphingDialogTitle>
            <MorphingDialogSubtitle className="text-muted-foreground">
              Edouard Wilfrid Buquet
            </MorphingDialogSubtitle>
          </div>
          <Button
            asChild
            variant="outline"
            size="icon-xs"
            className="relative ml-1 scale-100 select-none active:scale-[0.98]"
          >
            <span aria-hidden="true">
              <PlusIcon size={12} />
            </span>
          </Button>
        </div>
      </MorphingDialogTrigger>
      <MorphingDialogContainer>
        <MorphingDialogContent
          style={{
            borderRadius: "24px",
          }}
          className="pointer-events-auto relative flex h-auto w-full max-w-lg flex-col overflow-hidden border border-border bg-card"
        >
          <MorphingDialogImage
            src="https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800&q=80"
            alt="A desk lamp designed by Edouard Wilfrid Buquet in 1925. It features a double-arm design and is made from nickel-plated brass, aluminium and varnished wood."
            className="h-full w-full"
          />
          <div className="p-6">
            <MorphingDialogTitle className="text-2xl text-foreground">
              EB27
            </MorphingDialogTitle>
            <MorphingDialogSubtitle className="text-muted-foreground">
              Edouard Wilfrid Buquet
            </MorphingDialogSubtitle>
            <MorphingDialogDescription
              disableLayoutAnimation
              variants={{
                initial: { opacity: 0, scale: 0.8, y: 100 },
                animate: { opacity: 1, scale: 1, y: 0 },
                exit: { opacity: 0, scale: 0.8, y: 100 },
              }}
            >
              <p className="mt-2 text-muted-foreground">
                Little is known about the life of Édouard-Wilfrid Buquet. He was
                born in France in 1866, but the time and place of his death is
                unfortunately a mystery.
              </p>
              <p className="text-muted-foreground">
                Research conducted in the 1970s revealed that he'd designed the
                "EB 27" double-arm desk lamp in 1925, handcrafting it from
                nickel-plated brass, aluminium and varnished wood.
              </p>
              <a
                className="mt-2 inline-flex text-primary underline"
                href="https://www.are.na/block/12759029"
                target="_blank"
                rel="noopener noreferrer"
              >
                Are.na block
              </a>
            </MorphingDialogDescription>
          </div>
          <MorphingDialogClose className="text-muted-foreground hover:text-foreground" />
        </MorphingDialogContent>
      </MorphingDialogContainer>
    </MorphingDialog>
  );
}
