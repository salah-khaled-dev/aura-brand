"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  IconChevronUp, 
  IconChevronDown, 
  IconSettings2, 
  IconChevronLeft, 
  IconChevronRight,
  IconSearch,
  IconFilter,
  IconColumns,
  IconDownload,
  IconEdit,
  IconCopy,
  IconArchive,
  IconTrash
} from "@tabler/icons-react";
import { Badge, statusVariant } from "./Badge";
import { cn } from "@/utils/cn";
import { Button } from "./Button";
import { Input } from "./Input";

export interface Column<T> {
  accessor: keyof T | string;
  header: string;
  type?: "text" | "price" | "date" | "status" | "badge" | "custom" | "actions";
  render?: (value: unknown, item: T) => React.ReactNode;
  sortable?: boolean;
  align?: "start" | "center" | "end";
  hidden?: boolean;
}

export interface DataTableProps<T extends { id?: string | number }> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  className?: string;
  emptyState?: React.ReactNode;
  isLoading?: boolean;
  pageSize?: number;
  selectable?: boolean;
  selectedIds?: (string | number)[];
  onSelectionChange?: (ids: (string | number)[]) => void;
  
  // Toolbar Props
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onExport?: () => void;
  
  // Inline Actions
  onEdit?: (item: T) => void;
  onDuplicate?: (item: T) => void;
  onArchive?: (item: T) => void;
  onDelete?: (item: T) => void;
}

const SKELETON_WIDTHS = ["65%", "80%", "72%", "90%", "68%", "76%"];

function SkeletonRow({ cols, rowIndex }: { cols: number; rowIndex: number }) {
  return (
    <tr className="border-b border-[var(--admin-border-light)]">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div 
            className="h-5 rounded-[var(--admin-radius-sm)] bg-[var(--admin-bg-elevated)] animate-pulse" 
            style={{ width: SKELETON_WIDTHS[(rowIndex + i) % SKELETON_WIDTHS.length] }} 
          />
        </td>
      ))}
    </tr>
  );
}

export function DataTable<T extends { id?: string | number }>({
  columns: initialColumns, 
  data, 
  onRowClick, 
  className, 
  emptyState, 
  isLoading, 
  pageSize = 10,
  selectable, 
  selectedIds = [], 
  onSelectionChange,
  searchQuery,
  onSearchChange,
  onExport,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete
}: DataTableProps<T>) {
  const [columns, setColumns] = useState<Column<T>[]>(initialColumns);
  const [sortConfig, setSortConfig] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const columnManagerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (columnManagerRef.current && !columnManagerRef.current.contains(event.target as Node)) {
        setShowColumnManager(false);
      }
    }
    if (showColumnManager) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColumnManager]);

  const sorted = useMemo(() => {
    if (!sortConfig) return data;
    return [...data].sort((a: any, b: any) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal < bVal) return sortConfig.dir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (key: string) => {
    setSortConfig(prev =>
      prev?.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
    setPage(1);
  };

  const renderCell = (col: Column<T>, item: T) => {
    const raw = (item as any)[col.accessor as string];
    if (col.render) return col.render(raw, item);
    if (col.type === "price") return <span className="tabular-nums font-semibold">{Number(raw).toLocaleString("en-US")} ج.م</span>;
    if (col.type === "date") return <span className="text-[var(--admin-text-subtle)] font-medium">{new Date(String(raw)).toLocaleDateString("ar-EG")}</span>;
    if (col.type === "status") return (
      <Badge variant={statusVariant(String(raw))} size="sm" animated>
        {String(raw)}
      </Badge>
    );
    return <span>{String(raw ?? "—")}</span>;
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onSelectionChange) return;
    if (e.target.checked) {
      onSelectionChange(paginated.map(i => i.id).filter(id => id !== undefined) as (string | number)[]);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id: string | number, checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(i => i !== id));
    }
  };

  const visibleColumns = columns.filter(c => !c.hidden);
  const hasActions = !!(onEdit || onDuplicate || onArchive || onDelete);
  
  const isAllSelected = paginated.length > 0 && paginated.every(i => i.id !== undefined && selectedIds.includes(i.id));
  const isSomeSelected = paginated.some(i => i.id !== undefined && selectedIds.includes(i.id)) && !isAllSelected;

  return (
    <div className={cn("flex flex-col rounded-[var(--admin-radius-2xl)] border border-[var(--admin-border-base)] bg-[var(--admin-bg-card)] shadow-[var(--admin-shadow-sm)] overflow-hidden", className)}>
      
      {/* Toolbar */}
      {(onSearchChange !== undefined || onExport !== undefined) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-[var(--admin-border-light)] bg-[var(--admin-bg-surface)] gap-4">
          <div className="flex items-center gap-3">
            {selectable && selectedIds.length > 0 && (
              <span className="text-sm font-medium text-[var(--admin-primary)] bg-[var(--admin-primary-muted)] px-3 py-1 rounded-full whitespace-nowrap">
                تم تحديد {selectedIds.length}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onSearchChange !== undefined && (
              <div className="relative flex-1 sm:flex-none">
                <IconSearch size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--admin-text-subtle)]" />
                <Input 
                  placeholder="بحث..."
                  value={searchQuery || ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full sm:w-64 h-9 pl-3 pr-9"
                />
              </div>
            )}
            <Button variant="outline" size="sm" leftIcon={<IconFilter size={16} className="hidden sm:block" />}>
              <span className="hidden sm:inline">تصفية</span>
            </Button>
            
            <div className="relative" ref={columnManagerRef}>
              <Button 
                variant="outline" 
                size="sm" 
                leftIcon={<IconColumns size={16} className="hidden sm:block" />}
                onClick={() => setShowColumnManager(!showColumnManager)}
              >
                <span className="hidden sm:inline">الأعمدة</span>
              </Button>
              {showColumnManager && (
                <div className="absolute left-0 top-full mt-2 w-48 rounded-[var(--admin-radius-lg)] border border-[var(--admin-border-base)] bg-[var(--admin-bg-surface)] p-2 shadow-lg z-50 animate-in fade-in zoom-in-95">
                  <div className="text-xs font-semibold text-[var(--admin-text-subtle)] mb-2 px-2">إظهار / إخفاء</div>
                  {columns.map((col, idx) => (
                    <label key={idx} className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--admin-bg-hover)] rounded-[var(--admin-radius-sm)] cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={!col.hidden}
                        onChange={() => {
                          setColumns(columns.map((c, i) => i === idx ? { ...c, hidden: !c.hidden } : c));
                        }}
                        className="w-[16px] h-[16px] rounded-[var(--admin-radius-sm)] border-[var(--admin-border-strong)] text-[var(--admin-primary)] focus:ring-[var(--admin-primary)] cursor-pointer"
                      />
                      <span className="text-sm font-medium text-[var(--admin-text-base)]">{col.header}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {onExport && (
              <Button variant="outline" size="sm" leftIcon={<IconDownload size={16} className="hidden sm:block" />} onClick={onExport}>
                <span className="hidden sm:inline">تصدير</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto custom-scrollbar relative">
        <table className="w-full text-sm text-[var(--admin-text-base)]">
          <thead className="bg-[var(--admin-bg-surface)] border-b border-[var(--admin-border-base)] sticky top-0 z-10 shadow-sm">
            <tr>
              {selectable && (
                <th className="px-5 py-4 w-12 text-start border-r border-[var(--admin-border-light)]">
                  <input 
                    type="checkbox" 
                    checked={isAllSelected}
                    ref={input => {
                      if (input) input.indeterminate = isSomeSelected;
                    }}
                    onChange={handleSelectAll}
                    className="w-[18px] h-[18px] rounded-[var(--admin-radius-sm)] border-[var(--admin-border-strong)] text-[var(--admin-primary)] focus:ring-[var(--admin-primary)] cursor-pointer"
                  />
                </th>
              )}
              {visibleColumns.map((col, i) => (
                <th
                  key={i}
                  className={cn(
                    "px-5 py-4 text-xs font-semibold text-[var(--admin-text-subtle)] uppercase tracking-wider whitespace-nowrap",
                    col.align === "end" ? "text-end" : col.align === "center" ? "text-center" : "text-start",
                    col.sortable && "cursor-pointer select-none hover:text-[var(--admin-text-base)] hover:bg-[var(--admin-bg-hover)] transition-colors"
                  )}
                  onClick={() => col.sortable && handleSort(String(col.accessor))}
                >
                  <div className={cn("inline-flex items-center gap-1.5", col.align === "end" && "flex-row-reverse")}>
                    {col.header}
                    {col.sortable && (
                      <span className="text-[var(--admin-text-muted)]">
                        {sortConfig?.key === String(col.accessor) ? (
                          sortConfig.dir === "asc" ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />
                        ) : (
                          <IconChevronDown size={14} className="opacity-0 group-hover:opacity-50" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {hasActions && (
                <th className="px-5 py-4 text-xs font-semibold text-[var(--admin-text-subtle)] text-end w-[140px] whitespace-nowrap">الإجراءات</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-border-light)] relative z-0">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} rowIndex={i} cols={visibleColumns.length + (selectable ? 1 : 0) + (hasActions ? 1 : 0)} />)
            ) : (!data || data.length === 0) ? (
              <tr>
                <td colSpan={visibleColumns.length + (selectable ? 1 : 0) + (hasActions ? 1 : 0)} className="py-24">
                  {emptyState ?? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4 text-[var(--admin-text-muted)]">
                      <div className="w-16 h-16 rounded-[var(--admin-radius-xl)] bg-[var(--admin-bg-elevated)] flex items-center justify-center border border-[var(--admin-border-light)] shadow-sm">
                        <IconSettings2 size={28} stroke={1.5} className="text-[var(--admin-text-subtle)]" />
                      </div>
                      <div className="text-center">
                        <p className="text-base font-semibold text-[var(--admin-text-base)]">لا توجد بيانات للعرض</p>
                        <p className="text-sm mt-1">حاول تعديل الفلاتر أو إضافة بيانات جديدة.</p>
                      </div>
                    </motion.div>
                  )}
                </td>
              </tr>
            ) : (
              <AnimatePresence initial={false}>
                {paginated.map((item, rowIdx) => {
                  const isSelected = item.id !== undefined && selectedIds.includes(item.id);
                  return (
                    <motion.tr
                      key={item.id ?? rowIdx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, delay: rowIdx * 0.03, ease: "easeOut" }}
                      className={cn(
                        "bg-[var(--admin-bg-card)] transition-colors hover:bg-[var(--admin-bg-hover)] group",
                        onRowClick && "cursor-pointer",
                        isSelected && "bg-[var(--admin-primary-muted)]"
                      )}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).tagName === 'INPUT') return;
                        onRowClick?.(item);
                      }}
                    >
                      {selectable && (
                        <td className="px-5 py-4 w-12 border-r border-[var(--admin-border-light)]" onClick={e => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={(e) => item.id !== undefined && handleSelectRow(item.id, e.target.checked)}
                            className="w-[18px] h-[18px] rounded-[var(--admin-radius-sm)] border-[var(--admin-border-strong)] text-[var(--admin-primary)] focus:ring-[var(--admin-primary)] cursor-pointer"
                          />
                        </td>
                      )}
                      {visibleColumns.map((col, colIdx) => (
                        <td
                          key={colIdx}
                          className={cn(
                            "px-5 py-4 whitespace-nowrap text-sm font-medium",
                            col.align === "end" ? "text-end" : col.align === "center" ? "text-center" : "text-start"
                          )}
                        >
                          {renderCell(col, item)}
                        </td>
                      ))}
                      {hasActions && (
                        <td className="px-5 py-4 text-end" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            {onEdit && (
                              <Button variant="ghost" size="icon-sm" onClick={() => onEdit(item)} title="تعديل" aria-label="تعديل">
                                <IconEdit size={16} />
                              </Button>
                            )}
                            {onDuplicate && (
                              <Button variant="ghost" size="icon-sm" onClick={() => onDuplicate(item)} title="تكرار" aria-label="تكرار">
                                <IconCopy size={16} />
                              </Button>
                            )}
                            {onArchive && (
                              <Button variant="ghost" size="icon-sm" onClick={() => onArchive(item)} title="أرشفة" aria-label="أرشفة">
                                <IconArchive size={16} />
                              </Button>
                            )}
                            {onDelete && (
                              <Button variant="ghost" size="icon-sm" onClick={() => onDelete(item)} title="حذف" aria-label="حذف" className="text-[var(--admin-danger)] hover:bg-[var(--admin-danger-muted)]">
                                <IconTrash size={16} />
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--admin-border-light)] bg-[var(--admin-bg-surface)]">
          <p className="text-xs font-semibold text-[var(--admin-text-muted)]">
            عرض {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, sorted.length)} من {sorted.length}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-[var(--admin-radius-md)] hover:bg-[var(--admin-bg-hover)] hover:text-[var(--admin-text-base)] disabled:opacity-30 transition-colors text-[var(--admin-text-muted)]"
            >
              <IconChevronRight size={18} />
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={cn(
                  "w-8 h-8 text-sm rounded-[var(--admin-radius-md)] transition-colors font-bold",
                  page === i + 1
                    ? "bg-[var(--admin-primary)] text-white shadow-sm"
                    : "text-[var(--admin-text-muted)] hover:bg-[var(--admin-bg-hover)] hover:text-[var(--admin-text-base)]"
                )}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-[var(--admin-radius-md)] hover:bg-[var(--admin-bg-hover)] hover:text-[var(--admin-text-base)] disabled:opacity-30 transition-colors text-[var(--admin-text-muted)]"
            >
              <IconChevronLeft size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
