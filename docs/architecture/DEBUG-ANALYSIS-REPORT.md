# cOralup 診断フロー デバッグ分析レポート

**作成日**: 2026-02-16
**対象**: イベント運用中に発生したクリティカルバグの根本原因分析
**ステータス**: 🔴 重要度: 高

---

## 目次

1. [エグゼクティブサマリー](#1-エグゼクティブサマリー)
2. [Bug #1: 「次の診断へ」ボタン押下時のデータ消失](#2-bug-1-次の診断へボタン押下時のデータ消失)
3. [Bug #2: カメラ接続の不安定性](#3-bug-2-カメラ接続の不安定性)
4. [Bug #3: セッション切断（Session Disconnect）](#4-bug-3-セッション切断session-disconnect)
5. [Bug #4: ステータス遷移の不整合](#5-bug-4-ステータス遷移の不整合)
6. [Bug #5: Debounce保存のレースコンディション](#6-bug-5-debounce保存のレースコンディション)
7. [横断的課題: Vercelランタイム制約](#7-横断的課題-vercelランタイム制約)
8. [修正優先度マトリクス](#8-修正優先度マトリクス)
9. [修正実装プラン](#9-修正実装プラン)

---

## 1. エグゼクティブサマリー

第1回イベント運用で以下の重大な問題が確認された。コード解析により、データ消失の根本原因は **「保存タイミングのギャップ」** と **「ステータス遷移の不整合」** の2つに集約される。

### 影響度サマリー

| バグ | 影響度 | 発生頻度 | データ損失リスク |
|------|--------|----------|------------------|
| データ消失（次の診断へ） | 🔴 Critical | 高 | **確定的** |
| カメラ不安定 | 🟠 High | 中 | 間接的 |
| セッション切断 | 🟠 High | 中 | 条件付き |
| ステータス不整合 | 🟡 Medium | 高 | 潜在的 |
| Debounceレースコンディション | 🟡 Medium | 低 | 条件付き |

---

## 2. Bug #1: 「次の診断へ」ボタン押下時のデータ消失

### 2.1 症状

スタッフが診断を完了し「次の診断へ（QRスキャン）」ボタンを押すと、**完了した診断のデータが正しくDBに保存されていない場合がある**。特に、AI分析前の診断入力値やスタッフメモが失われるケースが報告されている。

### 2.2 根本原因分析

#### 原因1: `saveImmediately()` の未使用 🔴 Critical

```typescript
// src/hooks/useDiagnosisStorage.ts
// このフックは saveImmediately() を提供している
const { saveImmediately, clearStorage } = useDiagnosisStorage(visitId)
```

```typescript
// src/app/staff/diagnosis/[id]/page.tsx (line 223)
// saveImmediately は import されているが、一度も呼び出されていない！
saveImmediately,  // ← import のみ、使用箇所なし
```

**影響**: `saveToStorage()` は **500ms debounce** で動作する（`useDiagnosisStorage.ts` line 12: `DEBOUNCE_MS = 500`）。ユーザーが高速に操作した場合、最後のdebounce保存が完了する前に画面遷移やブラウザ閉鎖が発生すると、直前のデータが失われる。

#### 原因2: DB保存はAI分析時のみ実行

```typescript
// src/app/staff/diagnosis/[id]/page.tsx (line 1042-1075)
const runAnalysis = async () => {
    // 1. 診断データをDBに保存 ← AI分析実行時にのみDBに保存される
    const saveDiagnosisResponse = await fetch('/api/diagnoses', {
        method: 'POST',
        body: JSON.stringify({
            sessionId: visitData?.session_id || sessionId,
            diagnosisItems: diagnosisItemsData,
            staffNotes: staffNotes || '',
            photos: photos.map(p => ({ type: p.type, url: p.url })),
        }),
    })
    // 保存失敗してもAI分析は続行する
    if (!saveDiagnosisResponse.ok) {
        console.warn('[Diagnosis] DBへの保存に失敗しましたが、分析は続行します')
    }
}
```

**問題点**:
- 診断入力→レビュー→AI分析までの間にブラウザが閉じると、DBには何も保存されていない
- `runAnalysis`内でのDB保存が失敗しても続行するため、AIレポートはあるが入力値がDBにない状態が発生する
- `completeDiagnosis`（line 1289）や`sendReport`（line 1235）ではDB保存を行わない。レポート送信APIのみ呼んでいる

#### 原因3: `clearStorage()` のタイミング

```typescript
// src/app/staff/diagnosis/[id]/page.tsx (line 1288-1322)
const completeDiagnosis = async (confirmationStatus) => {
    // LINE配信確認APIを呼び出し
    const response = await fetch('/api/line/confirm-delivery', { ... })
    
    // ...
    
    markStepCompleted('report')
    setIsDiagnosisComplete(true)
    setShowLineDeliveryCheck(false)
    
    // 診断完了後、localStorageから途中保存データをクリア
    clearStorage()  // ← ここでlocalStorageがクリアされる
}
```

**問題点**: 
- `clearStorage()` はlocalStorageをクリアするが、この時点でDBへの最終保存を行っていない
- `isDiagnosisComplete` が `true` になった後、自動保存の `useEffect` は機能しない（line 331: `if (!isDiagnosisComplete)` ガード）
- つまり「DB保存なし → localStorage クリア」という**データの空白地帯**が生まれる

#### 原因4: 「次の診断へ」ボタンのナビゲーション

```typescript
// src/app/staff/diagnosis/[id]/page.tsx (line 2965-2972)
<Button onClick={() => {
    router.push('/staff/scan')  // ← 即座にページ遷移
}}>
    次の診断へ（QRスキャン）
</Button>
```

**問題点**: `router.push` は非同期処理を待たない。完了確認なしで即座にページ遷移が発生する。

### 2.3 データフロー図

```
[受付] → [問診] → [写真] → [診断入力] → [レビュー] → [AI分析] → [レポート送信] → [LINE確認] → [完了]
                              ↓                            ↓              ↓               ↓
                         localStorage        DB保存(1回目)   レポートDB     LINE DB
                         (debounce 500ms)    ※失敗しても    ※別テーブル    ※visitステータス
                                              続行                        更新

❌ 問題: 診断入力〜AI分析の間にDBへの保存なし
❌ 問題: AI分析でのDB保存失敗が警告のみ
❌ 問題: completeDiagnosis でDB最終保存なし
❌ 問題: clearStorage()前にDB保存確認なし
```

### 2.4 推奨修正

```typescript
// 修正案1: completeDiagnosis にDB最終保存を追加
const completeDiagnosis = async (confirmationStatus) => {
    try {
        // ★ DB最終保存を追加（clearStorage前に必ず実行）
        await saveToDatabase({
            visitId,
            diagnosisValues,
            staffNotes,
            photos,
        })
        
        const response = await fetch('/api/line/confirm-delivery', { ... })
        // ...
        
        clearStorage()  // DB保存成功後にのみクリア
    } catch (error) {
        // エラー時はlocalStorageをクリアしない
    }
}

// 修正案2: runAnalysis のDB保存失敗をブロッキングエラーに変更
if (!saveDiagnosisResponse.ok) {
    throw new Error('診断データの保存に失敗しました。再試行してください。')
}

// 修正案3: beforeunloadイベントで未保存データの警告
useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (!isDiagnosisComplete && Object.keys(diagnosisValues).length > 0) {
            saveImmediately({ diagnosisValues, staffNotes, photos })
            e.preventDefault()
            e.returnValue = ''
        }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
}, [isDiagnosisComplete, diagnosisValues, staffNotes, photos])

// 修正案4: 「次の診断へ」ボタンにDB保存確認を追加
<Button onClick={async () => {
    await saveImmediately({ diagnosisValues, staffNotes, photos })
    router.push('/staff/scan')
}}>
```

---

## 3. Bug #2: カメラ接続の不安定性

### 3.1 症状

- カメラ起動後、撮影ができない（「接続中」のまま固まる）
- カメラから戻った後、アプリが無応答になる
- 写真撮影後のプレビューが表示されない場合がある

### 3.2 根本原因分析

#### 原因1: MediaStream のリソースリーク

```typescript
// src/app/staff/diagnosis/[id]/page.tsx (line 907-915)
const stopCamera = () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop())
        setStream(null)
    }
    setIsCameraOpen(false)
    setCurrentPhotoType('')
}
```

**問題点**:
- `stopCamera` は `stream` ステートに依存しているが、実際の撮影はネイティブ `<input type="file" capture>` を使用
- ネイティブカメラ経由で撮影する場合、`stream` は `null` のまま
- レガシーの `videoRef` ベースのカメラストリームが停止されないケースがある
- コンポーネントのアンマウント時に `useEffect` cleanup でストリームを停止する処理がない

#### 原因2: ネイティブカメラ入力のイベントハンドリング

```typescript
// src/app/staff/diagnosis/[id]/page.tsx (line 772-780)
const handleSelectCamera = () => {
    setCurrentPhotoType(pendingPhotoType)
    setShowPhotoSourceModal(false)
    // hidden inputをクリックしてカメラを起動
    if (fileInputRef.current) {
        fileInputRef.current.click()
    }
}

// (line 792-803)
const handleFileCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !currentPhotoType) return  // ← currentPhotoType が空文字の場合、無視される
    
    const objectUrl = URL.createObjectURL(file)
    setPreviewPhoto({ url: objectUrl, type: currentPhotoType })
    event.target.value = ''
}
```

**問題点**:
- `setCurrentPhotoType(pendingPhotoType)` は非同期のReact state更新
- `fileInputRef.current.click()` は即座に実行される
- iOSのLINEアプリ内ブラウザ（LIFF）では、カメラアプリへの遷移で React のステート更新が中断される可能性がある
- カメラアプリから戻った際に `currentPhotoType` がまだ更新されていないと、`handleFileCapture` が `if (!currentPhotoType) return` で早期リターンする

#### 原因3: Blob URL のライフサイクル管理

```typescript
// src/app/staff/diagnosis/[id]/page.tsx (line 808-881)
const savePreviewPhoto = async () => {
    const localUrl = previewPhoto.url  // blob: URL
    const tempId = `${photoType}-${Date.now()}`
    
    // 1. 楽観的UI更新
    setPhotos(prev => [...prev.filter(p => p.type !== photoType), optimisticPhoto])
    
    // プレビューを即座に閉じる
    setPreviewPhoto(null)  // ← ここで previewPhoto を null にするが...
    
    // 2. バックグラウンドでアップロード
    const response = await fetch(localUrl)  // ← localUrl (blob:) はまだ有効
    const blob = await response.blob()
    // ...upload...
}
```

**問題点**:
- `URL.revokeObjectURL()` は `closePreview()` と `retakePhoto()` で呼ばれるが、`savePreviewPhoto()` では呼ばれない
- これにより、保存完了後もメモリ上に Blob URL が残り続ける（メモリリーク）
- ただし、ブラウザは通常これを自動解放するため、即座のクラッシュにはならない

### 3.3 LINE LIFF 固有の問題

- LINE アプリ内ブラウザでは `<input type="file" capture>` の動作がOS標準と異なる場合がある
- iOS では LIFF からカメラ起動時にアプリがバックグラウンドに回り、React state が再初期化される可能性がある
- Android の LINE アプリでは、カメラアプリへの遷移でページがリロードされるケースが報告されている

### 3.4 推奨修正

```typescript
// 修正案1: currentPhotoType を useRef にも保存
const currentPhotoTypeRef = useRef<string>('')

const handleSelectCamera = () => {
    currentPhotoTypeRef.current = pendingPhotoType  // ref に即時保存
    setCurrentPhotoType(pendingPhotoType)
    setShowPhotoSourceModal(false)
    if (fileInputRef.current) {
        fileInputRef.current.click()
    }
}

const handleFileCapture = (event) => {
    const file = event.target.files?.[0]
    const photoType = currentPhotoTypeRef.current || currentPhotoType
    if (!file || !photoType) return
    // ...
}

// 修正案2: コンポーネントアンマウント時のストリームクリーンアップ
useEffect(() => {
    return () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
        }
    }
}, [stream])

// 修正案3: savePreviewPhoto 後の Blob URL 解放
const savePreviewPhoto = async () => {
    // ...upload完了後...
    URL.revokeObjectURL(localUrl)  // メモリリーク防止
}
```

---

## 4. Bug #3: セッション切断（Session Disconnect）

### 4.1 症状

- 診断途中でセッションが切断され、入力データにアクセスできなくなる
- 「データの取得に失敗しました」エラーが表示される
- 再度QRスキャンしても前回のデータが復元されない

### 4.2 根本原因分析

#### 原因1: スタッフ認証のセッション切れ

```typescript
// src/app/api/diagnosis/complete/route.ts (line 28-37)
export async function POST(request: NextRequest) {
    const session = await getStaffSession()
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'unauthorized' },
            { status: 401 }
        )
    }
    // ...
}
```

**問題点**:
- `getStaffSession()` はクッキーベースの認証を使用
- イベント中の長時間セッション（数時間に及ぶ可能性）でセッションが期限切れになると、API呼び出しが `401 Unauthorized` で失敗する
- フロントエンドでは `401` エラーをgenericなエラーメッセージとして表示するため、スタッフはセッション切れと認識できない

#### 原因2: Network Recovery 機構の欠如

```typescript
// src/app/staff/diagnosis/[id]/page.tsx (line 370-537)
// fetchVisitData は useEffect 内で1回のみ実行
useEffect(() => {
    async function fetchVisitData() {
        try {
            const res = await fetch(`/api/staff/session?visitId=${encodeURIComponent(visitId)}`)
            // ...
        } catch (err) {
            console.error('[Diagnosis] Fetch error:', err)
            setVisitError('データの取得に失敗しました')
        } finally {
            setIsLoadingVisit(false)
        }
    }
    fetchVisitData()
}, [visitId])  // visitId が変わらない限り再実行されない
```

**問題点**:
- ネットワークエラー後のリトライ機構がない
- `visitId` は固定値のため、エラー発生後に再取得する方法がない（ページリロード以外）
- オフライン→オンライン復帰時の自動再接続がない

#### 原因3: localStorage のBlob URLフィルタリング

```typescript
// src/app/staff/diagnosis/[id]/page.tsx (line 303-311)
if (storedData.photos && storedData.photos.length > 0) {
    // 写真はURLが有効かチェックが必要（ローカルのobjectURLは失効するため）
    // サーバーURLの写真のみ復元
    const validPhotos = storedData.photos.filter(photo =>
        photo.url && !photo.url.startsWith('blob:')
    )
    if (validPhotos.length > 0) {
        setPhotos(validPhotos as PhotoData[])
    }
}
```

**問題点**:
- `blob:` URL はセッション切断やページリロードで無効化される（正しい処理）
- **しかし**、写真アップロードが成功しているのに楽観的UI更新のtempIdがDBのIDに置き換わる前に切断されると、localStorageにはblob URLが保存され、復元時にフィルタリングされて写真が消失する

### 4.3 推奨修正

```typescript
// 修正案1: API呼び出しに自動リトライを追加
async function fetchWithRetry(url: string, options?: RequestInit, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, options)
            if (res.status === 401) {
                // セッション切れの場合、ログイン画面にリダイレクト
                router.push('/staff/login?redirect=' + encodeURIComponent(window.location.pathname))
                throw new Error('セッションが切れました。再ログインしてください。')
            }
            return res
        } catch (error) {
            if (i === retries - 1) throw error
            await new Promise(r => setTimeout(r, 1000 * (i + 1)))
        }
    }
}

// 修正案2: オンライン復帰時の自動再取得
useEffect(() => {
    const handleOnline = () => {
        if (visitError) {
            fetchVisitData()  // 再取得
        }
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
}, [visitError])

// 修正案3: アップロード完了を待ってからlocalStorageを更新
const savePreviewPhoto = async () => {
    // ...アップロード成功後...
    // ★ localStorageも更新（blob URLをサーバーURLに置換）
    saveImmediately({
        diagnosisValues,
        staffNotes,
        photos: updatedPhotos.map(p => ({
            id: p.id,
            url: p.url,
            type: p.type,
            uploaded_at: p.uploaded_at,
        })),
    })
}
```

---

## 5. Bug #4: ステータス遷移の不整合

### 5.1 症状

- 管理画面で「診断中」のまま残るセッションがある
- 完了したはずの診断が「active」ステータスのまま
- 同じvisitに対して複数のステータスが競合する

### 5.2 根本原因分析

#### 原因1: 3つの異なるステータス更新ポイント

```
API Route                          | status 更新先           | currentStep 更新先
-----------------------------------|------------------------|---------------------
/api/diagnosis/complete (line 150) | 'completed'            | 'analysis_completed'
sendReportNotification (line 291)  | 'published'            | 'line_sent'
/api/line/confirm-delivery (line 37)| 'diagnosis_completed' | 'line_confirmed'
```

**不整合パターン**:

1. `diagnosis/complete` → `status: 'completed'`
2. `sendReportNotification` 成功 → `status: 'published'` (上書き)
3. `line/confirm-delivery` → `status: 'diagnosis_completed'` (また上書き!)

**問題**: `diagnosis_completed` は `published` よりも「前のステージ」のように見えるが、実際は最終確認後のステータス。命名が直感に反している。

#### 原因2: 非トランザクション的なステータス更新

```typescript
// /api/diagnosis/complete/route.ts
// Step 4: Visitステータスを更新
await db.update(visits).set({
    status: 'completed',                    // ← まず 'completed' に
    currentStep: 'analysis_completed',
}).where(eq(visits.id, visitId))

// Step 5: LINE通知送信
lineNotificationResult = await sendReportNotification(...)

// sendReportNotification 内部 (line 290-295):
await db.update(visits).set({
    status: 'published',                    // ← 成功したら 'published' に
    reportSentAt: sentAt,
    currentStep: 'line_sent',
}).where(eq(visits.id, visitId))
```

**問題点**:
- Step 4 と Step 5 がトランザクション外で実行
- LINE通知が途中で失敗した場合、`status: 'completed'` のまま放置される
- LINE通知は成功したが `confirm-delivery` API が呼ばれない場合、`status: 'published'` のまま放置される

#### 原因3: ステータス値の未標準化

DBスキーマでは `status` は `varchar(50)` で定義されており、ENUMではない：

```typescript
// src/db/schema/visits.ts (line 20)
status: varchar('status', { length: 50 }).default('active'),
```

使用されているステータス値（コードから抽出）:
- `'active'` - 初期状態
- `'completed'` - diagnosis/complete API
- `'published'` - LINE送信成功時
- `'diagnosis_completed'` - LINE配信確認後
- `'in_progress'` - 他箇所で使用（確認必要）

**問題**: ステータスの有効値と遷移ルールがコードレベルで強制されていない。

### 5.3 推奨修正

```typescript
// 修正案1: ステータスを enum 化（TypeScript + DB）
type VisitStatus = 
    | 'active'              // 来場登録済み
    | 'questionnaire_done'  // 問診完了
    | 'diagnosis_started'   // 診断開始
    | 'analysis_done'       // AI分析完了
    | 'report_created'      // レポート生成済み
    | 'line_sent'           // LINE送信済み
    | 'line_confirmed'      // LINE配信確認済み
    | 'completed'           // 最終完了

// 修正案2: ステータス遷移バリデーション
const VALID_TRANSITIONS: Record<VisitStatus, VisitStatus[]> = {
    'active': ['questionnaire_done', 'diagnosis_started'],
    'questionnaire_done': ['diagnosis_started'],
    'diagnosis_started': ['analysis_done'],
    'analysis_done': ['report_created'],
    'report_created': ['line_sent'],
    'line_sent': ['line_confirmed', 'completed'],
    'line_confirmed': ['completed'],
    'completed': [],
}

async function updateVisitStatus(visitId: string, newStatus: VisitStatus) {
    const [visit] = await db.select({ status: visits.status })
        .from(visits).where(eq(visits.id, visitId)).limit(1)
    
    const currentStatus = visit.status as VisitStatus
    if (!VALID_TRANSITIONS[currentStatus]?.includes(newStatus)) {
        throw new Error(`Invalid status transition: ${currentStatus} → ${newStatus}`)
    }
    
    await db.update(visits).set({ status: newStatus }).where(eq(visits.id, visitId))
}
```

---

## 6. Bug #5: Debounce保存のレースコンディション

### 6.1 症状

- 高速に診断値を入力すると、一部の値が保存されない
- ブラウザバックやタブ切り替え時にデータが消失する

### 6.2 根本原因分析

```typescript
// src/hooks/useDiagnosisStorage.ts (line 58-76)
const saveToStorage = useCallback(
    (data: Omit<DiagnosisStorageData, 'lastSaved'>) => {
        if (!storageKey) return
        
        // 既存のデバウンスをクリア
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }
        
        // デバウンス保存（500ms後に実行）
        debounceRef.current = setTimeout(() => {
            try {
                const saveData = { ...data, lastSaved: new Date().toISOString() }
                localStorage.setItem(storageKey, JSON.stringify(saveData))
            } catch (error) {
                console.error('Failed to save diagnosis data to storage:', error)
            }
        }, DEBOUNCE_MS)
    },
    [storageKey]
)
```

```typescript
// src/app/staff/diagnosis/[id]/page.tsx (line 326-344)
useEffect(() => {
    if (!visitId || isInitialLoad.current) return
    if (!isDiagnosisComplete) {
        saveToStorage({
            diagnosisValues,
            staffNotes,
            photos: photos.map(p => ({ ... })),
        })
    }
}, [visitId, diagnosisValues, staffNotes, photos, isDiagnosisComplete, saveToStorage])
```

**問題点**:
1. `useEffect` は `diagnosisValues` が変更されるたびに呼ばれる
2. 各呼び出しで前回のdebounceがキャンセルされる
3. 高速入力時、中間値は一度も保存されない（最後の値のみ保存）
4. **致命的**: コンポーネントの `useEffect` cleanup（line 144-148）でdebounceタイマーがクリアされるが、「最後の保存」を即時実行する処理がない

```typescript
// useDiagnosisStorage.ts (line 139-148)
useEffect(() => {
    return () => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)  // ← タイマーをキャンセルするだけ！
            // ★ 最後のデータを即時保存する処理がない
        }
    }
}, [])
```

### 6.3 推奨修正

```typescript
// 修正案: flush 機能を追加
const lastDataRef = useRef<Omit<DiagnosisStorageData, 'lastSaved'> | null>(null)

const saveToStorage = useCallback(
    (data: Omit<DiagnosisStorageData, 'lastSaved'>) => {
        if (!storageKey) return
        
        lastDataRef.current = data  // 最後のデータを常に保持
        
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }
        
        debounceRef.current = setTimeout(() => {
            flushToStorage()
        }, DEBOUNCE_MS)
    },
    [storageKey]
)

const flushToStorage = useCallback(() => {
    if (!storageKey || !lastDataRef.current) return
    try {
        const saveData = { ...lastDataRef.current, lastSaved: new Date().toISOString() }
        localStorage.setItem(storageKey, JSON.stringify(saveData))
        setLastSaved(new Date())
        lastDataRef.current = null
    } catch (error) {
        console.error('Failed to flush diagnosis data:', error)
    }
}, [storageKey])

// cleanup で最後のデータを即時保存
useEffect(() => {
    return () => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }
        flushToStorage()  // ★ アンマウント時に最後のデータを保存
    }
}, [flushToStorage])
```

---

## 7. 横断的課題: Vercelランタイム制約

### 7.1 Serverless Function のタイムアウト

```json
// vercel.json - maxDuration の指定なし
{
    "buildCommand": "pnpm run build",
    "outputDirectory": ".next",
    "framework": "nextjs",
    "installCommand": "pnpm install"
}
```

**問題点**:
- Vercel Hobby プランではServerless Function のデフォルトタイムアウトが **10秒**
- Pro プランでも **60秒** が上限
- AI分析（`/api/ai/generate-report`）は外部AIサービスへのリクエストを含み、応答に10秒以上かかる可能性がある
- AI分析 → レポート生成 → LINE送信 のチェーンが1つのAPI呼び出し内で完結する設計のため、全体で10秒を超えるリスクが高い

### 7.2 API Route での `runtime` 設定

```typescript
// /api/ai/generate-report/route.ts - runtime 指定なし
// /api/diagnosis/complete/route.ts - runtime 指定なし
// export const runtime = 'edge' または maxDuration の指定が必要
```

### 7.3 推奨修正

```typescript
// 各APIルートに runtime 設定を追加
// /api/ai/generate-report/route.ts
export const maxDuration = 30  // 30秒に延長（Pro plan）

// /api/diagnosis/complete/route.ts  
export const maxDuration = 15  // LINE送信を含むため15秒

// 長期的には: AI分析を非同期キュー化
// Step 1: /api/ai/generate-report → ジョブIDを返す
// Step 2: フロントエンドがポーリングで完了を待つ
// Step 3: 完了後に /api/report/[id]/create を呼ぶ
```

---

## 8. 修正優先度マトリクス

| 優先度 | バグ | 修正内容 | 工数 | 影響範囲 |
|--------|------|----------|------|----------|
| **P0** | データ消失 | `completeDiagnosis`にDB最終保存追加 | 2h | 全ユーザー |
| **P0** | データ消失 | `runAnalysis`のDB保存失敗をブロッキングに | 1h | 全ユーザー |
| **P0** | データ消失 | `beforeunload`イベントで`saveImmediately`呼び出し | 1h | 全ユーザー |
| **P1** | デバウンスRC | `flushToStorage`追加（アンマウント時の即時保存） | 2h | 高速操作時 |
| **P1** | カメラ | `currentPhotoType`をRefに二重保存 | 1h | LIFF/モバイル |
| **P1** | ステータス | ステータス遷移の整理と命名統一 | 4h | 管理画面 |
| **P2** | セッション | APIリトライ機構の追加 | 3h | ネットワーク不安定時 |
| **P2** | セッション | オンライン復帰時の自動再取得 | 2h | モバイル |
| **P2** | Vercel | `maxDuration`設定の追加 | 0.5h | AI分析 |
| **P3** | カメラ | MediaStreamクリーンアップの強化 | 1h | レガシーカメラ |
| **P3** | カメラ | Blob URLメモリリーク修正 | 0.5h | 長時間使用時 |

---

## 9. 修正実装プラン

### Phase 1: P0 修正（即時対応 - 次回イベント前に必須）

#### Task 1.1: データ保存の確実化

**ファイル**: `src/app/staff/diagnosis/[id]/page.tsx`

1. `completeDiagnosis` 関数に最終DB保存を追加
2. `runAnalysis` のDB保存失敗をブロッキングエラーに変更
3. `beforeunload` イベントハンドラを追加
4. 「次の診断へ」ボタンに `saveImmediately` を追加

#### Task 1.2: Debounce Flush の追加

**ファイル**: `src/hooks/useDiagnosisStorage.ts`

1. `lastDataRef` を追加
2. `flushToStorage` 関数を追加
3. cleanup useEffect に `flushToStorage` を追加
4. `flushToStorage` を外部に公開

### Phase 2: P1 修正（次回イベントまでに対応）

#### Task 2.1: カメラ安定化

1. `currentPhotoTypeRef` の追加
2. `handleFileCapture` で ref と state の両方をチェック

#### Task 2.2: ステータス遷移の整理

1. `VisitStatus` 型の定義
2. `VALID_TRANSITIONS` マップの作成
3. `updateVisitStatus` ユーティリティの作成
4. 各API Routeでの使用

### Phase 3: P2/P3 修正（中期対応）

#### Task 3.1: ネットワークレジリエンス

1. `fetchWithRetry` ユーティリティの作成
2. 認証エラー（401）の適切なハンドリング
3. `online` イベントでの自動再取得

#### Task 3.2: Vercel最適化

1. `maxDuration` 設定の追加
2. AI分析の非同期化（将来的）

---

## 付録: コードリファレンス

### 主要ファイル一覧

| ファイル | 説明 | 行数 |
|----------|------|------|
| `src/app/staff/diagnosis/[id]/page.tsx` | 診断メインページ | 2992 |
| `src/hooks/useDiagnosisStorage.ts` | LocalStorage永続化フック | 191 |
| `src/app/api/diagnosis/complete/route.ts` | 診断完了API | 304 |
| `src/app/api/line/confirm-delivery/route.ts` | LINE配信確認API | 48 |
| `src/db/schema/visits.ts` | Visitスキーマ定義 | 140 |

### ステータス遷移フロー（現状）

```
[active] ─── diagnosis/complete ──→ [completed]
                                         │
                                   LINE送信成功?
                                    ├─ Yes ──→ [published]
                                    │               │
                                    │         配信確認完了?
                                    │          ├─ Yes ──→ [diagnosis_completed]
                                    │          └─ No  ──→ [published] のまま
                                    └─ No  ──→ [completed] のまま
```

### ステータス遷移フロー（推奨）

```
[active] → [diagnosis_in_progress] → [analysis_done] → [report_created]
    → [line_sent] → [line_confirmed] → [completed]
```
