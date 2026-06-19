"use client";

import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/unified-modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useTaskStore } from "../utils/store";

export default function NewTaskDialog() {
  const addTask = useTaskStore((state) => state.addTask);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);
    const { title, description } = Object.fromEntries(formData);

    if (typeof title !== "string" || typeof description !== "string") return;
    addTask(title, description);
  };

  return (
    <Modal>
      <ModalTrigger asChild>
        <Button variant="secondary" size="sm">
          + Add New Task
        </Button>
      </ModalTrigger>
      <ModalContent size="md">
        <ModalHeader>
          <ModalTitle>Add New Task</ModalTitle>
          <ModalDescription>
            What do you want to get done today?
          </ModalDescription>
        </ModalHeader>
        <form
          id="task-form"
          className="grid gap-4 py-4"
          onSubmit={handleSubmit}
        >
          <div className="grid grid-cols-4 items-center gap-4">
            <Input
              id="title"
              name="title"
              placeholder="Task title..."
              className="col-span-4"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Textarea
              id="description"
              name="description"
              placeholder="Description..."
              className="col-span-4"
            />
          </div>
        </form>
        <ModalFooter>
          <ModalClose asChild>
            <Button type="submit" size="sm" form="task-form">
              Add Task
            </Button>
          </ModalClose>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
