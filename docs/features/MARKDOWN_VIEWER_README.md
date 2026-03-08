# Markdown Documentation Viewer

## Overview

A complete markdown documentation viewer has been implemented to display all markdown files from the `/documentation/docs` folder in the browser.

## Features

### 1. Dynamic Routing

- **Route**: `/docs/[[...slug]]`
- Supports nested folder structures
- Automatically maps file paths to URLs
- Example: `/documentation/docs/procore/budget/specs.md` → `/docs/procore/budget/specs`

### 2. Directory Browsing

- Lists folders and markdown files when accessing a directory
- Shows folder structure with icons
- Clickable navigation to sub-folders and files

### 3. Markdown Rendering

- Full GitHub Flavored Markdown (GFM) support
- Syntax highlighting for code blocks
- Responsive tables
- Custom styled components
- Dark mode support

### 4. Navigation Features

- Breadcrumb navigation
- Back to docs button
- Sidebar integration with Documentation link

## Implementation Details

### Components Created

1. **`/src/components/docs/markdown-renderer.tsx`**
   - React Markdown renderer with custom styling
   - Syntax highlighting with Prism
   - Responsive design

2. **`/src/app/docs/[[...slug]]/page.tsx`**
   - Dynamic catch-all route
   - Handles both files and directories
   - Static generation support

3. **`/src/app/docs/layout.tsx`**
   - Documentation layout wrapper
   - Consistent styling

4. **`/src/app/api/docs/check/route.ts`**
   - API endpoint to verify documentation path exists

### Production Deployment

The viewer is production-ready with:

- Static generation of all documentation pages
- SEO-friendly URLs and metadata
- Fast page loads
- No external dependencies for viewing

### Accessing Documentation

1. **Via Sidebar**: Click "Documentation" in the sidebar
2. **Direct URL**: Navigate to `/docs`
3. **Specific File**: `/docs/[path-to-file]` (without .md extension)

### Example URLs

- `/docs` - Documentation home (lists all folders)
- `/docs/procore/budget/specs` - Specific document
- `/docs/procore` - Lists all Procore documentation

## File Structure Support

The viewer automatically discovers and displays:

- All `.md` files in `/documentation/docs`
- Nested folder structures
- Maintains original organization

## Styling

The markdown content is styled with:

- Professional typography
- Consistent spacing
- Code syntax highlighting
- Responsive images
- Dark mode compatibility

## Future Enhancements

Consider adding:

- Search functionality
- Table of contents for long documents
- Previous/Next navigation
- PDF export option
- Edit on GitHub links
