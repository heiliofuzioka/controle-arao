import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { BigButton } from '../../components/buttons';
import { Stepper } from '../../components/fields';
import { Notice } from '../../components/Notice';
import { ProductPicker } from '../../components/ProductPicker';
import { Sheet } from '../../components/Sheet';
import { db } from '../../db/db';
import {
  ButcherBlockedError,
  deleteSettlement,
  loadActiveProducts,
  loadStockData,
  saveSettlement,
} from '../../db/operations';
import { toLocalDate } from '../../domain/dates';
import { computeSettlement } from '../../domain/settlement';
import { consignmentStock, stockBeforeSettlement } from '../../domain/stock';
import type { Cents, ID, Settlement } from '../../domain/types';
import { formatCents, formatCentsPlain, parseCentsInput } from '../../lib/money';
import styles from './butcherSheets.module.css';

interface Props {
  /** Acerto a editar (o produto não muda). Sem isso, é um acerto novo (hoje). */
  settlement?: Settlement;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** Folha "Acerto do Açougue": quanto sobrou e estragou; o resto foi vendido. */
export function SettlementSheet({ settlement, onClose, onSaved }: Props) {
  const data = useLiveQuery(async () => {
    const [products, stock] = await Promise.all([loadActiveProducts(db), loadStockData(db)]);
    // Produto inativo de um acerto antigo continua aparecendo na edição.
    if (settlement && !products.some((p) => p.id === settlement.productId)) {
      const old = await db.products.get(settlement.productId);
      if (old) products.push(old);
    }
    return { products, stock };
  }, []);
  const [productId, setProductId] = useState<ID | null>(settlement?.productId ?? null);
  const [remaining, setRemaining] = useState(settlement?.remaining ?? 0);
  const [loss, setLoss] = useState(settlement?.loss ?? 0);
  const [manualValue, setManualValue] = useState<Cents | null>(settlement?.valueCents ?? null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const product = data?.products.find((p) => p.id === productId);
  const stockBefore = !data || !productId
    ? 0
    : settlement
      ? stockBeforeSettlement(data.stock, settlement)
      : consignmentStock(data.stock, productId);
  const result = product
    ? computeSettlement({ stockBefore, remaining, loss, priceCents: product.priceCents })
    : null;
  const hasPrice = (product?.priceCents ?? 0) > 0;
  const sold = result?.ok ? result.soldQuantity : 0;
  const valueCents = !result?.ok ? 0 : hasPrice ? result.valueCents : sold > 0 ? (manualValue ?? 0) : 0;
  const needsValue = result?.ok === true && sold > 0 && valueCents === 0;
  const canSave = !!product && result?.ok === true && !needsValue && !busy;

  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setSaveError(null);
    try {
      await action();
      onSaved(message);
    } catch (e) {
      setSaveError(e instanceof ButcherBlockedError ? e.message : 'Não deu para salvar. Tente de novo.');
      setBusy(false);
    }
  };

  const save = () => {
    if (!canSave || !product) return;
    void run(
      () =>
        saveSettlement(db, {
          id: settlement?.id,
          date: settlement?.date ?? toLocalDate(new Date()),
          productId: product.id,
          remaining,
          loss,
          manualValueCents: hasPrice ? undefined : valueCents,
        }),
      valueCents > 0 ? `Acerto salvo · ${formatCents(valueCents)} a receber` : 'Acerto salvo',
    );
  };

  const detail = !product
    ? ''
    : sold === 0
      ? 'Nada vendido · não fica nada a receber'
      : hasPrice
        ? `${sold} × ${formatCents(product.priceCents)} · fica como “a receber”`
        : needsValue
          ? 'Sem preço · toque no valor para digitar'
          : 'Valor digitado · fica como “a receber”';

  return (
    <Sheet
      title="Acerto do Açougue"
      onClose={onClose}
      footer={
        <>
          {saveError && <Notice kind="error">{saveError}</Notice>}
          {settlement && confirmDelete && (
            <BigButton
              variant="danger"
              disabled={busy}
              onClick={() => void run(() => deleteSettlement(db, settlement.id), 'Acerto apagado')}
            >
              Apagar mesmo
            </BigButton>
          )}
          {settlement && !confirmDelete && (
            <BigButton variant="secondary" disabled={busy} onClick={() => setConfirmDelete(true)}>
              Apagar acerto
            </BigButton>
          )}
          <BigButton onClick={save} disabled={!canSave}>
            {product ? 'Salvar acerto' : 'Escolha o produto'}
          </BigButton>
        </>
      }
    >
      {data && (
        <ProductPicker
          products={data.products}
          selectedId={productId}
          disabled={!!settlement}
          onSelect={(id) => {
            setProductId(id);
            setManualValue(null);
            setSaveError(null);
          }}
        />
      )}

      <div className={styles.pair}>
        <Stepper large label="Sobraram" value={remaining} invalid={result?.ok === false} onChange={setRemaining} />
        <Stepper large label="Estragaram" value={loss} invalid={result?.ok === false && loss > 0} onChange={setLoss} />
      </div>

      {product && result && !result.ok && <Notice kind="error">{result.error}</Notice>}

      {product && result?.ok && (
        <section className={`${styles.summary} ${styles.summaryAction}`}>
          <p className={styles.summaryLabel}>
            Vendidos: {sold} de {stockBefore}
          </p>
          {!hasPrice && sold > 0 ? (
            <ValueInput valueCents={valueCents} onChange={setManualValue} />
          ) : (
            <p className={styles.bigValue}>{formatCents(valueCents)}</p>
          )}
          <p className={styles.summaryLabel}>{detail}</p>
        </section>
      )}
    </Sheet>
  );
}

/** Valor do acerto quando o produto não tem preço: tocar no número deixa digitar. */
function ValueInput({ valueCents, onChange }: { valueCents: Cents; onChange: (value: Cents | null) => void }) {
  const [text, setText] = useState<string | null>(null);

  if (text === null) {
    return (
      <button
        type="button"
        className={styles.bigValueButton}
        aria-label={`Valor do acerto: ${formatCents(valueCents)}. Toque para digitar.`}
        onClick={() => setText(valueCents > 0 ? formatCentsPlain(valueCents) : '')}
      >
        {formatCents(valueCents)}
      </button>
    );
  }

  return (
    <label className={styles.bigValueEdit}>
      <span className={styles.currency}>R$</span>
      <input
        className={styles.bigValueInput}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        aria-label="Valor do acerto"
        autoFocus
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(parseCentsInput(e.target.value));
        }}
        onBlur={() => setText(null)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
    </label>
  );
}
