/**
 * LINEレポート通知のFlex Message生成（本番/デモ共通）
 *
 * 本番（保護者宛 `/api/line/send-report`）とデモ（スタッフ本人宛
 * `/api/line/send-demo-report`）で「通知のフォーマット」を完全に一致させるための
 * 単一の生成元（SSoT）。doc 22「UIは1つ、データソースだけ切替」のLINE版。
 *
 * - 見た目（バブル/ボタン/文言）は本番=デモで同一
 * - 違いは reportUrl の向き先と、デモ時の小さな「デモ」注記だけ
 */

export interface ReportFlexMessageParams {
  /** お子様の名前 */
  childName: string
  /** ボタンのリンク先。本番=`/report/{visitId}`、デモ=`/report/demo` */
  reportUrl: string
  /** イベント名（任意。あれば本文に表示） */
  eventName?: string
  /** デモ送信か。trueなら altText と注記に「デモ」を明示する */
  isDemo?: boolean
}

interface LineFlexTextContent {
  type: 'text'
  text: string
  weight?: 'bold'
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'xl'
  color?: string
  margin?: 'md'
  align?: 'center'
  wrap?: boolean
}

export interface LineFlexMessage {
  type: 'flex'
  altText: string
  contents: Record<string, unknown>
}

const PRODUCTION_FOOTER_NOTE = '※ レポートは90日間有効です'
const DEMO_FOOTER_NOTE = '※ スタッフ確認用のデモ送信です'

/**
 * 本番/デモ共通のレポート通知Flex Messageを生成する。
 */
export function buildReportFlexMessage(
  params: ReportFlexMessageParams
): LineFlexMessage {
  const { childName, reportUrl, eventName, isDemo = false } = params

  const eventContents: LineFlexTextContent[] = eventName
    ? [
        {
          type: 'text',
          text: `📍 ${eventName}`,
          size: 'xs',
          color: '#999999',
          margin: 'md',
        },
      ]
    : []

  const footerNote = isDemo ? DEMO_FOOTER_NOTE : PRODUCTION_FOOTER_NOTE
  const altText = isDemo
    ? `【デモ】${childName}さんの分析レポートが完成しました`
    : `${childName}さんの分析レポートが完成しました`

  return {
    type: 'flex',
    altText,
    contents: {
      type: 'bubble',
      hero: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🦷 cOral up',
            weight: 'bold',
            size: 'sm',
            color: '#1e40af',
          },
        ],
        paddingAll: 'lg',
        backgroundColor: '#eff6ff',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '分析レポート完成',
            weight: 'bold',
            size: 'xl',
            margin: 'md',
          },
          {
            type: 'text',
            text: `${childName}さんの口腔育成診断レポートが完成しました。`,
            size: 'sm',
            color: '#666666',
            margin: 'md',
            wrap: true,
          },
          ...eventContents,
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'uri',
              label: 'レポートを見る',
              uri: reportUrl,
            },
            color: '#2563eb',
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: footerNote,
                size: 'xxs',
                color: '#aaaaaa',
                align: 'center',
              },
            ],
            margin: 'md',
          },
        ],
        flex: 0,
      },
    },
  }
}
