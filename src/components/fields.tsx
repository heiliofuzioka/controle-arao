import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { Cents, LocalDate } from '../domain/types';
import { formatDayLabel } from '../lib/format';
import { formatCentsPlain, parseCentsInput } from '../lib/money';
import { Icon } from './Icon';
import styles from './fields.module.css';

/** Linha vermelha com o ícone de alerta, embaixo de um campo ou card. */
export function ErrorLine({ children }: { children: ReactNode }) {
  return (
    <p className={styles.errorLine} role="alert">
      <Icon name="alert" size={18} />
      <span>{children}</span>
    </p>
  );
}

interface MoneyFieldProps {
  label: string;
  /** null = vazio ou inválido. */
  valueCents: Cents | null;
  onChange: (valueCents: Cents | null) => void;
  error?: string;
  hint?: ReactNode;
  autoFocus?: boolean;
}

/** Campo de valor: "R$" + número grande. O Arão digita "42" ou "42,50". */
export function MoneyField({ label, valueCents, onChange, error, hint, autoFocus }: MoneyFieldProps) {
  const id = useId();
  const [text, setText] = useState(valueCents === null ? '' : formatCentsPlain(valueCents));
  const focused = useRef(false);

  // Valor mudou por fora (ex.: abriu outro lançamento): atualiza o texto, menos enquanto ele digita.
  useEffect(() => {
    if (!focused.current) setText(valueCents === null ? '' : formatCentsPlain(valueCents));
  }, [valueCents]);

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={`${styles.moneyBox} ${error ? styles.invalid : ''}`}>
        <span className={styles.currency}>R$</span>
        <input
          id={id}
          className={styles.moneyInput}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          value={text}
          onFocus={(e) => {
            focused.current = true;
            e.currentTarget.select();
          }}
          onChange={(e) => {
            setText(e.target.value);
            onChange(parseCentsInput(e.target.value));
          }}
          onBlur={() => {
            focused.current = false;
            const parsed = parseCentsInput(text);
            if (parsed !== null) setText(formatCentsPlain(parsed));
          }}
        />
      </div>
      {error && <ErrorLine>{error}</ErrorLine>}
      {hint}
    </div>
  );
}

/** Campo de texto curto (ex.: "O que foi?"). */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        className={styles.textInput}
        type="text"
        autoComplete="off"
        enterKeyHint="done"
        maxLength={80}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/** "Hoje, 8 de nov · toque para mudar a data": abre o calendário do iPhone. */
export function DateLine({
  date,
  today,
  onChange,
}: {
  date: LocalDate;
  today: LocalDate;
  onChange: (date: LocalDate) => void;
}) {
  return (
    <label className={styles.dateLine}>
      <span>{formatDayLabel(date, today)} · toque para mudar a data</span>
      <input
        className={styles.dateInput}
        type="date"
        aria-label="Data"
        value={date}
        max={today}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
        }}
      />
    </label>
  );
}

interface StepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  invalid?: boolean;
  /** Versão estreita (Perdeu). */
  compact?: boolean;
  /** Contador grande, em card branco (Açougue: "Quantos vai levar?", "Sobraram"). */
  large?: boolean;
  max?: number;
}

/** Passo: contador de − / +. Tocar no número deixa digitar. */
export function Stepper({ label, value, onChange, invalid, compact, large, max = 9999 }: StepperProps) {
  const id = useId();
  const clamp = (n: number) => Math.max(0, Math.min(max, n));
  return (
    <div className={`${styles.stepper} ${compact ? styles.compact : ''} ${large ? styles.large : ''}`}>
      <label htmlFor={id} className={styles.stepperLabel}>
        {label}
      </label>
      <div className={`${styles.stepperBox} ${invalid ? styles.invalid : ''}`}>
        <button
          type="button"
          className={styles.stepButton}
          aria-label={`Diminuir ${label}`}
          disabled={value <= 0}
          onClick={() => onChange(clamp(value - 1))}
        >
          <Icon name="minus" size={20} />
        </button>
        <input
          id={id}
          className={styles.stepperInput}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          aria-invalid={invalid ? true : undefined}
          value={String(value)}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '');
            onChange(clamp(digits === '' ? 0 : Number(digits)));
          }}
        />
        <button
          type="button"
          className={styles.stepButton}
          aria-label={`Aumentar ${label}`}
          disabled={value >= max}
          onClick={() => onChange(clamp(value + 1))}
        >
          <Icon name="plus" size={20} />
        </button>
      </div>
    </div>
  );
}
