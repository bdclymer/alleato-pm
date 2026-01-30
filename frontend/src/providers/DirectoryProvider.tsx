"use client";

import React, { createContext, useCallback, useState, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  DirectoryService,
  type DirectoryFilters,
  type PersonWithDetails,
  type PersonCreateDTO,
  type PersonUpdateDTO,
} from "@/services/directoryService";
import type { DistributionGroupWithMembers } from "@/services/distributionGroupService";
import type { Database } from "@/types/database.types";

type Company = Database["public"]["Tables"]["companies"]["Row"];

interface DirectoryState {
  users: PersonWithDetails[];
  companies: Company[];
  distributionGroups: DistributionGroupWithMembers[];
  selectedCompanyId: string | null;
  selectedUserId: string | null;
  filters: DirectoryFilters;
  pagination: {
    usersPage: number;
    companiesPage: number;
    groupsPage: number;
  };
  loading: boolean;
  error: string | null;
}

interface DirectoryContextValue extends DirectoryState {
  fetchUsers: (projectId: string, companyId?: string) => Promise<void>;
  fetchCompanies: (projectId: string) => Promise<void>;
  fetchCompany: (
    projectId: string,
    companyId: string,
  ) => Promise<Company | null>;
  fetchDistributionGroups: (projectId: string) => Promise<void>;
  createUser: (
    projectId: string,
    data: PersonCreateDTO,
  ) => Promise<PersonWithDetails>;
  updateUser: (
    projectId: string,
    userId: string,
    data: PersonUpdateDTO,
  ) => Promise<PersonWithDetails>;
  deactivateUser: (projectId: string, userId: string) => Promise<void>;
  reactivateUser: (projectId: string, userId: string) => Promise<void>;
  setSelectedCompany: (id: string | null) => void;
  setSelectedUser: (id: string | null) => void;
  setFilters: (filters: DirectoryFilters) => void;
  setPagination: (page: number, type: "users" | "companies" | "groups") => void;
  clearError: () => void;
  refetch: () => Promise<void>;
}

const DirectoryContext = createContext<DirectoryContextValue | undefined>(
  undefined,
);

const initialState: DirectoryState = {
  users: [],
  companies: [],
  distributionGroups: [],
  selectedCompanyId: null,
  selectedUserId: null,
  filters: {
    search: "",
    type: "all",
    status: "active",
    groupBy: "none",
    page: 1,
    perPage: 50,
  },
  pagination: {
    usersPage: 1,
    companiesPage: 1,
    groupsPage: 1,
  },
  loading: false,
  error: null,
};

interface DirectoryProviderProps {
  children: ReactNode;
  projectId?: string;
}

export function DirectoryProvider({
  children,
  projectId,
}: DirectoryProviderProps) {
  const [state, setState] = useState<DirectoryState>(initialState);
  const supabase = createClient();
  const directoryService = new DirectoryService(supabase);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error, loading: false }));
  }, []);

  const fetchUsers = useCallback(
    async (projectId: string, companyId?: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const filters: DirectoryFilters = {
          ...state.filters,
          type: "user",
          companyId,
        };
        const response = await directoryService.getPeople(projectId, filters);
        setState((prev) => ({
          ...prev,
          users: response.data,
          loading: false,
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch users");
      }
    },
    [state.filters, directoryService, setError],
  );

  const fetchCompanies = useCallback(
    async (projectId: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const companies = await directoryService.getCompanies(projectId);
        setState((prev) => ({
          ...prev,
          companies,
          loading: false,
        }));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch companies",
        );
      }
    },
    [directoryService, setError],
  );

  const fetchCompany = useCallback(
    async (projectId: string, companyId: string): Promise<Company | null> => {
      try {
        const { data, error } = await supabase
          .from("companies")
          .select("*")
          .eq("id", companyId)
          .single();

        if (error) throw error;
        return data;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch company",
        );
        return null;
      }
    },
    [supabase, setError],
  );

  const fetchDistributionGroups = useCallback(
    async (projectId: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const response = await fetch(
          `/api/projects/${projectId}/directory/groups?include_members=true`,
        );
        if (!response.ok) {
          throw new Error("Failed to fetch distribution groups");
        }
        const groups = await response.json();
        setState((prev) => ({
          ...prev,
          distributionGroups: groups,
          loading: false,
        }));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch distribution groups",
        );
      }
    },
    [setError],
  );

  const createUser = useCallback(
    async (
      projectId: string,
      data: PersonCreateDTO,
    ): Promise<PersonWithDetails> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const person = await directoryService.createPerson(projectId, data);
        setState((prev) => ({
          ...prev,
          users: [...prev.users, person],
          loading: false,
        }));
        return person;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create user");
        throw err;
      }
    },
    [directoryService, setError],
  );

  const updateUser = useCallback(
    async (
      projectId: string,
      userId: string,
      data: PersonUpdateDTO,
    ): Promise<PersonWithDetails> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const updatedPerson = await directoryService.updatePerson(
          projectId,
          userId,
          data,
        );
        setState((prev) => ({
          ...prev,
          users: prev.users.map((u) => (u.id === userId ? updatedPerson : u)),
          loading: false,
        }));
        return updatedPerson;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update user");
        throw err;
      }
    },
    [directoryService, setError],
  );

  const deactivateUser = useCallback(
    async (projectId: string, userId: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        await directoryService.deactivatePerson(projectId, userId);
        setState((prev) => ({
          ...prev,
          users: prev.users.map((u) =>
            u.id === userId && u.membership
              ? { ...u, membership: { ...u.membership, status: "inactive" } }
              : u,
          ),
          loading: false,
        }));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to deactivate user",
        );
      }
    },
    [directoryService, setError],
  );

  const reactivateUser = useCallback(
    async (projectId: string, userId: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        await directoryService.reactivatePerson(projectId, userId);
        setState((prev) => ({
          ...prev,
          users: prev.users.map((u) =>
            u.id === userId && u.membership
              ? { ...u, membership: { ...u.membership, status: "active" } }
              : u,
          ),
          loading: false,
        }));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to reactivate user",
        );
      }
    },
    [directoryService, setError],
  );

  const setSelectedCompany = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, selectedCompanyId: id }));
  }, []);

  const setSelectedUser = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, selectedUserId: id }));
  }, []);

  const setFilters = useCallback((filters: DirectoryFilters) => {
    setState((prev) => ({ ...prev, filters }));
  }, []);

  const setPagination = useCallback(
    (page: number, type: "users" | "companies" | "groups") => {
      setState((prev) => ({
        ...prev,
        pagination: {
          ...prev.pagination,
          [`${type}Page`]: page,
        },
      }));
    },
    [],
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const refetch = useCallback(async () => {
    if (projectId) {
      await Promise.all([
        fetchUsers(projectId),
        fetchCompanies(projectId),
        fetchDistributionGroups(projectId),
      ]);
    }
  }, [projectId, fetchUsers, fetchCompanies, fetchDistributionGroups]);

  const value: DirectoryContextValue = {
    ...state,
    fetchUsers,
    fetchCompanies,
    fetchCompany,
    fetchDistributionGroups,
    createUser,
    updateUser,
    deactivateUser,
    reactivateUser,
    setSelectedCompany,
    setSelectedUser,
    setFilters,
    setPagination,
    clearError,
    refetch,
  };

  return (
    <DirectoryContext.Provider value={value}>
      {children}
    </DirectoryContext.Provider>
  );
}

export function useDirectoryContext() {
  const context = React.useContext(DirectoryContext);
  if (context === undefined) {
    throw new Error(
      "useDirectoryContext must be used within a DirectoryProvider",
    );
  }
  return context;
}
