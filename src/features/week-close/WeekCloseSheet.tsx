import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { BigButton } from '../../components/buttons';
import { ProductBadge } from '../../components/EntryList';
import { ErrorLine, Stepper } from '../../components/fields';
import { Icon } from '../../components/Icon';
import { Notice } from '../../components/Notice';
import { Sheet } from '../../components/Sheet';
import { db } from '../../db/db';
import {
  WeekCloseBlockedError,
  deleteWeekClose,
  loadActiveProducts,
  loadStockData,
  saveWeekClose,
} from '../../db/operations';
import { shiftDays, toLocalDate, weekStartOf } from '../../domain/dates';
import type { StockData } from '../../domain/stock';
import type { Cents, ID, LocalDate, Product } from '../../domain/types';
import {
  checkWeekClose,
  defaultWeekCloseValue,
  findWeekClose,
  isWeekClosed,
  weekCloseTotals,
  type WeekCloseCheck,
} from '../../domain/weekClose';
import { formatWeekLabel } from '../../lib/format';
import { formatCents, formatCentsPlain, parseCentsInput } from '../../lib/money';
import styles from './WeekCloseSheet.module.css';

interface CardState {
  produced: number;
  soldDirect: number;
  loss: number;
  /** Valor digitado à mão (desconto). null = vendidos × preço. */
  manualValueCents: Cents | null;
}

interface FormState {
  weekStart: LocalDate;
  cards: Record<ID, CardState>;
}

interface Loaded {
  products: Product[];
  stock: StockData;
}

async function loadData(): Promise<Loaded> {
  const [products, stock] = await Promise.all([loadActiveProducts(db), loadStockData(db)]);
  return { products, stock };
}

/** Começa com o que já foi salvo para a semana, ou com tudo em zero. */
function buildForm(data: Loaded, weekStart: LocalDate): FormState {
  const cards: Record<ID, CardState> = {};
  for (const product of data.products) {
    const saved = findWeekClose(data.stock.weekCloses, weekStart, product.id);
    if (!saved) {
      cards[product.id] = { produced: 0, soldDirect: 0, loss: 0, manualValueCents: null };
      continue;
    }
    const expected = defaultWeekCloseValue(saved.soldDirect, product.priceCents);
    cards[product.id] = {
      produced: saved.produced,
      soldDirect: saved.soldDirect,
      loss: saved.loss,
      manualValueCents: saved.valueCents === expected ? null : saved.valueCents,
    };
  }
  return { weekStart, cards };
}

const cardValue = (card: CardState, product: Product): Cents =>
  card.manualValueCents ?? defaultWeekCloseValue(card.soldDirect, product.priceCents);

interface Props {
  /** Segunda-feira da semana a abrir. Sem isso, abre a semana atual. */
  initialWeekStart?: LocalDate;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** Folha "Fechar a semana": um card por produto. */
export function WeekCloseSheet({ initialWeekStart, onClose, onSaved }: Props) {
  const currentWeek = weekStartOf(toLocalDate(new Date()));
  const [weekStart, setWeekStart] = useState(initialWeekStart ?? currentWeek);
  const data = useLiveQuery(loadData, []);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Monta o formulário quando os dados chegam e toda vez que a semana muda.
  if (data && (form === null || form.weekStart !== weekStart)) {
    setForm(buildForm(data, weekStart));
  }

  const ready = data !== undefined && form !== null && form.weekStart === weekStart;

  const rows = ready
    ? data.products.flatMap((product) => {
        const card = form.cards[product.id];
        if (!card) return [];
        const existing = findWeekClose(data.stock.weekCloses, weekStart, product.id);
        const check = checkWeekClose(data.stock, { weekStart, productId: product.id, ...card }, existing?.id);
        return [{ product, card, check, valueCents: cardValue(card, product) }];
      })
    : [];

  const totals = weekCloseTotals(rows.map((r) => ({ ...r.card, valueCents: r.valueCents })));
  const blocked = rows.some((r) => !r.check.ok);
  const missingPrice = rows.some((r) => r.product.priceCents === 0);

  const updateCard = (product: Product, changes: Partial<CardState>) => {
    setSaveError(null);
    setForm((current) => {
      if (!current) return current;
      const previous = current.cards[product.id];
      if (!previous) return current;
      const next = { ...previous, ...changes };
      // Mudou a quantidade vendida: o valor volta a ser vendidos × preço
      // (sem preço cadastrado, o valor digitado fica).
      if (changes.soldDirect !== undefined && changes.soldDirect !== previous.soldDirect && product.priceCents > 0) {
        next.manualValueCents = null;
      }
      return { ...current, cards: { ...current.cards, [product.id]: next } };
    });
  };

  const save = async () => {
    if (!ready || blocked || saving) return;
    setSaving(true);
    try {
      await saveWeekClose(
        db,
        weekStart,
        rows.map((r) => ({ productId: r.product.id, ...r.card, valueCents: r.valueCents })),
      );
      onSaved('Semana salva');
    } catch (error) {
      setSaveError(
        error instanceof WeekCloseBlockedError ? error.message : 'Não deu para salvar. Tente de novo.',
      );
      setSaving(false);
    }
  };

  // A semana já foi fechada antes: dá para apagar o fechamento inteiro.
  const closed = ready && isWeekClosed(data.stock.weekCloses, weekStart);

  const remove = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await deleteWeekClose(db, weekStart);
      onSaved('Semana apagada');
    } catch {
      setSaveError('Não deu para apagar. Tente de novo.');
      setSaving(false);
    }
  };

  return (
    <Sheet
      title="Fechar a semana"
      onClose={onClose}
      footer={
        <>
          {closed && confirmDelete && (
            <BigButton variant="danger" disabled={saving} onClick={() => void remove()}>
              Apagar mesmo
            </BigButton>
          )}
          {closed && !confirmDelete && (
            <BigButton variant="secondary" disabled={saving} onClick={() => setConfirmDelete(true)}>
              Apagar semana
            </BigButton>
          )}
          <BigButton onClick={save} disabled={!ready || blocked || saving}>
            {totals.valueCents > 0 && !blocked
              ? `Salvar semana · ${formatCents(totals.valueCents)}`
              : 'Salvar semana'}
          </BigButton>
        </>
      }
    >
      <div className={styles.weekPicker}>
        <button
          type="button"
          className={styles.weekButton}
          aria-label="Semana anterior"
          onClick={() => {
            setWeekStart(shiftDays(weekStart, -7));
            setConfirmDelete(false);
          }}
        >
          <Icon name="chevronLeft" size={22} />
        </button>
        <p className={styles.weekLabel} aria-live="polite">
          {formatWeekLabel(weekStart)}
        </p>
        <button
          type="button"
          className={styles.weekButton}
          aria-label="Próxima semana"
          disabled={weekStart >= currentWeek}
          onClick={() => {
            setWeekStart(shiftDays(weekStart, 7));
            setConfirmDelete(false);
          }}
        >
          <Icon name="chevronRight" size={22} />
        </button>
      </div>

      {ready && missingPrice && <Notice>Coloque os preços para o faturamento sair sozinho</Notice>}

      {rows.map(({ product, card, check, valueCents }) => (
        <ProductCard
          key={product.id}
          product={product}
          card={card}
          check={check}
          valueCents={valueCents}
          onChange={(changes) => updateCard(product, changes)}
        />
      ))}

      {ready && (
        <>
          <section className={styles.total}>
            <p className={styles.totalLabel}>Vendido na semana</p>
            <p className={styles.totalValue}>{formatCents(totals.valueCents)}</p>
            <p className={styles.totalLabel}>
              Produziu {totals.produced} · vendeu {totals.soldDirect} · perdeu {totals.loss}
            </p>
          </section>
          <p className={styles.footnote}>As vendas do Açougue entram pelo acerto, na aba Açougue.</p>
        </>
      )}

      {saveError && <Notice kind="error">{saveError}</Notice>}
    </Sheet>
  );
}

function ProductCard({
  product,
  card,
  check,
  valueCents,
  onChange,
}: {
  product: Product;
  card: CardState;
  check: WeekCloseCheck;
  valueCents: Cents;
  onChange: (changes: Partial<CardState>) => void;
}) {
  const oversold = !check.ok && check.explanation !== undefined;

  const note = oversold
    ? check.explanation
    : check.delivered > 0
      ? `Levou ${check.delivered} ao Açougue · em estoque: ${check.leftover}`
      : `Em estoque: ${check.leftover}`;

  return (
    <section className={`${styles.card} ${check.ok ? '' : styles.cardInvalid}`} aria-label={product.name}>
      <div className={styles.cardHeader}>
        <ProductBadge code={product.code} />
        <div className={styles.cardName}>
          <p className={styles.name}>{product.name}</p>
          <p className={styles.price}>
            {product.priceCents > 0 ? `${formatCents(product.priceCents)} cada` : 'Sem preço'}
          </p>
        </div>
        <ValueButton
          valueCents={valueCents}
          onChange={(value) => {
            const expected = defaultWeekCloseValue(card.soldDirect, product.priceCents);
            onChange({ manualValueCents: value === expected ? null : value });
          }}
        />
      </div>

      <div className={styles.pair}>
        <Stepper label="Produziu" value={card.produced} onChange={(produced) => onChange({ produced })} />
        <Stepper
          label="Vendeu"
          value={card.soldDirect}
          invalid={oversold}
          onChange={(soldDirect) => onChange({ soldDirect })}
        />
      </div>

      <div className={styles.lossRow}>
        <Stepper label="Perdeu" compact value={card.loss} onChange={(loss) => onChange({ loss })} />
        <p className={styles.note}>{note}</p>
      </div>

      {!check.ok && check.error && <ErrorLine>{check.error}</ErrorLine>}
    </section>
  );
}

/** "Vendido R$ 180,00": tocar no valor deixa digitar outro (desconto). */
function ValueButton({ valueCents, onChange }: { valueCents: Cents; onChange: (valueCents: Cents) => void }) {
  const [text, setText] = useState<string | null>(null);

  const commit = () => {
    const parsed = text === null ? null : parseCentsInput(text);
    if (parsed !== null) onChange(parsed);
    setText(null);
  };

  if (text === null) {
    return (
      <button
        type="button"
        className={styles.value}
        aria-label={`Vendido: ${formatCents(valueCents)}. Toque para mudar o valor.`}
        onClick={() => setText(formatCentsPlain(valueCents))}
      >
        <span className={styles.valueLabel}>Vendido</span>
        <span className={styles.valueNumber}>{formatCents(valueCents)}</span>
      </button>
    );
  }

  return (
    <label className={styles.value}>
      <span className={styles.valueLabel}>Vendido</span>
      <input
        className={styles.valueInput}
        inputMode="decimal"
        autoComplete="off"
        autoFocus
        value={text}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    </label>
  );
}
