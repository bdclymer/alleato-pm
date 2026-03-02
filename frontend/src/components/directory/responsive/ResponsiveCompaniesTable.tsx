"use client";

import type { ProjectCompany } from "@/services/companyService";
import { Button } from "@/components/ui/button";
import { MoreVertical, MapPin, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ResponsiveCompaniesTableProps {
  companies: ProjectCompany[];
  onEdit?: (company: ProjectCompany) => void;
  onDelete?: (company: ProjectCompany) => void;
  onViewDetails?: (company: ProjectCompany) => void;
}

function formatCompanyType(value: ProjectCompany["company_type"] | null) {
  if (!value) return null;
  return value
    .split("_")
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(" ");
}

export function ResponsiveCompaniesTable({
  companies,
  onEdit,
  onDelete,
  onViewDetails,
}: ResponsiveCompaniesTableProps) {
  return (
    <div className="space-y-4">
      {/* Desktop View - Hidden on mobile */}
      <div className="hidden md:block">
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-4 text-left text-sm font-medium">
                  Company Name
                </th>
                <th className="p-4 text-left text-sm font-medium">Location</th>
                <th className="p-4 text-left text-sm font-medium">Type</th>
                <th className="p-4 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => {
                const companyDetails = company.company;
                const companyType =
                  formatCompanyType(company.company_type) ||
                  companyDetails?.title ||
                  "-";

                return (
                <tr
                  key={company.id}
                  className="border-b last:border-0 hover:bg-muted/50"
                >
                  <td className="p-4">
                    <div className="font-medium">
                      {companyDetails?.name || "Unnamed Company"}
                    </div>
                    {companyDetails?.title && (
                      <div className="text-sm text-muted-foreground">
                        {companyDetails.title}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-sm">
                    {companyDetails?.city && companyDetails?.state
                      ? `${companyDetails.city}, ${companyDetails.state}`
                      : companyDetails?.city || companyDetails?.state || "-"}
                  </td>
                  <td className="p-4 text-sm">{companyType}</td>
                  <td className="p-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onViewDetails && (
                          <DropdownMenuItem
                            onClick={() => onViewDetails(company)}
                          >
                            View Details
                          </DropdownMenuItem>
                        )}
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(company)}>
                            Edit
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem onClick={() => onDelete(company)}>
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile View - Card layout */}
      <div className="md:hidden space-y-4">
        {companies.map((company) => {
          const companyDetails = company.company;
          const companyType =
            formatCompanyType(company.company_type) ||
            companyDetails?.title ||
            "-";

          return (
          <div key={company.id} className="border rounded-lg p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium">
                  {companyDetails?.name || "Unnamed Company"}
                </h3>
                {companyDetails?.title && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {companyDetails.title}
                  </p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onViewDetails && (
                    <DropdownMenuItem onClick={() => onViewDetails(company)}>
                      View Details
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(company)}>
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem onClick={() => onDelete(company)}>
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2">
              {(companyDetails?.city || companyDetails?.state) && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {companyDetails?.city && companyDetails?.state
                      ? `${companyDetails.city}, ${companyDetails.state}`
                      : companyDetails?.city || companyDetails?.state}
                  </span>
                </div>
              )}
              {companyType && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Type: </span>
                  <span>{companyType}</span>
                </div>
              )}
              {companyDetails?.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={companyDetails.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline truncate"
                  >
                    {companyDetails.website}
                  </a>
                </div>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
