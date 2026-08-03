'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  Circle,
  ExternalLink,
  MapPin,
  MessageCircle,
  PartyPopper,
  PlayCircle,
  RotateCcw,
  Smartphone,
  UserRoundCheck,
} from 'lucide-react'
import { StaffWorkflowOverview } from '@/components/staff/StaffWorkflowOverview'

type GuideRoute = 'new' | 'returning'
type ActionTone = 'line' | 'primary' | 'soft'

interface GuideStep {
  id: string
  title: string
  description: string
  note?: string
  action?: {
    label: string
    href: string
    external?: boolean
    tone?: ActionTone
  }
}

const FRIEND_URL = 'https://lin.ee/ZUvmToP'
const LOGIN_URL = 'https://liff.line.me/2008667323-S9w73N30'
const STORAGE_KEY = 'coralup-staff-guide-v1'

const commonSteps: GuideStep[] = [
  {
    id: 'login',
    title: 'LINEで本人ログイン',
    description: 'ボタンを押してLINE認証を進めます。認証後はSafariまたはChromeで開きます。',
    note: 'LINEの中の画面のままではなく、いつものブラウザに移動できればOKです。',
    action: {
      label: '本人ログインを開く',
      href: LOGIN_URL,
      external: true,
      tone: 'primary',
    },
  },
  {
    id: 'confirm',
    title: '名前と8/2イベントを確認',
    description: 'ログイン後の画面で、スタッフ登録名と参加イベントを確認します。',
    note: '「8/2 YourTIME.8th 東京」の参加登録が完了すると、スタッフホームへ進めます。',
    action: {
      label: 'スタッフホームを確認',
      href: '/staff/event-setup',
      tone: 'soft',
    },
  },
  {
    id: 'demo',
    title: 'デモを最後までやってみる',
    description: '画面に沿って進み、レポートをLINE送信します。デモの診断内容は本番データに残りません。',
    note: '自分のスタッフ用LINEに「デモレポート」と「ご案内」の2通が届いたら完了です。',
    action: {
      label: 'デモを始める',
      href: '/staff/diagnosis/demo',
      tone: 'primary',
    },
  },
]

const stepsByRoute: Record<GuideRoute, GuideStep[]> = {
  new: [
    {
      id: 'friend',
      title: 'スタッフ用LINEを追加',
      description: '友だち追加後、トーク画面を開きます。',
      action: {
        label: 'スタッフ用LINEを追加',
        href: FRIEND_URL,
        external: true,
        tone: 'line',
      },
    },
    {
      id: 'name',
      title: '実名を送る',
      description: 'トークに姓名を送ります。LINEの表示名ではなく、当日確認できる実名です。',
      note: '例：山田 太郎',
      action: {
        label: 'スタッフ用LINEを開く',
        href: FRIEND_URL,
        external: true,
        tone: 'line',
      },
    },
    {
      id: 'event',
      title: '8/2のイベントを選ぶ',
      description: 'LINEに表示されるイベントから「8/2 YourTIME.8th 東京」を選びます。',
      note: '選択後にログインURLが届けば登録できています。',
    },
    ...commonSteps,
  ],
  returning: commonSteps,
}

function loadStoredState(): { route: GuideRoute | null; completed: string[] } {
  if (typeof window === 'undefined') return { route: null, completed: [] }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { route: null, completed: [] }
    const parsed = JSON.parse(raw) as { route?: unknown; completed?: unknown }
    const route = parsed.route === 'new' || parsed.route === 'returning' ? parsed.route : null
    const completed = Array.isArray(parsed.completed)
      ? parsed.completed.filter((item): item is string => typeof item === 'string')
      : []
    return { route, completed }
  } catch {
    return { route: null, completed: [] }
  }
}

function actionClass(tone?: ActionTone) {
  if (tone === 'line') return 'bg-[#06c755] text-white hover:bg-[#05b54d]'
  if (tone === 'soft') return 'border border-[#00536d]/20 bg-[#f0fbff] text-[#00536d] hover:bg-[#dff6fb]'
  return 'bg-[#00536d] text-white hover:bg-[#004459]'
}

export function StaffQuickStartGuide() {
  const [route, setRoute] = useState<GuideRoute | null>(null)
  const [completed, setCompleted] = useState<string[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    const stored = loadStoredState()
    setRoute(stored.route)
    setCompleted(stored.completed)
    setHasLoaded(true)
  }, [])

  useEffect(() => {
    if (!hasLoaded) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ route, completed }))
  }, [completed, hasLoaded, route])

  const steps = route ? stepsByRoute[route] : []
  const completedCount = steps.filter((step) => completed.includes(step.id)).length
  const isDone = steps.length > 0 && completedCount === steps.length
  const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0

  const selectRoute = (nextRoute: GuideRoute) => {
    setRoute(nextRoute)
    setCompleted([])
    window.setTimeout(() => {
      document.getElementById('guide-steps')?.scrollIntoView({ behavior: 'smooth' })
    }, 0)
  }

  const toggleStep = (stepId: string) => {
    setCompleted((current) =>
      current.includes(stepId)
        ? current.filter((id) => id !== stepId)
        : [...current, stepId]
    )
  }

  const resetGuide = () => {
    setRoute(null)
    setCompleted([])
    window.localStorage.removeItem(STORAGE_KEY)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!hasLoaded) {
    return <div className="min-h-screen bg-[#f0fbff]" aria-hidden="true" />
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f0fbff] text-[#17333c]">
      <div className="pointer-events-none absolute -right-24 top-16 h-72 w-72 rounded-full bg-[#87e7ff]/30 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-[34rem] h-80 w-80 rounded-full bg-[#4cb9a7]/15 blur-3xl" />

      <header className="relative z-10 border-b border-[#00536d]/10 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="cOral up" width={34} height={34} priority />
            <div>
              <p className="text-sm font-bold tracking-wide text-[#00536d]">cOral up</p>
              <p className="text-[10px] tracking-[0.18em] text-[#4b747f]">STAFF GUIDE</p>
            </div>
          </div>
          {route && (
            <div className="text-right">
              <p className="text-xs font-bold text-[#00536d]">{completedCount} / {steps.length}</p>
              <p className="text-[10px] text-[#66828a]">準備完了</p>
            </div>
          )}
        </div>
        {route && (
          <div className="h-1 bg-[#d8ffff]">
            <div
              className="h-full bg-[#4cb9a7] transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </header>

      <div className="relative z-10 mx-auto max-w-3xl px-5 pb-16 pt-10 sm:pt-14">
        <section className="text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#4cb9a7]">YOURTIME.8TH TOKYO</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-[#00536d] sm:text-4xl">
            cOral up YourTIME 診断用アプリについて
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#476771] sm:text-base">
            自分に合う方を選んで、上から順に進めるだけです。
            <br className="hidden sm:block" />
            最後にデモLINEが届いたら準備完了です。
          </p>

          <div className="mx-auto mt-7 grid max-w-xl gap-3 rounded-2xl border border-white/80 bg-white/80 p-4 text-left shadow-[0_18px_50px_rgba(0,83,109,0.08)] sm:grid-cols-2">
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d8ffff] text-[#00536d]">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-[#66828a]">日時</p>
                <p className="mt-0.5 text-sm font-bold text-[#17333c]">2026年8月2日（日）</p>
                <p className="text-xs text-[#476771]">10:30〜16:30</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d8ffff] text-[#00536d]">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-[#66828a]">会場</p>
                <p className="mt-0.5 text-sm font-bold text-[#17333c]">東京流通センター</p>
                <p className="text-xs text-[#476771]">第1展示場C・D</p>
              </div>
            </div>
          </div>
        </section>

        <StaffWorkflowOverview />

        <section
          id="app-registration"
          className="mt-12 overflow-hidden rounded-[2rem] border-2 border-[#ef7d65]/35 bg-white shadow-[0_24px_70px_rgba(0,83,109,0.12)]"
          aria-labelledby="route-title"
        >
          <div className="border-b border-[#ef7d65]/15 bg-[#fff7f4] px-5 py-7 sm:px-8 sm:py-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#ef7d65] px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-white">
                必須
              </span>
              <span className="text-xs font-bold tracking-[0.15em] text-[#b85f4d]">
                事前準備 01
              </span>
            </div>
            <h2 id="route-title" className="mt-3 text-2xl font-bold text-[#00536d] sm:text-3xl">
              アプリ登録を完了してください
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#476771]">
              8/2に参加するスタッフ全員が対象です。登録状況に合う方を選び、
              表示される手順を上から順に完了してください。
            </p>
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-white/80 px-3 py-2.5 text-xs font-semibold leading-5 text-[#8a5a2b]">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#ef7d65]" />
              下のどちらかを必ず選択して、登録作業を開始してください。
            </div>
          </div>

          <div className="px-5 py-6 sm:px-8 sm:py-8">
            <p className="text-sm font-bold text-[#17333c]">登録状況を選択</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => selectRoute('returning')}
              className={`group rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                route === 'returning'
                  ? 'border-[#4cb9a7] bg-[#f5fffc] ring-2 ring-[#4cb9a7]/15'
                  : 'border-[#00536d]/10 bg-white shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e5f8f4] text-[#278d7c]">
                  <UserRoundCheck className="h-5 w-5" />
                </div>
                <ArrowRight className="h-5 w-5 text-[#4cb9a7] transition-transform group-hover:translate-x-1" />
              </div>
              <p className="mt-4 font-bold text-[#00536d]">登録済みの方はこちら</p>
              <p className="mt-1 text-xs leading-5 text-[#66828a]">
                スタッフ用LINEを以前登録した方。本人ログインから進みます。
              </p>
              <span className="mt-4 inline-flex text-xs font-bold text-[#278d7c]">
                登録済みの手順を開始
              </span>
            </button>

            <button
              type="button"
              onClick={() => selectRoute('new')}
              className={`group rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                route === 'new'
                  ? 'border-[#4cb9a7] bg-[#f5fffc] ring-2 ring-[#4cb9a7]/15'
                  : 'border-[#00536d]/10 bg-white shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eaf8ff] text-[#147797]">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <ArrowRight className="h-5 w-5 text-[#4cb9a7] transition-transform group-hover:translate-x-1" />
              </div>
              <p className="mt-4 font-bold text-[#00536d]">初めて登録する方はこちら</p>
              <p className="mt-1 text-xs leading-5 text-[#66828a]">
                スタッフ用LINEの友だち追加と実名登録から進みます。
              </p>
              <span className="mt-4 inline-flex text-xs font-bold text-[#147797]">
                初回登録の手順を開始
              </span>
            </button>
            </div>
          </div>
        </section>

        <section
          className="mt-4 rounded-2xl border border-[#00536d]/15 bg-white p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-5"
          aria-labelledby="login-help-title"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e5f8f4] text-[#278d7c]">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.14em] text-[#4cb9a7]">LOGIN HELP</p>
              <h2 id="login-help-title" className="mt-1 font-bold text-[#00536d]">
                ログインできない場合
              </h2>
              <p className="mt-2 text-xs leading-5 text-[#66828a]">
                スタッフ用LINEを開いて「ヘルプ」と送信し、返信にある
                「スタッフアプリ」のURLからログインしてください。
              </p>
            </div>
          </div>
          <a
            href={FRIEND_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-[#06c755] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#05b54d] sm:mt-0 sm:w-auto"
          >
            スタッフ用LINEを開く
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </section>

        {route && (
          <section id="guide-steps" className="scroll-mt-6 pt-12" aria-labelledby="steps-title">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#ef7d65] px-2.5 py-1 text-[9px] font-bold tracking-[0.14em] text-white">
                    必須
                  </span>
                  <p className="text-xs font-semibold tracking-[0.15em] text-[#4cb9a7]">
                    事前準備 02
                  </p>
                </div>
                <h2 id="steps-title" className="mt-1 text-2xl font-bold text-[#00536d]">
                  アプリ登録・動作確認
                </h2>
                <p className="mt-2 text-xs leading-5 text-[#66828a]">
                  各項目を実行し、できたらチェックしてください。
                </p>
              </div>
              <button
                type="button"
                onClick={resetGuide}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs text-[#66828a] transition hover:bg-white hover:text-[#00536d]"
              >
                <ChevronLeft className="h-4 w-4" />
                選び直す
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {steps.map((step, index) => {
                const isCompleted = completed.includes(step.id)
                return (
                  <article
                    key={step.id}
                    className={`rounded-2xl border bg-white p-5 shadow-sm transition sm:p-6 ${
                      isCompleted ? 'border-[#4cb9a7]/50 bg-[#fbfffe]' : 'border-[#00536d]/10'
                    }`}
                  >
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => toggleStep(step.id)}
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition ${
                          isCompleted
                            ? 'border-[#4cb9a7] bg-[#4cb9a7] text-white'
                            : 'border-[#b0cdd4] bg-white text-[#66828a] hover:border-[#4cb9a7] hover:text-[#278d7c]'
                        }`}
                        aria-label={`${step.title}を${isCompleted ? '未完了に戻す' : '完了にする'}`}
                        aria-pressed={isCompleted}
                      >
                        {isCompleted ? <Check className="h-5 w-5" /> : <span className="text-sm font-bold">{index + 1}</span>}
                      </button>

                      <div className="min-w-0 flex-1">
                        <h3 className={`font-bold ${isCompleted ? 'text-[#278d7c]' : 'text-[#17333c]'}`}>
                          {step.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-[#476771]">{step.description}</p>
                        {step.note && (
                          <p className="mt-3 rounded-xl bg-[#f0fbff] px-3 py-2.5 text-xs leading-5 text-[#416873]">
                            {step.note}
                          </p>
                        )}
                        {step.action && (
                          <a
                            href={step.action.href}
                            target={step.action.external ? '_blank' : undefined}
                            rel={step.action.external ? 'noopener noreferrer' : undefined}
                            className={`mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition sm:w-auto ${actionClass(step.action.tone)}`}
                          >
                            {step.id === 'demo' ? <PlayCircle className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                            {step.action.label}
                            {step.action.external && <ExternalLink className="h-3.5 w-3.5" />}
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleStep(step.id)}
                          className={`mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${
                            isCompleted
                              ? 'text-[#278d7c] hover:bg-[#e5f8f4]'
                              : 'text-[#66828a] hover:bg-[#f0fbff] hover:text-[#00536d]'
                          }`}
                        >
                          {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                          {isCompleted ? 'できた！' : 'できたらチェック'}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            {isDone ? (
              <div className="mt-6 overflow-hidden rounded-3xl bg-[#00536d] p-7 text-center text-white shadow-[0_20px_60px_rgba(0,83,109,0.2)] sm:p-9">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
                  <PartyPopper className="h-7 w-7 text-[#87e7ff]" />
                </div>
                <p className="mt-5 text-xs font-semibold tracking-[0.18em] text-[#87e7ff]">READY FOR YOURTIME</p>
                <h2 className="mt-2 text-2xl font-bold">できた！準備完了です。</h2>
                <p className="mt-3 text-sm leading-6 text-white/75">
                  当日はSafariまたはChromeのスタッフホームから始めればOKです。
                </p>
                <a
                  href="/staff/home"
                  className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#00536d] transition hover:bg-[#f0fbff] sm:w-auto"
                >
                  スタッフホームを開く
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            ) : (
              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[#00536d]/10 bg-white/70 p-4 text-sm text-[#476771]">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d8ffff] text-[#00536d]">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <p>あと{steps.length - completedCount}つ。終わった項目にチェックを入れてください。</p>
              </div>
            )}

            <button
              type="button"
              onClick={resetGuide}
              className="mx-auto mt-8 flex min-h-11 items-center gap-2 rounded-full px-4 text-xs text-[#66828a] transition hover:bg-white hover:text-[#00536d]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              最初からやり直す
            </button>
          </section>
        )}
      </div>
    </main>
  )
}
