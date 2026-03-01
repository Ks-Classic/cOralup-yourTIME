# LINE API 運用ナレッジ（cOralup）

## アカウント構成
- **親Bot:** cOral up口腔・姿勢診断 (@003ncfcr) — ライトプラン 5,000通/月
- **スタッフBot:** cOralupトレーナー (@718hrkva) — フリープラン 200通/月
- **Token:** Long-lived (無期限) 172文字 非JWT形式

## 通数カウントの仕組み
- **Push API** → 通数カウント**される**（有料）
- **Reply API** → 通数カウント**されない**（無料）
- **LIFF** → 通数に**一切関係なし**
- **Profile API** → 通数に関係なし

## 現状の課題（2026-03-01時点）
- `webhook/route.ts` と `staff-webhook/route.ts` の sendMessage() が**全てPush API**を使用
- Reply APIに変更すべき場面（follow/message/postback応答）でもPushを使っている
- DB記録（line_message_logs）に載らない通数がある（webhook経由分は記録なし）

## 対応済の安全対策
- `sendPushMessageSafe()` → 送信前に月間残数チェック（send-report, diagnosis/complete で使用）
- `gemini-client.ts` → マルチキーフォールバック + 指数バックオフリトライ
- `env-validation.ts` → 起動時に必須環境変数チェック

## TODO
- [ ] webhook/staff-webhook の sendMessage を Reply API + Push フォールバックに変更
- [ ] webhook の sendMessage にログ記録追加

## 通数確認コマンド
```bash
source .env.local
# 親
curl -s -H "Authorization: Bearer $LINE_MESSAGING_CHANNEL_ACCESS_TOKEN" https://api.line.me/v2/bot/message/quota/consumption
# スタッフ
curl -s -H "Authorization: Bearer $LINE_STAFF_CHANNEL_ACCESS_TOKEN" https://api.line.me/v2/bot/message/quota/consumption
```

## Reply API 移行時の注意
- replyToken有効期限: 約30秒（DB処理が長引くとタイムアウト）
- 1 replyToken = 1回の送信（複数メッセージはmessages配列にまとめる、最大5件）
- メッセージ種別（Flex/LIFF URL等）への影響: ゼロ
- 必ず Push フォールバックを入れること

## 詳細ドキュメント
`docs/line-api-audit.md` に完全版あり
