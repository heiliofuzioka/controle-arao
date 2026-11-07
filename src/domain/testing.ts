// Construtores de dados para os testes do domínio. Não usar no app.
import type { StockData } from './stock';
import type { Delivery, Production, Sale, Settlement, StockAdjustment } from './types';

let seq = 0;
const nextId = () => `id-${++seq}`;

export const P = 'gelinho';
export const OTHER = 'brownie';
export const SCHOOL = 'escola';
export const BUTCHER = 'acougue';

export const production = (o: Partial<Production> = {}): Production => ({
  id: nextId(),
  date: '2026-11-02',
  productId: P,
  quantity: 0,
  loss: 0,
  createdAt: '',
  ...o,
});

export const sale = (o: Partial<Sale> = {}): Sale => ({
  id: nextId(),
  date: '2026-11-02',
  pointId: SCHOOL,
  productId: P,
  quantity: 0,
  valueCents: 0,
  origin: 'direct',
  createdAt: '',
  ...o,
});

export const delivery = (o: Partial<Delivery> = {}): Delivery => ({
  id: nextId(),
  date: '2026-11-02',
  pointId: BUTCHER,
  productId: P,
  quantity: 0,
  createdAt: '',
  ...o,
});

export const settlement = (o: Partial<Settlement> = {}): Settlement => ({
  id: nextId(),
  date: '2026-11-02',
  pointId: BUTCHER,
  productId: P,
  remaining: 0,
  loss: 0,
  soldQuantity: 0,
  valueCents: 0,
  paid: false,
  createdAt: '',
  ...o,
});

export const adjustment = (o: Partial<StockAdjustment> = {}): StockAdjustment => ({
  id: nextId(),
  date: '2026-11-02',
  productId: P,
  location: 'home',
  delta: 0,
  reason: 'correction',
  ...o,
});

export const stockData = (o: Partial<StockData> = {}): StockData => ({
  productions: [],
  sales: [],
  deliveries: [],
  settlements: [],
  adjustments: [],
  ...o,
});
