/**
 * =============================================================================
 * ATTACHMENT MANAGER COMPONENT
 * =============================================================================
 *
 * File upload and management component with drag-and-drop support for Direct Costs
 *
 * Features:
 * - Drag-and-drop file upload
 * - File validation (size, type)
 * - Upload progress tracking
 * - File preview and download
 * - File deletion with confirmation
 * - Multiple simultaneous uploads
 */

'use client'

import { useState, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Upload,
  File,
  Image,
  FileText,
  Download,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// =============================================================================
// TYPES
// =============================================================================

interface AttachmentRow {
  id: string
  file_name: string | null
  url: string | null
  uploaded_at: string | null
  attached_to_id: string | null
  attached_to_table: string | null
}

interface AttachmentManagerProps {
  attachments: AttachmentRow[]
  onUpload: (files: File[]) => Promise<void>
  onDelete: (attachmentId: string) => Promise<void>
  maxFileSize?: number // in bytes, default 10MB
  allowedTypes?: string[] // default: images, PDFs, docs
  isUploading?: boolean
  uploadProgress?: number
}

interface UploadingFile {
  id: string
  file: File
  progress: number
  status: 'uploading' | 'success' | 'error'
  error?: string
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AttachmentManager({
  attachments = [],
  onUpload,
  onDelete,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedTypes = [
    'image/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  isUploading = false,
  uploadProgress = 0,
}: AttachmentManagerProps) {
  // State
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // =============================================================================
  // HELPERS
  // =============================================================================

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Get file icon based on file type
   */
  const getFileIcon = (fileName: string | null) => {
    if (!fileName) return File

    const extension = fileName.split('.').pop()?.toLowerCase()

    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension || '')) {
      return Image
    }
    if (extension === 'pdf') {
      return FileText
    }
    return File
  }

  /**
   * Validate file before upload
   */
  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File size must be less than ${formatFileSize(maxFileSize)}`
    }

    // Check file type
    const isValidType = allowedTypes.some((type) => {
      if (type.includes('*')) {
        // Handle wildcard types like "image/*"
        const baseType = type.split('/')[0]
        return file.type.startsWith(baseType)
      }
      return file.type === type
    })

    if (!isValidType) {
      return 'File type not supported'
    }

    return null
  }

  // =============================================================================
  // HANDLERS
  // =============================================================================

  /**
   * Handle file selection
   */
  const handleFiles = useCallback(
    async (files: FileList) => {
      setError(null)
      const filesToUpload = Array.from(files)
      const validFiles: File[] = []
      const errors: string[] = []

      // Validate all files first
      for (const file of filesToUpload) {
        const validationError = validateFile(file)
        if (validationError) {
          errors.push(`${file.name}: ${validationError}`)
        } else {
          validFiles.push(file)

          // Add to uploading state
          const uploadId = Math.random().toString(36).substring(2, 9)
          setUploadingFiles((prev) => [
            ...prev,
            {
              id: uploadId,
              file,
              progress: 0,
              status: 'uploading',
            },
          ])
        }
      }

      // Show errors if any
      if (errors.length > 0) {
        setError(errors.join('; '))
      }

      // Upload valid files
      if (validFiles.length > 0) {
        try {
          await onUpload(validFiles)

          // Mark all as success
          setUploadingFiles((prev) =>
            prev.map((uf) => ({
              ...uf,
              progress: 100,
              status: 'success' as const,
            }))
          )

          // Clear uploading files after delay
          setTimeout(() => {
            setUploadingFiles([])
          }, 1500)
        } catch (err) {
          // Mark all as error
          const errorMessage =
            err instanceof Error ? err.message : 'Upload failed'
          setUploadingFiles((prev) =>
            prev.map((uf) => ({
              ...uf,
              status: 'error' as const,
              error: errorMessage,
            }))
          )
          setError(errorMessage)
        }
      }
    },
    [onUpload, maxFileSize, allowedTypes]
  )

  /**
   * Handle drag over
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  /**
   * Handle drag leave
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  /**
   * Handle file drop
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  /**
   * Handle file input change
   */
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
    // Reset input so same file can be uploaded again
    e.target.value = ''
  }

  /**
   * Remove uploading file from state
   */
  const removeUploadingFile = (id: string) => {
    setUploadingFiles((prev) => prev.filter((uf) => uf.id !== id))
  }

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card
        className={cn(
          'border-2 border-dashed transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25',
          'hover:border-primary/50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Upload className="h-8 w-8 text-muted-foreground mb-4" />
          <div className="text-center">
            <p className="text-sm font-medium mb-1">
              Drop files here or click to upload
            </p>
            <p className="text-xs text-muted-foreground">
              Maximum {formatFileSize(maxFileSize)} per file
            </p>
            <p className="text-xs text-muted-foreground">
              Supported: Images, PDF, Word, Excel
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="mt-4"
            disabled={isUploading}
          >
            Choose Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={allowedTypes.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploading...</h4>
          {uploadingFiles.map((uploadingFile) => {
            const Icon = getFileIcon(uploadingFile.file.name)
            return (
              <Card key={uploadingFile.id}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium truncate">
                          {uploadingFile.file.name}
                        </p>
                        <div className="flex items-center space-x-2">
                          {uploadingFile.status === 'success' && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {uploadingFile.status === 'error' && (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              removeUploadingFile(uploadingFile.id)
                            }
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {uploadingFile.status === 'uploading' && (
                        <Progress
                          value={uploadingFile.progress}
                          className="h-1"
                        />
                      )}
                      {uploadingFile.status === 'error' &&
                        uploadingFile.error && (
                          <p className="text-xs text-red-500">
                            {uploadingFile.error}
                          </p>
                        )}
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(uploadingFile.file.size)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Existing Attachments */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            Attachments ({attachments.length})
          </h4>
          {attachments.map((attachment) => {
            const Icon = getFileIcon(attachment.file_name)
            return (
              <Card key={attachment.id}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">
                          {attachment.file_name || 'Unknown file'}
                        </p>
                        <div className="flex items-center space-x-2">
                          {attachment.url && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                window.open(attachment.url || '', '_blank')
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(attachment.id)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {attachment.uploaded_at && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(attachment.uploaded_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
