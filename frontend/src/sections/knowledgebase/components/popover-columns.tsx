import type { ColumnDef } from '@tanstack/react-table';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

interface ColumnVisibilityModel {
  [key: string]: boolean;
}

interface PopoverColumnsProps<TData> {
  columnVisibilityModel: ColumnVisibilityModel;
  columns: ColumnDef<TData>[];
  handleColumnToggle: (field: string) => void;
  handleReset: () => void;
  handleShowAll: () => void;
}

// Helper function to safely get column ID
function getColumnId<TData>(column: ColumnDef<TData>): string | undefined {
  if (column.id) {
    return column.id;
  }
  if ('accessorKey' in column && column.accessorKey) {
    return column.accessorKey as string;
  }
  return undefined;
}

export default function PopoverColumns<TData>({
  columnVisibilityModel,
  columns,
  handleColumnToggle,
  handleReset,
  handleShowAll,
}: PopoverColumnsProps<TData>) {
  return (
    <div className="w-64 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium">Columns</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleShowAll} className="h-7 px-2 text-xs">
            Show All
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 px-2 text-xs">
            Reset
          </Button>
        </div>
      </div>

      <Separator className="mb-3" />

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {columns
          .map((column) => {
            const columnId = getColumnId(column);
            return { column, columnId };
          })
          .filter(({ columnId }) => columnId && columnId !== 'actions')
          .map(({ column, columnId }) => {
            const header = typeof column.header === 'string' ? column.header : columnId;
            const isVisible = columnVisibilityModel[columnId!] !== false;
            return (
              <div key={columnId} className="flex items-center space-x-2">
                <Checkbox
                  id={columnId}
                  checked={isVisible}
                  onCheckedChange={() => handleColumnToggle(columnId!)}
                  className="h-4 w-4"
                />
                <Label htmlFor={columnId} className="text-sm font-normal cursor-pointer flex-1">
                  {header || columnId}
                </Label>
              </div>
            );
          })}
      </div>
    </div>
  );
}
