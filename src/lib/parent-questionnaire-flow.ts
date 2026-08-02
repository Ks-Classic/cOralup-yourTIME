export interface ChildWithLatestVisit {
  id: string
  latestVisit: unknown | null
}

export interface ExistingVisitForReuse {
  childId: string | null
  visitDate?: Date | string | null
  createdAt?: Date | string | null
}

export const VISIT_REUSE_WINDOW_MS = 24 * 60 * 60 * 1000

export function isVisitCurrent(
  visit: Pick<ExistingVisitForReuse, 'visitDate' | 'createdAt'> | null | undefined,
  now = new Date()
): boolean {
  if (!visit) return false

  const timestamp = visit.visitDate || visit.createdAt
  if (!timestamp) return false

  const occurredAt = timestamp instanceof Date ? timestamp : new Date(timestamp)
  const ageMs = now.getTime() - occurredAt.getTime()

  return Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= VISIT_REUSE_WINDOW_MS
}

export function selectQuestionnaireChild<TChild extends ChildWithLatestVisit>(
  children: TChild[],
  requestedChildId?: string | null
): TChild | null {
  if (requestedChildId) {
    return children.find(child => child.id === requestedChildId) || null
  }

  return children[0] || null
}

export function canReuseVisitForChild(
  existingVisit: ExistingVisitForReuse | null | undefined,
  childId: string,
  now = new Date()
): boolean {
  if (!existingVisit) return false
  return (
    isVisitCurrent(existingVisit, now) &&
    (!existingVisit.childId || existingVisit.childId === childId)
  )
}
