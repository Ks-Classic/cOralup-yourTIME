import {
  canReuseVisitForChild,
  selectQuestionnaireChild,
} from '../parent-questionnaire-flow'

describe('parent questionnaire sibling flow', () => {
  describe('selectQuestionnaireChild', () => {
    const children = [
      { id: 'child-2', latestVisit: { id: 'visit-2' } },
      { id: 'child-1', latestVisit: { id: 'visit-1' } },
    ]

    it('selects the requested child instead of defaulting to the latest child', () => {
      expect(selectQuestionnaireChild(children, 'child-1')).toEqual(children[1])
    })

    it('returns null for an unknown requested child id', () => {
      expect(selectQuestionnaireChild(children, 'missing-child')).toBeNull()
    })

    it('keeps the backward-compatible latest-child fallback when no child is requested', () => {
      expect(selectQuestionnaireChild(children, null)).toEqual(children[0])
    })
  })

  describe('canReuseVisitForChild', () => {
    it('does not reuse another child visit when registering a second child', () => {
      expect(canReuseVisitForChild({ childId: 'child-1' }, 'child-2')).toBe(false)
    })

    it('allows reuse when the visit is already tied to the same child', () => {
      expect(canReuseVisitForChild({ childId: 'child-2' }, 'child-2')).toBe(true)
    })

    it('allows reuse for a waiting visit that has not been tied to a child yet', () => {
      expect(canReuseVisitForChild({ childId: null }, 'child-2')).toBe(true)
    })
  })
})
