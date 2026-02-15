/**
 * i18n 翻译分析脚本
 *
 * 分析主 bundle 中的翻译 key 和中文翻译文件，找出：
 * 1. 缺失的翻译条目
 * 2. 术语不统一的问题
 * 3. 翻译质量可优化的条目
 *
 * 用法：
 *   node scripts/analyze-i18n.js          # 执行分析
 *   node scripts/analyze-i18n.js --json   # 输出 JSON 格式
 */
const fs = require("fs");
const path = require("path");

// ──────────────────────────────────────────────
//  配置
// ──────────────────────────────────────────────

// 术语统一化规则（台湾/香港用法 -> 大陆用法）
const TERMINOLOGY_RULES = [
  { from: "档案", to: "文件", reason: "file 标准译法" },
  { from: "登入", to: "登录", reason: "login 标准译法" },
  { from: "登出", to: "退出登录", reason: "logout 标准译法" },
  { from: "网路", to: "网络", reason: "network 标准译法" },
  { from: "视窗", to: "窗口", reason: "window 标准译法" },
  { from: "硬碟", to: "硬盘", reason: "disk 标准译法" },
  { from: "软体", to: "软件", reason: "software 标准译法" },
  { from: "程式", to: "程序", reason: "program 标准译法" },
  { from: "资料库", to: "数据库", reason: "database 标准译法" },
  { from: "资料", to: "数据", reason: "data 标准译法" },
  { from: "预设", to: "默认", reason: "default 标准译法" },
  { from: "回应", to: "响应", reason: "response 标准译法" },
  { from: "伺服器", to: "服务器", reason: "server 标准译法" },
  { from: "连结", to: "链接", reason: "link 标准译法" },
  { from: "设定", to: "设置", reason: "settings 标准译法" },
  { from: "专案", to: "项目", reason: "project 标准译法" },
  { from: "萤幕", to: "屏幕", reason: "screen 标准译法" },
  { from: "游标", to: "光标", reason: "cursor 标准译法" },
  { from: "剪贴簿", to: "剪贴板", reason: "clipboard 标准译法" },
  { from: "对话方块", to: "对话框", reason: "dialog 标准译法" },
  { from: "对话窗", to: "对话框", reason: "dialog 标准译法" },
  { from: "快捷键", to: "快捷键", reason: "保持不变" }, // 这个两岸一致
  { from: "搜寻", to: "搜索", reason: "search 标准译法" },
  { from: "存储", to: "保存", reason: "save 标准译法" },
  { from: "存储器", to: "存储器", reason: "storage 保持不变" },
  { from: "讯息", to: "消息", reason: "message 标准译法" },
  { from: "资讯", to: "信息", reason: "information 标准译法" },
  { from: "作业系统", to: "操作系统", reason: "OS 标准译法" },
  { from: "运算元", to: "操作数", reason: "operand 标准译法" },
  { from: "运算子", to: "运算符", reason: "operator 标准译法" },
];

// ──────────────────────────────────────────────
//  文件定位
// ──────────────────────────────────────────────

function locateBundle() {
  const assetsDir = path.join(__dirname, "..", "src", "webview", "assets");
  if (!fs.existsSync(assetsDir)) {
    console.error("❌ 资源目录不存在:", assetsDir);
    process.exit(1);
  }

  const files = fs.readdirSync(assetsDir).filter((f) => /^index-.*\.js$/.test(f));

  if (files.length === 0) {
    console.error("❌ 未找到 index-*.js bundle 文件");
    process.exit(1);
  }

  return path.join(assetsDir, files[0]);
}

function locateZhCNFile() {
  const assetsDir = path.join(__dirname, "..", "src", "webview", "assets");
  const files = fs.readdirSync(assetsDir).filter((f) => /^zh-CN-.*\.js$/.test(f));

  if (files.length === 0) {
    console.error("❌ 未找到 zh-CN-*.js 翻译文件");
    process.exit(1);
  }

  return path.join(assetsDir, files[0]);
}

// ──────────────────────────────────────────────
//  提取翻译 key
// ──────────────────────────────────────────────

/**
 * 从主 bundle 中提取所有翻译 key 和 defaultMessage
 */
function extractMessagesFromBundle(bundlePath) {
  const source = fs.readFileSync(bundlePath, "utf-8");
  const messages = new Map();

  // 匹配格式: id:"xxx",defaultMessage:"xxx" 或 id:"xxx",description:"xxx",defaultMessage:"xxx"
  // 也匹配 formatMessage({id:"xxx",defaultMessage:"xxx"})
  const patterns = [
    // formatMessage({id:"xxx",defaultMessage:"xxx"})
    /formatMessage\s*\(\s*\{\s*id\s*:\s*["']([^"']+)["']\s*,\s*defaultMessage\s*:\s*["']([^"']*)["']/g,
    // {id:"xxx",defaultMessage:"xxx",description:"xxx"}
    /\{\s*id\s*:\s*["']([^"']+)["']\s*,\s*defaultMessage\s*:\s*["']([^"']*)["']/g,
    // id:"xxx",defaultMessage:"xxx"
    /id\s*:\s*["']([^"']+)["']\s*,\s*defaultMessage\s*:\s*["']([^"']*)["']/g,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(source)) !== null) {
      const [, id, defaultMessage] = match;
      if (id && !messages.has(id)) {
        messages.set(id, defaultMessage);
      }
    }
  }

  return messages;
}

/**
 * 从中文翻译文件中提取所有翻译
 */
function extractZhCNTranslations(zhCNPath) {
  const source = fs.readFileSync(zhCNPath, "utf-8");
  const translations = new Map();

  // 匹配格式: const e={"key":"value",...}
  // 或 "key":"value"
  const pattern = /"([^"]+)":"([^"]*)"/g;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    const [, key, value] = match;
    // 过滤掉非翻译 key（如 "use strict" 等）
    if (key.includes(".") || key.includes("_") || key.length > 10) {
      translations.set(key, value);
    }
  }

  return translations;
}

// ──────────────────────────────────────────────
//  分析翻译质量
// ──────────────────────────────────────────────

/**
 * 检查翻译中的术语问题
 */
function checkTerminologyIssues(translations) {
  const issues = [];

  for (const [key, value] of translations) {
    for (const rule of TERMINOLOGY_RULES) {
      if (rule.from === rule.to) continue; // 跳过保持不变的
      if (value.includes(rule.from)) {
        issues.push({
          key,
          current: value,
          term: rule.from,
          suggested: rule.to,
          reason: rule.reason,
        });
      }
    }
  }

  return issues;
}

/**
 * 检查可能的翻译质量问题
 */
function checkTranslationQuality(messages, translations) {
  const issues = [];

  for (const [key, defaultMessage] of messages) {
    const translation = translations.get(key);

    if (!translation) {
      // 缺失翻译
      issues.push({
        type: "missing",
        key,
        defaultMessage,
      });
    } else if (translation === defaultMessage) {
      // 未翻译（与原文相同）
      issues.push({
        type: "untranslated",
        key,
        value: translation,
      });
    }
  }

  return issues;
}

// ──────────────────────────────────────────────
//  主流程
// ──────────────────────────────────────────────

function main() {
  const outputJson = process.argv.includes("--json");

  console.log("🔍 i18n 翻译分析\n");

  // 定位文件
  const bundlePath = locateBundle();
  const zhCNPath = locateZhCNFile();

  console.log(`📄 主 bundle: ${path.relative(path.join(__dirname, ".."), bundlePath)}`);
  console.log(`📄 中文翻译: ${path.relative(path.join(__dirname, ".."), zhCNPath)}\n`);

  // 提取数据
  console.log("📊 提取翻译数据...");
  const messages = extractMessagesFromBundle(bundlePath);
  const translations = extractZhCNTranslations(zhCNPath);

  console.log(`   主 bundle 中的翻译 key: ${messages.size}`);
  console.log(`   中文翻译文件中的条目: ${translations.size}\n`);

  // 分析缺失翻译
  console.log("━".repeat(60));
  console.log("📋 缺失翻译分析");
  console.log("━".repeat(60));

  const missingTranslations = [];
  for (const [key, defaultMessage] of messages) {
    if (!translations.has(key)) {
      missingTranslations.push({ key, defaultMessage });
    }
  }

  if (missingTranslations.length === 0) {
    console.log("✅ 没有缺失的翻译条目\n");
  } else {
    console.log(`⚠️  发现 ${missingTranslations.length} 条缺失翻译：\n`);
    for (const item of missingTranslations.slice(0, 20)) {
      console.log(`   [${item.key}]`);
      console.log(`   原文: ${item.defaultMessage}`);
      console.log("");
    }
    if (missingTranslations.length > 20) {
      console.log(`   ... 还有 ${missingTranslations.length - 20} 条未显示\n`);
    }
  }

  // 分析术语问题
  console.log("━".repeat(60));
  console.log("🔧 术语统一化分析");
  console.log("━".repeat(60));

  const terminologyIssues = checkTerminologyIssues(translations);

  if (terminologyIssues.length === 0) {
    console.log("✅ 没有发现术语问题\n");
  } else {
    // 按术语分组
    const grouped = {};
    for (const issue of terminologyIssues) {
      if (!grouped[issue.term]) {
        grouped[issue.term] = [];
      }
      grouped[issue.term].push(issue);
    }

    console.log(`⚠️  发现 ${terminologyIssues.length} 处术语问题：\n`);
    for (const [term, items] of Object.entries(grouped)) {
      console.log(`   "${term}" → "${items[0].suggested}" (${items.length} 处)`);
    }
    console.log("");
  }

  // 统计摘要
  console.log("━".repeat(60));
  console.log("📈 分析摘要");
  console.log("━".repeat(60));
  console.log(`   翻译覆盖率: ${((translations.size / messages.size) * 100).toFixed(1)}%`);
  console.log(`   缺失翻译: ${missingTranslations.length} 条`);
  console.log(`   术语问题: ${terminologyIssues.length} 处`);
  console.log("");

  // 输出 JSON 格式（用于脚本处理）
  if (outputJson) {
    const result = {
      stats: {
        totalKeys: messages.size,
        translatedKeys: translations.size,
        coverage: ((translations.size / messages.size) * 100).toFixed(1) + "%",
        missingCount: missingTranslations.length,
        terminologyIssueCount: terminologyIssues.length,
      },
      missingTranslations,
      terminologyIssues,
      messages: Object.fromEntries(messages),
      translations: Object.fromEntries(translations),
    };
    console.log(JSON.stringify(result, null, 2));
  }

  // 输出建议的翻译补丁
  if (missingTranslations.length > 0) {
    console.log("━".repeat(60));
    console.log("💡 建议添加的翻译（前 10 条）");
    console.log("━".repeat(60));
    for (const item of missingTranslations.slice(0, 10)) {
      // 自动生成翻译建议（简单规则）
      let suggestion = item.defaultMessage;
      // 如果是简单的英文，尝试翻译
      if (item.defaultMessage.length < 50 && /^[A-Za-z\s]+$/.test(item.defaultMessage)) {
        suggestion = `[待翻译: ${item.defaultMessage}]`;
      }
      console.log(`   "${item.key}": "${suggestion}"`);
    }
    console.log("");
  }
}

main();
