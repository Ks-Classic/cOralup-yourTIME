# 統合診断ページ コンポーネント分割実装ガイド

## 概要

このドキュメントは、統合診断ページのコンポーネント分割実装に関する詳細なガイドです。

## 目的

1つのページで完結しつつ、以下の目標を達成します：
- ✅ UXの維持（ページ遷移なしで即座にステップ切り替え）
- ✅ 保守性の向上（コンポーネント分割による独立した開発・テスト・保守）
- ✅ 開発効率の向上（並行開発、コードレビュー、バグ特定の容易化）
- ✅ パフォーマンスの最適化（動的インポートとプリロードによる最適化）

## 実装手順

### Phase 1: ディレクトリ構造の作成

```bash
# ディレクトリ構造を作成
mkdir -p src/app/(staff)/diagnosis/components/{steps,shared,hooks}
touch src/app/(staff)/diagnosis/components/types.ts
```

### Phase 2: 共通型定義の作成

`components/types.ts` に共通型定義を作成：

```typescript
export type DiagnosisStep = 
  | 'start'       // QR読み取り・セッションID入力
  | 'session'     // セッション情報確認
  | 'photos'      // 写真撮影
  | 'diagnosis'   // 診断項目入力
  | 'review'      // 確認・修正
  | 'analysis'    // AI分析
  | 'report'      // レポート送信

export interface DiagnosisState {
  sessionId: string
  session: SessionData | null
  questionnaire: QuestionnaireData | null
  photos: PhotoData[]
  diagnosisValues: Record<string, any>
  staffNotes: string
  analysisResult: AnalysisResult | null
  report: ReportData | null
}

export interface DiagnosisStepProps {
  sessionId: string
  session: SessionData | null
  questionnaire: QuestionnaireData | null
  onNext?: () => void
  onBack?: () => void
  onChangeStep?: (step: DiagnosisStep) => void
}
```

### Phase 3: 共通フックの実装

#### `useDiagnosisState.ts`

診断状態の一元管理：

```typescript
import { useState, useEffect } from 'react'
import type { DiagnosisState } from '../types'

export function useDiagnosisState(sessionId: string) {
  const [photos, setPhotos] = useState<PhotoData[]>([])
  const [diagnosisValues, setDiagnosisValues] = useState<Record<string, any>>({})
  const [staffNotes, setStaffNotes] = useState('')
  
  // 自動保存
  useEffect(() => {
    const saveData = () => {
      localStorage.setItem(`diagnosis_${sessionId}`, JSON.stringify({
        photos,
        diagnosisValues,
        staffNotes,
        timestamp: Date.now(),
      }))
    }
    saveData()
  }, [photos, diagnosisValues, staffNotes, sessionId])
  
  // データ復元
  useEffect(() => {
    const savedData = localStorage.getItem(`diagnosis_${sessionId}`)
    if (savedData) {
      const data = JSON.parse(savedData)
      setPhotos(data.photos || [])
      setDiagnosisValues(data.diagnosisValues || {})
      setStaffNotes(data.staffNotes || '')
    }
  }, [sessionId])
  
  return {
    photos,
    diagnosisValues,
    staffNotes,
    setPhotos,
    setDiagnosisValues,
    setStaffNotes,
  }
}
```

#### `useStepNavigation.ts`

ステップ遷移ロジック：

```typescript
import { useState, useEffect } from 'react'
import type { DiagnosisStep } from '../types'

const steps: DiagnosisStep[] = [
  'session',
  'photos',
  'diagnosis',
  'review',
  'analysis',
  'report'
]

export function useStepNavigation() {
  const [currentStep, setCurrentStep] = useState<DiagnosisStep>('session')
  
  // URLハッシュからステップを読み取り
  useEffect(() => {
    const hash = window.location.hash.replace('#step=', '')
    if (hash && steps.includes(hash as DiagnosisStep)) {
      setCurrentStep(hash as DiagnosisStep)
    }
  }, [])
  
  // ステップ変更
  const changeStep = (step: DiagnosisStep) => {
    setCurrentStep(step)
    window.history.replaceState(null, '', `#step=${step}`)
  }
  
  return {
    currentStep,
    changeStep,
    steps,
  }
}
```

#### `useStepPreload.ts`

プリロード戦略：

```typescript
import { useEffect } from 'react'
import type { DiagnosisStep } from '../types'

const steps: DiagnosisStep[] = [
  'session',
  'photos',
  'diagnosis',
  'review',
  'analysis',
  'report'
]

export function useStepPreload(currentStep: DiagnosisStep) {
  useEffect(() => {
    const preloadNextStep = async () => {
      const currentIndex = steps.indexOf(currentStep)
      const nextStep = steps[currentIndex + 1]
      
      if (!nextStep) return
      
      // 次のステップのコンポーネントを事前に読み込み
      switch (nextStep) {
        case 'photos':
          await import('../steps/PhotosStep')
          break
        case 'diagnosis':
          await import('../steps/DiagnosisStep')
          break
        case 'review':
          await import('../steps/ReviewStep')
          break
        case 'analysis':
          await import('../steps/AnalysisStep')
          break
        case 'report':
          await import('../steps/ReportStep')
          break
      }
    }
    
    // 100ms遅延で非ブロッキング読み込み
    const timer = setTimeout(preloadNextStep, 100)
    return () => clearTimeout(timer)
  }, [currentStep])
}
```

### Phase 4: ステップコンポーネントの実装

各ステップコンポーネントを実装します。例として `PhotosStep.tsx`：

```typescript
'use client'

import { usePhotoCapture } from '../hooks/usePhotoCapture'
import type { DiagnosisStepProps } from '../types'

interface PhotosStepProps extends DiagnosisStepProps {
  photos: PhotoData[]
  onPhotosUpdate: (photos: PhotoData[]) => void
}

export default function PhotosStep({ 
  photos, 
  onPhotosUpdate,
  onNext,
  onBack 
}: PhotosStepProps) {
  const { startCamera, stopCamera, capturePhoto, isCameraOpen } = usePhotoCapture()
  
  // 写真撮影のUIとロジック
  // ...
  
  return (
    <div>
      {/* 写真撮影UI */}
    </div>
  )
}
```

### Phase 5: ページファイルの更新

`[id]/page.tsx` を更新して動的インポートを実装：

```typescript
'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useDiagnosisState } from '../components/hooks/useDiagnosisState'
import { useStepNavigation } from '../components/hooks/useStepNavigation'
import { useStepPreload } from '../components/hooks/useStepPreload'
import StepIndicator from '../components/shared/StepIndicator'
import StepNavigation from '../components/shared/StepNavigation'
import StepSkeleton from '../components/shared/StepSkeleton'

// 動的インポート（コード分割）
const SessionStep = dynamic(() => import('../components/steps/SessionStep'), {
  loading: () => <StepSkeleton />
})

const PhotosStep = dynamic(() => import('../components/steps/PhotosStep'), {
  loading: () => <StepSkeleton />
})

const DiagnosisStep = dynamic(() => import('../components/steps/DiagnosisStep'), {
  loading: () => <StepSkeleton />
})

const ReviewStep = dynamic(() => import('../components/steps/ReviewStep'), {
  loading: () => <StepSkeleton />
})

const AnalysisStep = dynamic(() => import('../components/steps/AnalysisStep'), {
  loading: () => <StepSkeleton />
})

const ReportStep = dynamic(() => import('../components/steps/ReportStep'), {
  loading: () => <StepSkeleton />
})

export default function DiagnosisPage({ params }) {
  const { sessionId } = useParams()
  const diagnosisState = useDiagnosisState(sessionId)
  const { currentStep, changeStep } = useStepNavigation()
  
  // プリロード戦略
  useStepPreload(currentStep)
  
  return (
    <div>
      <StepIndicator currentStep={currentStep} />
      
      {/* ステップコンテンツ（ページ遷移なし） */}
      {currentStep === 'session' && <SessionStep {...diagnosisState} onChangeStep={changeStep} />}
      {currentStep === 'photos' && <PhotosStep {...diagnosisState} onChangeStep={changeStep} />}
      {currentStep === 'diagnosis' && <DiagnosisStep {...diagnosisState} onChangeStep={changeStep} />}
      {currentStep === 'review' && <ReviewStep {...diagnosisState} onChangeStep={changeStep} />}
      {currentStep === 'analysis' && <AnalysisStep {...diagnosisState} onChangeStep={changeStep} />}
      {currentStep === 'report' && <ReportStep {...diagnosisState} onChangeStep={changeStep} />}
      
      <StepNavigation currentStep={currentStep} onChangeStep={changeStep} />
    </div>
  )
}
```

## ベストプラクティス

### 1. コンポーネントの責務分離

- **ページファイル**: ステップ管理、ルーティング、データ状態の管理
- **ステップコンポーネント**: UI表示とそのステップ固有のロジック
- **共通フック**: 再利用可能なロジック（状態管理、ナビゲーション、プリロード）
- **共通コンポーネント**: 複数のステップで使用するUIコンポーネント

### 2. 型安全性の確保

- 共通型定義を `types.ts` に集約
- 各コンポーネントのPropsに型を定義
- TypeScriptのstrictモードを有効化

### 3. パフォーマンス最適化

- 動的インポートでコード分割
- プリロード戦略でUX最適化
- 不要な再レンダリングを防ぐ（`useMemo`, `useCallback`）

### 4. テスト容易性

- 各ステップコンポーネントを独立してテスト可能にする
- モックデータの注入が容易な設計
- 共通フックの単体テスト

## トラブルシューティング

### 問題: 動的インポートが動作しない

**解決策:**
- `ssr: false` を指定（クライアントサイドのみ）
- パスが正しいか確認
- Next.jsのバージョンを確認（14以上）

### 問題: プリロードが効かない

**解決策:**
- `useStepPreload` フックが正しく呼び出されているか確認
- タイマーのクリーンアップが適切に行われているか確認
- ブラウザの開発者ツールでネットワークタブを確認

### 問題: 状態が保持されない

**解決策:**
- `useDiagnosisState` フックの自動保存が正しく動作しているか確認
- ローカルストレージの容量制限を確認
- セッションIDが正しく渡されているか確認

## 参考資料

- [Next.js Dynamic Import](https://nextjs.org/docs/advanced-features/dynamic-import)
- [React Code Splitting](https://react.dev/reference/react/lazy)
- [16-field-optimized-diagnosis-page-design.md](./16-field-optimized-diagnosis-page-design.md)
