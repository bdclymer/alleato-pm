"use client";

import { useRef } from "react";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export default function TestFormPage() {
  const renderCountRef = useRef(0);
  renderCountRef.current++;

  const form = useForm({
    defaultValues: { name: "hello" },
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold" data-testid="heading">
        MINIMAL TEST - Renders: {renderCountRef.current}
      </h1>
      <p data-testid="status">OK</p>
      <Form {...form}>
        <form>
          <FormField control={form.control} name="name" render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
            </FormItem>
          )} />
        </form>
      </Form>
    </div>
  );
}
