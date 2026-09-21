import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import type { TYPE_TASK_LIST } from "@/lib/const";
import { useEffect, useState } from "react";

type DeleteTaskModelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TYPE_TASK_LIST | null;
  onDelete: (task: TYPE_TASK_LIST | null) => void;
};

function DeleteTaskModel({
  open,
  onOpenChange,
  task,
  onDelete,
}: DeleteTaskModelProps) {
  const [taskToSet, setTaskToSet] = useState<TYPE_TASK_LIST>();

  // Whenever a new task is passed in (or the modal opens), prefill the input
  useEffect(() => {
    if (task) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTaskToSet(task);
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onDelete(taskToSet || null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-gray-100">
        <DialogHeader>
          <DialogTitle className="text-gray-100">Delete Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <p className="text-blue-100">
            This action is permanent. Do you want to continue?
          </p>

          <DialogFooter className="bg-gray-900 border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gray-700 text-gray-300 hover:bg-gray-900 hover:text-gray-100"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-red-800 hover:bg-red-800/80 text-red-100"
            >
              Delete
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default DeleteTaskModel;
