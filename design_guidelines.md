# 设计指南（design_guidelines）

## 1. 品牌定位

- 应用定位：集团内部「先进评选」投票小程序（投票端 + 管理端）。
- 设计风格：工业重工、刚劲有力、大国重器、对称庄重、大留白、克制不花哨。
- 目标用户：集团普通员工（投票人）与管理员，界面需可信、正式、有仪式感。

## 2. 配色方案（Tailwind 类名）

> 色值通过 `src/app.css` 的 CSS 变量注入，页面直接用语义类名，不要写死色值。

- 主色（中国红）：`--primary` = `#C80018`，类名 `bg-primary` / `text-primary` / `border-primary`
- 主色前景：`--primary-foreground` = `#FFFFFF`，类名 `text-primary-foreground`
- 深红（按压/收尾）：`#8B0010`，用于按钮按压态或渐变收尾，类名 `bg-[#8B0010]`
- 墨黑正文：`--foreground` = `#1A1A1A`，类名 `text-foreground`
- 深灰辅助：`#4A4A4A`，类名 `text-[#4A4A4A]`
- 中灰弱化：`--muted-foreground` = `#8C8C8C`，类名 `text-muted-foreground`
- 雅金点缀（极小面积）：`#C9A063`，类名 `text-[#C9A063]` / `bg-[#C9A063]` / `border-[#C9A063]`
- 背景白：`--background` = `#FFFFFF`
- 极浅灰分组底：`#F7F7F5`，类名 `bg-[#F7F7F5]`
- 分割线：`--border` = `#E5E5E5`，类名 `border-border`

**严禁出现**：紫色渐变、荧光色、马卡龙色系、多彩撞色、卡通风格。

## 3. 字体规范

- 中文系统黑体族，保证加载速度。
- 标题：粗字重（`font-bold` / `font-semibold`），字距放宽（`tracking-wide`）。
- 数字（票数、编号、倒计时）：粗体，用等宽数字（`tabular-nums`）。
- 正文：行高 1.6~1.75（`leading-relaxed` / `leading-7`）。
- 文案书面语，正式简洁，禁用网络用语、颜文字、emoji。

## 4. 间距系统

- 页面左右边距：`px-4`（16px）。
- 卡片内边距：`p-4`（16px）或 `p-5`。
- 卡片/列表间距：`gap-3` 或 `gap-4`。
- 区块上下间距：`mt-6` / `mb-6`，组内 `mt-4`。
- 标题与内容间距：`mb-4`。

## 5. 组件使用原则（选型约束，务必遵守）

- 通用 UI 组件（按钮、输入框、弹窗、标签、Tabs、Toast、Card、Skeleton、Progress、Badge、Avatar、Separator、Select、Switch 等）**一律优先从 `@/components/ui/*` 导入**。
- 新页面开发前先拆 UI 单元：判断哪些区域需要按钮/输入框/卡片/标签/弹层/Tabs/空状态/加载态，再逐一映射到 `@/components/ui/*`。
- **禁止**用 `View/Text` 手搓按钮、输入框、卡片、标签胶囊、弹窗、底部操作栏、分段切换等通用组件。
- 仅组件库缺失或原生能力（Camera/Canvas 等）才用 `@tarojs/components` 原生组件。
- 圆角：卡片/按钮统一 4~8px（`rounded` / `rounded-md` / `rounded-lg`），**禁用 `rounded-xl` 及以上大圆角**。
- 层次：优先 1px 细边框（`border border-border`）区分，投影极弱或不用。

## 6. 导航结构

- 本应用为活动型流程，**不设 TabBar**。首页为唯一入口，按活动状态切换「进入投票 / 查看结果 / 我的投票记录」。
- 管理端通过首页隐藏入口进入（长按首页 logo/标题区域 3 秒），对普通用户不可见。
- 页面跳转：普通页 `Taro.navigateTo`，无返回栈时用 `Taro.redirectTo`。

## 7. 状态展示原则

- 空状态：居中对齐，线性图标 + 简短说明，配 `text-muted-foreground`。
- 加载态：优先 `Skeleton`，不写灰块假 UI。
- 活动未开始/已结束/无权限/网络异常：独立兜底页，居中 + 图标 + 说明 + 可操作按钮。

## 8. 小程序约束

- 图片/视频走 TOS 对象存储，仅 TabBar 图标可放本地（本项目无 TabBar）。
- 包体积：不引入重 UI 框架，图标用 `lucide-react-taro`。
- 375px 宽度下无横向滚动、无错位。
- 固定底部操作栏用 inline style（H5 端 Tailwind fixed+flex 失效），预留 TabBar 高度。
