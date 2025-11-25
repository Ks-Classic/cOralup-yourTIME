const fs = require('fs');

// イシューデータを読み込み
const issues = JSON.parse(fs.readFileSync('linear-issues.json', 'utf8'));

// Epic, Story, Task分類
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

console.log('=== Epic一覧 ===');
epics.forEach(epic => {
  console.log(`- ${epic.identifier}: ${epic.title}`);
});

console.log('\n=== Story一覧 ===');
stories.forEach(story => {
  console.log(`- ${story.identifier}: ${story.title}`);
});

console.log('\n=== Task一覧 ===');
tasks.forEach(task => {
  console.log(`- ${task.identifier}: ${task.title}`);
});

console.log('\n=== 階層構造（親子関係） ===');
tasks.forEach(task => {
  if (task.parentId) {
    const parentStory = stories.find(s => s.id === task.parentId);
    const parentEpic = parentStory ? epics.find(e => e.id === parentStory.parentId) : null;

    if (parentEpic && parentStory) {
      console.log(`${parentEpic.identifier} > ${parentStory.identifier} > ${task.identifier}: ${task.title}`);
    } else if (parentStory) {
      console.log(`未分類Epic > ${parentStory.identifier} > ${task.identifier}: ${task.title}`);
    } else {
      console.log(`未分類 > 未分類 > ${task.identifier}: ${task.title}`);
    }
  } else {
    console.log(`未分類 > 未分類 > ${task.identifier}: ${task.title}`);
  }
});

// 階層構造をJSONで保存
const hierarchy = {
  epics: epics.map(epic => ({
    id: epic.id,
    identifier: epic.identifier,
    title: epic.title,
    description: epic.description,
    url: epic.url,
    status: epic.status,
    stories: stories
      .filter(story => story.parentId === epic.id)
      .map(story => ({
        id: story.id,
        identifier: story.identifier,
        title: story.title,
        description: story.description,
        url: story.url,
        status: story.status,
        tasks: tasks
          .filter(task => task.parentId === story.id)
          .map(task => ({
            id: task.id,
            identifier: task.identifier,
            title: task.title,
            description: task.description,
            url: task.url,
            status: task.status
          }))
      }))
  }))
};

fs.writeFileSync('linear-hierarchy.json', JSON.stringify(hierarchy, null, 2));
console.log('\n階層構造を linear-hierarchy.json に保存しました。');
