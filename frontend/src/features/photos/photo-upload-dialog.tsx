"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload } from "lucide-react";

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ds";
import { useCreatePhoto } from "@/hooks/use-photos";
import { ALBUM_OPTIONS } from "./photos-grid-config";

const uploadPhotoSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  album: z.string().optional(),
  file_name: z.string().min(1, "File name is required"),
  file_url: z.string().url("Must be a valid URL"),
});

type UploadPhotoFormValues = z.infer<typeof uploadPhotoSchema>;

interface PhotoUploadDialogProps {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PhotoUploadDialog({
  projectId,
  open,
  onOpenChange,
}: PhotoUploadDialogProps) {
  const createPhoto = useCreatePhoto(projectId);

  const form = useForm<UploadPhotoFormValues>({
    resolver: zodResolver(uploadPhotoSchema),
    defaultValues: {
      title: "",
      description: "",
      album: "Default",
      file_name: "",
      file_url: "",
    },
  });

  const onSubmit = async (values: UploadPhotoFormValues) => {
    await createPhoto.mutateAsync({
      title: values.title,
      description: values.description || null,
      album: values.album || "Default",
      file_name: values.file_name,
      file_url: values.file_url,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Photo</DialogTitle>
          <DialogDescription>
            Add a new photo to this project. Provide the image URL and details.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Photo title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="album"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Album</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select album" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ALBUM_OPTIONS.filter((opt) => opt.value !== "").map(
                        (opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="file_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="file_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>File Name</FormLabel>
                  <FormControl>
                    <Input placeholder="photo.jpg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createPhoto.isPending}>
                <Upload className="mr-1.5 size-4" />
                {createPhoto.isPending ? "Uploading..." : "Upload Photo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
