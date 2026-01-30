'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Text } from '@/components/ui/text';
import { Upload, Loader2, AlertCircle, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface UploadDrawingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  onSuccess?: () => void;
}

interface DrawingMetadata {
  fileName: string;
  fileType: string;
  fileSize: number;
  category: string;
  number?: string;
  discipline?: string;
  revision?: string;
  status?: string;
}

export function UploadDrawingDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: UploadDrawingDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      const droppedFile = droppedFiles[0];
      // Validate file type
      const validTypes = [
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/jpg',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];
      if (validTypes.includes(droppedFile.type) || droppedFile.name.match(/\.(pdf|png|jpg|jpeg|dwg|dxf)$/i)) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('Invalid file type. Please upload PDF, DWG, DXF, or image files.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!file) {
        throw new Error('No file selected');
      }

      const formData = new FormData(e.currentTarget);
      const supabase = createClient();

      // Get form values
      const number = formData.get('number') as string;
      const title = formData.get('title') as string;
      const discipline = formData.get('discipline') as string;
      const revision = formData.get('revision') as string;
      const status = formData.get('status') as string;
      const description = formData.get('description') as string;

      // Upload file to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const fileName = `${number || fileId}.${fileExt}`;
      const filePath = `projects/${projectId}/drawings/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('drawings')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('drawings').getPublicUrl(filePath);

      // Prepare metadata
      const metadata: DrawingMetadata = {
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        category: 'drawings',
        number,
        discipline,
        revision,
        status,
      };

      // Insert drawing record into files table
      const { error: insertError } = await supabase.from('files').insert({
        id: fileId,
        project_id: projectId,
        title: title || file.name,
        content: description || file.name,
        url: publicUrl,
        category: 'drawings',
        status: 'active',
        metadata: metadata as any,
      });

      if (insertError) {
        throw new Error(`Database insert failed: ${insertError.message}`);
      }

      // Success! Close dialog and refresh
      onOpenChange(false);
      router.refresh();

      if (onSuccess) {
        onSuccess();
      }

      // Reset form
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to upload drawing. Please try again.';
      setError(errorMessage);
      } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setFile(files[0]);
      setError(null);
    }
  };

  const handleReset = () => {
    setFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Drawing</DialogTitle>
          <DialogDescription>
            Upload a new construction drawing or blueprint to the project.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* File Upload with Drag and Drop */}
            <div className="grid gap-2">
              <Label htmlFor="file">Drawing File *</Label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-lg p-6 text-center transition-colors
                  ${isDragging ? 'border-primary bg-primary/5' : 'border-border'}
                  ${file ? 'bg-muted/50' : ''}
                `}
              >
                {!file ? (
                  <>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <Text size="sm" weight="medium" className="mb-1">
                      Drag & drop your drawing here, or click to browse
                    </Text>
                    <Text size="xs" tone="muted" className="mb-3">
                      PDF, DWG, DXF, or image files (Max 50MB)
                    </Text>
                    <Input
                      ref={fileInputRef}
                      id="file"
                      name="file"
                      type="file"
                      accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                      className="cursor-pointer"
                      required
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 text-left">
                      <Text size="sm" weight="medium">{file.name}</Text>
                      <Text size="xs" tone="muted">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={handleReset}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Drawing Number */}
            <div className="grid gap-2">
              <Label htmlFor="number">Drawing Number *</Label>
              <Input
                id="number"
                name="number"
                placeholder="e.g., A-101"
                required
              />
            </div>

            {/* Title */}
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., First Floor Plan"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Discipline */}
              <div className="grid gap-2">
                <Label htmlFor="discipline">Discipline *</Label>
                <Select name="discipline" required>
                  <SelectTrigger id="discipline">
                    <SelectValue placeholder="Select discipline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="architectural">Architectural</SelectItem>
                    <SelectItem value="structural">Structural</SelectItem>
                    <SelectItem value="mechanical">Mechanical</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="plumbing">Plumbing</SelectItem>
                    <SelectItem value="civil">Civil</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Revision */}
              <div className="grid gap-2">
                <Label htmlFor="revision">Revision *</Label>
                <Input
                  id="revision"
                  name="revision"
                  placeholder="e.g., A, B, C"
                  defaultValue="A"
                  required
                />
              </div>
            </div>

            {/* Status */}
            <div className="grid gap-2">
              <Label htmlFor="status">Status *</Label>
              <Select name="status" defaultValue="issued_for_review" required>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="issued_for_construction">
                    Issued for Construction
                  </SelectItem>
                  <SelectItem value="issued_for_review">
                    Issued for Review
                  </SelectItem>
                  <SelectItem value="superseded">Superseded</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Additional notes or description..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !file}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Drawing
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
