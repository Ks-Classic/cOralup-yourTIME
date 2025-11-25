// LinearイシューをNotionに直接登録するスクリプト
const fs = require('fs');

// Linearから取得したイシューデータを読み込み（実際にはMCPから直接取得）
const linearIssues = JSON.parse(fs.readFileSync('linear-issues.json', 'utf8'));

// イシューをEpic、Story、Taskに分類
function categorizeIssues(issues) {
  const epics = [];
  const stories = [];
  const tasks = [];

  issues.forEach(issue => {
    const labels = issue.labels || [];
    if (labels.includes('1.Epic')) {
      epics.push(issue);
    } else if (labels.includes('2.Story')) {
      stories.push(issue);
    } else if (labels.includes('3.Task')) {
      tasks.push(issue);
    }
  });

  return { epics, stories, tasks };
}

// 親子関係を構築
function buildHierarchy(items) {
  const itemMap = new Map();
  const roots = [];

  items.forEach(item => {
    itemMap.set(item.id, { ...item, children: [] });
  });

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
}

// イシューをNotion形式に変換
function convertIssueToNotionBlock(issue, level = 0) {
  const prefix = '  '.repeat(level);
  const title = `${issue.identifier}: ${issue.title}`;
  const description = issue.description || '';

  // ヘッダーブロック（Epic/Story/Taskの見出し）
  const headerBlock = {
    type: 'heading_2',
    content: `${prefix}${title}`
  };

  // 説明ブロック
  const descBlock = {
    type: 'paragraph',
    content: description
  };

  // メタ情報ブロック
  const metaBlock = {
    type: 'paragraph',
    content: `ステータス: ${issue.status} | 作成日: ${issue.createdAt} | URL: ${issue.url}`
  };

  return [headerBlock, descBlock, metaBlock];
}

// Notionページに登録するデータを作成
function createNotionPageData(hierarchy, type) {
  const blocks = [];
  const title = `${type}一覧`;

  // 各アイテムを処理
  hierarchy.forEach(item => {
    blocks.push(...convertIssueToNotionBlock(item, 0));

    // 子アイテムがあれば再帰的に処理
    if (item.children && item.children.length > 0) {
      item.children.forEach(child => {
        blocks.push(...convertIssueToNotionBlock(child, 1));
      });
    }
  });

  return {
    title,
    blocks
  };
}

// メイン処理
function main() {
  try {
    const { epics, stories, tasks } = categorizeIssues(linearIssues);

    console.log('=== 分類結果 ===');
    console.log(`Epic数: ${epics.length}`);
    console.log(`Story数: ${stories.length}`);
    console.log(`Task数: ${tasks.length}`);

    // 階層構造を構築
    const epicHierarchy = buildHierarchy(epics);
    const storyHierarchy = buildHierarchy(stories);
    const taskHierarchy = buildHierarchy(tasks);

    // Notionページデータを作成
    const epicPageData = createNotionPageData(epicHierarchy, 'Epic');
    const storyPageData = createNotionPageData(storyHierarchy, 'Story');
    const taskPageData = createNotionPageData(taskHierarchy, 'Task');

    console.log('\n=== Notionページデータ作成完了 ===');
    console.log(`Epicページ: ${epicPageData.blocks.length}ブロック`);
    console.log(`Storyページ: ${storyPageData.blocks.length}ブロック`);
    console.log(`Taskページ: ${taskPageData.blocks.length}ブロック`);

    // 階層データを保存
    const allData = {
      epics: epicPageData,
      stories: storyPageData,
      tasks: taskPageData,
      summary: {
        totalEpics: epics.length,
        totalStories: stories.length,
        totalTasks: tasks.length
      }
    };

    fs.writeFileSync('notion-data.json', JSON.stringify(allData, null, 2));
    console.log('\nNotionデータファイルを作成しました: notion-data.json');

    return allData;

  } catch (error) {
    console.error('エラー:', error);
    return null;
  }
}

// スクリプト実行
main();
