"use client";
import * as React from "react";
import { Check, X, Trash, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
interface BulkActionsToolbarProps {
  selectedCount: number;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
  onExport: () => void;
  onClearSelection: () => void;
} /** * BulkActionsToolbar Component * * Displays when items are selected in the Direct Costs table. * Provides bulk operations: Approve, Reject, Delete, Export. * Includes confirmation dialogs for destructive actions. * * @example * ```tsx * <BulkActionsToolbar * selectedCount={5} * onApprove={() => handleBulkApprove(selectedIds)} * onReject={() => handleBulkReject(selectedIds)} * onDelete={() => handleBulkDelete(selectedIds)} * onExport={() => handleBulkExport(selectedIds)} * onClearSelection={() => setSelectedIds([])} * /> * ``` */
export function BulkActionsToolbar({
  selectedCount,
  onApprove,
  onReject,
  onDelete,
  onExport,
  onClearSelection,
}: BulkActionsToolbarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false); // Don't render if no items selected if (selectedCount === 0) { return null; } const handleDeleteConfirm = () => { onDelete(); setDeleteDialogOpen(false); }; const handleRejectConfirm = () => { onReject(); setRejectDialogOpen(false); }; return ( <> <div className="bg-muted border border-border rounded-lg p-4 mb-4"> <div className="flex items-center justify-between"> <span className="text-sm font-medium text-foreground"> {selectedCount} item{selectedCount > 1 ?"s" :""} selected </span> <div className="flex items-center gap-2"> <Button size="sm" variant="outline" onClick={onApprove} className="bg-background hover:bg-green-50 hover:border-green-300" > <Check className="h-4 w-4" /> Approve </Button> <Button size="sm" variant="outline" onClick={() => setRejectDialogOpen(true)} className="bg-background hover:bg-orange-50 hover:border-orange-300" > <X className="h-4 w-4" /> Reject </Button> <Button size="sm" variant="outline" onClick={onExport} className="bg-background" > <FileDown className="h-4 w-4" /> Export </Button> <Button size="sm" variant="destructive" onClick={() => setDeleteDialogOpen(true)} > <Trash className="h-4 w-4" /> Delete </Button> <Button size="sm" variant="ghost" onClick={onClearSelection} className="text-muted-foreground hover:text-foreground" > Clear </Button> </div> </div> </div> {/* Delete Confirmation Dialog */} <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}> <AlertDialogContent> <AlertDialogHeader> <AlertDialogTitle>Delete Direct Costs</AlertDialogTitle> <AlertDialogDescription> Are you sure you want to delete {selectedCount} direct cost {selectedCount > 1 ?"s" :""}? This action cannot be undone. </AlertDialogDescription> </AlertDialogHeader> <AlertDialogFooter> <AlertDialogCancel>Cancel</AlertDialogCancel> <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" > Delete </AlertDialogAction> </AlertDialogFooter> </AlertDialogContent> </AlertDialog> {/* Reject Confirmation Dialog */} <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}> <AlertDialogContent> <AlertDialogHeader> <AlertDialogTitle>Reject Direct Costs</AlertDialogTitle> <AlertDialogDescription> Are you sure you want to reject {selectedCount} direct cost {selectedCount > 1 ?"s" :""}? Rejected costs will need to be revised and resubmitted for approval. </AlertDialogDescription> </AlertDialogHeader> <AlertDialogFooter> <AlertDialogCancel>Cancel</AlertDialogCancel> <AlertDialogAction onClick={handleRejectConfirm} className="bg-primary text-primary-foreground hover:bg-primary/90" > Reject </AlertDialogAction> </AlertDialogFooter> </AlertDialogContent> </AlertDialog> </> );
}
