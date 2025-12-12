# E2Eテストチェックリスト

**作成日: 2024-12-13**

---

## 🔗 テスト用URL一覧

### 本番URL（Vercel）
| 画面 | URL | 備考 |
|------|-----|------|
| 親御さんLIFF問診 | `https://liff.line.me/{PARENT_LIFF_ID}` | LINE内でのみ動作 |
| スタッフLIFFログイン | `https://liff.line.me/{STAFF_LIFF_ID}` | LINE内でのみ動作 |
| スタッフホーム | `/staff/home` | 要ログイン |
| スタッフQRスキャン | `/staff/scan` | 要ログイン |
| スタッフ診断 | `/staff/diagnosis/{visitId}` | 要ログイン |
| レポートページ | `/report/{reportUuid}` | 公開URL |

### デモURL（認証不要）
| 画面 | URL | 備考 |
|------|-----|------|
| 親御さん問診デモ | `/parent/questionnaire/demo` | モックデータ |
| スタッフ診断デモ | `/staff/diagnosis/demo` | モックデータ |
| レポートデモ | `/report/demo` | モックデータ |

---

## 📋 手動テストフロー

### Phase 1: スタッフLINE登録テスト

1. **LINE友だち追加**
   - [ ] スタッフ用LINE公式アカウントを友だち追加
   - [ ] ウェルカムメッセージ受信確認

2. **DB登録確認**
   ```sql
   SELECT * FROM profiles WHERE role = 'staff' ORDER BY created_at DESC LIMIT 5;
   ```
   - [ ] `line_user_id` が登録されている
   - [ ] `display_name` が登録されている
   - [ ] `role = 'staff'`

3. **LIFFログインテスト**
   - [ ] LINE内でLIFFログイン画面を開く
   - [ ] 「ログイン」ボタンタップ
   - [ ] スタッフホーム画面に遷移

---

### Phase 2: 親御さんLINE登録〜問診テスト

1. **LINE友だち追加**
   - [ ] 親御さん用LINE公式アカウントを友だち追加
   - [ ] ウェルカムメッセージ受信確認
   - [ ] 「問診を開始」ボタン表示確認

2. **DB登録確認**
   ```sql
   SELECT * FROM profiles WHERE role = 'parent' ORDER BY created_at DESC LIMIT 5;
   ```
   - [ ] `line_user_id` が登録されている
   - [ ] `display_name` が登録されている
   - [ ] `role = 'parent'`

3. **LIFF問診テスト**
   - [ ] 「問診を開始」タップ → LIFF画面起動
   - [ ] 基本情報入力（保護者名、電話番号、お子様情報）
   - [ ] 「次へ」タップ

4. **DB登録確認（基本情報）**
   ```sql
   -- profiles更新確認
   SELECT * FROM profiles WHERE role = 'parent' ORDER BY updated_at DESC LIMIT 1;
   
   -- children作成確認
   SELECT * FROM children ORDER BY created_at DESC LIMIT 1;
   
   -- visits作成確認
   SELECT * FROM visits ORDER BY created_at DESC LIMIT 1;
   ```
   - [ ] `profiles.first_name`, `last_name`, `phone_number` が更新されている
   - [ ] `children` レコードが作成されている
   - [ ] `visits` レコードが作成されている（`status = 'questionnaire_in_progress'`）

5. **問診入力テスト**
   - [ ] 問診項目を入力
   - [ ] 自動保存が動作している（コンソールログ確認）
   - [ ] 「次へ：QR表示」タップ

6. **DB登録確認（問診回答）**
   ```sql
   SELECT qr.*, qi.question 
   FROM questionnaire_responses qr
   JOIN questionnaire_items qi ON qr.item_id = qi.id
   WHERE qr.visit_id = '{visitId}'
   ORDER BY qr.answered_at;
   ```
   - [ ] `questionnaire_responses` に回答が保存されている
   - [ ] `visits.status = 'questionnaire_completed'`

7. **QRコード表示確認**
   - [ ] QRコードが表示されている
   - [ ] QRコードに `visits.id` (UUID) が埋め込まれている

---

### Phase 3: スタッフQRスキャン〜診断テスト

1. **QRスキャンテスト**
   - [ ] スタッフホーム → 「QRスキャン」
   - [ ] 親御さんのQRコードをスキャン
   - [ ] セッション情報が表示される

2. **DB確認（スタッフ紐付け）**
   ```sql
   SELECT v.*, p.display_name as staff_name
   FROM visits v
   LEFT JOIN profiles p ON v.staff_profile_id = p.id
   WHERE v.id = '{visitId}';
   ```
   - [ ] `visits.staff_profile_id` が設定されている

3. **問診データ引き継ぎ確認**
   - [ ] 「診断開始」タップ
   - [ ] 問診回答が表示されている
   - [ ] 保護者名、お子様情報が表示されている

4. **写真撮影テスト**
   - [ ] 姿勢写真撮影
   - [ ] 口腔写真撮影
   - [ ] 写真がプレビュー表示される

5. **DB確認（写真）**
   - Supabase Storage確認
   - [ ] `visit-photos/{visitId}/` に画像が保存されている

6. **診断入力テスト**
   - [ ] 診断項目を入力
   - [ ] 自動保存が動作している

7. **DB確認（診断回答）**
   ```sql
   SELECT dr.*, di.question 
   FROM diagnosis_responses dr
   JOIN diagnosis_items di ON dr.item_id = di.id
   WHERE dr.visit_id = '{visitId}'
   ORDER BY dr.answered_at;
   ```
   - [ ] `diagnosis_responses` に回答が保存されている

---

### Phase 4: レポート生成〜LINE通知テスト

1. **レポート生成テスト**
   - [ ] 「レポート作成」タップ
   - [ ] AI分析が実行される（またはダミーデータ）
   - [ ] レポートプレビューが表示される

2. **DB確認（レポート）**
   ```sql
   SELECT * FROM reports WHERE visit_id = '{visitId}';
   ```
   - [ ] `reports` レコードが作成されている
   - [ ] `reports.uuid` が生成されている
   - [ ] `reports.ai_summary` が設定されている

3. **LINE送信テスト**
   - [ ] 「LINEで送信」タップ
   - [ ] 送信確認ダイアログ表示
   - [ ] 「送信」タップ

4. **DB確認（LINE送信ログ）**
   ```sql
   SELECT * FROM line_message_logs WHERE visit_id = '{visitId}';
   ```
   - [ ] `line_message_logs` レコードが作成されている
   - [ ] `status = 'success'`

5. **DB確認（Visit更新）**
   ```sql
   SELECT status, report_sent_at FROM visits WHERE id = '{visitId}';
   ```
   - [ ] `visits.status = 'report_sent'`
   - [ ] `visits.report_sent_at` が設定されている

6. **親御さんLINE確認**
   - [ ] 親御さんのLINEにレポート通知が届く
   - [ ] 「レポートを見る」ボタンが表示される
   - [ ] ボタンタップでレポートページが開く

7. **レポートページ確認**
   - [ ] `/report/{reportUuid}` でレポートが表示される
   - [ ] 診断結果が正しく表示されている
   - [ ] 写真が表示されている

---

## 🤖 自動テストスクリプト

### APIテスト（curl）

```bash
# 1. 親御さん基本情報保存テスト
curl -X POST http://localhost:3000/api/parent/basic-info \
  -H "Content-Type: application/json" \
  -d '{
    "lineUserId": "Utest123456789",
    "parentFirstName": "太郎",
    "parentLastName": "テスト",
    "parentPhone": "09012345678",
    "childFirstName": "花子",
    "childLastName": "テスト",
    "childBirthday": "2020-03-15",
    "childGender": "female"
  }'

# 2. 問診回答保存テスト
curl -X POST http://localhost:3000/api/parent/questionnaire \
  -H "Content-Type: application/json" \
  -d '{
    "visitId": "{visitId}",
    "answers": {
      "{itemId1}": "yes",
      "{itemId2}": "no"
    }
  }'

# 3. スタッフセッション取得テスト
curl "http://localhost:3000/api/staff/session?visitId={visitId}"

# 4. 診断完了テスト
curl -X POST http://localhost:3000/api/diagnosis/complete \
  -H "Content-Type: application/json" \
  -H "Cookie: staff_session=..." \
  -d '{
    "visitId": "{visitId}",
    "sendLineNotification": true
  }'
```

---

## 📊 テスト結果記録

| テスト項目 | 結果 | 日時 | 備考 |
|-----------|------|------|------|
| スタッフLINE登録 | | | |
| 親御さんLINE登録 | | | |
| 基本情報保存 | | | |
| 問診回答保存 | | | |
| QRスキャン | | | |
| スタッフ紐付け | | | |
| 診断回答保存 | | | |
| レポート生成 | | | |
| LINE通知 | | | |
| レポート表示 | | | |

---

## ⚠️ トラブルシューティング

### LIFF起動エラー
- LIFF IDが正しく設定されているか確認
- LINE LoginチャネルのコールバックURLが正しいか確認
- LIFFアプリのエンドポイントURLが正しいか確認

### Webhook未受信
- LINE Developers ConsoleでWebhook URLが正しく設定されているか確認
- Webhook検証が成功しているか確認
- Vercelのログでエラーがないか確認

### DB登録されない
- Supabase Service Role Keyが正しいか確認
- RLSポリシーが正しく設定されているか確認
- APIエラーログを確認

### LINE通知が届かない
- LINE Channel Access Tokenが正しいか確認
- `profiles.line_user_id` が正しく登録されているか確認
- `line_message_logs` のエラーメッセージを確認

