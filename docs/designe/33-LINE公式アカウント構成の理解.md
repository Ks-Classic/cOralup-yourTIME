# LINE公式アカウント構成の理解 (cOralup Platform)

**最終更新: 2024-12-12**

---

## 基本概念

### LINE公式アカウント = 1つ

**LINE公式アカウント**は、ユーザーが友だち追加する**1つのアカウント**です。

```
ユーザーの視点:
┌─────────────────────┐
│  LINE公式アカウント  │  ← これが1つ
│   「cOralup」        │
└─────────────────────┘
```

### チャネル = 複数紐づけ可能

**チャネル**は、そのアカウントに紐づく**技術的な設定**です。1つのアカウントに複数のチャネルを紐づけることができます。

```
LINE Developers Consoleの視点:
┌─────────────────────────────────────┐
│  LINE公式アカウント「cOralup」       │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐ │
│  │ Messaging APIチャネル          │ │ ← チャネル1
│  │ - 友だち追加                   │ │
│  │ - Webhook                      │ │
│  │ - メッセージ送信                │ │
│  └───────────────────────────────┘ │
│  ┌───────────────────────────────┐ │
│  │ LINE Loginチャネル              │ │ ← チャネル2
│  │ - LIFFアプリ作成                │ │
│  │ - OAuth認証                     │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## cOralupの構成

### 親御さん向け: 1アカウント + 2チャネル

```
LINE公式アカウント「cOralup」（1つ）
├── Messaging APIチャネル
│   ├── 友だち追加
│   ├── Webhook（/api/line/webhook）
│   └── メッセージ送信（レポート送信）
│
└── LINE Loginチャネル
    ├── LIFFアプリ（問診画面）
    └── OAuth認証
```

**環境変数:**
```env
# Messaging APIチャネル用
LINE_CHANNEL_ID=xxxxx
LINE_CHANNEL_SECRET=xxxxx
LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=xxxxx

# LINE Loginチャネル用
LINE_LOGIN_CHANNEL_ID=xxxxx
LINE_LOGIN_CHANNEL_SECRET=xxxxx
NEXT_PUBLIC_PARENT_LIFF_ID=xxxxx-xxxxx
```

### スタッフ向け: 1アカウント + 2チャネル ✅ 実装完了

```
LINE公式アカウント「cOralupスタッフ」（1つ）
├── Messaging APIチャネル ✅
│   ├── 友だち追加 → profiles作成
│   ├── Webhook（/api/line/staff-webhook）
│   └── メッセージ受信 → 名前登録
│
└── LINE Loginチャネル ✅
    ├── LIFFアプリ（/staff/liff-login）
    └── OAuth認証 → Cookie発行
```

**環境変数:**
```env
# Messaging APIチャネル用
LINE_STAFF_CHANNEL_ID=xxxxx
LINE_STAFF_CHANNEL_SECRET=xxxxx
LINE_STAFF_CHANNEL_ACCESS_TOKEN=xxxxx

# LINE Loginチャネル用
NEXT_PUBLIC_STAFF_LIFF_ID=xxxxx-xxxxx

# セッション管理
STAFF_SESSION_SECRET=xxxxx
CORALUP_ORG_ID=xxxxx
```

---

## 既存アカウント vs 新規作成

### 既存アカウントを使用する場合

**メリット:**
- 友だち数が維持される
- 既存の設定を活用できる

**必要な作業:**
1. 既存のLINE公式アカウントにLINE Loginチャネルを追加作成
2. LINE Loginチャネル内でLIFFアプリ作成
3. 環境変数追加

**注意点:**
- Messaging APIチャネルは既存のまま使用可能
- LINE Loginチャネルだけ新規追加すればOK

### 一から作り直す場合

**メリット:**
- 構成がクリーン
- 既存の設定に影響しない
- 一から設計できる

**デメリット:**
- 友だち数が0から開始
- 既存のWebhook設定を移行する必要がある

**必要な作業:**
1. LINE公式アカウント新規作成
2. Messaging APIチャネル新規作成
3. LINE Loginチャネル新規作成
4. LINE Loginチャネル内でLIFFアプリ作成
5. 環境変数設定（全て新規）

---

## 実装状況サマリー

### スタッフ向け ✅

| 項目 | 状態 | ファイル |
|------|------|---------|
| Webhook API | ✅ | `src/app/api/line/staff-webhook/route.ts` |
| セッション発行API | ✅ | `src/app/api/auth/staff-session/route.ts` |
| 認証ユーティリティ | ✅ | `src/lib/staff-auth.ts` |
| LIFFログイン画面 | ✅ | `src/app/staff/liff-login/page.tsx` |
| ログイン案内画面 | ✅ | `src/app/staff/login/page.tsx` |
| ホーム画面 | ✅ | `src/app/staff/home/page.tsx` |
| 対応履歴一覧 | ✅ | `src/app/staff/history/page.tsx` |
| 対応詳細 | ✅ | `src/app/staff/history/[sessionId]/page.tsx` |
| ログアウト | ✅ | `src/app/staff/logout/page.tsx` |

### 親御さん向け 📋

| 項目 | 状態 |
|------|------|
| Webhook API | ✅ 既存 |
| LIFF問診画面 | 📋 今後実装 |

---

## まとめ

**質問への回答: 「Messaging API + LINE Login とするなら1つのアカウントでいいってこと？」**

**はい、その通りです。**

- **LINE公式アカウント**: 1つ（ユーザーが友だち追加するアカウント）
- **チャネル**: 2つ（Messaging API + LINE Login）

**cOralupの構成:**
- **親御さん用**: 1アカウント + 2チャネル
- **スタッフ用**: 1アカウント + 2チャネル ✅ 実装完了

**スタッフ向けは既にコード実装完了。LINE Developers Console設定のみ残り。**
