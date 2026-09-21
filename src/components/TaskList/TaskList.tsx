import CardWrapper from "@/components/CardWrapper";
import DataTable from "@/components/DataTable";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NavTabsList, type TYPE_TASK_LIST } from "@/lib/const";
import { getColumns } from "@/components/DataTable/columns";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTaskStore } from "@/store/taskStore";

import DeleteTaskModel from "@/components/Models/DeleteTaskModel";
import EditTaskModel from "@/components/Models/EditTaskModel";
import { deleteTask, editTask } from "@/services/taskService";

type TaskListProps = {
  dataList: TYPE_TASK_LIST[];
  getList: (activeTab?: string, page?: number) => void;
  pagination: {
    page: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  onPageChange: (page: number) => void;
};

function TaskList({
  dataList,
  getList,
  pagination,
  onPageChange,
}: TaskListProps) {
  // Model states
  const [isDeleteTaskModelOpen, setIsDeleteTaskModelOpen] =
    useState<boolean>(false);

  const [taskToDelete, setTaskToDelete] = useState<TYPE_TASK_LIST | null>(null);

  const [isEditTaskModelOpen, setIsEditTaskModelOpen] =
    useState<boolean>(false);

  const [taskToEdit, setTaskToEdit] = useState<TYPE_TASK_LIST | null>(null);

  // Active tab state
  const [activeTab, setActiveTab] = useState<string>("all");

  // Store methods
  const setTaskInfo = useTaskStore((state) => state?.setTaskInfo);
  const setMultiSelect = useTaskStore((state) => state?.setMultiSelect);

  useEffect(() => {
    setTaskInfo({
      totalTask: dataList?.length || 0,
      remainingTask: dataList?.filter((item) => !item?.isCompleted)?.length,
    });
  }, [setTaskInfo, dataList]);

  // On change method
  const onTabChange = (value: string) => {
    getList(value, 1);
    setActiveTab(value);
  };

  const handleSelectionCountChange = useCallback(
    (count: number) => {
      setMultiSelect(count > 1);
    },
    [setMultiSelect],
  );

  // Toggle model methods
  const openDeleteModal = (task: TYPE_TASK_LIST) => {
    setIsDeleteTaskModelOpen(true);
    setTaskToDelete(task);
  };

  const openEditModal = (task: TYPE_TASK_LIST) => {
    setIsEditTaskModelOpen(true);
    setTaskToEdit(task);
  };

  // Edit Task Method
  const handleEdit = async (task: TYPE_TASK_LIST) => {
    try {
      const _data = { ...task };

      const res = await editTask(_data);
      if (res) {
        toast.success("Task successfully edited!");
        getList("all");
        setActiveTab("all");
      }
    } catch (error) {
      console.error(error);
      toast.error("Request Failed!");
    } finally {
      setIsEditTaskModelOpen(false);
      setTaskToEdit(null);
    }
  };

  // Delete Task Method
  const handleDelete = async () => {
    if (!taskToDelete) return;

    try {
      const res = await deleteTask(taskToDelete);
      if (res) {
        toast.success("Task successfully deleted!");
        getList();
        setActiveTab("all");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete!");
    } finally {
      setIsDeleteTaskModelOpen(false);
      setTaskToDelete(null);
    }
  };

  const handleComplete = async (task: TYPE_TASK_LIST) => {
    try {
      const _data = { isCompleted: true, id: task?.id };

      const res = await editTask(_data);
      if (res) {
        toast.success("Task marked completed!");
        getList("completed");
        setActiveTab("completed");
      }
    } catch (error) {
      console.log(error);
      toast.error("Request failed!");
    }
  };

  const handleMarkAsImportant = async (task: TYPE_TASK_LIST) => {
    try {
      const _data = { isImportant: !task?.isImportant, id: task?.id };

      const res = await editTask(_data);
      if (res) {
        toast.success("Task status updated!");
        getList();
        setActiveTab("all");
      }
    } catch (error) {
      console.log(error);
      toast.error("Request failed!");
    }
  };

  const columns = useMemo(
    () =>
      getColumns({
        onEditClick: openEditModal,
        onDeleteClick: openDeleteModal,
        onCompleteClick: handleComplete,
        onImportantClick: handleMarkAsImportant,
      }),
    [],
  );

  return (
    <>
      <CardWrapper>
        <Tabs className="w-full" value={activeTab} onValueChange={onTabChange}>
          <TabsList>
            {NavTabsList?.map(({ label, value }, idx) => (
              <TabsTrigger value={value} key={`nav-tabs-todo-${idx}`}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab}>
            <DataTable
              columns={columns}
              data={dataList}
              onSelectionCountChange={handleSelectionCountChange}
              pagination={pagination}
              onPageChange={onPageChange}
            />
          </TabsContent>
        </Tabs>
      </CardWrapper>

      {/* Modals */}
      <EditTaskModel
        open={isEditTaskModelOpen}
        onOpenChange={setIsEditTaskModelOpen}
        task={taskToEdit}
        onEdit={handleEdit}
      />

      <DeleteTaskModel
        open={isDeleteTaskModelOpen}
        onOpenChange={setIsDeleteTaskModelOpen}
        task={taskToDelete}
        onDelete={handleDelete}
      />
    </>
  );
}

export default TaskList;
