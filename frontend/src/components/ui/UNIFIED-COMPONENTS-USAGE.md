# Unified Components Usage Guide

This guide documents the standardized modal and slideover components that ensure consistency across the application.

## Core Components

### 1. UnifiedModal
A consistent modal component with standardized overlay, animations, and sizing.

### 2. UnifiedSlideover
A consistent slideover/drawer component for sidebars and detail panels.

### 3. ProjectChecklistSidebar
An example implementation using the UnifiedSlideover for the project homepage.

## UnifiedModal Usage

### Basic Modal Example

```tsx
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalTrigger,
} from "@/components/ui/unified-modal"
import { Button } from "@/components/ui/button"

export function BasicModalExample() {
  return (
    <Modal>
      <ModalTrigger asChild>
        <Button>Open Modal</Button>
      </ModalTrigger>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Edit Profile</ModalTitle>
          <ModalDescription>
            Make changes to your profile here. Click save when you're done.
          </ModalDescription>
        </ModalHeader>
        <div className="grid gap-4 py-4">
          {/* Your form content here */}
        </div>
        <ModalFooter>
          <Button type="submit">Save changes</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
```

### Controlled Modal with Different Sizes

```tsx
import { useState } from "react"
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/unified-modal"
import { Button } from "@/components/ui/button"

export function ControlledModalExample() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Large Modal</Button>
      <Modal open={open} onOpenChange={setOpen}>
        <ModalContent size="xl"> {/* xs, sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl, full */}
          <ModalHeader>
            <ModalTitle>Large Modal</ModalTitle>
          </ModalHeader>
          <div className="min-h-[400px]">
            {/* Content */}
          </div>
        </ModalContent>
      </Modal>
    </>
  )
}
```

### Modal without Close Button

```tsx
<ModalContent hideCloseButton>
  {/* Content */}
</ModalContent>
```

## UnifiedSlideover Usage

### Basic Slideover Example

```tsx
import {
  Slideover,
  SlideoverContent,
  SlideoverHeader,
  SlideoverTitle,
  SlideoverDescription,
  SlideoverBody,
  SlideoverFooter,
  SlideoverTrigger,
} from "@/components/ui/unified-slideover"
import { Button } from "@/components/ui/button"

export function BasicSlideoverExample() {
  return (
    <Slideover>
      <SlideoverTrigger asChild>
        <Button>Open Details</Button>
      </SlideoverTrigger>
      <SlideoverContent>
        <SlideoverHeader>
          <SlideoverTitle>Order Details</SlideoverTitle>
          <SlideoverDescription>
            View and manage order information
          </SlideoverDescription>
        </SlideoverHeader>
        <SlideoverBody>
          {/* Scrollable content */}
        </SlideoverBody>
        <SlideoverFooter>
          <Button>Close</Button>
        </SlideoverFooter>
      </SlideoverContent>
    </Slideover>
  )
}
```

### Slideover with Different Sides and Sizes

```tsx
export function SlideoverVariationsExample() {
  return (
    <>
      {/* Left sidebar */}
      <Slideover>
        <SlideoverTrigger asChild>
          <Button>Left Sidebar</Button>
        </SlideoverTrigger>
        <SlideoverContent side="left" size="sm">
          {/* Content */}
        </SlideoverContent>
      </Slideover>

      {/* Wide right panel */}
      <Slideover>
        <SlideoverTrigger asChild>
          <Button>Wide Panel</Button>
        </SlideoverTrigger>
        <SlideoverContent side="right" size="xl">
          {/* Content */}
        </SlideoverContent>
      </Slideover>

      {/* Bottom drawer */}
      <Slideover>
        <SlideoverTrigger asChild>
          <Button>Bottom Drawer</Button>
        </SlideoverTrigger>
        <SlideoverContent side="bottom" size="content">
          {/* Content */}
        </SlideoverContent>
      </Slideover>
    </>
  )
}
```

## ProjectChecklistSidebar Usage

### Basic Implementation

```tsx
import { ProjectChecklistSidebar } from "@/components/project/project-checklist-sidebar"

export function ProjectHomePage({ projectId }: { projectId: string }) {
  return (
    <div>
      {/* Page content */}

      {/* Checklist sidebar - fixed position button */}
      <ProjectChecklistSidebar
        projectId={projectId}
        projectName="Construction Project Alpha"
      />
    </div>
  )
}
```

### Custom Trigger Position

```tsx
<ProjectChecklistSidebar
  projectId={projectId}
  projectName="My Project"
  triggerClassName="top-32 right-8" // Override default position
/>
```

## Migration Guide

### Migrating from Dialog to UnifiedModal

**Before:**
```tsx
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"

<Dialog>
  <DialogContent className="sm:max-w-[425px]">
    {/* Content */}
  </DialogContent>
</Dialog>
```

**After:**
```tsx
import { Modal, ModalContent, ModalHeader } from "@/components/ui/unified-modal"

<Modal>
  <ModalContent size="sm">
    {/* Content */}
  </ModalContent>
</Modal>
```

### Migrating from Sheet to UnifiedSlideover

**Before:**
```tsx
import { Sheet, SheetContent } from "@/components/ui/sheet"

<Sheet>
  <SheetContent side="right" className="w-[400px]">
    {/* Content */}
  </SheetContent>
</Sheet>
```

**After:**
```tsx
import { Slideover, SlideoverContent } from "@/components/ui/unified-slideover"

<Slideover>
  <SlideoverContent side="right" size="md">
    {/* Content */}
  </SlideoverContent>
</Slideover>
```

## Component Props Reference

### UnifiedModal Props

- `size`: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full"
- `hideCloseButton`: boolean (default: false)
- All standard Radix Dialog props

### UnifiedSlideover Props

- `side`: "top" | "right" | "bottom" | "left" (default: "right")
- `size`: "xs" | "sm" | "md" | "lg" | "xl" | "full" | "content"
- `hideCloseButton`: boolean (default: false)
- All standard Radix Dialog (Sheet) props

## Design Consistency Standards

### Overlay
- **Color**: `bg-black/60` (60% black opacity)
- **Effect**: `backdrop-blur-sm` (subtle blur)
- **Animation**: Fade in/out

### Modal Animations
- **Entry**: Fade in + zoom in from 95% + slide from center
- **Exit**: Fade out + zoom out to 95% + slide to center
- **Duration**: 200ms

### Slideover Animations
- **Entry**: Slide in from edge (500ms)
- **Exit**: Slide out to edge (300ms)
- **Easing**: `ease-in-out`

### Close Button
- **Position**: Top-right (right-4 top-4)
- **Icon**: X icon from lucide-react
- **Hover**: Increased opacity
- **Focus**: Ring with offset

## Best Practices

1. **Always use the unified components** for new features
2. **Migrate existing modals/sheets** when touching related code
3. **Use controlled state** for complex interactions
4. **Provide proper ARIA labels** via title and description
5. **Test keyboard navigation** (Escape key, Tab order)
6. **Ensure mobile responsiveness** with appropriate sizes

## Accessibility

All components include:
- Proper ARIA attributes
- Focus management
- Keyboard navigation (Escape to close)
- Screen reader announcements
- Focus trap within modal/slideover

## Testing

```tsx
// Example test for modal
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

test("opens and closes modal", async () => {
  const user = userEvent.setup()

  render(<YourModalComponent />)

  // Open modal
  await user.click(screen.getByText("Open Modal"))
  expect(screen.getByRole("dialog")).toBeInTheDocument()

  // Close with Escape
  await user.keyboard("{Escape}")
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
})
```