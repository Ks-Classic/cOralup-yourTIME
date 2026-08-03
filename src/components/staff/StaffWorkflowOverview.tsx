'use client'

import {
  Brain,
  Camera,
  Check,
  ChevronDown,
  ClipboardCheck,
  FileText,
  MessageCircle,
  QrCode,
  Send,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'

type WorkflowStage = 'visitor' | 'diagnosis' | 'notification'

interface Stage {
  id: WorkflowStage
  step: string
  title: string
  summary: string
  icon: LucideIcon
}

const stages: Stage[] = [
  {
    id: 'visitor',
    step: 'STEP 01',
    title: '来場者',
    summary: 'LINE問診・QR提示',
    icon: UserRound,
  },
  {
    id: 'diagnosis',
    step: 'STEP 02 · STAFF',
    title: '診断',
    summary: '撮影・入力・AI分析',
    icon: ClipboardCheck,
  },
  {
    id: 'notification',
    step: 'STEP 03',
    title: 'LINE通知',
    summary: 'レポート・ご案内',
    icon: Send,
  },
]

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[18rem] overflow-hidden rounded-[1.5rem] border-[5px] border-[#17333c] bg-[#f4f7f8] shadow-[0_14px_35px_rgba(0,83,109,0.13)]">
      <div className="flex h-6 items-center justify-center bg-[#17333c]">
        <div className="h-1.5 w-12 rounded-full bg-white/30" />
      </div>
      <div className="min-h-52 p-3">{children}</div>
    </div>
  )
}

function VisitorDetail() {
  return (
    <div className="grid items-center gap-6 lg:grid-cols-[1fr_0.8fr]">
      <div>
        <p className="text-xs font-bold tracking-[0.15em] text-[#4cb9a7]">STEP 01 · 来場者</p>
        <h3 className="mt-2 text-xl font-bold text-[#00536d]">問診に回答し、QRを提示</h3>
        <p className="mt-3 text-sm leading-7 text-[#476771]">
          来場者は保護者用LINEを友だち追加し、お子さまの基本情報と問診に回答します。
          回答後に表示されるQRを受付スタッフへ見せます。
        </p>
        <ol className="mt-5 space-y-3">
          {['保護者用LINEを友だち追加', 'お子さま情報と問診に回答', '受付でQRを提示'].map(
            (label, index) => (
              <li key={label} className="flex items-center gap-3 text-sm font-semibold text-[#416873]">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e5f8f4] text-xs font-bold text-[#278d7c]">
                  {index + 1}
                </span>
                {label}
              </li>
            )
          )}
        </ol>
      </div>
      <PhoneFrame>
        <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#06c755] text-white">
            <MessageCircle className="h-4 w-4" />
          </div>
          <p className="text-[10px] font-bold text-slate-700">cOral up</p>
        </div>
        <div className="rounded-xl bg-white p-3 shadow-sm">
          <p className="text-[9px] font-bold text-[#00536d]">お子さまの問診</p>
          <div className="mt-2 space-y-1.5">
            {['基本情報を入力', '気になることに回答'].map((label) => (
              <div key={label} className="flex items-center gap-2 text-[8px] text-slate-500">
                <Check className="h-3 w-3 text-[#4cb9a7]" />
                {label}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3 rounded-xl bg-white p-3 text-center shadow-sm">
          <QrCode className="mx-auto h-14 w-14 text-[#17333c]" />
          <p className="mt-2 text-[8px] font-bold text-slate-600">このQRを受付で見せます</p>
        </div>
      </PhoneFrame>
    </div>
  )
}

function DiagnosisDetail() {
  return (
    <div className="grid items-center gap-6 lg:grid-cols-[1fr_0.8fr]">
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#4cb9a7] px-2.5 py-1 text-[9px] font-bold tracking-[0.12em] text-white">
            スタッフ担当
          </span>
          <p className="text-xs font-bold tracking-[0.15em] text-[#4cb9a7]">STEP 02 · 診断</p>
        </div>
        <h3 className="mt-2 text-xl font-bold text-[#00536d]">アプリで診断し、内容を確認</h3>
        <p className="mt-3 text-sm leading-7 text-[#476771]">
          QRから来場者を呼び出し、写真と診断項目を入力します。
          AIが作成したレポート文案は、スタッフが必ず読んでから確定します。
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: 'QR受付', icon: QrCode },
            { label: '写真3枚', icon: Camera },
            { label: '診断入力', icon: ClipboardCheck },
            { label: 'AI分析', icon: Brain },
          ].map(({ label, icon: Icon }) => (
            <div key={label} className="rounded-xl bg-[#f0fbff] p-3 text-center">
              <Icon className="mx-auto h-4 w-4 text-[#4cb9a7]" />
              <p className="mt-2 text-[10px] font-bold text-[#416873]">{label}</p>
            </div>
          ))}
        </div>
      </div>
      <PhoneFrame>
        <div className="border-b border-slate-200 pb-2">
          <p className="text-[8px] font-bold tracking-wider text-[#4cb9a7]">cOral up STAFF</p>
          <p className="text-xs font-bold text-[#17333c]">診断アプリ</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            { label: 'QR受付', icon: QrCode },
            { label: '写真3枚', icon: Camera },
            { label: '診断入力', icon: ClipboardCheck },
            { label: 'AI分析', icon: Brain },
          ].map(({ label, icon: Icon }) => (
            <div key={label} className="rounded-lg bg-white p-2.5 text-center shadow-sm">
              <Icon className="mx-auto h-4 w-4 text-[#4cb9a7]" />
              <p className="mt-1 text-[8px] font-bold text-slate-600">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg bg-[#00536d] py-2 text-center text-[9px] font-bold text-white">
          内容を確認して確定
        </div>
        <p className="mt-2 text-center text-[7px] text-slate-400">
          AIの文案はスタッフが必ず確認します
        </p>
      </PhoneFrame>
    </div>
  )
}

function NotificationDetail() {
  return (
    <div className="grid items-center gap-6 lg:grid-cols-[1fr_0.8fr]">
      <div>
        <p className="text-xs font-bold tracking-[0.15em] text-[#4cb9a7]">STEP 03 · LINE通知</p>
        <h3 className="mt-2 text-xl font-bold text-[#00536d]">結果と次のご案内を2通配信</h3>
        <p className="mt-3 text-sm leading-7 text-[#476771]">
          スタッフが確定・送信すると、保護者のLINEへ分析レポートと
          個別相談・Instagram・相談用公式LINEの案内が届きます。
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {['撮影した写真3枚', '分析レポート', '個別相談', 'SNS・相談用LINE'].map((label) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-xl bg-[#e5f8f4] px-3 py-2.5 text-xs font-bold text-[#278d7c]"
            >
              <Check className="h-3.5 w-3.5 shrink-0" />
              {label}
            </div>
          ))}
        </div>
      </div>
      <PhoneFrame>
        <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#06c755] text-white">
            <MessageCircle className="h-4 w-4" />
          </div>
          <p className="text-[10px] font-bold text-slate-700">cOral up</p>
        </div>
        <div className="rounded-xl rounded-tl-sm bg-white p-3 shadow-sm">
          <p className="text-[10px] font-bold text-[#00536d]">分析レポート完成</p>
          <div className="mt-2 rounded-lg bg-blue-600 py-2 text-center text-[8px] font-bold text-white">
            レポートを見る
          </div>
          <p className="mt-2 text-center text-[7px] text-slate-400">90日間閲覧できます</p>
        </div>
        <div className="mt-2 rounded-xl rounded-tl-sm bg-white p-3 text-[8px] leading-4 text-slate-600 shadow-sm">
          個別相談・Instagram・相談用公式LINEをご案内します。
        </div>
        <p className="mt-3 flex items-center justify-end gap-1 text-[8px] font-bold text-emerald-600">
          <Check className="h-3 w-3" />
          2通受信
        </p>
      </PhoneFrame>
    </div>
  )
}

export function StaffWorkflowOverview() {
  const [activeStage, setActiveStage] = useState<WorkflowStage>('diagnosis')

  return (
    <section className="mt-12" aria-labelledby="workflow-title">
      <div className="text-center">
        <p className="text-xs font-bold tracking-[0.18em] text-[#4cb9a7]">HOW IT WORKS</p>
        <h2 id="workflow-title" className="mt-2 text-2xl font-bold text-[#00536d] sm:text-3xl">
          診断の流れ
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#476771] sm:text-base">
          各項目をタップすると、画面と詳しい流れを確認できます。
        </p>
      </div>

      <div className="relative mt-7 grid gap-3 sm:grid-cols-3">
        <div className="pointer-events-none absolute left-[16%] right-[16%] top-1/2 hidden h-px bg-[#4cb9a7]/30 sm:block" />
        {stages.map((stage) => {
          const Icon = stage.icon
          const isActive = activeStage === stage.id
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => setActiveStage(stage.id)}
              aria-expanded={isActive}
              aria-controls={`workflow-detail-${stage.id}`}
              className={`relative z-10 flex min-h-28 items-center gap-4 rounded-2xl border-2 p-4 text-left transition sm:block sm:text-center ${
                isActive
                  ? 'border-[#4cb9a7] bg-[#00536d] text-white shadow-[0_14px_35px_rgba(0,83,109,0.18)]'
                  : 'border-white bg-white text-[#17333c] shadow-sm hover:border-[#4cb9a7]/40 hover:-translate-y-0.5'
              }`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:mx-auto ${
                  isActive ? 'bg-white/15 text-[#87e7ff]' : 'bg-[#e5f8f4] text-[#278d7c]'
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 sm:mt-3">
                <p className={`text-[9px] font-bold tracking-[0.12em] ${isActive ? 'text-[#87e7ff]' : 'text-[#4cb9a7]'}`}>
                  {stage.step}
                </p>
                <p className="mt-0.5 font-bold">{stage.title}</p>
                <p className={`mt-1 text-[10px] ${isActive ? 'text-white/65' : 'text-[#66828a]'}`}>
                  {stage.summary}
                </p>
              </div>
              <ChevronDown
                className={`h-5 w-5 shrink-0 transition-transform sm:absolute sm:bottom-3 sm:right-3 ${
                  isActive ? 'rotate-180 text-[#87e7ff]' : 'text-[#4cb9a7]'
                }`}
              />
            </button>
          )
        })}
      </div>

      <div
        id={`workflow-detail-${activeStage}`}
        className="mt-4 rounded-3xl border border-[#00536d]/10 bg-white p-5 shadow-[0_18px_50px_rgba(0,83,109,0.09)] sm:p-7"
      >
        {activeStage === 'visitor' && <VisitorDetail />}
        {activeStage === 'diagnosis' && <DiagnosisDetail />}
        {activeStage === 'notification' && <NotificationDetail />}
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#4cb9a7]/25 bg-[#e5f8f4] p-4">
        <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[#278d7c]" />
        <p className="text-xs leading-5 text-[#416873]">
          スタッフが担当するのは中央の「診断」です。続くアプリ登録とデモ練習を、当日までに完了してください。
        </p>
      </div>
    </section>
  )
}
