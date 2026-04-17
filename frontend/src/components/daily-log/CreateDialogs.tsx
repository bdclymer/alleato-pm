"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

type DailyLogSummary = { id: string; log_date: string };

export function CreateDailyLogButton({ projectId }: { projectId: number }) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState("");

  const handleCreate = async () => {
    if (!date) return;
    try {
      await apiFetch("/api/table-insert", {
        method: "POST",
        body: JSON.stringify({ table: "daily_logs", data: { project_id: projectId, log_date: date } }),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create daily log");
      return;
    }
    toast.success("Daily log created");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Log Entry</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Daily Log</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Label htmlFor="log-date">Date (YYYY-MM-DD)</Label>
          <Input id="log-date" placeholder="2026-01-13" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={!date}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CreateManpowerButton({ dailyLogs }: { dailyLogs: DailyLogSummary[] }) {
  const [open, setOpen] = React.useState(false);
  const [logId, setLogId] = React.useState<string>("");
  const [trade, setTrade] = React.useState("");
  const [workers, setWorkers] = React.useState("");

  const handleCreate = async () => {
    const payload = {
      daily_log_id: logId,
      trade: trade || null,
      workers_count: Number(workers) || 0,
    };
    try {
      await apiFetch("/api/table-insert", {
        method: "POST",
        body: JSON.stringify({ table: "daily_log_manpower", data: payload }),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create manpower entry");
      return;
    }
    toast.success("Manpower entry created");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Add Manpower</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Manpower</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Label>Daily Log Date</Label>
          <Select onValueChange={(v) => setLogId(v)}>
            <SelectTrigger><SelectValue placeholder="Select date" /></SelectTrigger>
            <SelectContent>
              {dailyLogs.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.log_date}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div>
            <Label>Trade</Label>
            <Input value={trade} onChange={(e) => setTrade(e.target.value)} />
          </div>
          <div>
            <Label>Workers</Label>
            <Input type="number" inputMode="numeric" value={workers} onChange={(e) => setWorkers(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={!logId || !workers}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CreateEquipmentButton({ dailyLogs }: { dailyLogs: DailyLogSummary[] }) {
  const [open, setOpen] = React.useState(false);
  const [logId, setLogId] = React.useState<string>("");
  const [name, setName] = React.useState("");

  const handleCreate = async () => {
    const payload = { daily_log_id: logId, equipment_name: name };
    try {
      await apiFetch("/api/table-insert", {
        method: "POST",
        body: JSON.stringify({ table: "daily_log_equipment", data: payload }),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create equipment entry");
      return;
    }
    toast.success("Equipment entry created");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Add Equipment</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Equipment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Label>Daily Log Date</Label>
          <Select onValueChange={(v) => setLogId(v)}>
            <SelectTrigger><SelectValue placeholder="Select date" /></SelectTrigger>
            <SelectContent>
              {dailyLogs.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.log_date}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div>
            <Label>Equipment Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={!logId || !name}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CreateNoteButton({ dailyLogs }: { dailyLogs: DailyLogSummary[] }) {
  const [open, setOpen] = React.useState(false);
  const [logId, setLogId] = React.useState<string>("");
  const [description, setDescription] = React.useState("");

  const handleCreate = async () => {
    const payload = { daily_log_id: logId, description };
    try {
      await apiFetch("/api/table-insert", {
        method: "POST",
        body: JSON.stringify({ table: "daily_log_notes", data: payload }),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create note");
      return;
    }
    toast.success("Note created");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Add Note</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Note</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Label>Daily Log Date</Label>
          <Select onValueChange={(v) => setLogId(v)}>
            <SelectTrigger><SelectValue placeholder="Select date" /></SelectTrigger>
            <SelectContent>
              {dailyLogs.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.log_date}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div>
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={!logId || !description}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

