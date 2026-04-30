"use client";

import { createClient } from "@/lib/supabase/client";
import {
  PostgrestQueryBuilder,
  type PostgrestClientOptions,
} from "@supabase/postgrest-js";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { Database } from "@/types/database.types";

const supabase = createClient();

// Change this to the database schema you want to use
type DatabaseSchema = Database["public"];

// Extracts the table names from the database type
type SupabaseTableName = keyof DatabaseSchema["Tables"];

// Extracts the table definition from the database type
type SupabaseTableData<T extends SupabaseTableName> =
  DatabaseSchema["Tables"][T]["Row"];

// Default client options for PostgrestQueryBuilder
type DefaultClientOptions = PostgrestClientOptions;

type SupabaseSelectBuilder<T extends SupabaseTableName> = ReturnType<
  PostgrestQueryBuilder<
    DefaultClientOptions,
    DatabaseSchema,
    DatabaseSchema["Tables"][T],
    T
  >["select"]
>;

// A function that modifies the query. Can be used to sort, filter, etc. If .range is used, it will be overwritten.
type SupabaseQueryHandler<T extends SupabaseTableName> = (
  query: SupabaseSelectBuilder<T>,
) => SupabaseSelectBuilder<T>;

interface UseInfiniteQueryProps<
  T extends SupabaseTableName,
  Query extends string = "*",
> {
  // The table name to query
  tableName: T;
  // The columns to select, defaults to `*`
  columns?: string;
  // The number of items to fetch per page, defaults to `20`
  pageSize?: number;
  // A function that modifies the query. Can be used to sort, filter, etc. If .range is used, it will be overwritten.
  trailingQuery?: SupabaseQueryHandler<T>;
}

interface StoreState<TData> {
  data: TData[];
  count: number;
  isSuccess: boolean;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  hasInitialFetch: boolean;
}

type Listener = () => void;

function createStore<
  TData extends SupabaseTableData<T>,
  T extends SupabaseTableName,
>(props: UseInfiniteQueryProps<T>) {
  const { tableName, columns = "*", pageSize = 20, trailingQuery } = props;

  let state: StoreState<TData> = {
    data: [],
    count: 0,
    isSuccess: false,
    isLoading: false,
    isFetching: false,
    error: null,
    hasInitialFetch: false,
  };

  const listeners = new Set<Listener>();

  const notify = () => {
    listeners.forEach((listener) => listener());
  };

  const setState = (newState: Partial<StoreState<TData>>) => {
    state = { ...state, ...newState };
    notify();
  };

  const fetchPage = async (skip: number) => {
    // Early return if already fetching or no more data
    if (state.isFetching) {
      return;
    }

    if (state.hasInitialFetch && state.count <= state.data.length) {
      return;
    }

    setState({ isFetching: true });

    let query = supabase
      .from(tableName)
      .select(columns, {
        count: "exact",
      }) as unknown as SupabaseSelectBuilder<T>;

    if (trailingQuery) {
      query = trailingQuery(query);
    }
    const {
      data: newData,
      count,
      error,
    } = await query.range(skip, skip + pageSize - 1);

    if (error) {
      setState({ error, isFetching: false });
    } else {
      setState({
        data: [...state.data, ...(newData as TData[])],
        count: count || 0,
        isSuccess: true,
        error: null,
        isFetching: false,
      });
    }
  };

  const fetchNextPage = async () => {
    await fetchPage(state.data.length);
  };

  const initialize = async () => {
    setState({ isLoading: true, isSuccess: false, data: [] });
    await fetchNextPage();
    setState({ isLoading: false, hasInitialFetch: true });
  };

  const refetch = async () => {
    setState({ isLoading: true, isSuccess: false, data: [], count: 0 });
    await fetchPage(0);
    setState({ isLoading: false, hasInitialFetch: true });
  };

  return {
    getState: () => state,
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    fetchNextPage,
    initialize,
    refetch,
  };
}

// Empty initial state to avoid hydration errors.
const initialState = {
  data: [],
  count: 0,
  isSuccess: false,
  isLoading: false,
  isFetching: false,
  error: null,
  hasInitialFetch: false,
} satisfies StoreState<never>;

function useInfiniteQuery<
  TData extends SupabaseTableData<T>,
  T extends SupabaseTableName = SupabaseTableName,
>(props: UseInfiniteQueryProps<T>) {
  const { tableName, columns, pageSize, trailingQuery } = props;
  const storeRef = useRef(createStore<TData, T>(props));

  const state = useSyncExternalStore(
    storeRef.current.subscribe,
    () => storeRef.current.getState(),
    () => initialState as StoreState<TData>,
  );

  // Initial fetch on mount
  useEffect(() => {
    if (!state.hasInitialFetch && typeof window !== "undefined") {
      storeRef.current.initialize();
    }
  }, [state.hasInitialFetch]);

  // Recreate store when actual dependencies change
  // This runs when filters change (trailingQuery is memoized with useCallback in parent)
  useEffect(() => {
    // Skip if we haven't done initial fetch yet (let the init effect handle it)
    if (!storeRef.current.getState().hasInitialFetch) return;

    // Reconstruct props from current values to satisfy ESLint
    const currentProps: UseInfiniteQueryProps<T> = {
      tableName,
      columns,
      pageSize,
      trailingQuery,
    };
    storeRef.current = createStore<TData, T>(currentProps);
    storeRef.current.initialize();
  }, [tableName, columns, pageSize, trailingQuery]);

  // Create a stable fetchNextPage callback that always references the current store
  const fetchNextPage = useCallback(() => {
    storeRef.current.fetchNextPage();
  }, []);

  const refetch = useCallback(() => {
    storeRef.current.refetch();
  }, []);

  return {
    data: state.data,
    count: state.count,
    isSuccess: state.isSuccess,
    isLoading: state.isLoading,
    isFetching: state.isFetching,
    error: state.error,
    hasMore: state.count > state.data.length,
    fetchNextPage,
    refetch,
  };
}

export {
  useInfiniteQuery,
  type SupabaseQueryHandler,
  type SupabaseTableData,
  type SupabaseTableName,
  type UseInfiniteQueryProps,
};
