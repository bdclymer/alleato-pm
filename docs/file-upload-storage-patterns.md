# File Upload and Storage Patterns in Alleato PM

This document analyzes the existing file upload and storage patterns in the Alleato PM project that can be reused for the drawings feature implementation.

## File Upload Components

### 1. Core File Upload Components

#### `FileUpload` Component (`frontend/src/components/ui/file-upload.tsx`)

- **Purpose**: Low-level drag-and-drop file upload utility
- **Features**:
  - Global drag-and-drop support with window event listeners
  - Context-based state management for drag state
  - Multiple file support with configurable limits
  - File type validation via `accept` prop
  - Portal-based drag overlay

**Key Implementation:**

```tsx
// Context provides drag state and input ref
const FileUploadContext = createContext<FileUploadContextValue | null>(null);

// Main component handles file processing
function FileUpload({ onFilesAdded, multiple = true, accept, disabled = false }) {
  // Drag counter prevents flickering on nested elements
  const dragCounter = useRef(0);

  // Window-level event listeners for global drag support
  useEffect(() => {
    window.addEventListener("dragenter", handleDragIn);
    window.addEventListener("dragleave", handleDragOut);
    // ...cleanup
  }, []);
}
```
#### `FileUploadField` Component (`frontend/src/components/forms/FileUploadField.tsx`)
- **Purpose**: Form-ready file upload with preview and validation
- **Features**:
  - Integrated file preview with metadata display
  - File size formatting utilities
  - Individual file removal
  - Form validation integration
  - Test ID support for automation

**Key Implementation:**
```tsx
interface FileInfo {
  name: string;
  size: number;
  type: string;
  url?: string;
}

export function FileUploadField({
  value = [],
  onChange,
  onFilesSelected,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024 // 10MB
}) {
  // Handles both drag-and-drop and click upload
  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => file.size <= maxSize);
    onFilesSelected?.(validFiles);

    const newFiles: FileInfo[] = validFiles.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    if (multiple) {
      onChange?.([...value, ...newFiles].slice(0, maxFiles));
    } else {
      onChange?.(newFiles.slice(0, 1));
    }
  };
}
```
### 2. Supabase Integration Hook

#### `useSupabaseUpload` Hook (`frontend/src/hooks/use-supabase-upload.ts`)

- **Purpose**: Complete Supabase storage integration with react-dropzone
- **Features**:
  - Automatic file upload to specified bucket and path
  - Progress tracking and error handling
  - File validation (MIME types, size limits)
  - Retry mechanism for failed uploads
  - Preview URL generation

**Key Implementation:**

```tsx
interface UseSupabaseUploadOptions {
  bucketName: string;
  path?: string;
  allowedMimeTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  cacheControl?: number;
  upsert?: boolean;
}

const useSupabaseUpload = (options: UseSupabaseUploadOptions) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{name: string; message: string}[]>([]);
  const [successes, setSuccesses] = useState<string[]>([]);

  const onUpload = useCallback(async () => {
    const responses = await Promise.all(
      filesToUpload.map(async (file) => {
        const { error } = await supabase.storage
          .from(bucketName)
          .upload(!!path ? `${path}/${file.name}` : file.name, file, {
            cacheControl: cacheControl.toString(),
            upsert,
          });

        return { name: file.name, message: error?.message };
      })
    );
  }, [files, path, bucketName]);

  return {
    files, setFiles, successes, isSuccess, loading, errors,
    onUpload, ...dropzoneProps
  };
};
```
### 3. Domain-Specific Upload Components

#### Profile Image Upload (`frontend/src/components/misc/profile-image-upload.tsx`)
- **Bucket**: `profile-images`
- **Path**: `avatars/${userId}-${timestamp}.${ext}`
- **Features**: Image validation, size limits (5MB), user metadata update

#### Drawing Upload Dialog (`frontend/src/components/drawings/upload-drawing-dialog.tsx`)
- **Bucket**: `drawings`
- **Path**: `projects/${projectId}/drawings/${number || fileId}.${ext}`
- **Features**: Drawing metadata form, discipline categorization, revision tracking

#### Document Upload Setup (`frontend/src/components/project-setup-wizard/document-upload-setup.tsx`)
- **Bucket**: `documents`
- **Path**: `projects/${projectId}/documents/${uploadId}.${ext}`
- **Features**: Category inference, bulk upload, progress tracking

## Supabase Storage Buckets

### Discovered Storage Buckets:
1. **`drawings`** - Construction drawings and blueprints
2. **`documents`** - Project documents (plans, specs, contracts)
3. **`specifications`** - Project specifications
4. **`schedules`** - Schedule files
5. **`profile-images`** - User avatar images
6. **`project-files`** - Generic project file storage

### Storage Path Patterns:
```

drawings/projects/{projectId}/drawings/{filename}
documents/projects/{projectId}/documents/{fileId}.{ext}
project-files/change-events/{projectId}/{changeEventId}/{filename}
project-files/commitments/{projectId}/{commitmentId}/{filename}
profile-images/avatars/{userId}-{timestamp}.{ext}

```
## Database Storage Patterns

### 1. Files Table (`files`)
**Used by**: Drawings, general document storage
**Schema**:
```sql
files: {
  id: string (primary key)
  project_id: number
  title: string
  content: string
  url: string
  category: string ('drawings', 'documents', etc.)
  status: string ('active', etc.)
  metadata: JSON {
    fileName: string,
    fileType: string,
    fileSize: number,
    category: string,
    // drawing-specific fields
    number?: string,
    discipline?: string,
    revision?: string
  }
  created_at: timestamp
  updated_at: timestamp
  embedding: string (for AI search)
}
```
### 2. Generic Attachments Table (`attachments`)

**Used by**: Commitments and other entities
**Schema**:

```sql
attachments: {
  id: string
  attached_to_id: string (foreign key)
  attached_to_table: string ('commitments', 'contracts', etc.)
  project_id: number
  file_name: string
  url: string (public Supabase storage URL)
  uploaded_by: string (user ID)
  uploaded_at: timestamp
}
```
### 3. Entity-Specific Attachment Tables
**Examples**:
- `change_event_attachments` - Change event files
- `change_event_rfq_attachments` - RFQ files
- `subcontract_attachments` - Subcontract files

**Common Schema Pattern**:
```sql
{entity}_attachments: {
  id: string
  {entity}_id: string
  file_name: string
  file_path: string (storage path)
  file_size: number
  mime_type: string
  uploaded_by: string
  uploaded_at: timestamp
}
```

## API Route Patterns

### 1. File Upload Routes

#### Change Event Attachments (`/api/projects/[projectId]/change-events/[changeEventId]/attachments/route.ts`)

**Features**:

- FormData parsing for file uploads
- Supabase storage integration
- Database record creation
- File validation and error handling
- Audit trail creation

**Implementation Pattern**:

```tsx
export async function POST(request: NextRequest, { params }: RouteParams) {
  // 1. Authentication & authorization
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // 2. Validate entity exists
  const { data: entity } = await supabase
    .from("change_events")
    .select("id")
    .eq("id", entityId)
    .single();

  // 3. Parse multipart form data
  const formData = await request.formData();
  const file = formData.get("file") as File;

  // 4. Upload to Supabase Storage
  const storagePath = `entity-type/${projectId}/${entityId}/${fileName}`;
  const { error: uploadError } = await supabase.storage
    .from("project-files")
    .upload(storagePath, file, { contentType: file.type });

  // 5. Create database record
  const { data: attachment } = await supabase
    .from("entity_attachments")
    .insert({ /* attachment data */ })
    .single();

  // 6. Update entity timestamp & create audit log
  // 7. Return formatted response with download URLs
}
```
### 2. File Download/Access Routes
**Pattern**: `/api/projects/[projectId]/entity/[entityId]/attachments/[attachmentId]/download`
**Features**:
- Authentication checks
- File access validation
- Public URL redirection

## File Viewer Components

### Document Preview Modal (`frontend/src/components/misc/DocumentPreviewModal.tsx`)
**Features**:
- PDF and HTML file preview via iframe
- Full-screen modal interface
- File type inference from filename
- Responsive design with proper backdrop

**Implementation**:
```tsx
export function DocumentPreviewModal({ document, onClose }) {
  const previewUrl = KNOWLEDGE_DOCUMENT_FILE_URL(document.id);
  const fileType = inferFileType(document.filename);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center">
      <div className="relative flex h-full w-full max-w-5xl flex-col">
        <header>{/* File metadata and close button */}</header>
        <div className="flex-1">
          <iframe
            src={previewUrl}
            className="h-full w-full border-0"
            allow="fullscreen"
          />
        </div>
      </div>
    </div>
  );
}
```
### Attachment Display Components

#### Change Event Attachments (`frontend/src/components/domain/change-events/ChangeEventAttachmentsSection.tsx`)

**Features**:

- File list with metadata display
- Drag-and-drop upload zone
- Download and delete actions
- File size formatting utilities
- Loading states and error handling

## Reusable Patterns for Drawings

### 1. Storage Structure

```text
drawings/projects/{projectId}/{drawingId}/{filename}
```

### 2. Database Schema (using `files` table)

```sql
INSERT INTO files {
  id: uuid,
  project_id: number,
  title: "Drawing Title",
  content: "Drawing description",
  url: "https://supabase-url/storage/v1/object/public/drawings/...",
  category: "drawings",
  status: "active",
  metadata: {
    fileName: "A-101_Rev-B.pdf",
    fileType: "application/pdf",
    fileSize: 2048576,
    category: "drawings",
    number: "A-101",
    discipline: "architectural",
    revision: "B",
    status: "issued_for_construction"
  }
}
```
### 3. API Route Structure
- GET `/api/projects/[projectId]/drawings` - List drawings
- POST `/api/projects/[projectId]/drawings` - Upload drawing
- GET `/api/projects/[projectId]/drawings/[drawingId]` - Get specific drawing
- PUT `/api/projects/[projectId]/drawings/[drawingId]` - Update drawing metadata
- DELETE `/api/projects/[projectId]/drawings/[drawingId]` - Delete drawing

### 4. Component Architecture
```tsx
// Main drawings page
<DrawingsPage>
  <DrawingsHeader>
    <UploadDrawingButton /> // Opens upload dialog
    <DrawingsFilters />     // Filter by discipline, status, etc.
  </DrawingsHeader>

  <DrawingsTable>
    {drawings.map(drawing =>
      <DrawingRow
        drawing={drawing}
        onPreview={() => openPreview(drawing)}
        onDownload={() => downloadDrawing(drawing)}
        onEdit={() => openEditDialog(drawing)}
      />
    )}
  </DrawingsTable>

  <UploadDrawingDialog />   // Reuse existing pattern
  <DrawingPreviewModal />   // Adapt DocumentPreviewModal
</DrawingsPage>
```
## Key Utilities and Helpers

### File Size Formatting

```tsx
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
```
### File Type Detection
```tsx
const getFileIcon = (filename: string) => {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'pdf': return <FileText />;
    case 'dwg':
    case 'dxf': return <Image />; // Use appropriate CAD icon
    case 'jpg':
    case 'jpeg':
    case 'png': return <Image />;
    default: return <File />;
  }
};
```

This comprehensive pattern documentation provides all the building blocks needed to implement a robust drawings upload and management feature that follows the established patterns in the Alleato PM codebase.
