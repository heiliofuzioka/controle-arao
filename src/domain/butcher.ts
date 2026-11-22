import { alive } from './records';
import { receivableCents } from './settlement';
import { consignmentStock, lastDeliveryDate, type StockData } from './stock';
import type { Cents, ID, LocalDate, Product, Settlement } from './types';

export interface ButcherStockRow {
  product: Product;
  /** Quanto está no Açougue agora. */
  quantity: number;
  /** Data da última entrega ("Entregue 07/11"); undefined = "Nada entregue". */
  lastDelivery?: LocalDate;
}

export interface ButcherSummary {
  receivableCents: Cents;
  /** Acertos esperando pagamento, do mais antigo para o mais novo. */
  pending: Settlement[];
  stock: ButcherStockRow[];
  /** Já houve alguma entrega? (sem nenhuma, a tela mostra a explicação) */
  hasDeliveries: boolean;
}

/** Tudo que a tela do Açougue mostra. */
export function butcherSummary(data: StockData, products: Product[], pointId: ID): ButcherSummary {
  const settlements = alive(data.settlements).filter((s) => s.pointId === pointId);
  const deliveries = alive(data.deliveries).filter((d) => d.pointId === pointId);
  return {
    receivableCents: receivableCents(settlements),
    pending: settlements
      .filter((s) => !s.paid)
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)),
    stock: products.map((product) => ({
      product,
      quantity: consignmentStock(data, product.id, { pointId }),
      lastDelivery: lastDeliveryDate(deliveries, product.id, pointId),
    })),
    hasDeliveries: deliveries.length > 0,
  };
}
