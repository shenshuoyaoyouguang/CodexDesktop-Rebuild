/**
 * 菜单汉化补丁脚本
 *
 * 对主进程代码中的菜单项进行汉化：
 * - 替换硬编码的菜单文本为中文
 * - 支持 File/Edit/View/Window/Help 菜单项
 *
 * 用法：
 *   node scripts/patch-menu-zh-cn.js          # 执行补丁
 *   node scripts/patch-menu-zh-cn.js --check  # 仅检查，不修改
 */
const fs = require("fs");
const path = require("path");

// ──────────────────────────────────────────────
//  菜单项翻译映射表
// ──────────────────────────────────────────────

const MENU_TRANSLATIONS = {
  // File 菜单
  'label:"New Thread"': 'label:"新建会话"',
  'label:"Open Folder…"': 'label:"打开文件夹…"',
  'label:"Settings…"': 'label:"设置…"',
  'label:"Log Out"': 'label:"注销"',
  'label:"Check for Updates…"': 'label:"检查更新…"',
  
  // View 菜单
  'label:"Command Menu…"': 'label:"命令菜单…"',
  'label:"Toggle Sidebar"': 'label:"切换侧边栏"',
  'label:"Toggle Terminal"': 'label:"切换终端"',
  'label:"Toggle Diff Panel"': 'label:"切换差异面板"',
  'label:"Find"': 'label:"查找"',
  'label:"Previous Thread"': 'label:"上一个会话"',
  'label:"Next Thread"': 'label:"下一个会话"',
  'label:"Back"': 'label:"后退"',
  'label:"Forward"': 'label:"前进"',
  'label:"Reload Window"': 'label:"重新加载窗口"',
  'label:"Open Debug Window"': 'label:"打开调试窗口"',
  'label:"Toggle DevTools"': 'label:"切换开发者工具"',
  'label:"Toggle Query Devtools"': 'label:"切换查询开发者工具"',
  'label:"Zoom In"': 'label:"放大"',
  'label:"Zoom Out"': 'label:"缩小"',
  'label:"Reset Zoom"': 'label:"重置缩放"',
  'label:"Toggle Fullscreen"': 'label:"切换全屏"',
  
  // Help 菜单
  'label:"Codex documentation"': 'label:"Codex 文档"',
  'label:"Automations"': 'label:"自动化"',
  'label:"Local Environments"': 'label:"本地环境"',
  'label:"Worktrees"': 'label:"工作树"',
  'label:"Skills"': 'label:"技能"',
  'label:"Model Context Protocol"': 'label:"模型上下文协议"',
  'label:"Troubleshooting"': 'label:"故障排除"',
  'label:"Keyboard shortcuts"': 'label:"键盘快捷键"',
  
  // App 菜单 (macOS)
  'label:"About Codex"': 'label:"关于 Codex"',
  'message:"Codex"': 'message:"Codex"',
  
  // 跟踪录制
  'label:"Start Trace Recording"': 'label:"开始跟踪录制"',
  'label:"Stop Trace Recording"': 'label:"停止跟踪录制"',
  'label:"Saving Trace…"': 'label:"正在保存跟踪…"',
  
  // Electron 原生菜单 (role-based)
  'label:"View"': 'label:"视图"',
  'label:"Services"': 'label:"服务"',
  
  // 上下文菜单 (electron-context-menu) - 编辑操作
  'label:"Cu&t"': 'label:"剪切"',
  'label:"&Copy"': 'label:"复制"',
  'label:"&Paste"': 'label:"粘贴"',
  'label:"Select &All"': 'label:"全选"',
  
  // 上下文菜单 - 图片操作
  'label:"Save I&mage"': 'label:"保存图片"',
  'label:"Sa&ve Image As…"': 'label:"图片另存为…"',
  'label:"Cop&y Image"': 'label:"复制图片"',
  'label:"C&opy Image Address"': 'label:"复制图片地址"',
  
  // 上下文菜单 - 视频操作
  'label:"Save Vide&o"': 'label:"保存视频"',
  'label:"Save Video& As…"': 'label:"视频另存为…"',
  'label:"Copy Video Ad&dress"': 'label:"复制视频地址"',
  
  // 上下文菜单 - 链接操作
  'label:"Copy Lin&k"': 'label:"复制链接"',
  'label:"Save Link As…"': 'label:"链接另存为…"',
  
  // 上下文菜单 - 其他
  'label:"I&nspect Element"': 'label:"检查元素"',
  'label:"&Search with Google"': 'label:"使用 Google 搜索"',
  'label:"Look Up \"{selection}\""': 'label:"查找 \"{selection}\""',
  'label:"&Learn Spelling"': 'label:"学习拼写"',
  'label:"No Guesses Found"': 'label:"未找到猜测"',
  
  // macOS 系统菜单角色翻译
  'role:"services"': 'role:"services",label:"服务"',
};

// ──────────────────────────────────────────────
//  文件定位
// ──────────────────────────────────────────────

function locateMainProcessFile() {
  const buildDir = path.join(__dirname, "..", "src", ".vite", "build");
  
  if (!fs.existsSync(buildDir)) {
    console.error("❌ 构建目录不存在:", buildDir);
    process.exit(1);
  }

  const files = fs.readdirSync(buildDir).filter((f) => /^main-.*\.js$/.test(f));

  if (files.length === 0) {
    console.error("❌ 未找到 main-*.js 主进程文件");
    process.exit(1);
  }

  if (files.length > 1) {
    console.error("❌ 发现多个 main-*.js 文件:", files.join(", "));
    process.exit(1);
  }

  return path.join(buildDir, files[0]);
}

// ──────────────────────────────────────────────
//  补丁执行
// ──────────────────────────────────────────────

function applyMenuTranslations(source, stats) {
  let result = source;

  for (const [from, to] of Object.entries(MENU_TRANSLATIONS)) {
    // 使用全局替换
    const regex = new RegExp(escapeRegex(from), "g");
    const matches = source.match(regex);
    
    if (matches && matches.length > 0) {
      result = result.replace(regex, to);
      stats.replaced.push({ from: from.slice(7, -1), to: to.slice(7, -1), count: matches.length });
    }
  }

  return result;
}

/**
 * 转义正则表达式特殊字符
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ──────────────────────────────────────────────
//  统计信息
// ──────────────────────────────────────────────

function showStats(source) {
  // 统计菜单项数量
  const labelMatches = source.match(/label:"[^"]+"/g) || [];
  
  console.log("\n📊 菜单项统计\n");
  console.log(`   总菜单项: ${labelMatches.length}`);
  
  // 显示部分菜单项示例
  console.log("\n   菜单项示例:");
  const samples = labelMatches.slice(0, 10);
  for (const s of samples) {
    console.log(`   ${s}`);
  }
  if (labelMatches.length > 10) {
    console.log(`   ... 还有 ${labelMatches.length - 10} 项`);
  }
}

// ──────────────────────────────────────────────
//  主流程
// ──────────────────────────────────────────────

function main() {
  const isCheck = process.argv.includes("--check");
  const showStatsOnly = process.argv.includes("--stats");

  const mainPath = locateMainProcessFile();
  const relPath = path.relative(path.join(__dirname, ".."), mainPath);

  console.log(`📄 目标文件: ${relPath}\n`);

  const source = fs.readFileSync(mainPath, "utf-8");

  // 仅显示统计
  if (showStatsOnly) {
    showStats(source);
    return;
  }

  // 执行补丁
  const stats = {
    replaced: [],
  };

  console.log("🔧 执行菜单汉化补丁...");
  const result = applyMenuTranslations(source, stats);

  // 输出统计
  console.log("\n━".repeat(40));
  console.log("📈 补丁统计");
  console.log("━".repeat(40));

  if (stats.replaced.length > 0) {
    console.log("\n已翻译菜单项:");
    for (const item of stats.replaced) {
      console.log(`   "${item.from}" → "${item.to}" (${item.count} 处)`);
    }
    console.log(`\n总计: ${stats.replaced.length} 个菜单项翻译`);
  } else {
    console.log("\n✅ 所有菜单项已翻译，无需修改");
    return;
  }

  // 检查模式不写入文件
  if (isCheck) {
    console.log("\n⚠️  检查模式，未写入文件");
    return;
  }

  // 写入文件
  fs.writeFileSync(mainPath, result);
  console.log("\n✅ 菜单汉化补丁已应用");

  // 显示更新后的统计
  showStats(result);
}

main();
