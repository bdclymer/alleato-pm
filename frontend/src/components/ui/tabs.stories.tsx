import React from "react";
import type { Meta } from "@storybook/nextjs-vite";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta: Meta = {
  title: "Navigation/Tabs",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

export default meta;

export const Default = {
  render: () => (
    <Tabs defaultValue="overview" className="w-full max-w-lg">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="schedule">Schedule of Values</TabsTrigger>
        <TabsTrigger value="invoices">Invoices</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="mt-4">
        <p className="text-sm text-muted-foreground">Contract overview and key details.</p>
      </TabsContent>
      <TabsContent value="schedule" className="mt-4">
        <p className="text-sm text-muted-foreground">Schedule of values and billing items.</p>
      </TabsContent>
      <TabsContent value="invoices" className="mt-4">
        <p className="text-sm text-muted-foreground">Pay applications and invoice history.</p>
      </TabsContent>
    </Tabs>
  ),
};

export const LineVariant = {
  render: () => (
    <Tabs defaultValue="summary" className="w-full max-w-2xl">
      <TabsList variant="line">
        <TabsTrigger value="summary">Summary</TabsTrigger>
        <TabsTrigger value="budget">Budget</TabsTrigger>
        <TabsTrigger value="commitments">Commitments</TabsTrigger>
        <TabsTrigger value="rfis">RFIs</TabsTrigger>
        <TabsTrigger value="submittals">Submittals</TabsTrigger>
      </TabsList>
      <TabsContent value="summary" className="mt-6">
        <p className="text-sm text-muted-foreground">Project summary view.</p>
      </TabsContent>
      <TabsContent value="budget" className="mt-6">
        <p className="text-sm text-muted-foreground">Budget and cost tracking.</p>
      </TabsContent>
      <TabsContent value="commitments" className="mt-6">
        <p className="text-sm text-muted-foreground">Subcontracts and purchase orders.</p>
      </TabsContent>
      <TabsContent value="rfis" className="mt-6">
        <p className="text-sm text-muted-foreground">Requests for information.</p>
      </TabsContent>
      <TabsContent value="submittals" className="mt-6">
        <p className="text-sm text-muted-foreground">Submittal log and approvals.</p>
      </TabsContent>
    </Tabs>
  ),
};
