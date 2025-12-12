# LIFF実装の前提条件と手順 (cOralup Platform)

**最終更新: 2024-12-12**

---

## ⚠️ 重要な前提条件

### Messaging APIチャネルではLIFFアプリを作成できない

LINE Developers Consoleの警告通り、**Messaging APIチャネルにはLIFFアプリを追加できません**。

**必要な構成:**
- **1つのLINE公式アカウント**（ユーザーが友だち追加するアカウント）
  - **Messaging APIチャネル**: 友だち追加、Webhook、メッセージ送信用
  - **LINE Loginチャネル**: LIFFアプリ作成用（別途必要）

**重要:** LINE公式アカウントは1つでOK。そのアカウントに複数のチャネル（Messaging API + LINE Login）を紐づける。

---

## スタッフ向けLIFF実装 ✅ 完了

### 実装済みファイル

| ファイル | 用途 |
|---------|------|
| `src/app/staff/liff-login/page.tsx` | LIFFログイン画面 |
| `src/app/api/auth/staff-session/route.ts` | セッション発行API |
| `src/lib/staff-auth.ts` | JWT認証ユーティリティ |
| `src/app/staff/login/page.tsx` | ログイン案内画面（Cookie切れ時） |
| `src/app/staff/home/page.tsx` | ホーム画面 |
| `src/app/staff/history/page.tsx` | 対応履歴一覧 |

### 実装済みフロー

```typescript
// src/app/staff/liff-login/page.tsx の実装

'use client'
import { useEffect, useState } from 'react'

export default function LiffLoginPage() {
  useEffect(() => {
    const initLiff = async () => {
      // 1. LIFF SDKを動的インポート
      const liff = (await import('@line/liff')).default
      
      // 2. LIFF初期化
      await liff.init({ liffId: process.env.NEXT_PUBLIC_STAFF_LIFF_ID })
      
      // 3. LINEログインしていない場合は自動ログイン
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: window.location.href })
        return
      }
      
      // 4. プロフィール取得
      const profile = await liff.getProfile()
      
      // 5. セッション発行API呼び出し
      const res = await fetch('/api/auth/staff-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineUserId: profile.userId })
      })
      
      // 6. 成功したらホームへリダイレクト
      if (res.ok) {
        window.location.href = '/staff/home'
      }
    }
    
    initLiff()
  }, [])
  
  return <div>ログイン中...</div>
}
```

---

## 親御さん向けLIFF（今後実装）

### 必要な作業

1. **LINE Loginチャネル確認/作成**
   - 既存のLINE公式アカウントにLINE Loginチャネルを追加
   - または新規作成

2. **LIFFアプリ作成**
   - エンドポイントURL: `/parent/questionnaire/[id]`
   - サイズ: Full
   - Scope: profile

3. **コード変更**
   - LIFF初期化コード追加
   - ハイブリッド実装（LIFF + localStorage）

### 環境変数

```env
# 親御さん用LINE Login
LINE_LOGIN_CHANNEL_ID=xxxxx
LINE_LOGIN_CHANNEL_SECRET=xxxxx
NEXT_PUBLIC_PARENT_LIFF_ID=xxxxx-xxxxx
```

---

## 通常のWebアプリ vs LIFFの違い

### 1. 開発・実装の違い

| 項目 | 通常のWebアプリ | LIFF |
|------|---------------|------|
| **実行環境** | ブラウザ（Safari/Chrome等） | LINEアプリ内 |
| **URLアクセス** | 直接URLでアクセス可能 | LIFF URL経由のみ |
| **セッション管理** | Cookie/localStorage | LINE側で管理 |
| **認証** | 独自実装 | LINE Login自動認証 |
| **データ保存** | localStorage/DB | LINE側 + localStorage/DB |

### 2. 実装手順の違い

#### 通常のWebアプリ（現在の実装）

```typescript
// 1. 通常のReactコンポーネント
export default function QuestionnairePage() {
  // 2. localStorageでデータ保存
  const { saveData } = useQuestionnaireStorage()
  
  // 3. 通常のAPI呼び出し
  const res = await fetch('/api/parent/questionnaire', { ... })
}
```

**特徴:**
- ブラウザで直接アクセス可能
- localStorage依存
- セッション管理は独自実装

#### LIFF実装

```typescript
// 1. LIFF SDK初期化が必要
import liff from '@line/liff'

useEffect(() => {
  const initLiff = async () => {
    await liff.init({ liffId: process.env.NEXT_PUBLIC_PARENT_LIFF_ID })
    
    // LINEアプリ内でない場合はエラー
    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: window.location.href })
      return
    }
    
    // プロフィール取得（自動認証）
    const profile = await liff.getProfile()
  }
}, [])

// 2. データ保存は同じ（localStorage + DB）
// 3. API呼び出しも同じ
```

**特徴:**
- LINEアプリ内でのみ動作
- LINE側でセッション管理
- 自動認証（line_user_id取得）

### 3. コード変更の違い

| 変更箇所 | 通常のWebアプリ | LIFF |
|---------|---------------|------|
| **初期化** | 不要 | LIFF SDK初期化必要 |
| **認証** | 不要（または独自実装） | LINE Login自動認証 |
| **データ保存** | localStorage | localStorage + LINE側セッション |
| **API呼び出し** | 同じ | 同じ |
| **UI/UX** | 同じ | 同じ（LINEアプリ内で表示） |

---

## 実装方針の選択

### オプション1: LIFF前提で実装

**メリット:**
- ブラウザ起動の問題を回避
- セッション管理が確実
- 端末依存が少ない

**デメリット:**
- LINEアプリ内でのみ動作（外部ブラウザ不可）
- LINE Loginチャネルが必要
- 初期化コードが必要

### オプション2: ハイブリッド実装（推奨）

**メリット:**
- LINEアプリ内: LIFF使用（確実性向上）
- 外部ブラウザ: localStorage使用（互換性維持）
- 両方に対応

**実装:**
```typescript
// LINEアプリ内判定
const isInLineApp = /Line/i.test(navigator.userAgent)

if (isInLineApp) {
  // LIFF使用
  await liff.init({ liffId })
} else {
  // localStorage使用（既存の実装）
  useQuestionnaireStorage()
}
```

### オプション3: 現状維持（localStorageのみ）

**メリット:**
- 実装変更不要
- シンプル

**デメリット:**
- ブラウザ起動の問題が残る
- データ消失リスク

---

## 推奨: ハイブリッド実装

**理由:**
1. **確実性**: LINEアプリ内ではLIFFで確実に動作
2. **互換性**: 外部ブラウザでも動作（フォールバック）
3. **実装コスト**: 約1時間で実装可能
4. **リスク分散**: 両方に対応することで、どちらでも動作

---

## LINE Developers Console設定手順

### 1. スタッフ用（設定が必要）

1. **プロバイダー作成**（既存があれば不要）
2. **Messaging APIチャネル作成**
   - チャネル名: `cOralupスタッフ`
   - Webhook URL: `https://your-domain.vercel.app/api/line/staff-webhook`
3. **LINE Loginチャネル作成**
   - チャネル名: `cOralupスタッフ Login`
4. **LIFFアプリ作成**
   - エンドポイントURL: `https://your-domain.vercel.app/staff/liff-login`
   - サイズ: Full
5. **環境変数設定**
   ```env
   LINE_STAFF_CHANNEL_ID=xxxxx
   LINE_STAFF_CHANNEL_SECRET=xxxxx
   LINE_STAFF_CHANNEL_ACCESS_TOKEN=xxxxx
   NEXT_PUBLIC_STAFF_LIFF_ID=xxxxx-xxxxx
   STAFF_SESSION_SECRET=your-random-secret
   ```

### 2. 親御さん用（今後）

同様の手順で設定。

---

## まとめ

**スタッフ向けLIFF実装は完了 ✅**

残りは以下の手動設定：
1. LINE Developers Consoleでチャネル作成
2. LIFF作成
3. Webhook URL設定
4. 環境変数設定
5. E2Eテスト

**親御さん向けは今後実装予定。スタッフ向けと同様のパターンで実装可能。**
