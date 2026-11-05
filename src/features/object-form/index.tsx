import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import type { ConstructionObject } from "@/entities/object";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";

import { ObjectFields } from "./ui/object-form-fields";
export function ObjectForm({ object }: { object?: ConstructionObject }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={object ? "outline" : "default"}>
          {object ? <Pencil size={16} /> : <Plus size={18} />}
          {object ? "Редактировать" : "Новый объект"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>
          {object ? "Редактирование объекта" : "Новый объект"}
        </DialogTitle>
        <DialogDescription>
          Укажите название стройки и адрес, по которому идут работы.
        </DialogDescription>
        {open && (
          <ObjectFields object={object} onClose={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
