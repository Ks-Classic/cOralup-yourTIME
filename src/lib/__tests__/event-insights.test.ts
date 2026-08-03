import {
  ageBucket,
  buildItemDistributions,
  durationBucket,
  elapsedMinutes,
  formatResponseValue,
  halfHourBucket,
  splitStoredValue,
} from '@/lib/event-insights'

describe('event insights utilities', () => {
  test('stored arrays and option labels are rendered for people', () => {
    expect(splitStoredValue('["mouth","nose"]')).toEqual(['mouth', 'nose'])
    expect(formatResponseValue('mouth', [{ value: 'mouth', label: '口呼吸' }])).toBe('口呼吸')
  })

  test('item distributions aggregate decoded values', () => {
    const result = buildItemDistributions([
      { id: 'a', visitId: 'v1', category: '呼吸', itemId: 'i1', label: '呼吸', value: 'mouth', options: [{ value: 'mouth', label: '口呼吸' }] },
      { id: 'b', visitId: 'v2', category: '呼吸', itemId: 'i1', label: '呼吸', value: 'mouth', options: [{ value: 'mouth', label: '口呼吸' }] },
    ])
    expect(result[0]).toMatchObject({ label: '呼吸', total: 2, values: [{ label: '口呼吸', count: 2 }] })
  })

  test('time and duration buckets use JST and safe bounds', () => {
    expect(halfHourBucket('2026-08-02T01:35:00.000Z')).toBe('10:30')
    expect(durationBucket(21)).toBe('20〜29分')
    expect(elapsedMinutes(new Date('2026-08-02T01:00:00Z'), new Date('2026-08-02T01:18:00Z'))).toBe(18)
    expect(elapsedMinutes(new Date('2026-08-02T01:00:00Z'), new Date('2026-08-02T05:00:00Z'))).toBeNull()
  })

  test('age buckets retain exact year visibility', () => {
    expect(ageBucket(71)).toBe('5歳')
    expect(ageBucket(null)).toBe('不明')
  })
})
