import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { BigButton } from '../../components/buttons';
import { CardPair, HeroCard, PeriodPicker, SectionTitle, StatCard } from '../../components/cards';
import { EntryList, EntryRow, ProductBadge } from '../../components/EntryList';
import { Notice } from '../../components/Notice';
import { PageTitle, TabLayout } from '../../components/TabLayout';
import { db } from '../../db/db';
import { loadActiveProducts } from '../../db/operations';
import { loadHomeData } from '../../db/queries';
import { shiftDays, toLocalDate, weekStartOf } from '../../domain/dates';
import type { Delivery, Product, Settlement } from '../../domain/types';
import { weekReport } from '../../domain/week';
import { formatWeekRangeLong } from '../../lib/format';
import { formatCents } from '../../lib/money';
import { DeliverySheet } from '../butcher/DeliverySheet';
import { SettlementSheet } from '../butcher/SettlementSheet';
import { WeekCloseSheet } from '../week-close/WeekCloseSheet';
import { ProductWeekSheet } from './ProductWeekSheet';

type OpenSheet =
  | { kind: 'week' }
  | { kind: 'product'; product: Product }
  | { kind: 'delivery'; delivery: Delivery }
  | { kind: 'settlement'; settlement: Settlement }
  | null;

const sold = (n: number) => (n === 1 ? '1 vendido' : `${n} vendidos`);

/** Aba Semana: faturamento, na mão × Açougue e, por produto, produzido, vendido, sobrou e faturamento. */
export function WeekPage() {
  const currentWeek = weekStartOf(toLocalDate(new Date()));
  const [weekStart, setWeekStart] = useState(currentWeek);
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [message, setMessage] = useState<string | null>(null);

  const report = useLiveQuery(async () => {
    const [data, products] = await Promise.all([loadHomeData(db), loadActiveProducts(db)]);
    return weekReport(data, products, weekStart);
  }, [weekStart]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 3500);
    return () => window.clearTimeout(timer);
  }, [message]);

  const close = () => setSheet(null);
  const saved = (text: string) => {
    setSheet(null);
    setMessage(text);
  };

  return (
    <TabLayout
      actions={
        report && !report.closed ? <BigButton onClick={() => setSheet({ kind: 'week' })}>Fechar a semana</BigButton> : undefined
      }
    >
      <PageTitle>Semana</PageTitle>

      <PeriodPicker
        label={formatWeekRangeLong(weekStart)}
        previousLabel="Semana anterior"
        nextLabel="Próxima semana"
        nextDisabled={weekStart >= currentWeek}
        onPrevious={() => setWeekStart(shiftDays(weekStart, -7))}
        onNext={() => setWeekStart(shiftDays(weekStart, 7))}
      />

      {message && <Notice kind="success">{message}</Notice>}

      {report && (
        <>
          <HeroCard
            label="Faturamento da semana"
            value={formatCents(report.revenueCents)}
            detail={
              report.closed
                ? `Produziu ${report.produced} · vendeu ${report.sold} · sobrou ${report.leftover}`
                : 'Semana ainda não fechada'
            }
          />

          {!report.closed && <Notice>Feche a semana para ver o que você produziu, vendeu e faturou</Notice>}

          {report.hasData && (
            <>
              <CardPair>
                <StatCard label="Na mão" value={formatCents(report.direct.valueCents)} detail={sold(report.direct.quantity)} />
                <StatCard
                  label="Açougue"
                  value={formatCents(report.consignment.valueCents)}
                  detail={sold(report.consignment.quantity)}
                />
              </CardPair>

              <SectionTitle>Por produto</SectionTitle>
              <EntryList>
                {report.rows.map((row) => (
                  <EntryRow
                    key={row.product.id}
                    badge={<ProductBadge code={row.product.code} />}
                    title={row.product.name}
                    detail={`Produziu ${row.produced} · vendeu ${row.sold} · sobrou ${row.leftover}`}
                    value={formatCents(row.revenueCents)}
                    onClick={() => setSheet({ kind: 'product', product: row.product })}
                  />
                ))}
              </EntryList>
            </>
          )}
        </>
      )}

      {sheet?.kind === 'product' && report && (
        <ProductWeekSheet
          product={sheet.product}
          weekStart={weekStart}
          row={report.rows.find((r) => r.product.id === sheet.product.id)}
          onClose={close}
          onOpenWeekClose={() => setSheet({ kind: 'week' })}
          onOpenDelivery={(delivery) => setSheet({ kind: 'delivery', delivery })}
          onOpenSettlement={(settlement) => setSheet({ kind: 'settlement', settlement })}
        />
      )}
      {sheet?.kind === 'week' && <WeekCloseSheet initialWeekStart={weekStart} onClose={close} onSaved={saved} />}
      {sheet?.kind === 'delivery' && <DeliverySheet delivery={sheet.delivery} onClose={close} onSaved={saved} />}
      {sheet?.kind === 'settlement' && <SettlementSheet settlement={sheet.settlement} onClose={close} onSaved={saved} />}
    </TabLayout>
  );
}
