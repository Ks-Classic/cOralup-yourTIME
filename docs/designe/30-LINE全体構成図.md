# LINE全体構成図 (cOralup Platform)

**最終更新: 2024-12-12**

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
│  │  - 友だち追加Webhook     │    │  - 友だち追加Webhook ✅   │     │
│  │  - レポート送信           │    │  - 名前登録（メッセージ）✅│     │
│  │                          │    │                          │     │
│  │  [LINE Login]           │    │  [LINE Login]            │     │
│  │  - LIFFアプリ（問診用）  │    │  - LIFFアプリ（認証用）✅  │     │
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
│  【スタッフ向け】 ✅ 実装完了                                        │
│  /api/line/staff-webhook    - 友だち追加処理 + 名前登録             │
│  /api/auth/staff-session    - LIFF→セッション発行（Cookie）        │
│  /staff/liff-login          - LIFF専用ログイン画面                  │
│  /staff/login               - ログイン案内画面（Cookie切れ時）      │
│  /staff/home                - ホーム画面（QRスキャン + 履歴）       │
│  /staff/history             - 対応履歴一覧                          │
│  /staff/history/[sessionId] - 対応詳細                              │
│  /staff/logout              - ログアウト                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         Supabase                                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  profiles (role: 'parent' | 'staff')                                │
│  ├── line_user_id      ← LINE識別キー                              │
│  ├── display_name      ← LINE表示名                                │
│  ├── first_name/last_name ← 名前（メッセージで登録）               │
│  ├── role              ← 'staff' | 'parent'                        │
│  └── is_active         ← 有効フラグ（ブロック時false）             │
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

### 2. スタッフ用「cOralupスタッフ」✅ 実装完了

| 項目 | 内容 |
|------|------|
| **チャネル名** | cOralupスタッフ |
| **チャネルタイプ** | Messaging API + LINE Login |
| **用途** | スタッフ事前登録・認証・通知 |
| **機能** | 友だち追加で自動登録、名前登録（メッセージ）、LIFF認証 |
| **Webhook** | `/api/line/staff-webhook` ✅ |
| **LIFF** | `/staff/liff-login` ✅ |
| **環境変数** | `LINE_STAFF_CHANNEL_ID`, `LINE_STAFF_CHANNEL_SECRET`, `LINE_STAFF_CHANNEL_ACCESS_TOKEN`, `NEXT_PUBLIC_STAFF_LIFF_ID` |

---

## 実装済み機能一覧

### スタッフ認証フロー ✅

| 機能 | ファイル | 状態 |
|------|---------|------|
| Webhook API | `src/app/api/line/staff-webhook/route.ts` | ✅ |
| セッション発行API | `src/app/api/auth/staff-session/route.ts` | ✅ |
| 認証ユーティリティ | `src/lib/staff-auth.ts` | ✅ |
| LIFFログイン画面 | `src/app/staff/liff-login/page.tsx` | ✅ |
| ログイン案内画面 | `src/app/staff/login/page.tsx` | ✅ |
| ホーム画面 | `src/app/staff/home/page.tsx` | ✅ |
| 対応履歴一覧 | `src/app/staff/history/page.tsx` | ✅ |
| 対応詳細 | `src/app/staff/history/[sessionId]/page.tsx` | ✅ |
| ログアウト | `src/app/staff/logout/page.tsx` | ✅ |

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

### スタッフフロー ✅ 実装完了

#### 事前登録（イベント前）
```
1. スタッフがLINE公式「cOralupスタッフ」を友だち追加
   ↓
2. Webhook → profiles作成 (role: 'staff', display_name: LINE名)
   ↓
3. LINEで「名前を入力してください」メッセージ受信
   ↓
4. スタッフが「山田 太郎」と送信
   ↓
5. Webhook → profiles更新 (first_name, last_name)
   ↓
6. 登録完了メッセージ受信
```

#### 当日ログイン（イベント時）
```
1. スタッフがLINEのリッチメニューから「アプリを開く」タップ
   ↓
2. LIFF起動 → /staff/liff-login
   ↓
3. LIFF SDK初期化 → LINE自動認証
   ↓
4. /api/auth/staff-session → Cookie発行
   ↓
5. /staff/home へリダイレクト
```

#### 2回目以降（Cookie有効時）
```
1. ブラウザで /staff/home に直接アクセス
   ↓
2. Cookie認証でスタッフ識別
   ↓
3. ホーム画面表示（QRスキャン + 履歴）
```

#### QRスキャン〜診断
```
1. /staff/home の「QRスキャン」タップ
   ↓
2. /staff/session/new → QRスキャン画面
   ↓
3. QRスキャン → visitId取得
   ↓
4. スタッフ自動紐付け（Cookie → staff_profile_id）
   ↓
5. /staff/diagnosis/[visitId] → 診断入力
```

---

## 必要な環境変数

### スタッフ用（新規追加が必要）

```env
# スタッフ用Messaging API
LINE_STAFF_CHANNEL_ID=xxxxx
LINE_STAFF_CHANNEL_SECRET=xxxxx
LINE_STAFF_CHANNEL_ACCESS_TOKEN=xxxxx

# スタッフ用LIFF
NEXT_PUBLIC_STAFF_LIFF_ID=xxxxx-xxxxx

# セッション暗号化キー（Cookie認証用）
STAFF_SESSION_SECRET=your-random-secret-key

# cOralup組織ID
CORALUP_ORG_ID=xxxxx
```

---

## 残作業（LINE Developers Console設定）

### 📋 手動設定が必要

1. **スタッフ用LINE公式アカウント作成**
   - Messaging APIチャネル作成
   - LINE Loginチャネル作成（LIFF用）

2. **Webhook URL設定**
   - `https://your-domain.vercel.app/api/line/staff-webhook`

3. **LIFF作成**
   - エンドポイントURL: `https://your-domain.vercel.app/staff/liff-login`
   - サイズ: Full

4. **リッチメニュー作成（オプション）**
   - 「診断アプリを開く」→ LIFF URL
   - 「対応履歴」→ `/staff/history`

5. **環境変数設定**
   - Vercel + `.env.local` に上記変数を設定

---

## 実装完了度

| 項目 | 状態 | 備考 |
|------|------|------|
| **コード実装** | ✅ 100% | 全API・画面実装済み |
| **LINE設定** | 📋 未完了 | LINE Developers Console設定必要 |
| **環境変数** | 📋 未完了 | 設定後に動作確認必要 |
| **E2Eテスト** | 📋 未完了 | LINE設定後に実施 |

---

## まとめ

**スタッフLINE認証機能のコード実装は100%完了しています。**

残りは以下の手動設定のみ：
1. LINE Developers Consoleでチャネル・LIFF作成
2. Webhook URL設定
3. 環境変数設定
4. E2Eテスト実施
