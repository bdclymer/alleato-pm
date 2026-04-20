"use client";

import * as React from "react";
import Link from "next/link";
import { Edit2 } from "lucide-react";
import { ProjectTeamMember } from "@/types/project-home";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProjectTeamProps {
  team: ProjectTeamMember[];
  projectId: string;
}

export function ProjectTeam({ team, projectId }: ProjectTeamProps) {
  return (
    <div className="bg-background rounded-md border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        {/* eslint-disable-next-line design-system/no-raw-heading */}
        <h2 className="text-base font-semibold text-foreground">Project Team</h2>
        <Link
          href={`/${projectId}/directory/settings`}
          className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
        >
          Edit <Edit2 className="w-3 h-3" />
        </Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Role</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Office</TableHead>
            <TableHead>Mobile</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {team.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">{member.role}</TableCell>
              <TableCell>
                {member.name} ({member.company})
              </TableCell>
              <TableCell>
                <a
                  href={`mailto:${member.email}`}
                  className="text-link hover:text-link-hover hover:underline"
                >
                  {member.email}
                </a>
              </TableCell>
              <TableCell>{member.office || "-"}</TableCell>
              <TableCell>{member.mobile || "-"}</TableCell>
            </TableRow>
          ))}
          {team.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No team members assigned
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
