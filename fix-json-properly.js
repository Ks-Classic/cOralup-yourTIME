const fs = require('fs');

// 問題のあるJSONファイルを読み込み
let rawData = fs.readFileSync('linear-issues.json', 'utf8');

// より包括的な修正
rawData = rawData
  // 制御文字と特殊文字を削除
  .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
  // バックスラッシュを適切にエスケープ
  .replace(/\\/g, '\\\\')
  // 改行文字を適切に処理
  .replace(/\n/g, '\\n')
  // タブ文字を適切に処理
  .replace(/\t/g, '\\t')
  // 引用符を適切にエスケープ
  .replace(/"/g, '\\"')
  // シングルクォートはそのまま
  .replace(/'/g, "'");

// 修正したJSONを保存
fs.writeFileSync('linear-issues-fixed.json', rawData);

console.log('JSONファイルを修正しました');

// 修正したファイルでテスト
try {
  const issues = JSON.parse(rawData);
  console.log(`修正成功: ${issues.length}件のイシューを読み込みました`);

  // 修正したデータを新しいファイルに保存
  fs.writeFileSync('linear-issues-clean.json', JSON.stringify(issues, null, 2));
  console.log('クリーンなJSONファイルを作成しました');

} catch (error) {
  console.log('JSONパースエラー:', error.message);
  console.log('エラー位置:', error.message.match(/position (\d+)/)?.[1]);
}
