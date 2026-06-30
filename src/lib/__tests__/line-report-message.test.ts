import { buildReportFlexMessage } from '../line-report-message'

/**
 * このテストの主目的は「本番とデモのレポート通知Flexが同形である」ことの固定。
 * doc 22「UIは1つ、データソースだけ切替」のLINE版ドリフト防止。
 */

// Flex構造を辿るための最小ヘルパ（型は緩く扱う）
function getContents(message: ReturnType<typeof buildReportFlexMessage>) {
  return message.contents as Record<string, any>
}

describe('buildReportFlexMessage', () => {
  const baseParams = {
    childName: '花子',
    reportUrl: 'https://example.com/report/visit-123',
  }

  test('本番もデモも bubble + hero/body/footer の同じ骨格を返す', () => {
    const prod = getContents(buildReportFlexMessage(baseParams))
    const demo = getContents(
      buildReportFlexMessage({ ...baseParams, isDemo: true })
    )

    for (const c of [prod, demo]) {
      expect(c.type).toBe('bubble')
      expect(c.hero.contents[0].text).toBe('🦷 cOral up')
      expect(c.body.contents[0].text).toBe('分析レポート完成')
    }
  })

  test('ボタンは uri アクションで reportUrl を指す', () => {
    const c = getContents(buildReportFlexMessage(baseParams))
    const button = c.footer.contents[0]
    expect(button.type).toBe('button')
    expect(button.action.type).toBe('uri')
    expect(button.action.uri).toBe('https://example.com/report/visit-123')
    expect(button.action.label).toBe('レポートを見る')
  })

  test('childName が本文と altText に反映される', () => {
    const message = buildReportFlexMessage(baseParams)
    const c = getContents(message)
    expect(message.altText).toBe('花子さんの分析レポートが完成しました')
    expect(c.body.contents[1].text).toContain('花子さん')
  })

  test('eventName があれば本文に表示、無ければ表示しない', () => {
    const withEvent = getContents(
      buildReportFlexMessage({ ...baseParams, eventName: 'YourTIME 2026' })
    )
    const withoutEvent = getContents(buildReportFlexMessage(baseParams))

    const eventTexts = withEvent.body.contents.filter(
      (x: any) => typeof x.text === 'string' && x.text.includes('📍')
    )
    expect(eventTexts).toHaveLength(1)
    expect(eventTexts[0].text).toBe('📍 YourTIME 2026')

    const noEventTexts = withoutEvent.body.contents.filter(
      (x: any) => typeof x.text === 'string' && x.text.includes('📍')
    )
    expect(noEventTexts).toHaveLength(0)
  })

  test('デモは altText と注記に「デモ」を明示する（本番には出さない）', () => {
    const prod = buildReportFlexMessage(baseParams)
    const demo = buildReportFlexMessage({ ...baseParams, isDemo: true })

    expect(prod.altText).not.toContain('デモ')
    expect(demo.altText).toContain('デモ')

    const prodNote = getContents(prod).footer.contents[1].contents[0].text
    const demoNote = getContents(demo).footer.contents[1].contents[0].text
    expect(prodNote).toBe('※ レポートは90日間有効です')
    expect(demoNote).toBe('※ スタッフ確認用のデモ送信です')
  })
})
