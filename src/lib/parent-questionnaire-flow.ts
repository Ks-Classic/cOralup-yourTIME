export interface ChildWithLatestVisit {
  id: string
  latestVisit: unknown | null
}

export interface ExistingVisitForReuse {
  childId: string | null
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
  childId: string
): boolean {
  if (!existingVisit) return false
  return !existingVisit.childId || existingVisit.childId === childId
}
