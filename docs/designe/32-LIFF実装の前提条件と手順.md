# LIFF実装の前提条件と手順 (cOralup Platform)

**最終更新: 2024-12-09**

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

## 既存の親御さん向け公式アカウントの確認

### 現在の構成を確認する必要がある

| 確認項目 | 内容 |
|---------|------|
| **LINE公式アカウント** | 既存？ 新規作成？ |
| **Messaging APIチャネル** | 既存？ 新規作成？ |
| **LINE Loginチャネル** | 既存？ 新規作成？ |
| **LIFFアプリ** | 既に作成済み？ 未作成？ |
| **環境変数** | `LINE_CHANNEL_ID` は Messaging API？ LINE Login？ |

### 確認方法

1. **LINE Developers Console** で親御さん用チャネルを開く
2. **「LIFF」タブ** を確認
   - LIFFアプリが既にある → そのまま使用可能
   - LIFFアプリがない → LINE Loginチャネルが必要

### 想定されるケース

#### ケース1: 既存アカウント + Messaging APIチャネルのみ（LIFF未作成）

```
現在の構成:
- LINE公式アカウント: 既存
- Messaging APIチャネル: 既存（友だち追加、Webhook用）

必要な作業:
1. 既存のLINE公式アカウントにLINE Loginチャネルを追加作成
2. LINE Loginチャネル内でLIFFアプリ作成
3. 環境変数追加（LINE Loginチャネル用）
   - LINE_LOGIN_CHANNEL_ID
   - LINE_LOGIN_CHANNEL_SECRET
   - NEXT_PUBLIC_PARENT_LIFF_ID
```

#### ケース2: 既存アカウント + Messaging API + LINE Loginチャネル（LIFF既存）

```
現在の構成:
- LINE公式アカウント: 既存
- Messaging APIチャネル: 既存（友だち追加、Webhook用）
- LINE Loginチャネル: 既に存在
- LIFFアプリ: 既に作成済み

必要な作業:
1. 既存のLIFFアプリのエンドポイントURLを確認
2. 必要に応じてエンドポイントURLを更新
3. 環境変数確認（`NEXT_PUBLIC_PARENT_LIFF_ID`）
```

#### ケース3: 一から作り直す

```
新規作成:
- LINE公式アカウント: 新規作成
- Messaging APIチャネル: 新規作成（友だち追加、Webhook用）
- LINE Loginチャネル: 新規作成（LIFFアプリ用）
- LIFFアプリ: 新規作成

必要な作業:
1. LINE公式アカウント作成
2. Messaging APIチャネル作成
3. LINE Loginチャネル作成
4. LINE Loginチャネル内でLIFFアプリ作成
5. 環境変数設定（全て新規）
```

**メリット:**
- 構成がクリーン
- 既存の設定に影響しない
- 一から設計できる

**デメリット:**
- 友だち数が0から開始
- 既存のWebhook設定を移行する必要がある

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

### 4. デプロイ・設定の違い

#### 通常のWebアプリ

```yaml
必要な設定:
- Vercelデプロイ: 通常通り
- 環境変数: 通常のもののみ
- URL: 直接アクセス可能
```

#### LIFF

```yaml
必要な設定:
- Vercelデプロイ: 通常通り（変更なし）
- LINE Loginチャネル作成: 新規作成または既存確認
- LIFFアプリ作成: LINE Loginチャネル内で作成
- 環境変数追加: NEXT_PUBLIC_PARENT_LIFF_ID
- エンドポイントURL: /parent/questionnaire/[id]
```

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

**実装:**
- LIFF SDK初期化を必須にする
- 外部ブラウザではエラー表示

### オプション2: ハイブリッド実装（推奨）

**メリット:**
- LINEアプリ内: LIFF使用（確実性向上）
- 外部ブラウザ: localStorage使用（互換性維持）
- 両方に対応

**デメリット:**
- 実装が少し複雑
- 両方のケースをテスト必要

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

## 実装前の確認事項

### 1. 既存チャネルの確認

- [ ] 親御さん用LINE公式アカウントのチャネルタイプ確認
- [ ] LINE Loginチャネルの有無確認
- [ ] 既存LIFFアプリの有無確認

### 2. 環境変数の確認

- [ ] `LINE_CHANNEL_ID`: Messaging APIチャネルID
- [ ] `LINE_CHANNEL_SECRET`: Messaging APIチャネルシークレット
- [ ] `NEXT_PUBLIC_PARENT_LIFF_ID`: LIFF ID（未設定の場合は新規作成必要）

### 3. 実装方針の決定

- [ ] LIFF前提で実装するか
- [ ] ハイブリッド実装にするか
- [ ] 現状維持にするか

---

## まとめ

**質問への回答:**

1. **「既存の親御さん向け公式アカウントとLIFFってあまり気にしなくていいの？」**
   - **いいえ、確認が必要です。** Messaging APIチャネルではLIFFアプリを作成できないため、LINE Loginチャネルが必要です。

2. **「そのままLIFF前提で実装できるもの？」**
   - **条件付きで可能です。** LINE Loginチャネルが既にある、または新規作成できる場合のみ可能です。

3. **「通常のWebアプリとLIFFにする場合の開発や実装や手順の違いがあまりわかってない」**
   - **主な違い:**
     - LIFF: LINEアプリ内でのみ動作、初期化コード必要、LINE側セッション管理
     - 通常のWebアプリ: ブラウザで直接アクセス可能、初期化不要、独自セッション管理
   - **実装手順:** LIFF SDK初期化を追加するだけ（API呼び出しやUIは同じ）

**推奨:** ハイブリッド実装（LINEアプリ内: LIFF、外部ブラウザ: localStorage）で、確実性と互換性を両立。

