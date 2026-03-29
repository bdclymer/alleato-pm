"use client";
import * as React from "react";
import { usePathname } from "next/navigation";
import {
  Bug,
  ChevronDown,
  ChevronUp,
  Database,
  Globe,
  User,
  Shield,
  Clock,
  Server,
  X,
  Copy,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
interface ApiCall {
  id: string;
  method: string;
  url: string;
  status?: number;
  duration?: number;
  timestamp: Date;
  table?: string;
}
interface DebugInfo {
  supabaseTable?: string;
  apiRoute?: string;
  queryParams?: Record<string, string>;
  additionalInfo?: Record<string, unknown>;
} // Global state for debug info from components
const debugInfoRegistry = new Map<string, DebugInfo>();
const apiCallsRegistry: ApiCall[] = [];
const listeners = new Set<() => void>(); // Export functions for components to register their debug info
export function registerDebugInfo(key: string, info: DebugInfo) {
  debugInfoRegistry.set(key, info);
  listeners.forEach((fn) => fn());
}
export function unregisterDebugInfo(key: string) {
  debugInfoRegistry.delete(key);
  listeners.forEach((fn) => fn());
}
export function registerApiCall(call: Omit<ApiCall, "id" | "timestamp">) {
  const newCall: ApiCall = {
    ...call,
    id: Math.random().toString(36).substring(7),
    timestamp: new Date(),
  };
  apiCallsRegistry.unshift(newCall); // Keep only last 20 calls if (apiCallsRegistry.length > 20) { apiCallsRegistry.pop(); } listeners.forEach(fn => fn());
}
export function updateApiCall(url: string, updates: Partial<ApiCall>) {
  const call = apiCallsRegistry.find((c) => c.url === url);
  if (call) {
    Object.assign(call, updates);
    listeners.forEach((fn) => fn());
  }
} // Hook to use debug registry
function useDebugRegistry() {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    listeners.add(forceUpdate);
    return () => {
      listeners.delete(forceUpdate);
    };
  }, []);
  return {
    debugInfo: Object.fromEntries(debugInfoRegistry),
    apiCalls: [...apiCallsRegistry],
  };
} // Hook for components to register their debug info
export function useDebugInfo(key: string, info: DebugInfo) {
  React.useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      registerDebugInfo(key, info);
      return () => unregisterDebugInfo(key);
    }
  }, [key, JSON.stringify(info)]);
}
interface DevDebugPanelProps {
  className?: string;
}
export function DevDebugPanel({ className }: DevDebugPanelProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<
    "info" | "api" | "user" | "env"
  >("info");
  const [copied, setCopied] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<{
    id: string;
    email?: string;
    role?: string;
  } | null>(null);
  const [userProfile, setUserProfile] = React.useState<{
    is_admin?: boolean;
  } | null>(null);
  const pathname = usePathname();
  const { debugInfo, apiCalls } = useDebugRegistry(); // Fetch current user React.useEffect(() => { if (process.env.NODE_ENV !== 'development') { return; } const supabase = createClient(); async function fetchUser() { const { data: { user } } = await supabase.auth.getUser(); if (user) { setUser({ id: user.id, email: user.email, role: user.role, }); // Fetch user profile for is_admin const { data: profile } = await supabase .from('user_profiles') .select('is_admin') .eq('id', user.id) .single(); if (profile) { setUserProfile(profile); } } } fetchUser(); }, []); // Only render in development if (process.env.NODE_ENV !== 'development') { return null; } const copyToClipboard = async (text: string, key: string) => { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 2000); }; // Extract project ID from pathname const projectIdMatch = pathname.match(/^\/(\d+)/); const projectId = projectIdMatch ? projectIdMatch[1] : null; // Aggregate tables being used const tablesInUse = Object.values(debugInfo) .filter(info => info.supabaseTable) .map(info => info.supabaseTable); // Aggregate API routes const apiRoutesInUse = Object.values(debugInfo) .filter(info => info.apiRoute) .map(info => info.apiRoute); if (!isVisible) { return ( <button onClick={() => setIsVisible(true)} className="fixed bottom-4 right-4 z-50 p-2 bg-yellow-500 text-black rounded-full shadow-lg hover:bg-yellow-400 transition-colors" title="Show Debug Panel" > <Bug className="h-4 w-4" /> </button> ); } return ( <div className={cn("fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 text-zinc-100 border-t border-zinc-700 font-mono text-xs shadow-2xl", className )} > {/* Header Bar - Always Visible */} <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 cursor-pointer hover:bg-zinc-750" onClick={() => setIsExpanded(!isExpanded)} > <div className="flex items-center gap-4"> <div className="flex items-center gap-2 text-yellow-400"> <Bug className="h-4 w-4" /> <span className="font-semibold">DEV DEBUG</span> </div> {/* Quick Stats */} <div className="flex items-center gap-4 text-zinc-400"> <span className="flex items-center gap-1"> <Database className="h-3 w-3" /> {tablesInUse.length > 0 ? tablesInUse.join(', ') : 'No tables'} </span> <span className="flex items-center gap-1"> <Globe className="h-3 w-3" /> {apiCalls.length} API calls </span> <span className="flex items-center gap-1"> <User className="h-3 w-3" /> {user?.email || 'Not logged in'} </span> {userProfile?.is_admin && ( <span className="flex items-center gap-1 text-green-400"> <Shield className="h-3 w-3" /> Admin </span> )} </div> </div> <div className="flex items-center gap-2"> <button onClick={(e) => { e.stopPropagation(); setIsVisible(false); }} className="p-1 hover:bg-zinc-700 rounded" title="Hide Panel" > <X className="h-4 w-4" /> </button> {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />} </div> </div> {/* Expanded Content */} {isExpanded && ( <div className="max-h-[50vh] overflow-auto"> {/* Tabs */} <div className="flex border-b border-zinc-700 bg-zinc-850"> {(['info', 'api', 'user', 'env'] as const).map(tab => ( <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-4 py-2 text-sm capitalize transition-colors", activeTab === tab ?"bg-zinc-700 text-white border-b-2 border-yellow-400" :"text-zinc-400 hover:text-white hover:bg-zinc-800" )} > {tab === 'info' && <Database className="h-3 w-3 inline mr-1" />} {tab === 'api' && <Globe className="h-3 w-3 inline mr-1" />} {tab === 'user' && <User className="h-3 w-3 inline mr-1" />} {tab === 'env' && <Server className="h-3 w-3 inline mr-1" />} {tab} </button> ))} </div> <div className="p-4"> {/* Page Info Tab */} {activeTab === 'info' && ( <div className="space-y-4"> <div className="grid grid-cols-2 gap-4"> <InfoCard title="Current Path" value={pathname} onCopy={() => copyToClipboard(pathname, 'path')} copied={copied === 'path'} /> <InfoCard title="Project ID" value={projectId || 'N/A'} /> </div> {tablesInUse.length > 0 && ( <div className="space-y-2"> <h3 className="text-zinc-400 uppercase text-2xs tracking-wider">Supabase Tables</h3> <div className="flex flex-wrap gap-2"> {[...new Set(tablesInUse)].map(table => ( <span key={table} className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded"> {table} </span> ))} </div> </div> )} {apiRoutesInUse.length > 0 && ( <div className="space-y-2"> <h3 className="text-zinc-400 uppercase text-2xs tracking-wider">API Routes</h3> <div className="flex flex-wrap gap-2"> {[...new Set(apiRoutesInUse)].map(route => ( <span key={route} className="px-2 py-1 bg-green-900/50 text-green-300 rounded"> {route} </span> ))} </div> </div> )} {Object.entries(debugInfo).length > 0 && ( <div className="space-y-2"> <h3 className="text-zinc-400 uppercase text-2xs tracking-wider">Component Debug Info</h3> <div className="space-y-2"> {Object.entries(debugInfo).map(([key, info]) => ( <div key={key} className="p-2 bg-zinc-800 rounded"> <div className="text-yellow-400 mb-1">{key}</div> <pre className="text-zinc-300 text-2xs overflow-auto"> {JSON.stringify(info, null, 2)} </pre> </div> ))} </div> </div> )} </div> )} {/* API Calls Tab */} {activeTab === 'api' && ( <div className="space-y-2"> <h3 className="text-zinc-400 uppercase text-2xs tracking-wider mb-2">Recent API Calls</h3> {apiCalls.length === 0 ? ( <div className="text-zinc-500 text-center py-4">No API calls recorded yet</div> ) : ( <div className="space-y-1"> {apiCalls.map(call => ( <div key={call.id} className="flex items-center gap-2 p-2 bg-zinc-800 rounded hover:bg-zinc-750" > <span className={cn("px-1.5 py-0.5 rounded text-2xs font-bold", call.method === 'GET' && 'bg-green-900 text-green-300', call.method === 'POST' && 'bg-blue-900 text-blue-300', call.method === 'PUT' && 'bg-yellow-900 text-yellow-300', call.method === 'DELETE' && 'bg-red-900 text-red-300', )}> {call.method} </span> <span className="flex-1 truncate text-zinc-300">{call.url}</span> {call.status && ( <span className={cn("px-1.5 py-0.5 rounded text-2xs", call.status >= 200 && call.status < 300 && 'bg-green-900 text-green-300', call.status >= 400 && 'bg-red-900 text-red-300', )}> {call.status} </span> )} {call.duration && ( <span className="text-zinc-500 flex items-center gap-1"> <Clock className="h-3 w-3" /> {call.duration}ms </span> )} {call.table && ( <span className="px-1.5 py-0.5 bg-purple-900 text-purple-300 rounded text-2xs"> {call.table} </span> )} </div> ))} </div> )} </div> )} {/* User Tab */} {activeTab === 'user' && ( <div className="space-y-4"> <div className="grid grid-cols-2 gap-4"> <InfoCard title="User ID" value={user?.id || 'Not logged in'} onCopy={user?.id ? () => copyToClipboard(user.id, 'userId') : undefined} copied={copied === 'userId'} /> <InfoCard title="Email" value={user?.email || 'N/A'} /> <InfoCard title="Role" value={user?.role || 'N/A'} /> <InfoCard title="Is Admin" value={userProfile?.is_admin ? 'Yes' : 'No'} valueClassName={userProfile?.is_admin ? 'text-green-400' : 'text-zinc-400'} /> </div> {user && ( <div className="p-4 bg-zinc-800 rounded"> <h4 className="text-zinc-400 text-2xs uppercase tracking-wider mb-2">Full User Object</h4> <pre className="text-zinc-300 text-2xs overflow-auto"> {JSON.stringify({ ...user, is_admin: userProfile?.is_admin }, null, 2)} </pre> </div> )} </div> )} {/* Environment Tab */} {activeTab === 'env' && ( <div className="space-y-4"> <div className="grid grid-cols-2 gap-4"> <InfoCard title="Node Env" value={process.env.NODE_ENV || 'N/A'} /> <InfoCard title="Next.js" value={process.env.NEXT_RUNTIME || 'client'} /> </div> <div className="p-4 bg-zinc-800 rounded"> <h4 className="text-zinc-400 text-2xs uppercase tracking-wider mb-2">Public Environment Variables</h4> <div className="space-y-1 text-2xs"> {Object.entries(process.env) .filter(([key]) => key.startsWith('NEXT_PUBLIC_')) .map(([key, value]) => ( <div key={key} className="flex"> <span className="text-yellow-400 w-64 truncate">{key}:</span> <span className="text-zinc-300 truncate">{value}</span> </div> ))} </div> </div> </div> )} </div> </div> )} </div> );
} // Helper component for info cards
function InfoCard({
  title,
  value,
  onCopy,
  copied,
  valueClassName,
}: {
  title: string;
  value: string;
  onCopy?: () => void;
  copied?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="p-4 bg-zinc-800 rounded">
      {" "}
      <div className="text-zinc-400 text-2xs uppercase tracking-wider mb-1">
        {title}
      </div>{" "}
      <div className={cn("text-sm flex items-center gap-2", valueClassName)}>
        {" "}
        <span className="truncate">{value}</span>{" "}
        {onCopy && (
          // eslint-disable-next-line design-system/no-design-violations -- dev-only debug panel
          <button onClick={onCopy} className="p-1 hover:bg-zinc-700 rounded">
            {" "}
            {copied ? (
              <Check className="h-3 w-3 text-green-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}{" "}
          </button>
        )}{" "}
      </div>{" "}
    </div>
  );
}
