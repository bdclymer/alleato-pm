"use client";

import * as React from "react";
import {
  Building2,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Edit,
  Users,
  ClipboardList,
  History,
  User,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useProjectCompany } from "@/hooks/use-project-companies";
import type { ProjectCompany } from "@/services/companyService";
import type { PersonWithDetails } from "@/services/directoryService";

interface CompanyDetailViewProps {
  projectId: string;
  companyId: string;
  onBackClick: () => void;
  onEditClick?: (company: ProjectCompany) => void;
  onAddUser?: () => void;
}

// TODO: Phase 1C - Change History tab content
// TODO: Phase 2 - Bidder Info tab content

export function CompanyDetailView({
  projectId,
  companyId,
  onBackClick,
  onEditClick,
  onAddUser,
}: CompanyDetailViewProps) {
  const { company, isLoading, error } = useProjectCompany(projectId, companyId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="text-center py-12">
        <Text tone="destructive">{error?.message || "Company not found"}</Text>
        <Button variant="outline" onClick={onBackClick} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Companies
        </Button>
      </div>
    );
  }

  const companyData = company.company;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={onBackClick}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {companyData?.name || "Unnamed Company"}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={company.status === "ACTIVE" ? "active" : "inactive"}
                >
                  {company.status}
                </Badge>
                <Badge variant="outline">{company.company_type}</Badge>
                {company.user_count !== undefined && (
                  <Text size="sm" tone="muted">
                    {company.user_count} user
                    {company.user_count !== 1 ? "s" : ""}
                  </Text>
                )}
              </div>
            </div>
          </div>
        </div>
        {onEditClick && (
          <Button variant="outline" onClick={() => onEditClick(company)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Company
          </Button>
        )}
      </div>

      {/* Company Info Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Contact Info */}
            <div className="space-y-2">
              {company.email_address && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <Text size="sm">{company.email_address}</Text>
                </div>
              )}
              {company.business_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <Text size="sm">{company.business_phone}</Text>
                </div>
              )}
            </div>

            {/* Address */}
            <div className="space-y-2">
              {(companyData?.address ||
                companyData?.city ||
                companyData?.state) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    {companyData?.address && (
                      <Text size="sm">{companyData.address}</Text>
                    )}
                    {(companyData?.city || companyData?.state) && (
                      <Text size="sm">
                        {[companyData?.city, companyData?.state]
                          .filter(Boolean)
                          .join(", ")}
                      </Text>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Primary Contact */}
            <div className="space-y-2">
              {company.primary_contact && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Text size="sm" weight="medium">
                      Primary Contact
                    </Text>
                    <Text size="sm">
                      {company.primary_contact.first_name}{" "}
                      {company.primary_contact.last_name}
                    </Text>
                  </div>
                </div>
              )}
              {company.erp_vendor_id && (
                <Text size="sm" tone="muted">
                  ERP ID: {company.erp_vendor_id}
                </Text>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">
            <Building2 className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="bidder">
            <ClipboardList className="h-4 w-4 mr-2" />
            Bidder Info
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            Change History
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                General information about this company
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Text size="sm" weight="medium" tone="muted">
                    Company Name
                  </Text>
                  <Text>{companyData?.name || "-"}</Text>
                </div>
                <div>
                  <Text size="sm" weight="medium" tone="muted">
                    Company Type
                  </Text>
                  <Text>{company.company_type || "-"}</Text>
                </div>
                <div>
                  <Text size="sm" weight="medium" tone="muted">
                    Email Address
                  </Text>
                  <Text>{company.email_address || "-"}</Text>
                </div>
                <div>
                  <Text size="sm" weight="medium" tone="muted">
                    Business Phone
                  </Text>
                  <Text>{company.business_phone || "-"}</Text>
                </div>
                <div>
                  <Text size="sm" weight="medium" tone="muted">
                    Address
                  </Text>
                  <Text>{companyData?.address || "-"}</Text>
                </div>
                <div>
                  <Text size="sm" weight="medium" tone="muted">
                    City / State
                  </Text>
                  <Text>
                    {[companyData?.city, companyData?.state]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </Text>
                </div>
                <div>
                  <Text size="sm" weight="medium" tone="muted">
                    ERP Vendor ID
                  </Text>
                  <Text>{company.erp_vendor_id || "-"}</Text>
                </div>
                <div>
                  <Text size="sm" weight="medium" tone="muted">
                    Status
                  </Text>
                  <Badge
                    variant={
                      company.status === "ACTIVE" ? "active" : "inactive"
                    }
                  >
                    {company.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Company Users</CardTitle>
                <CardDescription>
                  People from this company who are on this project
                </CardDescription>
              </div>
              {onAddUser && (
                <Button onClick={onAddUser}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {(company as ProjectCompany & { users?: PersonWithDetails[] })
                .users &&
              (company as ProjectCompany & { users?: PersonWithDetails[] })
                .users!.length > 0 ? (
                <div className="space-y-2">
                  {(
                    company as ProjectCompany & { users?: PersonWithDetails[] }
                  ).users!.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {user.first_name?.[0]}
                            {user.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Text weight="medium">
                            {user.first_name} {user.last_name}
                          </Text>
                          {user.email && (
                            <Text size="sm" tone="muted">
                              {user.email}
                            </Text>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.job_title && (
                          <Badge variant="outline">{user.job_title}</Badge>
                        )}
                        <Badge
                          variant={
                            user.status === "active" ? "active" : "inactive"
                          }
                        >
                          {user.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <Text tone="muted">
                    No users from this company on this project
                  </Text>
                  {onAddUser && (
                    <Button
                      variant="outline"
                      onClick={onAddUser}
                      className="mt-4"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bidder Info Tab - TODO Phase 2 */}
        <TabsContent value="bidder" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bidder Information</CardTitle>
              <CardDescription>
                Bidding and qualification information for this company
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <Text tone="muted">
                  Bidder information will be available in Phase 2
                </Text>
                {/* TODO: Phase 2 - Implement bidder info fields */}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Change History Tab - TODO Phase 1C */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Change History</CardTitle>
              <CardDescription>
                Audit trail of changes made to this company
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <History className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <Text tone="muted">
                  Change history will be available in Phase 1C
                </Text>
                {/* TODO: Phase 1C - Implement change history log */}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
