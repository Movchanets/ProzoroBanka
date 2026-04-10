import { useState } from 'react';
import { PencilLine, Save, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ReceiptItem } from '@/types';
import type { UpdateReceiptItemRequest } from '@/types';

type ReceiptItemValue = {
  name?: string;
  quantity?: number | string;
  unit_price?: number | string;
  total_price?: number | string;
  barcode?: string;
  vat_rate?: number | string;
  vat_amount?: number | string;
  unitPrice?: number | string;
  totalPrice?: number | string;
  vatRate?: number | string;
  vatAmount?: number | string;
};

interface ReceiptItemsTableProps {
  structuredOutputJson?: string | null;
  items?: ReceiptItem[];
  testIdPrefix: string;
  onUpdateItem?: (itemId: string, payload: UpdateReceiptItemRequest) => Promise<void> | void;
  onDeleteItem?: (itemId: string) => Promise<void> | void;
}

type ReceiptTableItem = ReceiptItemValue & {
  index: number;
  id?: string;
  sortOrder?: number;
  isPersisted?: boolean;
};

function parseNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim();
    if (!normalized) return undefined;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function parseItemValue(raw: unknown): ReceiptItemValue | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const name = typeof item.name === 'string' ? item.name : typeof item.item_name === 'string' ? item.item_name : typeof item.title === 'string' ? item.title : undefined;

  return {
    name,
    quantity: item.quantity as number | string | undefined,
    unit_price: item.unit_price as number | string | undefined,
    total_price: item.total_price as number | string | undefined,
    barcode: typeof item.barcode === 'string' ? item.barcode : undefined,
    vat_rate: item.vat_rate as number | string | undefined,
    vat_amount: item.vat_amount as number | string | undefined,
    unitPrice: item.unitPrice as number | string | undefined,
    totalPrice: item.totalPrice as number | string | undefined,
    vatRate: item.vatRate as number | string | undefined,
    vatAmount: item.vatAmount as number | string | undefined,
  };
}

function parseMoneyInput(value: string) {
  if (!value.trim()) return undefined;

  const normalized = value.replace(/\s+/g, '').replace(',', '.');
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return undefined;

  return Math.round(parsed * 100);
}

function parsePlainNumber(value: string) {
  if (!value.trim()) return undefined;

  const normalized = value.replace(/\s+/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatMoneyInputValue(value?: number) {
  if (typeof value !== 'number') return '';
  return (value / 100).toString();
}

function buildItemDraft(item: {
  name?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  totalPrice?: number | string;
  barcode?: string;
  vatRate?: number | string;
  vatAmount?: number | string;
}) {
  return {
    name: item.name ?? '',
    quantity: item.quantity?.toString() ?? '',
    unitPrice: typeof item.unitPrice === 'number' ? formatMoneyInputValue(item.unitPrice) : item.unitPrice?.toString() ?? '',
    totalPrice: typeof item.totalPrice === 'number' ? formatMoneyInputValue(item.totalPrice) : item.totalPrice?.toString() ?? '',
    barcode: item.barcode ?? '',
    vatRate: item.vatRate?.toString() ?? '',
    vatAmount: typeof item.vatAmount === 'number' ? formatMoneyInputValue(item.vatAmount) : item.vatAmount?.toString() ?? '',
  };
}

function parseReceiptItems(structuredOutputJson?: string | null, persistedItems?: ReceiptItem[]): ReceiptTableItem[] {
  if (persistedItems && persistedItems.length > 0) {
    return persistedItems
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item, index) => ({
        id: item.id,
        sortOrder: item.sortOrder,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        barcode: item.barcode,
        vat_rate: item.vatRate,
        vat_amount: item.vatAmount,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        vatRate: item.vatRate,
        vatAmount: item.vatAmount,
        index,
        isPersisted: true,
      }));
  }

  if (!structuredOutputJson?.trim()) return [];

  try {
    const parsed = JSON.parse(structuredOutputJson) as Record<string, unknown>;
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    return items
      .map(parseItemValue)
      .filter((item): item is ReceiptItemValue => Boolean(item?.name))
      .map((item, index) => ({ ...item, index, isPersisted: false }));
  } catch {
    return [];
  }
}

function formatMoney(value?: number | string, isPersisted = false) {
  const amount = parseNumber(value);
  if (amount === undefined) return '—';
  const displayAmount = isPersisted ? amount / 100 : amount;
  return new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(displayAmount);
}

function formatText(value?: number | string) {
  if (value === undefined || value === null || value === '') return '—';
  return String(value);
}

export function ReceiptItemsTable({
  structuredOutputJson,
  items: persistedItems,
  testIdPrefix,
  onUpdateItem,
  onDeleteItem,
}: ReceiptItemsTableProps) {
  const items = parseReceiptItems(structuredOutputJson, persistedItems);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    name: string;
    quantity: string;
    unitPrice: string;
    totalPrice: string;
    barcode: string;
    vatRate: string;
    vatAmount: string;
  } | null>(null);

  const startEditing = (item: ReceiptTableItem) => {
    if (!item.id) return;

    setEditingItemId(item.id);
    setDraft(buildItemDraft(item));
  };

  const cancelEditing = () => {
    setEditingItemId(null);
    setDraft(null);
  };

  const saveEditing = async (item: ReceiptTableItem) => {
    if (!draft || !onUpdateItem || !item.id) return;

    const name = draft.name.trim();
    if (!name) return;

    setSavingItemId(item.id);
    try {
      await onUpdateItem(item.id, {
        name,
        quantity: parsePlainNumber(draft.quantity),
        unitPrice: parseMoneyInput(draft.unitPrice),
        totalPrice: parseMoneyInput(draft.totalPrice),
        barcode: draft.barcode.trim() || undefined,
        vatRate: parsePlainNumber(draft.vatRate),
        vatAmount: parseMoneyInput(draft.vatAmount),
      });
      cancelEditing();
    } finally {
      setSavingItemId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/10 px-4 py-6 text-sm text-muted-foreground" data-testid={`${testIdPrefix}-empty`}>
        У структурованому OCR JSON ще немає позицій товарів.
      </div>
    );
  }

  const totalItems = items.reduce((sum, item) => {
    const qty = parseNumber(item.quantity) ?? 0;
    return sum + qty;
  }, 0);

  return (
    <div className="space-y-4" data-testid={`${testIdPrefix}-wrapper`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" data-testid={`${testIdPrefix}-count-badge`}>
          {items.length} позицій
        </Badge>
        <Badge variant="secondary" data-testid={`${testIdPrefix}-qty-badge`}>
          {totalItems > 0 ? `Сумарна кількість: ${totalItems}` : 'Кількість не вказано'}
        </Badge>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card" data-testid={`${testIdPrefix}-table-container`}>
        <Table data-testid={`${testIdPrefix}-table`}>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[34%]">Товар</TableHead>
              <TableHead className="w-[10%] text-right">Кількість</TableHead>
              <TableHead className="w-[14%] text-right">Ціна</TableHead>
              <TableHead className="w-[14%] text-right">Сума</TableHead>
              <TableHead className="w-[12%]">Штрихкод</TableHead>
              <TableHead className="w-[8%] text-right">ПДВ</TableHead>
              <TableHead className="w-[8%] text-right">ПДВ сума</TableHead>
              {onUpdateItem || onDeleteItem ? <TableHead className="w-[8%] text-right">Дії</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => {
              const quantity = parseNumber(item.quantity);
              const unitPrice = parseNumber(item.unit_price ?? item.unitPrice);
              const totalPrice = parseNumber(item.total_price ?? item.totalPrice);
              const vatRate = parseNumber(item.vat_rate ?? item.vatRate);
              const vatAmount = parseNumber(item.vat_amount ?? item.vatAmount);
              const isEditable = Boolean(item.id && (onUpdateItem || onDeleteItem));
              const isEditing = editingItemId === item.id;
              const itemId = item.id;
              const isPersisted = Boolean(item.isPersisted);

              return (
                <TableRow key={`${item.name}-${index}`} data-testid={`${testIdPrefix}-row-${index}`}>
                  <TableCell className="align-top font-medium text-foreground">
                    {isEditing && draft ? (
                      <Input
                        value={draft.name}
                        onChange={(event) => setDraft((current) => (current ? { ...current, name: event.target.value } : current))}
                        data-testid={`${testIdPrefix}-edit-name-${index}`}
                      />
                    ) : (
                      <div className="space-y-1">
                        <div data-testid={`${testIdPrefix}-item-name-${index}`}>{item.name}</div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-right tabular-nums" data-testid={`${testIdPrefix}-item-quantity-${index}`}>
                    {isEditing && draft ? (
                      <Input
                        value={draft.quantity}
                        onChange={(event) => setDraft((current) => (current ? { ...current, quantity: event.target.value } : current))}
                        className="text-right"
                        data-testid={`${testIdPrefix}-edit-quantity-${index}`}
                      />
                    ) : (
                      formatText(quantity ?? item.quantity)
                    )}
                  </TableCell>
                  <TableCell className="align-top text-right tabular-nums" data-testid={`${testIdPrefix}-item-unit-price-${index}`}>
                    {isEditing && draft ? (
                      <Input
                        value={draft.unitPrice}
                        onChange={(event) => setDraft((current) => (current ? { ...current, unitPrice: event.target.value } : current))}
                        className="text-right"
                        data-testid={`${testIdPrefix}-edit-unit-price-${index}`}
                      />
                    ) : (
                      formatMoney(unitPrice ?? item.unit_price, isPersisted)
                    )}
                  </TableCell>
                  <TableCell className="align-top text-right tabular-nums font-medium" data-testid={`${testIdPrefix}-item-total-price-${index}`}>
                    {isEditing && draft ? (
                      <Input
                        value={draft.totalPrice}
                        onChange={(event) => setDraft((current) => (current ? { ...current, totalPrice: event.target.value } : current))}
                        className="text-right"
                        data-testid={`${testIdPrefix}-edit-total-price-${index}`}
                      />
                    ) : (
                      formatMoney(totalPrice ?? item.total_price, isPersisted)
                    )}
                  </TableCell>
                  <TableCell className="align-top text-sm text-muted-foreground" data-testid={`${testIdPrefix}-item-barcode-${index}`}>
                    {isEditing && draft ? (
                      <Input
                        value={draft.barcode}
                        onChange={(event) => setDraft((current) => (current ? { ...current, barcode: event.target.value } : current))}
                        data-testid={`${testIdPrefix}-edit-barcode-${index}`}
                      />
                    ) : (
                      item.barcode || '—'
                    )}
                  </TableCell>
                  <TableCell className="align-top text-right tabular-nums" data-testid={`${testIdPrefix}-item-vat-rate-${index}`}>
                    {isEditing && draft ? (
                      <Input
                        value={draft.vatRate}
                        onChange={(event) => setDraft((current) => (current ? { ...current, vatRate: event.target.value } : current))}
                        className="text-right"
                        data-testid={`${testIdPrefix}-edit-vat-rate-${index}`}
                      />
                    ) : (
                      vatRate === undefined ? '—' : `${new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 }).format(vatRate)}%`
                    )}
                  </TableCell>
                  <TableCell className="align-top text-right tabular-nums" data-testid={`${testIdPrefix}-item-vat-amount-${index}`}>
                    {isEditing && draft ? (
                      <Input
                        value={draft.vatAmount}
                        onChange={(event) => setDraft((current) => (current ? { ...current, vatAmount: event.target.value } : current))}
                        className="text-right"
                        data-testid={`${testIdPrefix}-edit-vat-amount-${index}`}
                      />
                    ) : (
                      formatMoney(vatAmount ?? item.vat_amount, isPersisted)
                    )}
                  </TableCell>
                  <TableCell className="align-top text-right">
                    {isEditable ? (
                      <div className="flex justify-end gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void saveEditing(item)}
                              disabled={savingItemId === item.id}
                              data-testid={`${testIdPrefix}-save-button-${index}`}
                            >
                              {savingItemId === item.id ? <Save className="h-4 w-4 animate-pulse" /> : <Save className="h-4 w-4" />}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={cancelEditing}
                              disabled={savingItemId === item.id}
                              data-testid={`${testIdPrefix}-cancel-button-${index}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            {onUpdateItem ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => startEditing(item)}
                                data-testid={`${testIdPrefix}-edit-button-${index}`}
                              >
                                <PencilLine className="h-4 w-4" />
                              </Button>
                            ) : null}
                            {onDeleteItem && itemId ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => void onDeleteItem(itemId)}
                                data-testid={`${testIdPrefix}-delete-button-${index}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            ) : null}
                          </>
                        )}
                      </div>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
