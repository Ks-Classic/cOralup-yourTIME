# LINE未送信レポート一覧

**抽出日時**: 2026/1/15 13:24:41  
**未送信件数**: 14件  
**送信済み件数**: 25件  
**合計**: 47件

---

## 📊 判定基準

- **送信済み**: LINE送信ログの最新ステータスが `success`
- **未送信**: LINE送信ログの最新ステータスが `failed` または送信試行なし
- ⚠️ `reports.sentToLine` フラグは実際の送信状態と同期していない場合あり

---

## 📋 未送信レポート一覧

| No. | お子さん名 | 年齢 | 親御さん名 | LINE ID | レポートURL | 作成日 | LINE状態 | sentToLineフラグ | エラー |
|-----|-----------|------|-----------|---------|------------|--------|---------|----------------|--------|
| 1 | 木幡 美奈子 | 18歳 | 不明 | - | [リンク](https://coralup-yourtime.vercel.app/report/8475d156-90bc-4905-a528-60cf75dff6b1) | 2025/12/21 | 未試行 | false | - |
| 2 | 冨永 結仁 | 11歳 | 冨永ゆかり | Uc32c4d0399dc820de90... | [リンク](https://coralup-yourtime.vercel.app/report/e29126b1-f8fb-4ca3-be1f-544ca66f2b5a) | 2025/12/21 | failed | false | {"message":"You have reached your monthly limit."} |
| 3 | 亀石 茉叶 | 6歳 | あやの | U1037079d35342855ae4... | [リンク](https://coralup-yourtime.vercel.app/report/89fb36b4-df49-4486-839d-39103996bffe) | 2025/12/21 | failed | false | {"message":"You have reached your monthly limit."} |
| 4 | 岩井 蒼太 | 5歳 | もも | Ue0c8fee5f6f2242235f... | [リンク](https://coralup-yourtime.vercel.app/report/5ed512c9-c449-4411-9553-b6cce4202fd8) | 2025/12/21 | failed | false | {"message":"You have reached your monthly limit."} |
| 5 | 南 瑛斗 | 6歳 | みなみ ゆうこ（つやえみ😆👄） | Uad27737995a25a4783c... | [リンク](https://coralup-yourtime.vercel.app/report/7f4b886d-5c36-43fb-8fcc-4901483e36fc) | 2025/12/21 | failed | false | {"message":"You have reached your monthly limit."} |
| 6 | 谷川 奈優 | 5歳 | 谷川良枝 | U6c6f39c6526c22038bc... | [リンク](https://coralup-yourtime.vercel.app/report/1cadb349-841e-4a83-9764-6d51c12c2013) | 2025/12/21 | failed | false | {"message":"You have reached your monthly limit."} |
| 7 | 齋藤 伍希 | 6歳 | 齋藤奈美子 | U3f1ab3c2daf56685e47... | [リンク](https://coralup-yourtime.vercel.app/report/46e06e76-3def-4265-a0b1-d7d4aef0f6f9) | 2025/12/21 | failed | false | {"message":"You have reached your monthly limit."} |
| 8 | 酒井 絵未 | 2歳 | 酒井 有香 | Ue95f07a8a6fdfd7261b... | [リンク](https://coralup-yourtime.vercel.app/report/347fbea8-a176-452a-8e2f-66d70497d856) | 2025/12/21 | failed | false | {"message":"You have reached your monthly limit."} |
| 9 | 谷川 竣祐 | 3歳 | 谷川良枝 | U6c6f39c6526c22038bc... | [リンク](https://coralup-yourtime.vercel.app/report/1e8d36a9-6af9-4bd1-9f45-db77c1a6eb27) | 2025/12/21 | failed | false | {"message":"You have reached your monthly limit."} |
| 10 | 上田 創介 | 3歳 | YURI | U02c6357a099da0b7963... | [リンク](https://coralup-yourtime.vercel.app/report/75b19e3e-775f-4dca-85d6-517e9cea8041) | 2025/12/21 | failed | false | {"message":"You have reached your monthly limit."} |
| 11 | 南 伶旺 | 12歳 | みなみ ゆうこ（つやえみ😆👄） | Uad27737995a25a4783c... | [リンク](https://coralup-yourtime.vercel.app/report/68a77b45-a44b-46f4-9298-dbba20cde150) | 2025/12/21 | failed | false | {"message":"You have reached your monthly limit."} |
| 12 | 河内 佑友 | 8歳 | 河内香織 | Ufb74237fb9d5c1da46c... | [リンク](https://coralup-yourtime.vercel.app/report/6d855cbe-bc8f-4a2b-8095-cf676b39b20e) | 2025/12/21 | failed | false | {"message":"You have reached your monthly limit."} |
| 13 | 冨永 絢仁 | 6歳 | 冨永ゆかり | Uc32c4d0399dc820de90... | [リンク](https://coralup-yourtime.vercel.app/report/12fc43b8-f9d4-4db6-834d-7789532b0fd5) | 2025/12/21 | failed | false | {"message":"You have reached your monthly limit."} |
| 14 | 中尾 浩都 | 5歳 | さちこ | U84a815d80d3c093277c... | [リンク](https://coralup-yourtime.vercel.app/report/4244b339-7492-43bb-a898-64287f7eab1c) | 2025/12/21 | failed | false | {"message":"You have reached your monthly limit."} |

---

## 💡 推奨アクション

1. **LINE APIの制限確認**
   - 現在のプランと月次送信制限を確認
   - 必要に応じて上位プランへ移行

2. **再送信の実施**
   - 手動で各レポートを再送信
   - または一括再送信スクリプトの作成

3. **親御さんへの連絡**
   - LINE以外の方法（メール等）でレポートURLを共有
   - 診断結果が確認できることをお知らせ

4. **データ同期の改善**
   - LINE送信成功時に `reports.sentToLine = true` へ確実に更新する処理を追加
   - 定期的にLINE送信ログと reports テーブルの同期を確認