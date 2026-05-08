/**
 * Data fetching hooks for Supabase tables
 * These hooks provide consistent patterns for fetching and creating records
 */

export type { Company } from "@/types/financial";
export { useCompanies, type CompanyOption } from "../use-companies";
export { useClients, type Client, type ClientOption } from "../use-clients";
export {
  useUsers,
  useEmployees,
  type AppUser,
  type Employee,
  type UserOption,
} from "../use-users";
export { useProjects, type Project, type ProjectOption } from "../use-projects";
export {
  useCostCodes,
  type CostCode,
  type CostCodeOption,
} from "../use-cost-codes";
export {
  useContracts,
  type Contract,
  type ContractOption,
} from "../use-contracts";
export { useContacts, type Contact, type ContactOption } from "../use-contacts";
export {
  useCommitments,
  type CommitmentOption,
} from "../use-commitments-query";
export {
  useChangeEvents,
  useProjectChangeEvents,
  type ChangeEvent,
  type ChangeEventOption,
} from "../use-change-events";
