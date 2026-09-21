import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../ui/dialog";
import { Label } from "../../ui/label";
import { Input } from "../../ui/input";
import { Button } from "../../ui/button";
import { type TYPE_TASK_LIST } from "@/lib/const";

type EditTaskModelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TYPE_TASK_LIST | null;
  onEdit: (updatedTask: TYPE_TASK_LIST) => void;
};

function EditTaskModel({
  open,
  onOpenChange,
  task,
  onEdit,
}: EditTaskModelProps) {
  const [taskText, setTaskText] = useState("");

  // Whenever a new task is passed in (or the modal opens), prefill the input
  useEffect(() => {
    if (task) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTaskText(task?.task);
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!task) return;

    onEdit({ ...task, task: taskText });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 text-gray-100">
        <DialogHeader>
          <DialogTitle className="text-gray-100">Edit Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="task">Task</Label>
            <Input
              id="task"
              type="text"
              value={taskText}
              onChange={(e) => setTaskText(e.target.value)}
            />
          </div>

          <DialogFooter className="bg-gray-900 border-gray-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-gray-700 text-gray-300 hover:bg-gray-900 hover:text-gray-100"
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-800">
              Edit Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditTaskModel;
