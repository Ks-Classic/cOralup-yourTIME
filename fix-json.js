const fs = require('fs');

// 問題のあるJSONファイルを読み込み
let rawData = fs.readFileSync('linear-issues.json', 'utf8');

// 特殊文字を修正
rawData = rawData
  .replace(/[\u0000-\u001f\u007f-\u009f]/g, '') // 制御文字を削除
  .replace(/\\n/g, '\\\\n') // 改行文字をエスケープ
  .replace(/\\"/g, '\\\\"') // 引用符をエスケープ
  .replace(/'/g, "\\'"); // シングルクォートをエスケープ

// 修正したJSONを保存
fs.writeFileSync('linear-issues-fixed.json', rawData);

console.log('JSONファイルを修正しました');

// 修正したファイルでテスト
try {
  const issues = JSON.parse(rawData);
  console.log(`修正成功: ${issues.length}件のイシューを読み込みました`);
} catch (error) {
  console.log('JSONパースエラー:', error.message);
}
