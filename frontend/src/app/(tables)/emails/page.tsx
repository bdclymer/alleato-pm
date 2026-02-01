"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MoreHorizontal,
  Eye,
  Reply,
  Forward,
  Trash2,
  Mail,
  MailOpen,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Email {
  id: string;
  subject: string;
  from: string;
  to: string;
  read: boolean;
  hasAttachments: boolean;
  sentAt: string;
  category: "general" | "rfi" | "submittal" | "change_order" | "meeting";
}

const mockEmails: Email[] = [
  {
    id: "1",
    subject: "RE: Foundation Pour Schedule Confirmation",
    from: "john.smith@contractor.com",
    to: "project-team@company.com",
    read: false,
    hasAttachments: true,
    sentAt: "2025-12-10T10:30:00",
    category: "general",
  },
  {
    id: "2",
    subject: "RFI-001 Response: Structural Beam Specification",
    from: "engineer@structuraleng.com",
    to: "superintendent@company.com",
    read: true,
    hasAttachments: true,
    sentAt: "2025-12-09T14:15:00",
    category: "rfi",
  },
  {
    id: "3",
    subject: "Weekly Progress Meeting Notes",
    from: "admin@company.com",
    to: "all-stakeholders@company.com",
    read: true,
    hasAttachments: false,
    sentAt: "2025-12-08T16:00:00",
    category: "meeting",
  },
];

export default function EmailsPage() {
  const [data, setData] = React.useState<Email[]>(mockEmails);

  const columns: ColumnDef<Email>[] = [
    {
      id: "read",
      header: "",
      cell: ({ row }) => (
        <div className="w-4">
          {row.original.read ? (
            <MailOpen className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Mail className="h-4 w-4 text-blue-600" />
          )}
        </div>
      ),
      size: 40,
    },
    {
      accessorKey: "subject",
      header: "Subject",
      cell: ({ row }) => (
        <button
          type="button"
          className={`font-medium text-left hover:underline ${
            row.original.read ? "text-foreground" : "text-foreground font-semibold"
          }`}
        >
          {row.getValue("subject")}
        </button>
      ),
    },
    {
      accessorKey: "from",
      header: "From",
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const category = row.getValue("category") as string;
        const categoryColors: Record<string, string> = {
          general: "bg-muted text-foreground",
          rfi: "bg-blue-100 text-blue-700",
          submittal: "bg-purple-100 text-purple-700",
          change_order: "bg-orange-100 text-orange-700",
          meeting: "bg-green-100 text-green-700",
        };
        return (
          <Badge
            className={categoryColors[category] || "bg-muted text-foreground"}
          >
            {category.replace("_", " ")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "sentAt",
      header: "Date",
      cell: ({ row }) => {
        const date = new Date(row.getValue("sentAt"));
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();

        if (isToday) {
          return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          });
        }
        return date.toLocaleDateString();
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Reply className="mr-2 h-4 w-4" />
              Reply
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Forward className="mr-2 h-4 w-4" />
              Forward
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Emails</h1>
          <p className="text-sm text-muted-foreground mt-1">Project correspondence</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Compose Email
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-background rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground">Total Emails</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {data.length}
          </div>
        </div>
        <div className="bg-background rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground">Unread</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {data.filter((email) => !email.read).length}
          </div>
        </div>
        <div className="bg-background rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground">
            With Attachments
          </div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {data.filter((email) => email.hasAttachments).length}
          </div>
        </div>
        <div className="bg-background rounded-lg border p-4">
          <div className="text-sm font-medium text-muted-foreground">Today</div>
          <div className="text-2xl font-bold text-foreground mt-1">
            {
              data.filter(
                (email) =>
                  new Date(email.sentAt).toDateString() ===
                  new Date().toDateString(),
              ).length
            }
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 bg-background rounded-lg border overflow-hidden">
        <DataTable
          columns={columns}
          data={data}
          searchKey="subject"
          searchPlaceholder="Search emails..."
        />
      </div>
    </div>
  );
}
