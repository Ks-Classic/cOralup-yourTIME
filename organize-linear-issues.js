const fs = require('fs');

// Linearから取得したイシューデータを読み込み
const issues = JSON.parse(fs.readFileSync('linear-issues.json', 'utf8'));

// Epic、Story、Taskに分類
const epics = [];
const stories = [];
const tasks = [];

// ラベルに基づいて分類
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
