"use client";
import React, { useState } from "react";
import { FileUpload } from "@/components/ui/file-upload";

export default function FileUploadDemo() {
  const [files, setFiles] = useState<File[]>([]);
  const handleFileUpload = (files: File[]) => {
    setFiles(files);
    console.log(files);
  };

  return (
    <div className="mx-auto min-h-96 w-full max-w-4xl rounded-lg border border-dashed border-border bg-background">
      <FileUpload onChange={handleFileUpload} />
    </div>
  );
}
