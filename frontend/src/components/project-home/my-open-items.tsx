"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  FileText,
  HelpCircle,
  ClipboardCheck,
  LucideIcon,
} from "lucide-react";
import { MyOpenItem } from "@/types/project-home";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";

interface MyOpenItemsProps {
  items: MyOpenItem[];
  projectId: string;
}

const iconMap: Record<string, LucideIcon> = {
  Calendar,
  FileText,
  HelpCircle,
  ClipboardCheck,
};


export function MyOpenItems({ items, projectId }: MyOpenItemsProps) {
  return (
    <div className="bg-background rounded-md border border-border">
      <div className="px-6 py-4 border-b border-border">
        {/* eslint-disable-next-line design-system/no-raw-heading */}
        <h2 className="text-base font-semibold text-foreground">My Open Items</h2>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Item Type</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Due Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const Icon = iconMap[item.icon] || FileText;
            const href = item.link.replace("[projectId]", projectId);
            return (
              <TableRow key={item.id}>
                <TableCell>
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </TableCell>
                <TableCell className="text-sm text-foreground">
                  {item.itemType}
                </TableCell>
                <TableCell>
                  <Link href={href} className="text-link hover:text-link-hover hover:underline">
                    {item.details}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-foreground">
                  {item.status}
                </TableCell>
                <TableCell className="text-right text-sm text-foreground">
                  {formatDate(item.dueDate)}
                </TableCell>
              </TableRow>
            );
          })}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No open items
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
