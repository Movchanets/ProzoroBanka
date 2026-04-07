import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
  testIdPrefix: string;
}

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

function parseReceiptItems(structuredOutputJson?: string | null) {
  if (!structuredOutputJson?.trim()) return [] as Array<ReceiptItemValue & { index: number }>;

  try {
    const parsed = JSON.parse(structuredOutputJson) as Record<string, unknown>;
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    return items
      .map(parseItemValue)
      .filter((item): item is ReceiptItemValue => Boolean(item?.name))
      .map((item, index) => ({ ...item, index }));
  } catch {
    return [] as Array<ReceiptItemValue & { index: number }>;
  }
}

function formatMoney(value?: number | string) {
  const amount = parseNumber(value);
  if (amount === undefined) return '—';
  return new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
}

function formatText(value?: number | string) {
  if (value === undefined || value === null || value === '') return '—';
  return String(value);
}

export function ReceiptItemsTable({ structuredOutputJson, testIdPrefix }: ReceiptItemsTableProps) {
  const items = parseReceiptItems(structuredOutputJson);

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
          {totalItems > 0 ? `${totalItems} шт.` : 'Кількість не вказано'}
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => {
              const quantity = parseNumber(item.quantity);
              const unitPrice = parseNumber(item.unit_price ?? item.unitPrice);
              const totalPrice = parseNumber(item.total_price ?? item.totalPrice);
              const vatRate = parseNumber(item.vat_rate ?? item.vatRate);
              const vatAmount = parseNumber(item.vat_amount ?? item.vatAmount);

              return (
                <TableRow key={`${item.name}-${index}`} data-testid={`${testIdPrefix}-row-${index}`}>
                  <TableCell className="align-top font-medium text-foreground">
                    <div className="space-y-1">
                      <div data-testid={`${testIdPrefix}-item-name-${index}`}>{item.name}</div>
                    </div>
                  </TableCell>
                  <TableCell className="align-top text-right tabular-nums" data-testid={`${testIdPrefix}-item-quantity-${index}`}>
                    {formatText(quantity ?? item.quantity)}
                  </TableCell>
                  <TableCell className="align-top text-right tabular-nums" data-testid={`${testIdPrefix}-item-unit-price-${index}`}>
                    {formatMoney(unitPrice ?? item.unit_price)}
                  </TableCell>
                  <TableCell className="align-top text-right tabular-nums font-medium" data-testid={`${testIdPrefix}-item-total-price-${index}`}>
                    {formatMoney(totalPrice ?? item.total_price)}
                  </TableCell>
                  <TableCell className="align-top text-sm text-muted-foreground" data-testid={`${testIdPrefix}-item-barcode-${index}`}>
                    {item.barcode || '—'}
                  </TableCell>
                  <TableCell className="align-top text-right tabular-nums" data-testid={`${testIdPrefix}-item-vat-rate-${index}`}>
                    {vatRate === undefined ? '—' : `${new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 }).format(vatRate)}%`}
                  </TableCell>
                  <TableCell className="align-top text-right tabular-nums" data-testid={`${testIdPrefix}-item-vat-amount-${index}`}>
                    {formatMoney(vatAmount ?? item.vat_amount)}
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
