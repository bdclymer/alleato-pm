import { readdirSync, statSync } from 'fs'
import { join } from 'path'

export interface RouteInfo {
  path: string
  title: string
  category: string
  type: 'static' | 'dynamic'
  isDynamic: boolean
  segments: string[]
  fullPath: string
  fileModified?: Date
}

/**
 * AUTO-DISCOVERY SITEMAP UTILITIES
 *
 * Automatically discovers all routes by scanning the app directory
 * No hardcoding needed - stays up-to-date as you add/remove pages
 */

/**
 * Convert file path to route path
 * Example: (tables)/companies/page.tsx -> /companies
 */
function filePathToRoute(filePath: string): string {
  // Remove /page.tsx or /page.ts
  let route = filePath.replace(/\/page\.(tsx|ts|jsx|js)$/, '')

  // Remove route groups like (tables), (forms), (chat)
  route = route.replace(/\/\([^)]+\)/g, '')

  // Convert to URL path
  if (route === '' || route === '/') {
    return '/'
  }

  return route.startsWith('/') ? route : `/${route}`
}

/**
 * Check if route contains dynamic segments [id], [slug], etc.
 */
function isDynamicRoute(route: string): boolean {
  return route.includes('[') && route.includes(']')
}

/**
 * Extract dynamic segments from route
 * Example: /projects/[id]/tasks -> ['id']
 */
function getDynamicSegments(route: string): string[] {
  const matches = route.match(/\[([^\]]+)\]/g)
  return matches ? matches.map(m => m.replace(/[\[\]]/g, '')) : []
}

/**
 * Generate human-readable title from route
 * Example: /projects/[projectId]/budget -> Budget
 */
function routeToTitle(route: string): string {
  // Get the last segment (the page name)
  const segments = route.split('/').filter(Boolean)
  const lastSegment = segments[segments.length - 1] || 'Home'

  // Skip dynamic segments for title
  if (lastSegment.startsWith('[')) {
    const previousSegment = segments[segments.length - 2]
    return previousSegment
      ? previousSegment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      : 'Detail Page'
  }

  return lastSegment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Categorize route based on path
 */
function categorizeRoute(route: string, filePath: string): string {
  // Check for route groups first
  if (filePath.includes('/(tables)')) {
    return 'Tables'
  }
  if (filePath.includes('/(forms)')) {
    return 'Forms'
  }
  if (filePath.includes('/(chat)')) {
    return 'Chat'
  }

  // Check for specific prefixes
  if (route.startsWith('/auth')) {
    return 'Authentication'
  }
  if (route.startsWith('/admin')) {
    return 'Admin'
  }
  if (route.startsWith('/settings')) {
    return 'Settings'
  }
  if (route.startsWith('/dev')) {
    return 'Developer Tools'
  }

  if (route.includes('/budget')) {
    return 'Financial'
  }
  if (route.includes('/invoice')) {
    return 'Financial'
  }
  if (route.includes('/contract')) {
    return 'Financial'
  }
  if (route.includes('/change-order')) {
    return 'Financial'
  }
  if (route.includes('/commitment')) {
    return 'Financial'
  }

  // Project-specific routes
  if (route.includes('[projectId]') || route.match(/^\/\[[^\]]+\]/)) {
    return 'Project Pages'
  }

  // Root level pages
  if (route === '/' || route === '/dashboard' || route === '/welcome') {
    return 'Main'
  }

  return 'Other'
}

/**
 * Recursively scan directory for page files
 */
function scanDirectory(dir: string, basePath: string = ''): RouteInfo[] {
  const routes: RouteInfo[] = []

  try {
    const entries = readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      const relativePath = join(basePath, entry.name)

      if (entry.isDirectory()) {
        // Skip certain directories
        if (
          entry.name === 'api' ||
          entry.name === 'node_modules' ||
          entry.name.startsWith('.')
        ) {
          continue
        }

        // Recursively scan subdirectories
        routes.push(...scanDirectory(fullPath, relativePath))
      } else if (entry.isFile()) {
        // Check if it's a page file
        if (
          entry.name === 'page.tsx' ||
          entry.name === 'page.ts' ||
          entry.name === 'page.jsx' ||
          entry.name === 'page.js'
        ) {
          const route = filePathToRoute(relativePath.replace(/\\/g, '/'))
          const stats = statSync(fullPath)

          routes.push({
            path: route,
            title: routeToTitle(route),
            category: categorizeRoute(route, relativePath),
            type: isDynamicRoute(route) ? 'dynamic' : 'static',
            isDynamic: isDynamicRoute(route),
            segments: getDynamicSegments(route),
            fullPath: relativePath.replace(/\\/g, '/'),
            fileModified: stats.mtime,
          })
        }
      }
    }
  } catch (error) {
    console.error("Failed to process route file:", error);
    // Intentionally swallowed: individual file errors should not stop sitemap generation
  }

  return routes
}

/**
 * Get all routes from the app directory
 */
export function getAllRoutes(): RouteInfo[] {
  const appDir = join(process.cwd(), 'src', 'app')
  const routes = scanDirectory(appDir)

  // Sort by path
  return routes.sort((a, b) => a.path.localeCompare(b.path))
}

/**
 * Get routes grouped by category
 */
export function getRoutesByCategory(): Record<string, RouteInfo[]> {
  const routes = getAllRoutes()
  const categorized: Record<string, RouteInfo[]> = {}

  for (const route of routes) {
    if (!categorized[route.category]) {
      categorized[route.category] = []
    }
    categorized[route.category].push(route)
  }

  // Sort categories
  const sortedCategories: Record<string, RouteInfo[]> = {}
  const categoryOrder = [
    'Main',
    'Project Pages',
    'Tables',
    'Forms',
    'Financial',
    'Chat',
    'Authentication',
    'Admin',
    'Settings',
    'Developer Tools',
    'Other',
  ]

  for (const category of categoryOrder) {
    if (categorized[category]) {
      sortedCategories[category] = categorized[category]
    }
  }

  // Add any remaining categories
  for (const [category, routes] of Object.entries(categorized)) {
    if (!sortedCategories[category]) {
      sortedCategories[category] = routes
    }
  }

  return sortedCategories
}

/**
 * Get only static (non-dynamic) routes
 */
export function getStaticRoutes(): RouteInfo[] {
  return getAllRoutes().filter(r => !r.isDynamic)
}

/**
 * Get only dynamic routes
 */
export function getDynamicRoutes(): RouteInfo[] {
  return getAllRoutes().filter(r => r.isDynamic)
}

/**
 * Search routes by query
 */
export function searchRoutes(query: string): RouteInfo[] {
  const routes = getAllRoutes()
  const lowerQuery = query.toLowerCase()

  return routes.filter(
    r =>
      r.path.toLowerCase().includes(lowerQuery) ||
      r.title.toLowerCase().includes(lowerQuery) ||
      r.category.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Get route statistics
 */
export function getRouteStats() {
  const routes = getAllRoutes()
  const staticRoutes = routes.filter(r => !r.isDynamic)
  const dynamicRoutes = routes.filter(r => r.isDynamic)
  const categories = getRoutesByCategory()

  return {
    total: routes.length,
    static: staticRoutes.length,
    dynamic: dynamicRoutes.length,
    categories: Object.keys(categories).length,
    byCategory: Object.entries(categories).map(([name, routes]) => ({
      name,
      count: routes.length,
    })),
  }
}
