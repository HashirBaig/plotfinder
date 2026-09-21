import { createColumnHelper } from "@tanstack/react-table";
// import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Star, Pencil, Trash, Check, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { getToday } from "@/lib/utils";

import { type TYPE_TASK_LIST } from "@/lib/const";
import { type DataTableFeatures } from "./DataTableFeatures";

const columnHelper = createColumnHelper<DataTableFeatures, TYPE_TASK_LIST>();

type GetColumnsProps = {
  onEditClick: (task: TYPE_TASK_LIST) => void;
  onDeleteClick: (task: TYPE_TASK_LIST) => void;
  onCompleteClick: (task: TYPE_TASK_LIST) => void;
  onImportantClick: (task: TYPE_TASK_LIST) => void;
};

export function getColumns({
  onEditClick,
  onDeleteClick,
  onCompleteClick,
  onImportantClick,
}: GetColumnsProps) {
  return columnHelper.columns([
    // columnHelper.display({
    //   id: "select",
    //   cell: ({ row }) => (
    //     <Checkbox
    //       checked={row.getIsSelected()}
    //       onCheckedChange={(value) => row.toggleSelected(!!value)}
    //       aria-label="Select row"
    //     />
    //   ),
    //   enableSorting: false,
    //   enableHiding: false,
    // }),

    columnHelper.accessor("task", {
      header: "Task",
      cell: ({ row }) => (
        <div className="flex flex-col justify-center space-y-3">
          <span
            className={
              row.original.isCompleted
                ? "line-through text-gray-500 text-lg"
                : "text-gray-100 text-lg"
            }
          >
            {row?.original?.task}
          </span>

          <div className="flex items-center gap-2">
            {row?.original?.createdDate ? (
              <Badge
                className={cn({
                  "bg-purple-500/10 text-purple-500 border-purple-500/20":
                    getToday(row?.original?.createdDate) === "Today",
                  "bg-transparent text-gray-500":
                    getToday(row?.original?.createdDate) !== "Today",
                })}
              >
                <Calendar className="size-4" />
                <span>{getToday(row?.original?.createdDate)}</span>
              </Badge>
            ) : null}

            {row?.original?.isImportant ? (
              <Badge className="bg-amber-500/10 text-red-500 border-red-500/20">
                <Star className="size-4" />
                <span>Important</span>
              </Badge>
            ) : null}

            {row?.original?.isCompleted ? (
              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                <Check className="size-4" />
                <span>Completed</span>
              </Badge>
            ) : (
              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                <span>Pending</span>
              </Badge>
            )}
          </div>
        </div>
      ),
    }),

    columnHelper.display({
      id: "actions",
      header: "Action",
      cell: ({ row, table }) => {
        const selectedCount = table.getSelectedRowModel().rows.length;

        if (selectedCount > 1) {
          return null;
        }

        return (
          <div
            className="flex items-center justify-end gap-3"
            title="mark important, complete, edit & delete"
          >
            <Star
              className={cn("size-6 cursor-pointer", {
                "text-red-100  hover:text-red-400": !row?.original?.isImportant,
                "text-red-400  hover:text-red-100": row?.original?.isImportant,
              })}
              onClick={() => onImportantClick(row.original)}
            />

            {!row?.original?.isCompleted && (
              <>
                <Check
                  className="text-green-100 size-6 hover:text-green-400 cursor-pointer"
                  onClick={() => onCompleteClick(row.original)}
                />
                <Pencil
                  className="text-blue-100 size-5 hover:text-blue-400 cursor-pointer"
                  onClick={() => onEditClick(row.original)}
                />
              </>
            )}

            <Trash
              className="text-blue-100 size-5 hover:text-red-400 cursor-pointer"
              onClick={() => onDeleteClick(row.original)}
            />
          </div>
        );
      },
    }),
  ]);
}
