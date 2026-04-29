import { type NextRequest } from 'next/server'

import { updateSession } from '@/lib/supabase/middleware'
import { validateEnvVars } from '@/lib/guardrails/env'

let runtimeEnvValidated = false

function ensureRuntimeEnv() {
  if (runtimeEnvValidated) return
  validateEnvVars('/middleware', [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ], {
    urlVars: ['NEXT_PUBLIC_SUPABASE_URL', 'BACKEND_URL', 'PYTHON_BACKEND_URL'],
  })
  runtimeEnvValidated = true
}

export async function middleware(request: NextRequest) {
  ensureRuntimeEnv()
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next (all Next.js internals: static, image, HMR, etc.)
     * - favicon.ico (favicon file)
     * - public folder and static assets
     * - api routes (route handlers own auth and timeout budgets)
     * - auth routes (entire /auth path)
     */
    '/((?!api/|_next/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$|auth).*)',
  ],
}
