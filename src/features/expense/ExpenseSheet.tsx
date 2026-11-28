import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { BigButton, ChoiceButton } from '../../components/buttons';
import { DateLine, ErrorLine, MoneyField, TextField } from '../../components/fields';
import { Notice } from '../../components/Notice';
import { Sheet } from '../../components/Sheet';
import { db } from '../../db/db';
import { deleteExpense, saveExpense } from '../../db/operations';
import { toLocalDate } from '../../domain/dates';
import { alive, byCreation } from '../../domain/records';
import type { Cents, Expense, ID, LocalDate } from '../../domain/types';
import { formatCents } from '../../lib/money';
import styles from './ExpenseSheet.module.css';

interface Props {
  /** Despesa a editar. Sem isso, é uma despesa nova. */
  expense?: Expense;
  /** Data inicial de uma despesa nova (hoje, se não vier). */
  defaultDate?: LocalDate;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** Folha "Despesa": valor, data, categoria em botões e descrição curta. */
export function ExpenseSheet({ expense, defaultDate, onClose, onSaved }: Props) {
  const today = toLocalDate(new Date());
  const categories = useLiveQuery(async () => byCreation(alive(await db.expenseCategories.toArray())), []);

  const [valueCents, setValueCents] = useState<Cents | null>(expense?.valueCents ?? null);
  const [date, setDate] = useState(expense?.date ?? defaultDate ?? today);
  const [categoryId, setCategoryId] = useState<ID | null>(expense?.categoryId ?? null);
  const [description, setDescription] = useState(expense?.description ?? '');
  const [tried, setTried] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const valueOk = valueCents !== null && valueCents > 0;
  const categoryOk = categoryId !== null;

  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    setFailed(false);
    try {
      await action();
      onSaved(message);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  const save = () => {
    setTried(true);
    if (!valueOk || !categoryOk || busy) return;
    void run(
      () => saveExpense(db, { id: expense?.id, date, valueCents, categoryId, description }),
      'Despesa salva',
    );
  };

  return (
    <Sheet
      title="Despesa"
      onClose={onClose}
      footer={
        <>
          {failed && <Notice kind="error">Não deu para salvar. Tente de novo.</Notice>}
          {expense && confirmDelete && (
            <BigButton
              variant="danger"
              disabled={busy}
              onClick={() => void run(() => deleteExpense(db, expense.id), 'Despesa apagada')}
            >
              Apagar mesmo
            </BigButton>
          )}
          {expense && !confirmDelete && (
            <BigButton variant="secondary" disabled={busy} onClick={() => setConfirmDelete(true)}>
              Apagar despesa
            </BigButton>
          )}
          <BigButton onClick={save} disabled={busy}>
            {valueOk ? `Salvar despesa ${formatCents(valueCents)}` : 'Salvar despesa'}
          </BigButton>
        </>
      }
    >
      <MoneyField
        label="Valor"
        valueCents={valueCents}
        onChange={setValueCents}
        autoFocus={!expense}
        error={tried && !valueOk ? 'Coloque um valor maior que zero' : undefined}
        hint={<DateLine date={date} today={today} onChange={setDate} />}
      />

      <div className={styles.group} role="group" aria-label="Categoria">
        <p className={styles.label}>Categoria</p>
        <div className={styles.categories}>
          {categories?.map((category) => (
            <ChoiceButton
              key={category.id}
              selected={category.id === categoryId}
              onClick={() => setCategoryId(category.id)}
            >
              {category.name}
            </ChoiceButton>
          ))}
        </div>
        {tried && !categoryOk && <ErrorLine>Escolha a categoria</ErrorLine>}
      </div>

      <TextField
        label="O que foi? (opcional)"
        placeholder="Mercado do dia"
        value={description}
        onChange={setDescription}
      />
    </Sheet>
  );
}
