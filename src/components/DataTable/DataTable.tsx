import { useState, useEffect } from "react";
import { useTable, type ColumnDef, type RowData } from "@tanstack/react-table";

import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

import { features, type DataTableFeatures } from "./DataTableFeatures";
import type { TYPE_PAGINATION_META } from "@/lib/const";
import { Button } from "@/components/ui/button";

interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<DataTableFeatures, TData>[];
  data: TData[];
  onSelectionCountChange?: (count: number) => void;
  pagination?: TYPE_PAGINATION_META;
  onPageChange?: (page: number) => void;
}

function DataTable<TData extends RowData>({
  columns,
  data,
  onSelectionCountChange,
  pagination,
  onPageChange,
}: DataTableProps<TData>) {
  const [rowSelection, setRowSelection] = useState({});

  const table = useTable({
    features,
    data,
    columns,
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
  });

  useEffect(() => {
    onSelectionCountChange?.(Object.keys(rowSelection).length);
  }, [rowSelection, onSelectionCountChange]);

  return (
    <div className="mt-4">
      <div className=" border-gray-800 rounded-2xl overflow-hidden">
        <Table className="table-fixed">
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="text-blue-100 text-md border-b-blue-400/10 hover:bg-blue-100/5 data-[state=selected]:bg-blue-400/10"
                >
                  {row?.getVisibleCells()?.map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        cell.column.id === "select" ? "w-10 py-6" : "py-6"
                      }
                    >
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="text-sm text-gray-400">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>

        {pagination && onPageChange && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrevPage}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNextPage}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default DataTable;
