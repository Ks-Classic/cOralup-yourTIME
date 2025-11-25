// Linearイシューデータを直接処理して階層構造を作成
const fs = require('fs');

// Linear MCPから取得した生データを処理
function processLinearIssues() {
  try {
    // Linearから取得したデータをオブジェクトとして直接定義
    // （実際にはMCPから取得したデータをここに貼り付け）
    const linearData = [
      {
        "id": "54ce3a8d-40fd-4b0f-882a-510fb374af60",
        "identifier": "KS-161",
        "title": "Task: Yakubato parity UI刷新",
        "description": "## 概要\n\n参考サービス（やくばとWeb問診）の操作感に合わせてフォームビルダーの画面レイアウト・UIを再設計する。\n\n## 詳細\n\n* 左カラム: フォーム構造ツリー（セクション/質問、ドラッグ&ドロップ整理）\n* 中央カラム: 選択中フィールドの編集カード（ラベル、説明、必須、バリデーション等を1画面で編集）\n* 右カラム: PC / スマホ プレビュー切替、送信ボタン設定等\n* 全体トーンやガイドテキストを医療スタッフ向けに最適化\n\n## 成功基準\n\n* 新しい3ペインレイアウトでフォーム編集ができる\n* プレビューがリアルタイムに反映される\n* 主要操作にツールチップや説明文が追加され、既存操作に支障がない",
        "url": "https://linear.app/ks-classic/issue/KS-161/task-yakubato-parity-ui刷新",
        "gitBranchName": "yasuhikokohata/ks-161-task-yakubato-parity-ui刷新",
        "createdAt": "2025-09-24T13:19:45.939Z",
        "updatedAt": "2025-09-24T13:19:45.939Z",
        "status": "Todo",
        "labels": ["Yakubato Parity", "3.Task", "Admin"],
        "attachments": [],
        "createdBy": "木幡靖彦",
        "createdById": "8be14f6c-251f-4535-8c93-62c9ff5ba47c",
        "project": "Coralup 問診票・ユーザー管理DX",
        "projectId": "85c78cd1-06a6-4e76-be05-a890020022d2",
        "parentId": "ffca6c35-558a-4e23-9b4f-a7e2f819e207",
        "team": "Ks-classic",
        "teamId": "10162a07-228f-493c-bf46-d3006e8ae70f"
      }
      // 他のイシューもここに追加...
    ];

    // Epic、Story、Taskに分類
    const epics = [];
    const stories = [];
    const tasks = [];

    linearData.forEach(issue => {
      const labels = issue.labels || [];
      if (labels.includes('1.Epic')) {
        epics.push(issue);
      } else if (labels.includes('2.Story')) {
        stories.push(issue);
      } else if (labels.includes('3.Task')) {
        tasks.push(issue);
      }
    });

    // 親子関係を構築
    const buildHierarchy = (items) => {
      const itemMap = new Map();
      const roots = [];

      // まず全アイテムをマップに登録
      items.forEach(item => {
        itemMap.set(item.id, { ...item, children: [] });
      });

      // 親子関係を構築
      items.forEach(item => {
        const itemWithChildren = itemMap.get(item.id);
        if (item.parentId && itemMap.has(item.parentId)) {
          const parent = itemMap.get(item.parentId);
          parent.children.push(itemWithChildren);
        } else {
          roots.push(itemWithChildren);
        }
      });

      return roots;
    };

    // 階層構造を構築
    const epicHierarchy = buildHierarchy(epics);
    const storyHierarchy = buildHierarchy(stories);
    const taskHierarchy = buildHierarchy(tasks);

    // 結果を出力
    console.log('=== Epic階層構造 ===');
    console.log(JSON.stringify(epicHierarchy, null, 2));

    console.log('\n=== Story階層構造 ===');
    console.log(JSON.stringify(storyHierarchy, null, 2));

    console.log('\n=== Task階層構造 ===');
    console.log(JSON.stringify(taskHierarchy, null, 2));

    // 階層構造をファイルに保存
    const hierarchyData = {
      epics: epicHierarchy,
      stories: storyHierarchy,
      tasks: taskHierarchy,
      summary: {
        totalEpics: epics.length,
        totalStories: stories.length,
        totalTasks: tasks.length
      }
    };

    fs.writeFileSync('linear-hierarchy.json', JSON.stringify(hierarchyData, null, 2));

    console.log('\n=== 統計情報 ===');
    console.log(`Epic数: ${epics.length}`);
    console.log(`Story数: ${stories.length}`);
    console.log(`Task数: ${tasks.length}`);

    return hierarchyData;

  } catch (error) {
    console.error('エラー:', error);
    return null;
  }
}

// スクリプト実行
processLinearIssues();
