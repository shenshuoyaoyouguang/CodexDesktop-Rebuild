/**
 * 中文翻译补丁脚本
 *
 * 对 zh-CN 翻译文件执行以下优化：
 * 1. 术语统一化（台湾/香港用法 -> 大陆用法）
 * 2. 添加缺失的翻译条目
 * 3. 优化特定翻译表达
 *
 * 用法：
 *   node scripts/patch-zh-cn.js          # 执行补丁
 *   node scripts/patch-zh-cn.js --check  # 仅检查，不修改
 *   node scripts/patch-zh-cn.js --stats  # 显示统计信息
 */
const fs = require("fs");
const path = require("path");

// ──────────────────────────────────────────────
//  术语统一化规则
// ──────────────────────────────────────────────

const TERMINOLOGY_RULES = [
  // 文件/系统相关
  { from: "档案", to: "文件" },
  { from: "登入", to: "登录" },
  { from: "登出", to: "退出登录" },
  { from: "网路", to: "网络" },
  { from: "视窗", to: "窗口" },
  { from: "硬碟", to: "硬盘" },
  { from: "软体", to: "软件" },
  { from: "程式", to: "程序" },
  { from: "资料库", to: "数据库" },
  { from: "预设", to: "默认" },
  { from: "伺服器", to: "服务器" },
  { from: "萤幕", to: "屏幕" },
  { from: "游标", to: "光标" },
  { from: "剪贴簿", to: "剪贴板" },
  { from: "对话方块", to: "对话框" },
  { from: "对话窗", to: "对话框" },
  { from: "作业系统", to: "操作系统" },
  { from: "运算元", to: "操作数" },
  { from: "运算子", to: "运算符" },

  // 操作相关
  { from: "搜寻", to: "搜索" },
  { from: "连结", to: "链接" },
  { from: "讯息", to: "消息" },
  { from: "资讯", to: "信息" },

  // 特殊处理：保留"设定"在某些上下文中的用法
  // { from: "设定", to: "设置" }, // 注释掉，因为在"自动设定"等词中"设定"更合适
];

// ──────────────────────────────────────────────
//  缺失翻译补充
// ──────────────────────────────────────────────

const MISSING_TRANSLATIONS = {
  // 侧边栏相关
  "sidebarElectron.missingWorkspaceRoot": "此项目文件夹已被删除或移动",
  "sidebarElectron.pinThread": "置顶会话",
  "sidebarElectron.unpinThread": "取消置顶",

  // 调试/欢迎
  "debug.onboarding.override.welcome": "欢迎",

  // 自动化设置
  "settings.automations.scheduleSummary.intervalDayCount": "{count, plural, other {# 天}}",
  "settings.automations.scheduleBadge.dayCount": "{count}天",
  "settings.automations.scheduleBadge.interval": "{count}小时",
  "settings.automations.scheduleBadge.weekdays": "工作日",
  "settings.automations.scheduleBadge.weekends": "周末",

  // PDF 预览
  "codex.diffView.pdfPreview.previousPage": "上一页",
  "codex.diffView.pdfPreview.nextPage": "下一页",
  "codex.diffView.pdfPreview.pageIndicator": "{current}/{total}",
  "codex.diffView.pdfPreviewError": "无法渲染 PDF 预览",
  "codex.diffView.pdfPreviewEmpty": "无 PDF 预览",

  // 差异对比
  "diff.fileHeader.toggle": "切换文件差异",
  "codex.diff.openInEditorPrompt.singleLine": "此文件太大，无法在此显示。",
  "codex.diff.openInEditorPrompt.openButton": "在编辑器中打开",

  // PR 相关
  "localConversationPage.viewPullRequestButtonLabel.loading": "正在加载 PR…",
  "localConversationPage.createPullRequestButtonLabel.loading": "正在创建 PR…",
  "localConversationPage.pushButtonLabel.loading": "正在推送…",
  "localConversationPage.generatePullRequestMessageError": "生成 PR 标题和正文失败",
  "localConversationPage.generatePullRequestMessageFailed": "生成 PR 标题和正文失败。",
  "localConversationPage.pushSuccessToast": "已推送更改",

  // 提交相关
  "review.commit.generate.emptyResponse": "无法获取响应",
  "review.commit.generate.failed": "生成提交信息失败：{error}",
  "review.commit.generate.missingPrompt": "添加一些上下文以生成提交信息。",
  "review.commit.disabled.missingContext": "添加一些上下文以生成提交信息",
  "review.commit.rows.commitCount": "{count, plural, other {# 次提交}}",
  "review.commit.rows.commitCount.withUncommitted": "{count, plural, other {# 次提交}}，{stats}",

  // 分支切换
  "composer.footer.branchSwitch.tooltip": "切换分支",
  "composer.footer.branchSwitch.createAndCheckout.disabledTooltip": "提交更改以创建并检出新分支",
  "composer.footer.branchSwitch.checkoutError": "切换分支失败：{message}",
  "composer.footer.branchSwitch.createBranchError": "创建分支失败：{message}",
  "composer.footer.branchSwitch.dropdownTitle": "检出分支",
  "composer.footer.branchSwitch.createAndCheckout": "创建并检出新分支…",
  "composer.footer.branchSwitch.uncommittedSummaryPrefix": "未提交：{fileCount, plural, other {# 个文件}}",
  "composer.footer.branchSwitch.createDialog.title": "创建并检出分支",
  "composer.footer.branchSwitch.createDialog.placeholder": "新分支名",
  "composer.footer.branchSwitch.createDialog.trailingSlashError": "分支名不能以"/"结尾。",
  "composer.footer.branchSwitch.createDialog.branchExistsError": "分支已存在。",
  "composer.footer.branchSwitch.createDialog.createAndCheckout": "创建并检出",
  "composer.footer.branchSwitch.uncommittedDialog.bodyPrefix": "提交 {fileCount, plural, other {# 个文件}}中的更改",
  "composer.footer.branchSwitch.uncommittedDialog.bodySuffix": " 以切换分支。",
  "composer.footer.branchSwitch.uncommittedDialog.commit": "继续提交…",

  // 权限相关
  "composer.permissionsDropdown.default.tooltip": "Codex 在沙箱中自动运行命令",
  "composer.permissionsDropdown.agentMode.tooltip.fullAccess": "Codex 拥有对您电脑的完全访问权限（高风险）",
  "composer.permissionsDropdown.agentMode.tooltip.custom": "Codex 使用 config.toml 中定义的权限。",
  "composer.permissionsDropdown.disabled.requirements": "权限已被 requirements.toml 锁定",
  "composer.permissionsDropdown.default.label": "默认权限",
  "composer.permissionsDropdown.fullAccess.label": "完全访问",
  "composer.permissionsDropdown.trigger.tooltip": "选择权限",
  "composer.permissionsDropdown.default.optionLabel": "默认权限",
  "composer.permissionsDropdown.fullAccess.optionLabel": "完全访问",

  // 文件选择器
  "composer.filePicker.selectFiles": "选择文件",

  // 模式下拉菜单
  "composer.planModeDropdown.ariaLabel": "计划模式",
  "composer.planModeDropdown": "计划模式",
  "composer.addContextDropdown.ariaLabel": "添加文件等",
  "composer.addContextDropdown.tooltipText": "添加文件等",
  "composer.addContextDropdown.tooltipSlash": "/",
  "composer.addContext.openFilePickerError": "无法打开文件选择器",

  // 提交按钮
  "composer.submitButtonTooltip.stop": "停止",
  "composer.submitButtonTooltip.steer": "引导",
  "composer.submitButtonTooltip.send": "发送",

  // 执行审批
  "execApprovalRequest.menu.runAlwaysWithAmendment": "是，且不再询问",
  "execApprovalRequest.menu.runAlwaysWithAmendment.prefix": "是，且不再",

  // 个性设置
  "composer.personalitySlashCommand.title": "个性",
  "composer.personalitySlashCommand.notApplicableSuffix": "（不适用于当前模型）",
  "composer.personalitySlashCommand.label.friendly": "友好",
  "composer.personalitySlashCommand.description.friendly": "热情、协作、乐于助人",
  "composer.personalitySlashCommand.label.pragmatic": "务实",
  "composer.personalitySlashCommand.description.pragmatic": "简洁、任务导向、直接",

  // 计划模式
  "composer.planSlashCommand.title": "计划模式",
  "composer.planSlashCommand.disableDescription": "关闭计划模式",
  "composer.planSlashCommand.enableDescription": "开启计划模式",
  "composer.planModeIndicator.tooltipShortcut": "Shift+Tab",
  "composer.planModeIndicator.tooltipText": "切换",

  // 图片输入
  "composer.imageInputsUnsupported": "此模型不支持图片输入。请尝试其他模型。",
  "composer.submit.imageInputsUnsupported": "移除图片或切换模型以发送此消息。",

  // 同步设置
  "localConversation.syncSetup.createBranchError": "设置交接分支失败：{message}",
  "localConversation.syncSetup.checkoutError": "检出分支失败：{message}",
  "localConversation.syncSetup.error.workingTreeMissing": "无法快照工作树。请重试交接。",
  "localConversation.syncSetup.success.checkedOut": "分支已创建并在本地检出",
  "localConversation.syncSetup.success.notCheckedOut": "分支已创建",
  "localConversation.syncSetup.overwriteError": "分支已创建但未完全交接。请在本地检出前手动交接。",
  "localConversation.syncSetup.error": "出现问题：{message}",
  "localConversation.syncSetup.mode.ariaLabel": "选择分支模式",
  "localConversation.syncSetup.branchPlaceholder.new": "codex/新功能",
  "localConversation.syncSetup.branchPlaceholder.existing": "选择现有分支",
  "localConversation.syncSetup.branchesLoading": "正在加载分支…",
  "localConversation.syncSetup.noBranches": "未找到分支",
  "localConversation.syncSetup.checkoutLabel": "立即在本地检出",
  "localConversation.syncSetup.checkoutUnavailable": "本地工作区不可用",
  "localConversation.syncSetup.checkoutAlreadyCheckedOut": "已检出",
  "localConversation.syncSetup.checkoutPending": "正在检查本地状态…",
  "localConversation.syncSetup.checkoutUnknown": "本地分支不可用",
  "localConversation.syncSetup.checkoutDirty": "当前位于 {branchName}，有未提交的更改",
  "localConversation.syncSetup.checkoutClean": "当前位于 {branchName}",
  "localConversation.syncSetup.checkoutOnLocal": "交接到本地",
  "localConversation.syncSetup.title": "交接到本地分支",
  "localConversation.syncSetup.subtitle": "在本地测试和编辑工作树更改。<a>了解更多</a>",
  "localConversation.syncSetup.mode.new": "新分支",
  "localConversation.syncSetup.mode.existing": "现有分支",

  // 工作树同步 V2
  "localConversation.syncWorktreeV2.direction.ariaLabel": "选择交接方向",
  "localConversation.syncWorktreeV2.changeBranch.ariaLabel": "更改交接分支",
  "localConversation.syncWorktreeError.branchUpdate.error": "更新分支失败：{message}",
  "localConversation.syncWorktreeError.branchUpdate.unknown": "出现问题：{message}",
  "localConversation.syncWorktreeError.branchPlaceholder.new": "codex/新功能",
  "localConversation.syncWorktreeError.branchSetup.title": "更新分支",
  "localConversation.syncWorktreeError.branchSetup.subtitle": "选择一个分支进行交接，然后重试加载更改。",
  "localConversation.syncWorktreeError.branchUpdate.cta": "更新并重试",
  "localConversation.syncWorktreeV2.success.overwrite": "交接成功",
  "localConversation.syncWorktreeV2.apply.disabled.noCheckout": "分支未在本地检出",
  "localConversation.syncWorktreeV2.success.apply": "成功应用更改",
  "localConversation.syncWorktreeV2.changeBranch.error": "更改交接分支失败：{message}",
  "localConversation.syncWorktreeV2.commandError.body": "交接时 git 命令失败。查看输出并重试。",
  "localConversation.syncWorktreeV2.commandError.action.apply": "应用失败",
  "localConversation.syncWorktreeV2.commandError.action.overwrite-worktree-to-local": "覆盖本地失败",
  "localConversation.syncWorktreeV2.commandError.action.overwrite-local-to-worktree": "覆盖工作树失败",
  "localConversation.syncWorktreeV2.direction.toLocal": "到本地",
  "localConversation.syncWorktreeV2.direction.fromLocal": "从本地",
  "localConversation.syncWorktreeV2.localBranchLabel": "本地",
  "localConversation.syncWorktreeV2.title": "交接更改",
  "localConversation.syncWorktreeV2.description": "在本地和此工作树之间交接更改 <a>了解更多</a>。",
  "localConversation.syncWorktreeV2.applyUncommitted.disabled": "必须在本地检出分支才能应用未提交的更改",
  "localConversation.syncWorktreeV2.overwrite.local": "覆盖本地",
  "localConversation.syncWorktreeV2.overwrite.worktree": "覆盖工作树",
  "localConversation.syncWorktreeV2.noChanges": "计算更改中",
  "localConversation.syncWorktreeV2.branches.loading": "正在加载分支…",
  "localConversation.syncWorktreeV2.branches.empty": "未找到分支",
  "localConversation.syncWorktreeV2.partial.body.resolveConflicts": "解决冲突后重试。",
  "localConversation.syncWorktreeV2.partial.conflictsLabel": "冲突",
  "localConversation.syncWorktreeV2.partial.action.overwriteLocalFailed": "无法覆盖本地",
  "localConversation.syncWorktreeV2.partial.action.overwriteWorktreeFailed": "无法覆盖工作树",
  "localConversation.syncWorktreeV2.stateFailed.title": "加载工作树更改失败",
  "localConversation.syncWorktreeV2.stateFailed.generic": "获取工作树更改进行交接时出现问题。请重试。",

  // 工作树分支设置
  "localConversation.worktreeBranchSetup.createBranchError": "设置分支失败：{message}",
  "localConversation.worktreeBranchSetup.checkoutError": "检出分支失败：{message}",
  "localConversation.worktreeBranchSetup.error": "出现问题：{message}",
  "localConversation.worktreeBranchSetup.branchPlaceholder.new": "创建新分支",
  "localConversation.worktreeBranchSetup.subtitle": "创建分支以提交更改、推送并从此工作树创建 PR。<a>了解更多</a>",
  "localConversation.worktreeBranchSetup.checkoutDisabled": "此分支已在 {location} 检出",

  // 外观设置
  "settings.general.appearance.usePointerCursors.label": "使用指针光标",
  "settings.general.appearance.usePointerCursors.description": "悬停在交互元素上时将光标更改为指针",

  // 文件搜索
  "codex.review.fileSearch.placeholder": "筛选文件…",
  "codex.review.fileSearch.clear": "清除文件筛选",

  // Shell 输出
  "codex.shell.noOutput": "无输出",
  "codex.shell.embeddedHeader.bash": "bash",

  // 滚动
  "localConversation.scrollToBottomButton": "滚动到底部",

  // 数据控制
  "settings.dataControls.archivedChats.unarchiveError": "取消归档会话失败",
  "settings.dataControls.archivedChats.unarchive": "取消归档",
  "inbox.archived.deleteError": "无法删除已归档的运行",
  "inbox.archived.deleteRun": "删除已归档的运行",

  // Electron 入门
  "electron.onboarding.workspace.skip.error.unknown": "未知错误",

  // 技能
  "skills.preview.copyPrompt": "复制提示词",
  "skills.card.removeFailed": "卸载技能失败",

  // 搜索栏
  "codex.threadFindBar.chatFilter": "搜索会话",
  "codex.threadFindBar.diffFilter": "搜索差异",
  "codex.threadFindBar.placeholder.review.extension": "搜索差异…",
  "codex.threadFindBar.placeholder.review": "搜索差异…",
  "codex.threadFindBar.placeholder": "搜索会话…",

  // 归档信息
  "codex.archiveInfo.electron": "在{settingsLink}查看已归档的会话",

  // 链接
  "threadHeader.copyAppLink": "复制应用链接",

  // 个人资料下拉菜单
  "codex.profileDropdown.getPlus": "升级以获取更高额度",
  "codex.profileDropdown.skills": "技能设置",
  "codex.profileDropdown.openSkillsSettings": "打开技能设置",
  "codex.profileFooter.upgrade": "升级",

  // 代码审查助手
  "codeReviewAssistant.addComment": "添加",
  "codeReviewAssistant.dismiss": "忽略",

  // Markdown
  "markdown.fileReference.copyPath": "复制路径",

  // 差异上下文菜单
  "wham.diff.contextMenu.requestChanges": "请求更改",
  "wham.diff.contextMenu.openInTarget": "在 {target} 中打开",
  "wham.diff.contextMenu.openWith": "打开方式",
  "wham.diff.contextMenu.copySelection": "复制选择",
  "wham.diff.contextMenu.copyPath": "复制路径",
  "wham.diff.contextMenu.toggleWrap": "切换换行",

  // 升级横幅
  "codex.upsellBanner.cta.viewUsage": "查看用量",
  "codex.upsellBanner.cta.upgradeAccount": "升级",
  "codex.upsellBanner.cta.addCredits": "添加额度",
  "codex.upsellBanner.business.headline": "要立即获取更多访问权限，请向您的管理员发送请求，或等待至 {resetDate}。",
  "codex.upsellBanner.cbp.headline": "要立即获取更多访问权限，请向您的管理员发送请求。",
  "codex.upsellBanner.plus.headline": "您的速率限制将于 {resetDate} 重置。要继续使用 Codex，请立即添加额度或升级到 Pro。",
  "codex.upsellBanner.pro.headline": "您的速率限制将于 {resetDate} 重置。立即添加额度以继续使用 Codex。",
  "codex.upsellBanner.free.trialHeadline": "您的速率限制将于 {resetDate} 重置。要继续使用 Codex 并获取 GPT-5.3-Codex 访问权限，请立即开始 Plus 免费试用。",
  "codex.upsellBanner.go.trialHeadline": "您的速率限制将于 {resetDate} 重置。要继续使用 Codex，请立即开始 Plus 免费试用。",
  "codex.upsellBanner.freeOrGo.headline": "您的速率限制将于 {resetDate} 重置。要继续使用 Codex，请立即升级到 Plus。",
  "codex.upsellBanner.general.headline": "您的速率限制将于 {resetDate} 重置。",
  "codex.upsellBanner.general.title": "您的 Codex 消息已用完",

  // 远程分支
  "composer.remote.branchStartingPoint": "此任务应从哪个分支开始？",

  // 模式
  "composer.mode.worktree.submoduleWarning": "此仓库有 git 子模块。工作树创建可能失败",
  "composer.mode.local.gpt5_3_codex_reasoning.model": "GPT-5.3-Codex",

  // 请求输入面板
  "requestInputPanel.escapeKey": "ESC",

  // 队列消息
  "composer.queuedMessage.sendNowTooltip": "立即发送",

  // 沙箱按钮
  "composer.sandboxButton.windowsSandboxDialog.title": "启用 Windows 沙箱？",
  "composer.sandboxButton.windowsSandboxDialog.content": "Codex 可以在 Windows 上使用实验性沙箱来限制文件系统和网络访问。{sandboxLink}",
  "composer.sandboxButton.windowsSandboxDialog.useReadOnly": "使用只读模式",

  // 上下文窗口
  "composer.contextWindow.autoCompactionTooltipLine1": "Codex 自动压缩其上下文",

  // 添加文件
  "composer.addPhotosAndFiles": "添加照片和文件",

  // 补丁更改
  "codex.patch.change.created-file": "已创建文件",
  "codex.patch.change.deleted-file": "已删除文件",
  "codex.patch.change.edited-file": "已编辑文件",

  // 应用升级横幅
  "codex.appUpsellBanner.freeGo.message": "Codex 已包含在您的计划中，有效期至 3 月 2 日。试用 Codex 应用以更快构建。",
  "codex.appUpsellBanner.proPlusBusiness.message": "试用 Codex 应用，享双倍速率限制至 4 月 2 日。立即下载或{learnMoreLink}。",
  "codex.appUpsellBanner.learnMoreLowercase": "了解更多",
  "codex.appUpsellBanner.cbpApi.message": "使用 Codex 应用更快构建。立即下载或{learnMoreLink}。",
  "codex.appUpsellBanner.title": "Codex 应用",
  "codex.appUpsellBanner.download": "下载",

  // 用例提示
  "home.useCases.dailyBugScan.prompt": "扫描最近的提交查找可能的错误并提出最小化修复。",
  "home.useCases.weeklyReleaseNotes.prompt": "从合并的 PR 起草发布说明。",
  "home.useCases.dailyStandup.prompt": "总结昨天的 git 活动用于站会。",
  "home.useCases.nightlyCiReport.prompt": "总结 CI 失败和不稳定测试。",
  "home.useCases.dailyClassicGame.prompt": "创建一个范围最小的小型经典游戏。",
  "home.useCases.skillProgressionMap.prompt": "从最近的 PR 和审查建议下一步要深化的技能。",
  "home.useCases.weeklyEngineeringSummary.prompt": "综合本周的 PR、发布、事件和审查。",
  "home.useCases.performanceRegressionWatch.prompt": "监视最近更改中的性能回归。",
  "home.useCases.dependencySdkDrift.prompt": "检测依赖和 SDK 漂移；提出对齐建议。",
  "home.useCases.testGapDetection.prompt": "从最近更改中发现测试缺口；创建草稿 PR。",
  "home.useCases.preReleaseCheck.prompt": "在打标签前运行发布前检查清单。",
  "home.useCases.agentsDocsSync.prompt": "用新工作流和命令更新 AGENTS.md。",
  "home.useCases.weeklyPrSummary.prompt": "总结上周的 PR。",
  "home.useCases.issueTriage.prompt": "分类新问题并建议负责人和优先级。",
  "home.useCases.ciMonitor.prompt": "检查 CI 失败；分组可能的根本原因。",
  "home.useCases.dependencySweep.prompt": "扫描过时的依赖并提出安全升级建议。",
  "home.useCases.performanceAudit.prompt": "审核性能回归；提出修复建议。",
  "home.useCases.changelogUpdate.prompt": "用本周的更改更新变更日志。",
  "home.useCases.section.getStarted": "开始使用",
  "home.useCases.section.skills": "技能",
  "home.useCases.section.automations": "自动化",
  "home.useCases.title": "从任务开始",
  "home.useCases.close": "关闭画廊",

  // 审查相关
  "codex.review.largeDiff.banner": "检测到大差异 — 一次显示一个文件。",
  "codex.review.find.loadMore": "加载更多匹配",
  "codex.review.fileSearch.label": "筛选文件",
  "codex.review.fileSearch.empty": "没有文件匹配当前筛选条件。",

  // 页面相关
  "threadPage.openOverlay": "弹出",

  // 命令菜单
  "codex.commandMenu.switchWorkspace": "切换项目",

  // 主页
  "home.header.getPlus": "获取 Plus",
  "home.conversationStarters.exploreMore": "探索更多",

  // 自动化设置
  "settings.automations.dialog.subtitle": "在后台自动执行重复任务。Codex 将发现结果添加到收件箱，或者如果没有发现则自动归档任务。",
  "inbox.automations.startingNow": "现在开始",
  "inbox.automations.pauseTooltip": "暂停自动化",
  "inbox.automations.resumeTooltip": "恢复自动化",

  // 收件箱
  "inbox.contextMenu.markRead": "标记为已读",
  "inbox.contextMenu.markUnread": "标记为未读",

  // 快速启动
  "inbox.rightPanel.quickStart.home.defaultDraftName": "自动化",
  "inbox.rightPanel.quickStart.home.dailyBugScan.draftName": "每日 Bug 扫描",
  "inbox.rightPanel.quickStart.home.weeklyReleaseNotes.draftName": "每周发布说明",
  "inbox.rightPanel.quickStart.home.dailyStandup.draftName": "站会总结",
  "inbox.rightPanel.quickStart.home.nightlyCiReport.draftName": "夜间 CI 报告",
  "inbox.rightPanel.quickStart.home.dailyClassicGame.draftName": "每日经典游戏",
  "inbox.rightPanel.quickStart.home.skillProgressionMap.draftName": "技能进阶图谱",
  "inbox.rightPanel.quickStart.home.weeklyEngineeringSummary.draftName": "每周工程总结",
  "inbox.rightPanel.quickStart.home.performanceRegressionWatch.draftName": "性能回归监控",
  "inbox.rightPanel.quickStart.home.dependencySdkDrift.draftName": "依赖和 SDK 漂移",
  "inbox.rightPanel.quickStart.home.testGapDetection.draftName": "测试缺口检测",
  "inbox.rightPanel.quickStart.home.preReleaseCheck.draftName": "发布前检查",
  "inbox.rightPanel.quickStart.home.agentsDocsSync.draftName": "更新 AGENTS.md",
  "inbox.rightPanel.quickStart.home.weeklyPrSummary.draftName": "每周 PR 总结",
  "inbox.rightPanel.quickStart.home.issueTriage.draftName": "问题分类",
  "inbox.rightPanel.quickStart.home.ciMonitor.draftName": "CI 监控",
  "inbox.rightPanel.quickStart.home.dependencySweep.draftName": "依赖扫描",
  "inbox.rightPanel.quickStart.home.performanceAudit.draftName": "性能审计",
  "inbox.rightPanel.quickStart.home.changelogUpdate.draftName": "更新变更日志",
  "inbox.rightPanel.quickStart.header": "从模板开始",

  // 收件箱模式
  "inbox.mode.automations.beta": "测试版",

  // 工作树恢复
  "worktreeRestoreBanner.missing.title": "当前工作目录缺失",
  "worktreeRestoreBanner.missing.description": "工作目录已被删除或移动。",
  "worktreeRestoreBanner.missing.action": "恢复工作树",

  // 沙箱
  "sandbox.label": "沙箱",
  "sandbox.exit": "退出沙箱",
  "sandbox.default": "默认沙箱",
  "sandbox.windows": "Windows 沙箱",

  // MCP 服务器
  "mcpServer.status.running": "运行中",
  "mcpServer.status.stopped": "已停止",
  "mcpServer.status.error": "错误",
  "mcpServer.status.starting": "正在启动",

  // 环境
  "environment.local": "本地",
  "environment.cloud": "云端",
  "environment.connecting": "正在连接…",

  // 权限
  "permission.approve": "批准",
  "permission.deny": "拒绝",
  "permission.always": "始终允许",
  "permission.never": "从不允许",

  // Git 相关
  "git.branch.current": "当前分支",
  "git.branch.create": "创建分支",
  "git.branch.switch": "切换分支",
  "git.commit.amend": "修改提交",
  "git.commit.message": "提交信息",
  "git.push.force": "强制推送",
  "git.pull.rebase": "变基拉取",
  "git.merge.conflict": "合并冲突",
  "git.stash.pop": "恢复暂存",
  "git.stash.drop": "丢弃暂存",

  // 文件操作
  "file.create": "创建文件",
  "file.delete": "删除文件",
  "file.rename": "重命名",
  "file.move": "移动",
  "file.copy": "复制",
  "file.paste": "粘贴",

  // 编辑器
  "editor.format": "格式化",
  "editor.save": "保存",
  "editor.saveAll": "全部保存",
  "editor.undo": "撤销",
  "editor.redo": "重做",

  // 搜索
  "search.placeholder": "搜索…",
  "search.replace": "替换",
  "search.replaceAll": "全部替换",
  "search.caseSensitive": "区分大小写",
  "search.regex": "正则表达式",
  "search.wholeWord": "全词匹配",

  // 终端
  "terminal.new": "新建终端",
  "terminal.split": "拆分终端",
  "terminal.close": "关闭终端",
  "terminal.clear": "清空终端",

  // 调试
  "debug.start": "开始调试",
  "debug.stop": "停止调试",
  "debug.restart": "重新启动",
  "debug.stepOver": "单步跳过",
  "debug.stepInto": "单步进入",
  "debug.stepOut": "单步跳出",
  "debug.continue": "继续",
  "debug.breakpoint": "断点",

  // 工作树恢复
  "worktreeRestoreBanner.missing.body": "此会话的工作目录已被删除或移动。",

  // 探索计数
  "localConversationTurn.exploration.accordion.count.lists": "<countText>{count, plural, other {# 个列表}}</countText>",

  // 上下文压缩
  "localConversation.contextCompacted": "上下文已自动压缩",
  "localConversation.contextCompacting": "正在自动压缩上下文",

  // 命令摘要
  "toolSummaryForCmd.ranSpecificCommand": "<status>已运行</status> {command}{timer}",

  // MCP 工具
  "codex.mcpTool.collapsedLabel.verb.called": "已调用",
  "codex.mcpTool.collapsedLabel.verb.calling": "正在调用",
  "codex.mcpTool.collapsedLabel.details": "{server} MCP {tool} 工具",

  // 个性切换
  "localConversation.personalityChanged": "已切换到 {personality} 个性",

  // 推理
  "reasoningItem.thoughtWithElapsed": "思考了 {elapsed}",

  // 大文件
  "codex.unifiedDiff.inlineLargeFile": "文件过大，无法内联渲染",

  // 用户输入请求
  "localConversation.userInputRequest.inProgress": "正在询问 {count, plural, other {# 个问题}}",
  "localConversation.userInputRequest.summary.asked": "已询问",
  "localConversation.userInputRequest.summary.count": "{count, plural, other {# 个问题}}",
  "localConversation.userInputRequest.summary": "{label} {counts}",
  "localConversation.userInputRequest.noAnswer": "未提供答案",

  // 网页搜索
  "codex.webSearch.summary.verb.completed": "已搜索网页",
  "codex.webSearch.summary.verb.inProgress": "正在搜索网页",
  "codex.webSearch.summary.details": " 关键词：{query}",
  "codex.webSearch.summary": "{label}{details}",

  // 测试
  "test.run": "运行测试",
  "test.runAll": "运行所有测试",
  "test.debug": "调试测试",
  "test.coverage": "测试覆盖率",
  "test.passed": "通过",
  "test.failed": "失败",
  "test.skipped": "跳过",

  // 任务
  "task.start": "开始任务",
  "task.cancel": "取消任务",
  "task.retry": "重试",
  "task.completed": "已完成",
  "task.failed": "失败",
  "task.inProgress": "进行中",
  "task.queued": "已排队",

  // 通知
  "notification.clear": "清除通知",
  "notification.clearAll": "清除所有",
  "notification.settings": "通知设置",

  // 帮助
  "help.documentation": "文档",
  "help.shortcuts": "快捷键",
  "help.feedback": "反馈",
  "help.about": "关于",

  // 状态
  "status.ready": "就绪",
  "status.loading": "加载中…",
  "status.error": "错误",
  "status.success": "成功",
  "status.warning": "警告",
  "status.info": "信息",

  // 确认对话框
  "confirm.yes": "是",
  "confirm.no": "否",
  "confirm.ok": "确定",
  "confirm.cancel": "取消",
  "confirm.save": "保存",
  "confirm.discard": "放弃",
  "confirm.dontAskAgain": "不再询问",
};

// ──────────────────────────────────────────────
//  特定翻译优化
// ──────────────────────────────────────────────

const TRANSLATION_OVERRIDES = {
  // "key": "优化后的翻译"

  // 示例：如果某些翻译需要特别优化
  // "app.sidebar.tooltip": "切换侧边栏",
};

// ──────────────────────────────────────────────
//  文件定位
// ──────────────────────────────────────────────

function locateZhCNFile() {
  const assetsDir = path.join(__dirname, "..", "src", "webview", "assets");
  if (!fs.existsSync(assetsDir)) {
    console.error("❌ 资源目录不存在:", assetsDir);
    process.exit(1);
  }

  const files = fs.readdirSync(assetsDir).filter((f) => /^zh-CN-.*\.js$/.test(f));

  if (files.length === 0) {
    console.error("❌ 未找到 zh-CN-*.js 翻译文件");
    process.exit(1);
  }

  if (files.length > 1) {
    console.error("❌ 发现多个 zh-CN-*.js 文件:", files.join(", "));
    process.exit(1);
  }

  return path.join(assetsDir, files[0]);
}

// ──────────────────────────────────────────────
//  补丁执行
// ──────────────────────────────────────────────

/**
 * 执行术语统一化
 */
function applyTerminologyPatches(source, stats) {
  let result = source;

  for (const rule of TERMINOLOGY_RULES) {
    // 匹配翻译值中的术语（在引号内）
    // 格式: "key":"value with 术语"
    const pattern = new RegExp(`("[^"]+":"[^"]*)(${escapeRegex(rule.from)})([^"]*")`, "g");
    let count = 0;

    result = result.replace(pattern, (match, before, term, after) => {
      count++;
      return before + rule.to + after;
    });

    if (count > 0) {
      stats.terminology.push({ from: rule.from, to: rule.to, count });
    }
  }

  return result;
}

/**
 * 添加缺失翻译
 */
function addMissingTranslations(source, stats) {
  if (Object.keys(MISSING_TRANSLATIONS).length === 0) {
    return source;
  }

  // 找到翻译对象的结尾位置
  // 格式: const e={"key":"value",...}
  const objectStart = source.indexOf('const e={');
  if (objectStart === -1) {
    console.warn("⚠️  无法找到翻译对象起始位置");
    return source;
  }

  // 找到最后一个翻译条目的位置
  const lastQuote = source.lastIndexOf('"}', source.indexOf('};', objectStart));
  if (lastQuote === -1) {
    console.warn("⚠️  无法找到翻译对象结束位置");
    return source;
  }

  // 构建要添加的翻译
  const additions = [];
  for (const [key, value] of Object.entries(MISSING_TRANSLATIONS)) {
    // 检查是否已存在
    if (!source.includes(`"${key}":`)) {
      additions.push(`"${key}":"${value}"`);
      stats.added++;
    }
  }

  if (additions.length === 0) {
    return source;
  }

  // 在最后一个条目后添加
  const insertPos = lastQuote + 1; // 在 "}" 之后
  const insertion = "," + additions.join(",");

  stats.added = additions.length;
  return source.slice(0, insertPos) + insertion + source.slice(insertPos);
}

/**
 * 应用翻译覆盖
 */
function applyTranslationOverrides(source, stats) {
  if (Object.keys(TRANSLATION_OVERRIDES).length === 0) {
    return source;
  }

  let result = source;

  for (const [key, newValue] of Object.entries(TRANSLATION_OVERRIDES)) {
    // 匹配: "key":"oldValue"
    const pattern = new RegExp(`("${escapeRegex(key)}":"[^"]*")`, "g");
    let count = 0;

    result = result.replace(pattern, (match) => {
      count++;
      return `"${key}":"${newValue}"`;
    });

    if (count > 0) {
      stats.overrides.push({ key, value: newValue, count });
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
  // 统计翻译条目数
  const matches = source.match(/"[^"]+":"[^"]*"/g) || [];
  const count = matches.length;

  // 统计术语使用情况
  const termStats = {};
  for (const rule of TERMINOLOGY_RULES) {
    const regex = new RegExp(`"[^"]+":"[^"]*${escapeRegex(rule.from)}[^"]*"`, "g");
    const termMatches = source.match(regex) || [];
    if (termMatches.length > 0) {
      termStats[rule.from] = termMatches.length;
    }
  }

  console.log("\n📊 翻译文件统计\n");
  console.log(`   总翻译条目: ${count}`);
  console.log(`   待统一术语: ${Object.keys(termStats).length} 种`);

  if (Object.keys(termStats).length > 0) {
    console.log("\n   术语分布:");
    for (const [term, cnt] of Object.entries(termStats)) {
      const rule = TERMINOLOGY_RULES.find((r) => r.from === term);
      console.log(`   "${term}" (${cnt} 处) → "${rule?.to || "未定义"}"`);
    }
  }
}

// ──────────────────────────────────────────────
//  主流程
// ──────────────────────────────────────────────

function main() {
  const isCheck = process.argv.includes("--check");
  const showStatsOnly = process.argv.includes("--stats");

  const zhCNPath = locateZhCNFile();
  const relPath = path.relative(path.join(__dirname, ".."), zhCNPath);

  console.log(`📄 目标文件: ${relPath}\n`);

  const source = fs.readFileSync(zhCNPath, "utf-8");

  // 仅显示统计
  if (showStatsOnly) {
    showStats(source);
    return;
  }

  // 执行补丁
  const stats = {
    terminology: [],
    added: 0,
    overrides: [],
  };

  let result = source;

  // 1. 术语统一化
  console.log("🔧 执行术语统一化...");
  result = applyTerminologyPatches(result, stats);

  // 2. 添加缺失翻译
  console.log("➕ 添加缺失翻译...");
  result = addMissingTranslations(result, stats);

  // 3. 应用翻译覆盖
  console.log("✏️  应用翻译优化...");
  result = applyTranslationOverrides(result, stats);

  // 输出统计
  console.log("\n━".repeat(40));
  console.log("📈 补丁统计");
  console.log("━".repeat(40));

  if (stats.terminology.length > 0) {
    console.log("\n术语统一化:");
    for (const item of stats.terminology) {
      console.log(`   "${item.from}" → "${item.to}": ${item.count} 处`);
    }
  }

  if (stats.added > 0) {
    console.log(`\n添加翻译: ${stats.added} 条`);
  }

  if (stats.overrides.length > 0) {
    console.log("\n翻译优化:");
    for (const item of stats.overrides) {
      console.log(`   [${item.key}]: ${item.count} 处`);
    }
  }

  if (stats.terminology.length === 0 && stats.added === 0 && stats.overrides.length === 0) {
    console.log("\n✅ 无需修改，翻译已是最新状态");
    return;
  }

  // 检查模式不写入文件
  if (isCheck) {
    console.log("\n⚠️  检查模式，未写入文件");
    return;
  }

  // 写入文件
  fs.writeFileSync(zhCNPath, result);
  console.log("\n✅ 翻译补丁已应用");

  // 显示更新后的统计
  showStats(result);
}

main();
