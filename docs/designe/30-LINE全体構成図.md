# LINE全体構成図 (cOralup Platform)

**最終更新: 2024-12-09**

---

## 全体像

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LINE Platform                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────┐    ┌──────────────────────────┐     │
│  │  親御さん用LINE公式       │    │  スタッフ用LINE公式       │     │
│  │  「cOralup」              │    │  「cOralupスタッフ」      │     │
│  │                          │    │                          │     │
│  │  [Messaging API]         │    │  [Messaging API]         │     │
│  │  - 友だち追加Webhook     │    │  - 友だち追加Webhook     │     │
│  │  - レポート送信           │    │  - 通知送信               │     │
│  │                          │    │                          │     │
│  │  [LINE Login]           │    │  [LINE Login]            │     │
│  │  - LIFFアプリ（問診用）  │    │  - LIFFアプリ（認証用）   │     │
│  └──────────────────────────┘    └──────────────────────────┘     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ↓               ↓               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    Vercel (Next.js App)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  【親御さん向け】                                                    │
│  /api/line/webhook          - 友だち追加処理                       │
│  /api/line/send-report      - レポート送信                         │
│  /parent/questionnaire      - 問診画面（LIFF）                     │
│                                                                     │
│  【スタッフ向け】                                                    │
│  /api/line/staff-webhook     - 友だち追加処理                       │
│  /api/auth/staff-session     - セッション発行                       │
│  /staff/scan                 - QRスキャン（LIFF対応）              │
│  /staff/diagnosis/[id]       - 診断画面                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         Supabase                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  profiles (role: 'parent' | 'staff')                                │
│  ├── line_user_id                                                  │
│  ├── display_name                                                  │
│  └── role                                                          │
│                                                                     │
│  visits                                                             │
│  ├── staff_profile_id  ← スタッフ紐付け                            │
│  └── child_id         ← 子供紐付け                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## LINE公式アカウント一覧

### 1. 親御さん用「cOralup」（既存）

| 項目 | 内容 |
|------|------|
| **チャネル名** | cOralup |
| **チャネルタイプ** | Messaging API + LINE Login |
| **用途** | 親御さん向けサービス |
| **機能** | 友だち追加、問診票入力、レポート受信 |
| **Webhook** | `/api/line/webhook` |
| **LIFF** | 問診画面（`/parent/questionnaire`） |
| **環境変数** | `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`, `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` |

### 2. スタッフ用「cOralupスタッフ」（新規作成必要）

| 項目 | 内容 |
|------|------|
| **チャネル名** | cOralupスタッフ |
| **チャネルタイプ** | Messaging API + LINE Login（2チャネル） |
| **用途** | スタッフ認証・診断 |
| **機能** | スタッフ認証、QRスキャン、診断入力 |
| **Webhook** | `/api/line/staff-webhook` |
| **LIFF** | QRスキャン画面（`/staff/scan`） |
| **環境変数** | `LINE_STAFF_CHANNEL_ID`, `LINE_STAFF_CHANNEL_SECRET`, `LINE_STAFF_CHANNEL_ACCESS_TOKEN`, `LINE_STAFF_LOGIN_CHANNEL_ID`, `LINE_STAFF_LOGIN_CHANNEL_SECRET`, `NEXT_PUBLIC_STAFF_LIFF_ID` |

---

## フロー図

### 親御さんフロー

```
1. LINE公式「cOralup」を友だち追加
   ↓
2. Webhook → profiles作成 (role: 'parent')
   ↓
3. QRコード表示 → 問診票入力
   ↓
4. 診断完了後 → LINEでレポート受信
```

### スタッフフロー（最短）

```
1. LINEアプリからQRスキャン画面を開く（LIFF URL）
   ↓
2. LIFFで自動認証 → line_user_id取得
   ↓
3. QRスキャン → visitId取得
   ↓
4. スタッフ自動紐付け（line_user_id → staff_profile_id）
   ↓
5. 診断開始 → 診断入力 → 保存
```

---

## 必要な作業

### ✅ 既に完了

- [x] 親御さん用LINE公式アカウント（既存）
- [x] スタッフ認証実装（LIFF対応）
- [x] QRスキャン画面LIFF対応
- [x] スタッフ紐付けAPI実装

### 📋 残作業（手動設定）

#### 1. スタッフ用LINE公式アカウント作成

**LINE Developers Consoleで以下を作成:**

1. **Messaging APIチャネル**
   - チャネル名: `cOralupスタッフ`
   - Webhook URL: `https://your-app.vercel.app/api/line/staff-webhook`
   - リッチメニュー: QRスキャン画面のLIFF URLを設定

2. **LINE Loginチャネル**
   - チャネル名: `cOralupスタッフ（ログイン用）`
   - コールバックURL: `https://your-app.vercel.app/staff/scan`
   - LIFFアプリ作成: エンドポイントURL = `/staff/scan`

#### 2. 環境変数設定

```env
# スタッフ用Messaging API
LINE_STAFF_CHANNEL_ID=xxxxx
LINE_STAFF_CHANNEL_SECRET=xxxxx
LINE_STAFF_CHANNEL_ACCESS_TOKEN=xxxxx

# スタッフ用LINE Login
LINE_STAFF_LOGIN_CHANNEL_ID=xxxxx
LINE_STAFF_LOGIN_CHANNEL_SECRET=xxxxx

# LIFF ID
NEXT_PUBLIC_STAFF_LIFF_ID=xxxxx-xxxxx
```

---

## まとめ

**質問への回答: 「スタッフ用LINE公式アカウントつくればいいってこと？」**

**はい、その通りです。** ただし、正確には：

1. **スタッフ用LINE公式アカウント（Messaging APIチャネル）** を作成
2. **LINE Loginチャネル** を別途作成（LIFFアプリ用）
3. **LIFFアプリ** をLINE Loginチャネル内で作成（QRスキャン画面用）

これで、スタッフはLINEアプリから直接QRスキャン画面を開き、自動認証で診断を開始できます。

**友だち追加は不要**（LINE LoginチャネルだけでOK）なので、最短手順で動作します。

