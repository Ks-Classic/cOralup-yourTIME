# ルーティング戦略比較: タブ切り替え vs URLパス分け

## 概要

スタッフ向けページのナビゲーションについて、以下の2つのアプローチを比較検討します：

1. **タブ切り替え方式**: 1つのページ（例: `/staff`）内でタブを使って内容を切り替える
2. **URLパス分け方式**: 各機能ごとに独立したURLパスを用意する（例: `/staff/session`, `/staff/diagnosis`）

---

## 比較表

| 観点 | タブ切り替え方式 | URLパス分け方式 |
|------|-----------------|----------------|
| **URLの共有・ブックマーク** | ❌ タブ状態がURLに反映されない | ✅ 特定のページを直接共有可能 |
| **ブラウザの戻る/進む** | ❌ タブ切り替えが履歴に残らない | ✅ 各ページが履歴に残る |
| **ページリロード時の状態保持** | ❌ タブ状態が失われる | ✅ URLから状態を復元可能 |
| **開発の複雑さ** | ✅ 1つのページで完結 | ⚠️ 複数のページファイルが必要 |
| **コードの再利用性** | ⚠️ コンポーネント化が必要 | ✅ 各ページが独立 |
| **パフォーマンス** | ✅ 初期ロード後は高速 | ⚠️ ページ遷移時に再レンダリング |
| **SEO** | ⚠️ 1つのURLのみ | ✅ 各ページが独立したURL |
| **デバッグの容易さ** | ⚠️ 状態管理が複雑 | ✅ 各ページが独立してデバッグ可能 |
| **アクセシビリティ** | ⚠️ タブの状態管理が必要 | ✅ 標準的なナビゲーション |
| **モバイル対応** | ✅ タブUIでコンパクト | ⚠️ ナビゲーションが必要 |

---

## 詳細比較

### 1. URLの共有・ブックマーク

#### タブ切り替え方式
```typescript
// すべて /staff という同じURL
/staff?tab=session  // ❌ クエリパラメータが必要
/staff?tab=diagnosis
```

**問題点:**
- タブ状態をURLに反映させるには、クエリパラメータやハッシュが必要
- ブックマークしても、デフォルトのタブが表示される
- 特定のタブを直接共有するのが難しい

#### URLパス分け方式
```typescript
// 各機能が独立したURL
/staff/session     // ✅ 直接アクセス可能
/staff/diagnosis   // ✅ 直接アクセス可能
/staff/analysis    // ✅ 直接アクセス可能
```

**メリット:**
- 各ページを直接ブックマーク可能
- URLをコピー&ペーストで共有可能
- ブラウザの履歴に残る

---

### 2. ブラウザの戻る/進むボタン

#### タブ切り替え方式
```typescript
// タブ切り替えは履歴に残らない
ユーザー操作: タブ1 → タブ2 → タブ3
ブラウザ履歴: /staff (1つだけ)
戻るボタン: /staff から前のページへ（タブ状態は失われる）
```

#### URLパス分け方式
```typescript
// 各ページ遷移が履歴に残る
ユーザー操作: /staff → /staff/session → /staff/diagnosis
ブラウザ履歴: /staff → /staff/session → /staff/diagnosis
戻るボタン: /staff/diagnosis → /staff/session → /staff
```

---

### 3. 開発・管理・運用上の観点

#### タブ切り替え方式

**メリット:**
- ✅ 1つのページファイルで完結（`/staff/page.tsx`）
- ✅ 状態管理が1箇所に集約
- ✅ ページ遷移のオーバーヘッドがない
- ✅ モバイルでタブUIがコンパクト

**デメリット:**
- ❌ ページが肥大化する可能性
- ❌ 各タブのコンポーネントを適切に分離する必要がある
- ❌ タブ状態をURLに反映させる実装が必要（`useSearchParams`など）
- ❌ デバッグ時にどのタブで問題が発生したか特定しにくい
- ❌ パフォーマンス分析が難しい（1つのURLに全機能が集約）

**実装例:**
```typescript
// /staff/page.tsx
'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function StaffPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') || 'dashboard'

  const handleTabChange = (value: string) => {
    router.push(`/staff?tab=${value}`)
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="dashboard">ダッシュボード</TabsTrigger>
        <TabsTrigger value="session">セッション一覧</TabsTrigger>
        <TabsTrigger value="diagnosis">診断入力</TabsTrigger>
        {/* ... */}
      </TabsList>
      <TabsContent value="dashboard"><DashboardContent /></TabsContent>
      <TabsContent value="session"><SessionListContent /></TabsContent>
      <TabsContent value="diagnosis"><DiagnosisContent /></TabsContent>
      {/* ... */}
    </Tabs>
  )
}
```

#### URLパス分け方式

**メリット:**
- ✅ 各ページが独立して開発・テスト可能
- ✅ コードの分離が明確（各ページが独立したファイル）
- ✅ デバッグが容易（どのページで問題が発生したか明確）
- ✅ パフォーマンス分析が容易（各ページのパフォーマンスを個別に測定）
- ✅ 権限管理が容易（特定のページへのアクセス制御）
- ✅ ログ分析が容易（どのページがよく使われているか明確）
- ✅ エラーハンドリングが明確（404エラーなど）
- ✅ キャッシュ戦略を個別に設定可能

**デメリット:**
- ⚠️ 複数のページファイルが必要
- ⚠️ 共通レイアウトの管理が必要（ただし、`layout.tsx`で解決可能）
- ⚠️ ページ遷移時のローディング状態が必要

**実装例:**
```typescript
// /staff/session/page.tsx
export default function SessionListPage() {
  // セッション一覧の実装
}

// /staff/diagnosis/page.tsx
export default function DiagnosisPage() {
  // 診断入力の実装
}
```

---

### 4. Next.js App Routerでの実装

#### タブ切り替え方式（クエリパラメータ使用）

```typescript
// /staff/page.tsx
'use client'
import { useSearchParams, useRouter } from 'next/navigation'

export default function StaffPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tab = searchParams.get('tab') || 'dashboard'

  return (
    <div>
      {/* タブUI */}
      {/* コンテンツ切り替え */}
    </div>
  )
}
```

**注意点:**
- `useSearchParams`は`Suspense`でラップする必要がある場合がある
- サーバーコンポーネントでは使えない

#### URLパス分け方式（推奨）

```typescript
// /staff/layout.tsx - 共通レイアウト
export default function StaffLayout({ children }) {
  return (
    <div>
      <Sidebar />
      <main>{children}</main>
    </div>
  )
}

// /staff/session/page.tsx
export default function SessionListPage() {
  // セッション一覧
}

// /staff/diagnosis/page.tsx
export default function DiagnosisPage() {
  // 診断入力
}
```

**メリット:**
- Next.js App Routerの設計思想に沿っている
- サーバーコンポーネントとクライアントコンポーネントを適切に分離可能
- 各ページで個別にメタデータを設定可能

---

## このプロジェクトでの推奨アプローチ

### **URLパス分け方式を推奨**

**理由:**

1. **現在のプロジェクト構造との整合性**
   - 既に `/staff/session/[id]`, `/staff/diagnosis/[id]` などの動的ルートが存在
   - レイアウトファイル（`/staff/layout.tsx`）で共通UIを管理可能
   - ナビゲーション構造が明確

2. **開発・運用上のメリット**
   - 各機能が独立して開発・テスト可能
   - デバッグが容易（どのページで問題が発生したか明確）
   - ログ分析が容易（アクセス解析で各ページの使用状況を把握可能）
   - エラーハンドリングが明確（404エラーなど）

3. **ユーザー体験**
   - ブックマーク可能
   - URL共有が容易
   - ブラウザの戻る/進むボタンが自然に動作

4. **将来の拡張性**
   - 権限管理（特定のページへのアクセス制御）が容易
   - ページごとのキャッシュ戦略を設定可能
   - ページごとのメタデータ（SEO）を設定可能

### ハイブリッドアプローチ（オプション）

特定の機能グループ内でタブを使う場合は、以下のように組み合わせる：

```typescript
// /staff/session/page.tsx - セッション一覧（タブなし）
export default function SessionListPage() {
  // セッション一覧の実装
}

// /staff/session/[id]/page.tsx - セッション詳細（タブで情報を切り替え）
export default function SessionDetailPage({ params }) {
  return (
    <Tabs>
      <TabsList>
        <TabsTrigger value="info">基本情報</TabsTrigger>
        <TabsTrigger value="questionnaire">問診票</TabsTrigger>
        <TabsTrigger value="diagnosis">診断結果</TabsTrigger>
      </TabsList>
      {/* ... */}
    </Tabs>
  )
}
```

**この場合:**
- セッション詳細ページ内でタブを使用（関連情報の切り替え）
- セッション一覧ページは独立したURL（`/staff/session`）

---

## 実装推奨事項

### 1. 基本構造

```
/staff/
  ├── layout.tsx          # 共通レイアウト（サイドバー、ヘッダー）
  ├── page.tsx            # ダッシュボード（/staff）
  ├── session/
  │   ├── page.tsx        # セッション一覧（/staff/session）
  │   └── [id]/
  │       └── page.tsx   # セッション詳細（/staff/session/[id]）
  ├── diagnosis/
  │   ├── page.tsx        # 診断入力一覧（/staff/diagnosis）
  │   └── [id]/
  │       └── page.tsx   # 診断入力詳細（/staff/diagnosis/[id]）
  ├── analysis/
  │   ├── page.tsx        # AI分析一覧（/staff/analysis）
  │   └── [id]/
  │       └── page.tsx   # AI分析詳細（/staff/analysis/[id]）
  └── report/
      ├── page.tsx        # レポート一覧（/staff/report）
      └── [id]/
          └── page.tsx   # レポート詳細（/staff/report/[id]）
```

### 2. ナビゲーションの実装

```typescript
// /staff/layout.tsx
const navigation = [
  { href: '/staff', label: 'ダッシュボード' },
  { href: '/staff/session', label: 'セッション一覧' },
  { href: '/staff/diagnosis', label: '診断入力' },
  { href: '/staff/analysis', label: 'AI分析' },
  { href: '/staff/report', label: 'レポート送信' },
]
```

### 3. アクティブ状態の管理

```typescript
// /staff/layout.tsx
const pathname = usePathname()
const isActive = pathname.startsWith(item.href) // ✅ 簡単に判定可能
```

---

## 結論

**このプロジェクトでは、URLパス分け方式を推奨します。**

理由:
1. ✅ 開発・運用・管理が容易
2. ✅ ユーザー体験が向上（ブックマーク、共有、履歴）
3. ✅ Next.js App Routerの設計思想に沿っている
4. ✅ 既存のプロジェクト構造と整合性がある
5. ✅ 将来の拡張性が高い

**タブ切り替え方式は、以下の場合に検討:**
- 関連性の高い情報を1つのページ内で切り替える場合（例: セッション詳細ページ内のタブ）
- モバイルで画面スペースを節約したい場合
- ページ遷移のオーバーヘッドを避けたい場合

ただし、その場合でもURLに状態を反映させる（クエリパラメータやハッシュ）ことを推奨します。

