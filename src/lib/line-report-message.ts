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

export interface LineTextMessage {
  type: 'text'
  text: string
}

export interface LineImageMessage {
  type: 'image'
  originalContentUrl: string
  previewImageUrl: string
}

export type LineReportMessage =
  | LineFlexMessage
  | LineTextMessage
  | LineImageMessage

const PRODUCTION_FOOTER_NOTE = '※ レポートは90日間有効です'
const DEMO_FOOTER_NOTE = '※ スタッフ確認用のデモ送信です'
const FREE_LECTURE_IMAGE_PATH = '/images/free-lecture-notice.jpg'
const FREE_LECTURE_APPLICATION_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLScnwSdn1I8U_EdTAMZBDNIBA8RajMzmar5jS2YOSKSne5nymA/viewform?usp=header'

const POST_REPORT_GUIDANCE = [
  '本日は、cOral up（コーラルアップ）ブースの簡易検査にお越しいただき、ありがとうございました😊',
  '',
  '短い時間でしたが、お口や姿勢、呼吸について知っていただくきっかけになっていれば嬉しいです。',
  '',
  'ご希望の方は、30分5,500円（税込）の個別相談も承っています。',
  'お一人おひとりのお悩みに合わせて、今の状態やご家庭でできることをお伝えします。',
  '',
  '▼個別相談はこちら',
  'https://coralup.jp/trainer/',
  '',
  'Instagramでも、お口の育ちや姿勢・呼吸・子どもの発達について発信しています🌿',
  '',
  '▼Instagram',
  'https://www.instagram.com/dh_tsuuu_san?igsh=dW9lcDV4Y2l3OWxo&utm_source=qr',
  '',
  '▼相談用公式LINE',
  'https://lin.ee/YKvKfpa',
  '',
  '気になることがありましたら、お気軽に公式LINEへメッセージしてください😊',
  'ありがとうございました✨',
].join('\n')

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

/**
 * レポート通知の直後に送る、個別相談・SNS・相談窓口の案内を生成する。
 */
export function buildPostReportGuidanceMessage(): LineTextMessage {
  return {
    type: 'text',
    text: POST_REPORT_GUIDANCE,
  }
}

/**
 * 無料講座の告知画像を、レポートと同じ公開オリジンから配信する。
 */
export function buildFreeLectureImageMessage(
  reportUrl: string
): LineImageMessage {
  const imageUrl = new URL(FREE_LECTURE_IMAGE_PATH, reportUrl).toString()

  return {
    type: 'image',
    originalContentUrl: imageUrl,
    previewImageUrl: imageUrl,
  }
}

/**
 * 画像の直後に送る、無料講座の申込導線。
 */
export function buildFreeLectureApplicationMessage(): LineTextMessage {
  return {
    type: 'text',
    text: `▼ お申し込みはこちら\n${FREE_LECTURE_APPLICATION_URL}`,
  }
}

/**
 * LINE Push APIへ渡すレポート通知一式を、表示順どおりに生成する。
 */
export function buildReportMessages(
  params: ReportFlexMessageParams
): LineReportMessage[] {
  return [
    buildReportFlexMessage(params),
    buildPostReportGuidanceMessage(),
    buildFreeLectureImageMessage(params.reportUrl),
    buildFreeLectureApplicationMessage(),
  ]
}
