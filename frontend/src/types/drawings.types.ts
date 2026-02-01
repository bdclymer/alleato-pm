/**
 * Drawing management system types and schemas
 * 
 * This file contains TypeScript interfaces and Zod schemas for the drawings system,
 * including hierarchical areas, drawings, revisions, sets, sketches, and related items.
 */

import { z } from 'zod';
import type { Database } from './database.types';

// Temporary type definitions until migration is applied
interface DrawingAreaRow {
  id: string;
  project_id: number;
  parent_area_id: string | null;
  name: string;
  description: string | null;
  sort_order: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface DrawingRow {
  id: string;
  project_id: number;
  area_id: string | null;
  drawing_number: string;
  title: string;
  discipline: string | null;
  drawing_type: string | null;
  current_revision_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface DrawingRevisionRow {
  id: string;
  drawing_id: string;
  revision_number: string;
  drawing_set_id: string | null;
  drawing_date: string | null;
  received_date: string;
  status: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  is_current_revision: boolean;
  description: string | null;
  uploaded_by: string;
  created_at: string;
}

interface DrawingSetRow {
  id: string;
  project_id: number;
  name: string;
  issued_at: string;
  status: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface DrawingSketchRow {
  id: string;
  drawing_revision_id: string;
  sketch_number: string;
  name: string;
  description: string | null;
  sketch_date: string;
  file_url: string;
  created_by: string;
  created_at: string;
}

interface DrawingDownloadRow {
  id: string;
  drawing_revision_id: string;
  downloaded_by: string;
  downloaded_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

interface DrawingRelatedItemRow {
  id: string;
  drawing_id: string;
  related_type: string;
  related_id: string;
  created_by: string;
  created_at: string;
}

// Status enums for better type safety
export type DrawingStatus = 'draft' | 'under_review' | 'approved' | 'superseded' | 'void';
export type DrawingSetStatus = 'active' | 'archived';

// Drawing disciplines and types for consistent data
export const DRAWING_DISCIPLINES = [
  'Architectural',
  'Structural', 
  'Mechanical',
  'Electrical',
  'Plumbing',
  'Fire Protection',
  'Civil',
  'Landscape',
  'Other'
] as const;

export const DRAWING_TYPES = [
  'Plan',
  'Section', 
  'Detail',
  'Elevation',
  'Schedule',
  'Specification',
  'Other'
] as const;

export type DrawingDiscipline = typeof DRAWING_DISCIPLINES[number];
export type DrawingType = typeof DRAWING_TYPES[number];

// Enhanced interfaces with relations and computed properties
export interface DrawingArea extends DrawingAreaRow {
  drawingCount?: number;
  children?: DrawingArea[];
  depth?: number;
  path?: string[];
}

export interface Drawing extends DrawingRow {
  area?: DrawingArea;
  currentRevision?: DrawingRevision;
  revisions?: DrawingRevision[];
  relatedItems?: DrawingRelatedItem[];
  revisionCount?: number;
  latestRevisionDate?: string;
}

export interface DrawingRevision extends DrawingRevisionRow {
  drawing?: Drawing;
  drawingSet?: DrawingSet;
  sketches?: DrawingSketch[];
  downloads?: DrawingDownload[];
  downloadCount?: number;
  uploaderEmail?: string;
}

export interface DrawingSet extends DrawingSetRow {
  revisions?: DrawingRevision[];
  revisionCount?: number;
}

export interface DrawingSketch extends DrawingSketchRow {
  drawingRevision?: DrawingRevision;
  creatorEmail?: string;
}

export interface DrawingDownload extends DrawingDownloadRow {
  drawingRevision?: DrawingRevision;
  downloaderEmail?: string;
}

export interface DrawingRelatedItem extends DrawingRelatedItemRow {
  drawing?: Drawing;
  creatorEmail?: string;
}

// Related item type constants
export const DRAWING_RELATED_TYPES = [
  'rfi',
  'submittal', 
  'change_order',
  'change_event',
  'commitment',
  'invoice',
  'daily_log',
  'inspection',
  'meeting'
] as const;

export type DrawingRelatedType = typeof DRAWING_RELATED_TYPES[number];

// Zod schemas for form validation

export const drawingAreaSchema = z.object({
  name: z.string()
    .min(1, 'Area name is required')
    .max(255, 'Area name must be 255 characters or less'),
  description: z.string()
    .max(1000, 'Description must be 1000 characters or less')
    .optional(),
  parentAreaId: z.string().uuid('Invalid parent area ID').optional(),
  sortOrder: z.number()
    .int('Sort order must be an integer')
    .min(0, 'Sort order must be non-negative')
    .optional()
    .default(0),
});

export const drawingUploadSchema = z.object({
  drawingNumber: z.string()
    .min(1, 'Drawing number is required')
    .max(100, 'Drawing number must be 100 characters or less'),
  title: z.string()
    .min(1, 'Drawing title is required')
    .max(255, 'Drawing title must be 255 characters or less'),
  discipline: z.enum(DRAWING_DISCIPLINES).optional(),
  drawingType: z.enum(DRAWING_TYPES).optional(),
  revisionNumber: z.string()
    .min(1, 'Revision number is required')
    .max(10, 'Revision number must be 10 characters or less')
    .default('A'),
  drawingDate: z.string()
    .datetime('Invalid drawing date')
    .optional(),
  receivedDate: z.string()
    .datetime('Invalid received date')
    .default(() => new Date().toISOString()),
  drawingSetId: z.string().uuid('Invalid drawing set ID').optional(),
  description: z.string()
    .max(1000, 'Description must be 1000 characters or less')
    .optional(),
  areaId: z.string().uuid('Invalid area ID').optional(),
});

export const drawingFilterSchema = z.object({
  search: z.string().optional(),
  discipline: z.enum(DRAWING_DISCIPLINES).optional(),
  drawingType: z.enum(DRAWING_TYPES).optional(), 
  status: z.enum(['draft', 'under_review', 'approved', 'superseded', 'void'] as const).optional(),
  areaId: z.string().uuid('Invalid area ID').optional(),
  drawingSetId: z.string().uuid('Invalid drawing set ID').optional(),
  uploadedBy: z.string().uuid('Invalid user ID').optional(),
  dateFrom: z.string().datetime('Invalid date').optional(),
  dateTo: z.string().datetime('Invalid date').optional(),
  revisionFrom: z.string().optional(),
  revisionTo: z.string().optional(),
  hasSketch: z.boolean().optional(),
});

export const drawingRevisionSchema = z.object({
  revisionNumber: z.string()
    .min(1, 'Revision number is required')
    .max(10, 'Revision number must be 10 characters or less'),
  drawingDate: z.string()
    .datetime('Invalid drawing date')
    .optional(),
  receivedDate: z.string()
    .datetime('Invalid received date')
    .default(() => new Date().toISOString()),
  status: z.enum(['draft', 'under_review', 'approved', 'superseded', 'void'] as const)
    .default('under_review'),
  description: z.string()
    .max(1000, 'Description must be 1000 characters or less')
    .optional(),
  drawingSetId: z.string().uuid('Invalid drawing set ID').optional(),
});

// Form data types (inferred from schemas)
export type DrawingAreaFormData = z.infer<typeof drawingAreaSchema>;
export type DrawingUploadFormData = z.infer<typeof drawingUploadSchema>;
export type DrawingFilterFormData = z.infer<typeof drawingFilterSchema>;
export type DrawingRevisionFormData = z.infer<typeof drawingRevisionSchema>;

// Additional interfaces for special data structures
export interface DrawingAreaWithCount extends DrawingArea {
  drawingCount: number;
  depth: number;
  path: string[];
  children?: DrawingAreaWithCount[];
}

export interface DrawingLogTableRow {
  id: string;
  projectId: number;
  areaId: string | null;
  drawingNumber: string;
  title: string;
  discipline: string | null;
  drawingType: string | null;
  drawingCreatedAt: string;
  drawingUpdatedAt: string;
  revisionId: string | null;
  revisionNumber: string | null;
  drawingDate: string | null;
  receivedDate: string | null;
  status: DrawingStatus | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileType: string | null;
  revisionDescription: string | null;
  uploadedBy: string | null;
  revisionCreatedAt: string | null;
  areaName: string | null;
  setName: string | null;
  uploadedByEmail: string | null;
}

// Upload progress and error types
export interface DrawingUploadProgress {
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  drawingId?: string;
  revisionId?: string;
}

export interface DrawingUploadError {
  fileName: string;
  error: string;
  code?: 'FILE_TOO_LARGE' | 'INVALID_TYPE' | 'NETWORK_ERROR' | 'SERVER_ERROR';
}

// Hook return types for consistency
export interface UseDrawingAreasReturn {
  areas: DrawingAreaWithCount[];
  isLoading: boolean;
  error: Error | null;
  createArea: (data: DrawingAreaFormData) => Promise<DrawingArea>;
  updateArea: (id: string, data: Partial<DrawingAreaFormData>) => Promise<DrawingArea>;
  deleteArea: (id: string) => Promise<void>;
  reorderAreas: (sourceId: string, targetId: string, position: 'before' | 'after' | 'inside') => Promise<void>;
}

export interface UseDrawingUploadReturn {
  uploadDrawing: (file: File, metadata: DrawingUploadFormData) => Promise<DrawingRevision>;
  uploadMultipleDrawings: (files: FileList, metadata: Partial<DrawingUploadFormData>) => Promise<DrawingRevision[]>;
  progress: DrawingUploadProgress[];
  isUploading: boolean;
  errors: DrawingUploadError[];
  clearErrors: () => void;
}
