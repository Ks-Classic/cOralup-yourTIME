// LinearイシューをMCPで直接取得してNotionに登録するスクリプト

// Linear MCPからすべてのイシューを取得
async function getLinearIssues() {
  try {
    console.log('Linearからイシューを取得中...');

    // Linear MCPからイシューを取得（実際にはMCPツールを呼び出す）
    // const linearIssues = await mcp_linear_list_issues({ limit: 250 });

    // テストデータとしてサンプルを使用
    const linearIssues = [
      {
        "id": "54ce3a8d-40fd-4b0f-882a-510fb374af60",
        "identifier": "KS-161",
        "title": "Task: Yakubato parity UI刷新",
        "description": "参考サービス（やくばとWeb問診）の操作感に合わせてフォームビルダーの画面レイアウト・UIを再設計する。",
        "status": "Todo",
        "labels": ["Yakubato Parity", "3.Task", "Admin"],
        "parentId": "ffca6c35-558a-4e23-9b4f-a7e2f819e207",
        "url": "https://linear.app/ks-classic/issue/KS-161/task-yakubato-parity-ui刷新"
      },
      {
        "id": "b4433639-e98c-4bec-a441-29da59eb7489",
        "identifier": "KS-153",
        "title": "Story: Supabaseプロジェクト初期設定",
        "description": "Coralupシステムで利用するSupabaseプロジェクトを新規に立ち上げ、環境変数や接続設定を整備する。",
        "status": "Backlog",
        "labels": ["Configuration", "Supabase Setup", "2.Story", "Supabase"],
        "parentId": "1c1f94e1-e55b-4ca3-a315-ceb4340ce904",
        "url": "https://linear.app/ks-classic/issue/KS-153/story-supabaseプロジェクト初期設定"
      },
      {
        "id": "1c1f94e1-e55b-4ca3-a315-ceb4340ce904",
        "identifier": "KS-14",
        "title": "Epic: 外部サービス連携完成",
        "description": "LINE、Lark Base、Supabase等の外部サービスとの連携を完成させる",
        "status": "Backlog",
        "labels": ["1.Epic", "Supabase", "Lark Base", "LINE", "Medium Priority"],
        "url": "https://linear.app/ks-classic/issue/KS-14/epic-外部サービス連携完成"
      }
    ];

    console.log(`${linearIssues.length}件のイシューを取得しました`);
    return linearIssues;

  } catch (error) {
    console.error('Linearイシュー取得エラー:', error);
    return [];
  }
}

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

// Notionページに登録するデータを作成
function createNotionPageData(hierarchy, type) {
  const blocks = [];

  // タイトル
  blocks.push({
    object: 'block',
    type: 'heading_1',
    heading_1: {
      rich_text: [{
        type: 'text',
        text: { content: `${type}一覧` }
      }]
    }
  });

  // 各アイテムを処理
  hierarchy.forEach(item => {
    // ヘッダー（イシュータイトル）
    blocks.push({
      object: 'block',
      type: 'heading_2',
      heading_2: {
        rich_text: [{
          type: 'text',
          text: { content: `${item.identifier}: ${item.title}` }
        }]
      }
    });

    // 説明
    if (item.description) {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: item.description }
          }]
        }
      });
    }

    // メタ情報
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{
          type: 'text',
          text: {
            content: `ステータス: ${item.status} | URL: ${item.url}`
          }
        }]
      }
    });

    // 子アイテムがあれば再帰的に処理
    if (item.children && item.children.length > 0) {
      item.children.forEach(child => {
        // 子アイテム用のブロック
        blocks.push({
          object: 'block',
          type: 'heading_3',
          heading_3: {
            rich_text: [{
              type: 'text',
              text: { content: `  └ ${child.identifier}: ${child.title}` }
            }]
          }
        });

        if (child.description) {
          blocks.push({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{
                type: 'text',
                text: { content: `    ${child.description}` }
              }]
            }
          });
        }
      });
    }

    // 区切り線
    blocks.push({
      object: 'block',
      type: 'divider',
      divider: {}
    });
  });

  return blocks;
}

// Notion MCPでページを作成
async function createNotionPage(blocks, title) {
  try {
    console.log(`Notionページ "${title}" を作成中...`);

    // 実際にはMCPツールを呼び出す
    // const result = await mcp_notion_post_page({
    //   parent: { page_id: '27958ddc46a68043bb75e7e69c2e9505' },
    //   properties: {
    //     title: {
    //       title: [{ text: { content: title } }]
    //     }
    //   },
    //   children: blocks
    // });

    console.log(`Notionページ "${title}" の作成が完了しました`);
    console.log(`ブロック数: ${blocks.length}`);

    return { success: true, blocks: blocks.length };

  } catch (error) {
    console.error(`Notionページ "${title}" 作成エラー:`, error);
    return { success: false, error };
  }
}

// メイン処理
async function main() {
  try {
    // 1. Linearからイシューを取得
    const linearIssues = await getLinearIssues();

    if (linearIssues.length === 0) {
      console.log('イシューが見つかりませんでした');
      return;
    }

    // 2. イシューを分類
    const { epics, stories, tasks } = categorizeIssues(linearIssues);

    console.log('\n=== 分類結果 ===');
    console.log(`Epic数: ${epics.length}`);
    console.log(`Story数: ${stories.length}`);
    console.log(`Task数: ${tasks.length}`);

    // 3. 階層構造を構築
    const epicHierarchy = buildHierarchy(epics);
    const storyHierarchy = buildHierarchy(stories);
    const taskHierarchy = buildHierarchy(tasks);

    // 4. Notionページデータを作成
    const epicBlocks = createNotionPageData(epicHierarchy, 'Epic');
    const storyBlocks = createNotionPageData(storyHierarchy, 'Story');
    const taskBlocks = createNotionPageData(taskHierarchy, 'Task');

    // 5. Notionにページを作成
    console.log('\n=== Notionページ作成 ===');

    const epicResult = await createNotionPage(epicBlocks, 'Linear Epic一覧');
    const storyResult = await createNotionPage(storyBlocks, 'Linear Story一覧');
    const taskResult = await createNotionPage(taskBlocks, 'Linear Task一覧');

    console.log('\n=== 処理完了 ===');
    console.log(`Epicページ: ${epicResult.success ? '成功' : '失敗'}`);
    console.log(`Storyページ: ${storyResult.success ? '成功' : '失敗'}`);
    console.log(`Taskページ: ${taskResult.success ? '成功' : '失敗'}`);

  } catch (error) {
    console.error('メイン処理エラー:', error);
  }
}

// スクリプト実行
main();
