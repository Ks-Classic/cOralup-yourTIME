# LINE API 監査レポート & 運用ガイド

> 最終更新: 2026-03-01
> 次回アクション: webhook の Push → Reply API 移行（次回イベント前に実施推奨）

---

## 📊 アカウント構成

| アカウント | Bot名 | Basic ID | プラン | 月間上限 |
|---|---|---|---|---|
| **親用** | cOral up口腔・姿勢診断 | @003ncfcr | **ライト** | **5,000通** |
| **スタッフ用** | cOralupトレーナー | @718hrkva | **フリー** | **200通** |

### Channel Access Token

- **種別:** Long-lived Channel Access Token（172文字、非JWT形式）
- **有効期限:** **なし（無期限）** — LINE Developers Console で発行した長期トークン
- 再発行しない限り永続的に有効
- v2.1 verify → "not JWS" = Stateless tokenではない = Long-lived

---

## 📈 通数消費の実態（2026年3月1日時点）

### 親アカウント

| 区分 | 通数 | 送信元 |
|---|---|---|
| レポート通知（DB記録あり） | ~42通 | `send-report/route.ts`, `diagnosis/complete/route.ts` |
| ウェルカム・自動応答（DB記録なし） | ~156通 | `webhook/route.ts` の `sendMessage()` |
| **合計（LINE API公式）** | **198通 / 5,000通** | |

### スタッフアカウント

| 区分 | 通数 |
|---|---|
| **合計（LINE API公式）** | **3通 / 200通** |

### 通数確認コマンド

```bash
# 親アカウント
source .env.local
curl -s -H "Authorization: Bearer $LINE_MESSAGING_CHANNEL_ACCESS_TOKEN" \
  https://api.line.me/v2/bot/message/quota/consumption

# スタッフアカウント
curl -s -H "Authorization: Bearer $LINE_STAFF_CHANNEL_ACCESS_TOKEN" \
  https://api.line.me/v2/bot/message/quota/consumption
```

---

## 🔍 LINE API 全利用箇所

| # | ファイル | API種別 | 用途 | 通数カウント | 安全対策 |
|---|---|---|---|---|---|
| 1 | `line/webhook/route.ts` | **Push API** | ウェルカム・自動応答 | ⚠️ **される** | ❌ 上限チェックなし |
| 2 | `line/webhook/route.ts` | Profile API | プロフィール取得 | - | ✅ エラー時フロー継続 |
| 3 | `line/staff-webhook/route.ts` | **Push API** | スタッフ応答 | ⚠️ **される** | 🟡 リトライのみ |
| 4 | `line/staff-webhook/route.ts` | Profile API | プロフィール取得 | - | ✅ エラー時フロー継続 |
| 5 | `line/send-report/route.ts` | **Push API** | レポート通知 | ⚠️ される | ✅ `sendPushMessageSafe` |
| 6 | `diagnosis/complete/route.ts` | **Push API** | 診断完了通知 | ⚠️ される | ✅ `sendPushMessageSafe` |
| 7 | `lib/liff-utils.ts` | LIFF SDK | クライアント認証 | ❌ されない | ✅ |
| 8 | 各parentページ | LIFF | 問診・レポート表示 | ❌ されない | ✅ |

---

## 📚 Reply API vs Push API

### 基本仕様

| | Reply API | Push API |
|---|---|---|
| エンドポイント | `/v2/bot/message/reply` | `/v2/bot/message/push` |
| 必要なもの | `replyToken`（イベント付属） | `userId` のみ |
| **通数カウント** | **されない（無料）** | **される（有料）** |
| タイミング制約 | **replyToken有効: 約30秒** | いつでも |
| 送信回数 | 1つのreplyTokenで **1回だけ** | 何回でも |
| メッセージ数/回 | 最大5件 | 最大5件 |
| メッセージ種別 | テキスト/Flex/画像 etc 全部OK | 同じ |
| LIFF URL | ✅ 送れる。遷移も問題なし | ✅ 同じ |

### 使い分けの原則

```
ユーザーが何かした（follow/message/postback）→ Reply API（無料）
Bot側から能動的に送る → Push API（有料カウント）
```

### cOralupでの正しい使い分け

| 場面 | 現状 | 正解 | イベント種別 |
|---|---|---|---|
| 友だち追加時のウェルカム | ❌ Push | ✅ Reply | `follow` |
| 「問診」テキストへの応答 | ❌ Push | ✅ Reply | `message` |
| 「ヘルプ」への応答 | ❌ Push | ✅ Reply | `message` |
| postbackボタン応答 | ❌ Push | ✅ Reply | `postback` |
| **レポート完成通知** | ✅ Push | ✅ Push | Bot発（イベント起点ではない） |
| **診断完了通知** | ✅ Push | ✅ Push | Bot発 |

### Reply API 移行時の注意点

1. **replyToken の30秒制限**: DB操作に時間がかかるとタイムアウトする可能性がある
2. **フォールバック必須**: Reply失敗時は Push API で再送する安全策を入れる
3. **1 replyToken = 1回の送信**: 複数メッセージは `messages` 配列にまとめる（最大5件）
4. **メッセージ内容・機能への影響**: ゼロ（Flex、LIFF URL、ボタン等すべて同じ）

### 推奨実装パターン

```typescript
async function replyOrPush(replyToken: string, userId: string, messages: any[]) {
  // 1. まず Reply API を試行（無料）
  try {
    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ replyToken, messages }),
    })
    if (res.ok) return { method: 'reply', success: true }
  } catch (e) {
    console.warn('[LINE] Reply failed, falling back to Push:', e)
  }

  // 2. Reply 失敗時は Push API にフォールバック（有料だが確実に届く）
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ to: userId, messages }),
  })
  return { method: 'push', success: res.ok }
}
```

---

## ⚠️ 過去のインシデント

### 2025年12月21日: フリープラン上限到達

- **原因:** フリープラン（200通/月）で19通目以降の13件が送信失敗
- **エラー:** `"You have reached your monthly limit."`
- **対策済:** ライトプラン（5,000通）にアップグレード + `sendPushMessageSafe` 導入

### ライトプランの制約

- 超過時は **追加購入不可**（スタンダードプランのみ従量課金可能）
- 5,000通に達すると **翌月まで配信停止**
- 現在の消費ペースでは月間500通以下のため、十分な余裕あり

---

## 🔧 TODO（次回対応）

- [ ] `line/webhook/route.ts` の `sendMessage()` を Reply API + Push フォールバックに変更
- [ ] `line/staff-webhook/route.ts` の `sendMessage()` も同様に変更
- [ ] webhook の sendMessage にもログ記録を追加（DB未記録の通数を可視化）
- [ ] スタッフBotのプラン検討（スタッフ増加時）
