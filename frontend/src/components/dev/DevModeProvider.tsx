'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface DataSource {
  id: string;
  component: string;
  table: string;
  columns: string[];
  query?: string;
  relationships?: string[];
  calculatedFields?: Record<string, string>;
}

interface DevModeContextType {
  enabled: boolean;
  toggle: () => void;
  dataSources: DataSource[];
  registerDataSource: (source: DataSource) => void;
  unregisterDataSource: (id: string) => void;
  highlightedSource: string | null;
  setHighlightedSource: (id: string | null) => void;
}

const DevModeContext = createContext<DevModeContextType | null>(null);

export function DevModeProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [highlightedSource, setHighlightedSource] = useState<string | null>(null);

  const toggle = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  const registerDataSource = useCallback((source: DataSource) => {
    setDataSources((prev) => {
      const exists = prev.some((s) => s.id === source.id);
      if (exists) return prev;
      return [...prev, source];
    });
  }, []);

  const unregisterDataSource = useCallback((id: string) => {
    setDataSources((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return (
    <DevModeContext.Provider
      value={{
        enabled,
        toggle,
        dataSources,
        registerDataSource,
        unregisterDataSource,
        highlightedSource,
        setHighlightedSource,
      }}
    >
      {children}
      {enabled && <DevModePanel />}
    </DevModeContext.Provider>
  );
}

export function useDevMode() {
  const context = useContext(DevModeContext);
  if (!context) {
    throw new Error('useDevMode must be used within DevModeProvider');
  }
  return context;
}

// Floating panel showing all registered data sources
function DevModePanel() {
  const { dataSources, highlightedSource, setHighlightedSource, toggle } = useDevMode();

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-96 max-h-[60vh] overflow-auto bg-yellow-50 border-2 border-yellow-400 rounded-lg shadow-sm">
      <div className="sticky top-0 bg-yellow-200 px-4 py-2 flex items-center justify-between">
        <span className="font-bold text-yellow-900 text-sm">
          DEV MODE: Data Sources ({dataSources.length})
        </span>
        {/* eslint-disable-next-line design-system/no-design-violations -- dev-only mode panel */}
        <button
          onClick={toggle}
          className="text-yellow-700 hover:text-yellow-900 text-xs underline"
        >
          Close
        </button>
      </div>

      <div className="p-2 space-y-2">
        {dataSources.length === 0 ? (
          <p className="text-xs text-yellow-700 italic">
            No data sources registered. Components using useDataSource will appear here.
          </p>
        ) : (
          dataSources.map((source) => (
            <div
              key={source.id}
              className={`p-2 rounded text-xs ${
                highlightedSource === source.id
                  ? 'bg-yellow-300 ring-2 ring-yellow-500'
                  : 'bg-card'
              }`}
              onMouseEnter={() => setHighlightedSource(source.id)}
              onMouseLeave={() => setHighlightedSource(null)}
            >
              <div className="font-bold text-yellow-900">{source.component}</div>
              <div className="text-yellow-700 mt-1">
                <span className="font-medium">Table:</span> {source.table}
              </div>
              <div className="text-yellow-600">
                <span className="font-medium">Columns:</span> {source.columns.join(', ')}
              </div>
              {source.query && (
                <div className="mt-1 text-yellow-600 font-mono text-2xs bg-yellow-100 p-1 rounded overflow-x-auto">
                  {source.query}
                </div>
              )}
              {source.calculatedFields && Object.keys(source.calculatedFields).length > 0 && (
                <div className="mt-1">
                  <span className="font-medium text-orange-700">Calculated:</span>
                  <ul className="ml-2 text-orange-600">
                    {Object.entries(source.calculatedFields).map(([field, formula]) => (
                      <li key={field}>
                        {field}: <code className="text-2xs">{formula}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {source.relationships && source.relationships.length > 0 && (
                <div className="text-purple-600 mt-1">
                  <span className="font-medium">Relations:</span> {source.relationships.join(' → ')}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="sticky bottom-0 bg-yellow-100 px-4 py-2 text-2xs text-yellow-700">
        Press <kbd className="bg-yellow-200 px-1 rounded">Ctrl+Shift+D</kbd> to toggle
      </div>
    </div>
  );
}
