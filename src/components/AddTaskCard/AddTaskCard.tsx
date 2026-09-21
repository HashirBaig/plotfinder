import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Star } from "lucide-react";
import { addTask } from "@/services/taskService";
import { cn } from "@/lib/utils";

import CardWrapper from "@/components/CardWrapper";

type AddTaskFormData = {
  task: string;
};
type AddTaskCardProps = {
  getList: () => void;
};

const FORMDATA_TEMPLATE = { task: "" };

const AddTaskCard = ({ getList }: AddTaskCardProps) => {
  const [formData, setFormData] = useState<AddTaskFormData>(FORMDATA_TEMPLATE);
  const [isTaskImportant, setIsTaskImportant] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const resetForm = () => {
    setFormData(FORMDATA_TEMPLATE);
    setIsTaskImportant(false);
  };

  const handleOnSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setIsLoading(true);

      const _data = { ...formData, isImportant: isTaskImportant };
      const res = await addTask(_data);

      if (res) {
        resetForm();
        getList();
        toast.success("Task successfully created!");
      }

      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      console.error(err);
      toast.error(`Error Occurred ${err}`);
    }
  };

  return (
    <CardWrapper>
      <form className="flex items-center gap-4" onSubmit={handleOnSubmit}>
        <div className="flex items-center grow border-2 border-blue-400/10 rounded-xl focus-within:ring-2 focus-within:ring-blue-300/10 focus-within:outline-none transition-shadow">
          <Input
            id="task"
            type="text"
            className="text-lg border-none focus-visible:ring-0 focus-visible:outline-none"
            placeholder="What needs to be done?"
            value={formData.task}
            autoComplete="off"
            onChange={(e) =>
              setFormData({ ...formData, task: e?.target?.value })
            }
            disabled={isLoading}
          />

          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setIsTaskImportant(!isTaskImportant)}
          >
            <Star
              className={cn("size-8", {
                "text-blue-300": !isTaskImportant,
                "text-red-300": isTaskImportant,
              })}
            />
            <span
              className={cn("text-sm font-semibold w-fit md:w-35", {
                "text-blue-300": !isTaskImportant,
                "text-red-300": isTaskImportant,
              })}
            >
              Mark as Important
            </span>
          </div>
        </div>

        <Button
          className={"text-lg"}
          type="submit"
          disabled={!formData?.task || isLoading}
        >
          {isLoading ? (
            <Spinner className="size-6" />
          ) : (
            <>
              <Plus className="size-7" />
              <span>Add Task</span>
            </>
          )}
        </Button>
      </form>
    </CardWrapper>
  );
};

export default AddTaskCard;
