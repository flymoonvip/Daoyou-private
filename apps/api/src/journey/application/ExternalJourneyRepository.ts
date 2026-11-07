import type { DbExecutor, DbTransaction } from '@server/lib/drizzle/db.js';
import { getExecutor } from '@server/lib/drizzle/db.js';
import { externalJourneys } from '@server/lib/drizzle/schema.js';
import { and, eq, isNull } from 'drizzle-orm';

export type ExternalJourneyRow = typeof externalJourneys.$inferSelect;

export function findExternalJourneyByJourneyId(
  journeyId: string,
  q: DbExecutor = getExecutor(),
): Promise<ExternalJourneyRow | null> {
  return q
    .select()
    .from(externalJourneys)
    .where(eq(externalJourneys.journeyId, journeyId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

export function findExternalJourneyByCultivatorId(
  cultivatorId: string,
  q: DbExecutor = getExecutor(),
): Promise<ExternalJourneyRow | null> {
  return q
    .select()
    .from(externalJourneys)
    .where(eq(externalJourneys.cultivatorId, cultivatorId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

export async function insertExternalJourney(
  input: {
    journeyId: string;
    externalUserId: string;
    userId: string;
    cultivatorId: string;
    avatarId: number;
    characterName: string;
    gender: string | null;
    combatPower: number;
    combatSampleDays: number;
    starterTier: number;
    aptitude: string;
    payload: Record<string, unknown>;
  },
  tx: DbTransaction,
): Promise<ExternalJourneyRow> {
  const [row] = await tx.insert(externalJourneys).values(input).returning();
  if (!row) throw new Error('外部降世账本写入失败');
  return row;
}

/** 首次入世时间只写一次 */
export async function markExternalJourneyEntered(
  cultivatorId: string,
  at: Date,
  q: DbExecutor = getExecutor(),
): Promise<boolean> {
  const rows = await q
    .update(externalJourneys)
    .set({ enteredAt: at })
    .where(and(eq(externalJourneys.cultivatorId, cultivatorId), isNull(externalJourneys.enteredAt)))
    .returning({ id: externalJourneys.id });
  return rows.length > 0;
}

export async function markExternalJourneyDead(
  cultivatorId: string,
  diedAt: Date,
  q: DbExecutor = getExecutor(),
): Promise<ExternalJourneyRow | null> {
  const [row] = await q
    .update(externalJourneys)
    .set({ status: 'dead', diedAt })
    .where(and(eq(externalJourneys.cultivatorId, cultivatorId), eq(externalJourneys.status, 'active')))
    .returning();
  return row ?? null;
}
