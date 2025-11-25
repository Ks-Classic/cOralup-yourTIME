// LinearイシューをNotionに階層構造で登録するスクリプト

// Linear MCPから取得したイシューデータ（実際にはMCPから取得）
const linearIssues = [
  {"id":"54ce3a8d-40fd-4b0f-882a-510fb374af60","identifier":"KS-161","title":"Task: Yakubato parity UI刷新","description":"参考サービス（やくばとWeb問診）の操作感に合わせてフォームビルダーの画面レイアウト・UIを再設計する。","status":"Todo","labels":["Yakubato Parity","3.Task","Admin"],"parentId":"ffca6c35-558a-4e23-9b4f-a7e2f819e207","url":"https://linear.app/ks-classic/issue/KS-161/task-yakubato-parity-ui刷新"},
  {"id":"ffca6c35-558a-4e23-9b4f-a7e2f819e207","identifier":"KS-35","title":"Story: 動的フォームビルダー","description":"管理者向けの動的フォームビルダーを実装する","status":"In Progress","labels":["2.Story","Admin","Medium Priority"],"parentId":"042355e9-2b92-4ca8-a23a-3e8b221695f1","url":"https://linear.app/ks-classic/issue/KS-35/story-動的フォームビルダー"},
  {"id":"042355e9-2b92-4ca8-a23a-3e8b221695f1","identifier":"KS-13","title":"Epic: 管理者向け管理機能完成","description":"管理者向けのダッシュボード、ユーザー管理、データ分析、フォーム管理機能を完成させる","status":"Backlog","labels":["1.Epic","Admin","Medium Priority"],"url":"https://linear.app/ks-classic/issue/KS-13/epic-管理者向け管理機能完成"},
  {"id":"24c96387-565c-44a0-9ebd-476de6f40a27","identifier":"KS-157","title":"Task:契約書たたき作成","description":"","status":"In Progress","labels":["ビジネス"],"attachments":[],"createdBy":"木幡靖彦","createdById":"8be14f6c-251f-4535-8c93-62c9ff5ba47c","project":"Coralup 問診票・ユーザー管理DX","projectId":"85c78cd1-06a6-4e76-be05-a890020022d2","team":"Ks-classic","teamId":"10162a07-228f-493c-bf46-d3006e8ae70f"},
  {"id":"63064dd5-936c-41cf-bdc0-153262eef8f4","identifier":"KS-156","title":"Task:見積書作成","description":"","status":"Backlog","labels":["ビジネス"],"attachments":[],"createdBy":"木幡靖彦","createdById":"8be14f6c-251f-4535-8c93-62c9ff5ba47c","project":"Coralup 問診票・ユーザー管理DX","projectId":"85c78cd1-06a6-4e76-be05-a890020022d2","team":"Ks-classic","teamId":"10162a07-228f-493c-bf46-d3006e8ae70f"}
];

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

// Notionページ作成用のコンテンツを生成
function generateNotionContent(issue, level = 0) {
  const indent = '  '.repeat(level);
  const status = issue.status || '未設定';
  const labels = issue.labels ? issue.labels.join(', ') : 'なし';

  let content = `${indent}• ${issue.title}\n`;
  content += `${indent}  ID: ${issue.identifier}\n`;
  content += `${indent}  ステータス: ${status}\n`;
  content += `${indent}  ラベル: ${labels}\n`;

  if (issue.description) {
    content += `${indent}  説明: ${issue.description.replace(/\n/g, '\n' + indent + '    ')}\n`;
  }

  content += `${indent}  URL: ${issue.url}\n`;

  if (issue.children && issue.children.length > 0) {
    content += '\n';
    issue.children.forEach(child => {
      content += generateNotionContent(child, level + 1);
    });
  }

  return content;
}

// メイン処理
async function registerToNotion() {
  console.log('LinearイシューをNotionに登録中...');

  const { epics, stories, tasks } = categorizeIssues(linearIssues);

  // Epicページ
  if (epics.length > 0) {
    const epicHierarchy = buildHierarchy(epics);
    let epicContent = '# Epic一覧\n\n';
    epicHierarchy.forEach(epic => {
      epicContent += generateNotionContent(epic);
      epicContent += '\n---\n\n';
    });

    console.log('Epicページを作成:', epicContent);

    // 指定されたNotionページの子ページとしてEpicページを作成
    const epicPageData = {
      parent: {
        page_id: "27958ddc46a68043bb75e7e69c2e9505"
      },
      properties: {
        title: {
          title: [
            {
              text: {
                content: "Linear Epic一覧"
              }
            }
          ]
        }
      },
      children: [
        {
          paragraph: {
            rich_text: [
              {
                text: {
                  content: epicContent
                }
              }
            ]
          }
        }
      ]
    };

    // await mcp_notion_ks-Classic_API-post-page(epicPageData);
    console.log('Epicページの作成を完了しました');
  }

  // Storyページ
  if (stories.length > 0) {
    const storyHierarchy = buildHierarchy(stories);
    let storyContent = '# Story一覧\n\n';
    storyHierarchy.forEach(story => {
      storyContent += generateNotionContent(story);
      storyContent += '\n---\n\n';
    });

    console.log('Storyページを作成:', storyContent);

    // 指定されたNotionページの子ページとしてStoryページを作成
    const storyPageData = {
      parent: {
        page_id: "27958ddc46a68043bb75e7e69c2e9505"
      },
      properties: {
        title: {
          title: [
            {
              text: {
                content: "Linear Story一覧"
              }
            }
          ]
        }
      },
      children: [
        {
          paragraph: {
            rich_text: [
              {
                text: {
                  content: storyContent
                }
              }
            ]
          }
        }
      ]
    };

    // await mcp_notion_ks-Classic_API-post-page(storyPageData);
    console.log('Storyページの作成を完了しました');
  }

  // Taskページ
  if (tasks.length > 0) {
    const taskHierarchy = buildHierarchy(tasks);
    let taskContent = '# Task一覧\n\n';
    taskHierarchy.forEach(task => {
      taskContent += generateNotionContent(task);
      taskContent += '\n---\n\n';
    });

    console.log('Taskページを作成:', taskContent);

    // 指定されたNotionページの子ページとしてTaskページを作成
    const taskPageData = {
      parent: {
        page_id: "27958ddc46a68043bb75e7e69c2e9505"
      },
      properties: {
        title: {
          title: [
            {
              text: {
                content: "Linear Task一覧"
              }
            }
          ]
        }
      },
      children: [
        {
          paragraph: {
            rich_text: [
              {
                text: {
                  content: taskContent
                }
              }
            ]
          }
        }
      ]
    };

    // await mcp_notion_ks-Classic_API-post-page(taskPageData);
    console.log('Taskページの作成を完了しました');
  }

  console.log('Notionへの登録が完了しました');
}

// 実行
registerToNotion();
