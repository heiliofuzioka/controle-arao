import { useState } from 'react';
import { BigButton } from '../../components/buttons';
import { DateLine, MoneyField, TextField } from '../../components/fields';
import { Notice } from '../../components/Notice';
import { Sheet } from '../../components/Sheet';
import { db } from '../../db/db';
import { deletePersonalExpense, savePersonalExpense } from '../../db/operations';
import { toLocalDate } from '../../domain/dates';
import type { Cents, LocalDate, PersonalExpense } from '../../domain/types';
import { formatCents } from '../../lib/money';

interface Props {
  /** Gasto a editar. Sem isso, é um gasto novo. */
  personalExpense?: PersonalExpense;
  /** Data inicial de um gasto novo (hoje, se não vier). */
  defaultDate?: LocalDate;
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** Folha "Gasto pessoal": fluxo separado das despesas do negócio. */
export function PersonalExpenseSheet({ personalExpense, defaultDate, onClose, onSaved }: Props) {
  const today = toLocalDate(new Date());
  const [valueCents, setValueCents] = useState<Cents | null>(personalExpense?.valueCents ?? null);
  const [date, setDate] = useState(personalExpense?.date ?? defaultDate ?? today);
  const [description, setDescription] = useState(personalExpense?.description ?? '');
  const [tried, setTried] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const valueOk = valueCents !== null && valueCents > 0;

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
    if (!valueOk || busy) return;
    void run(
      () => savePersonalExpense(db, { id: personalExpense?.id, date, valueCents, description }),
      'Gasto salvo',
    );
  };

  return (
    <Sheet
      title="Gasto pessoal"
      size="auto"
      onClose={onClose}
      footer={
        <>
          {failed && <Notice kind="error">Não deu para salvar. Tente de novo.</Notice>}
          {personalExpense && confirmDelete && (
            <BigButton
              variant="danger"
              disabled={busy}
              onClick={() => void run(() => deletePersonalExpense(db, personalExpense.id), 'Gasto apagado')}
            >
              Apagar mesmo
            </BigButton>
          )}
          {personalExpense && !confirmDelete && (
            <BigButton variant="secondary" disabled={busy} onClick={() => setConfirmDelete(true)}>
              Apagar gasto
            </BigButton>
          )}
          <BigButton onClick={save} disabled={busy}>
            {valueOk ? `Salvar gasto ${formatCents(valueCents)}` : 'Salvar gasto'}
          </BigButton>
        </>
      }
    >
      <Notice>Gasto pessoal não mexe no lucro, só no que sobra</Notice>
      <MoneyField
        label="Valor"
        valueCents={valueCents}
        onChange={setValueCents}
        autoFocus={!personalExpense}
        error={tried && !valueOk ? 'Coloque um valor maior que zero' : undefined}
        hint={<DateLine date={date} today={today} onChange={setDate} />}
      />
      <TextField label="O que foi? (opcional)" placeholder="Lanche" value={description} onChange={setDescription} />
    </Sheet>
  );
}
