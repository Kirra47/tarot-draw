# 塔罗抽卡 · Tarot Draw

沉浸式单页塔罗 Web 应用，支持手势/鼠标/触摸抽卡、三牌阵与五牌阵、本地综合解读与可选 AI 深度解读。

## 在线演示

https://peas-47.netlify.app/

## 功能

- Astral Archive 「星象档案」仪式感 UI，桌面端与手机端分别优化
- 3D 粒子星空背景 + 塔罗牌动画
- 支持鼠标 / 触摸 / 摄像头手势（本地 MediaPipe）三种交互模式
- 手势模式支持张开手掌浏览、短暂捏合蓄力选牌/确认；使用距离归一化、松开锁与冷却防止误触和连续触发
- 正位 / 逆位随机抽取，实时牌意展示
- 三牌阵（过去 / 现在 / 未来）与五牌阵（加入行动建议 / 潜在影响）
- 本地牌阵综合解读，即使 AI 未配置或暂时不可用也能完成流程
- 通义千问 AI 深度解读（由 Netlify Function 代理）
- 围绕同一次牌阵连续追问，保留本次对话上下文；网络不可用时自动给出本地牌面回应
- 个人观测档案：按整次解读保存、全文检索、高频牌/元素/正逆位/七日活跃统计与本地 JSON 导出
- 复制或调用系统分享本次解读
- 本地生成 1080×1440 三牌/五牌高清海报，支持隐藏问题、Android 图片直分享与 PNG 保存
- 移动端自适应
- 可安装为 PWA；提供 Android/iPhone 安装引导、规范图标、离线下载进度、网络状态和新版本一键更新
- 首次完整访问后，基础抽牌与 78 张牌面可离线使用；桌面快捷入口可直达新观测或个人档案
- Three.js、MediaPipe、牌图全部由本站托管，运行时不依赖境外 CDN
- 抽第一张牌确认时同步锁定梅花易数时间卦：展示本卦、动爻、互卦、变卦与体用关系；同一牌阵的后续追问沿用同一卦
- 结果页以“本卦先读”为主线：先给六爻图、本卦主题、白话导读、问题落点、动爻变化提示；动爻 / 互卦 / 体用和塔罗牌面参照可按需展开
- 原典对照区载入对应卦辞和本次动爻辞，和本站现代说明分开标注；其余传篇通过逐卦原文入口查看
- 起卦方式可选：按抽牌时间、三个数字、射覆、静物取象、人物取象、失物占、声音占、物数占、测字与外应记录；自动模式会识别“用三个数字起卦”等明确表述
- 射覆与取象结果会单列颜色、形状、材质、大小手感、方向及候选物品，并明确标注为可核对线索，不把候选当成事实

## 传统文化资料库（第一批）

《周易》、梅花易数、道德经、庄子与四柱八字的来源清单位于 [`knowledge/`](knowledge/)。梅花试点已形成[五个技能与阅读说明](books/meihua-yishu-wikisource/INDEX.md)，并安装到本项目 `.agents/skills/`。网站使用 `mh-ws-1` 规则档案做确定性起卦，前端展示结构化卦象、取数过程与取象候选，原文通过周易底本链接查看；30 条行为盲测与 384 组结构检查通过。运行 `node scripts/verify-meihua.mjs` 与 `node scripts/verify-meihua-modes.mjs` 可复核数值与模式检查。

## 文件说明

| 文件 | 说明 |
|------|------|
| `tarot.html` | 应用结构、3D 牌桌与交互逻辑 |
| `emil-redesign.css` | “雾金夜航台”视觉系统、动效与安卓响应式布局 |
| `tarot-bg.png` | 背景图（主） |
| `tarot-bg.jpg` | 背景图（备用） |
| `netlify.toml` | Netlify 部署配置 |
| `netlify/functions/tarot-reading.mjs` | AI 解读代理、输入校验与限流配置 |
| `scripts/meihua-display.mjs` | 农历/时辰读取、六十四卦名称映射、各类起卦与取象展示数据 |
| `scripts/meihua-insight.mjs` | 64 卦本站白话导读、上下卦取象、动爻变化提示与逐卦原文链接 |
| `scripts/zhouyi-text.mjs` | 六十四卦卦辞与爻辞原文对照数据，供本卦和动爻展示 |
| `books/meihua-yishu-wikisource/meihua-numeric-cast/scripts/meihua.mjs` | 可复核的梅花易数时间卦计算核心 |
| `manifest.webmanifest` / `service-worker.js` | PWA 安装信息与离线缓存策略 |
| `assets/cards/` | 本地 78 张 Rider–Waite 牌图 |
| `vendor/` | 锁定版本的 Three.js 与 MediaPipe Hands 运行库 |
| `scripts/localize-assets.mjs` | 可重复执行的资源下载、校验与来源清单生成脚本 |
| `scripts/generate-pwa-icons.cjs` | 从 SVG 品牌图标生成 Android、maskable 与 iPhone PNG 图标 |

## 本地运行

请通过静态服务器访问。直接双击 `tarot.html` 可以查看页面，但浏览器不会启用 Service Worker，因此无法安装 PWA 或验证离线模式。

```bash
# Python 内置服务器
python3 -m http.server 8080
# 浏览器访问 http://localhost:8080/tarot.html
```

如需重新拉取或校验本地依赖与牌图：

```bash
node scripts/localize-assets.mjs
node scripts/generate-pwa-icons.cjs
```

脚本会校验文件格式、体积与 SHA-256，并把确切来源写入 `assets/asset-manifest.json`。页面首次完整打开后会在后台缓存 78 张牌；手势模型约 23 MB，仅在第一次开启手势模式时加载并缓存。离线 AI 不可用时，应用会自动使用本地综合解读。

梅花易数同步起卦在第一张牌确认瞬间完成，不调用摄像头、不上传起卦时间；起卦结果随本次观测保存在本机档案，并随 AI 请求以结构化资料传入，不包含任何 API 密钥。

## 部署到 Netlify

1. 将此目录推送到 GitHub
2. Netlify → New site from Git → 选择仓库
3. Build command 留空，Publish directory 设为 `.`
4. `netlify.toml` 已配置根路径重定向到 `tarot.html`

### 配置智能解读

在 Netlify 的 **Site configuration → Environment variables** 中添加：

```text
DASHSCOPE_API_KEY=你的通义千问 API Key
```

API Key 只由 Netlify Function 读取，不会发送到浏览器。函数端点还会校验请求来源与体积，并按 IP + 站点做分钟级限流。若旧版本曾把 Key 写进前端源码，请先在阿里云控制台撤销旧 Key 并创建新 Key。

不要把真实 Key 写进 `tarot.html`、`netlify.toml` 或提交到 GitHub。线上请在 Netlify 的 **Project configuration → Environment variables** 新建 `DASHSCOPE_API_KEY`，如界面提供 Scope，需包含 **Functions**；可将它标记为 **Contains secret values**。修改环境变量后需要重新部署。

本地的 Python 静态服务器不运行 Netlify Function，所以 AI 请求会返回 501。需要本地测试 AI 时：

```bash
copy .env.example .env
# 只在本机的 .env 中填入真实 DASHSCOPE_API_KEY
npx netlify dev
# 打开 Netlify CLI 输出的本地地址，通常是 http://localhost:8888
```

`.env` 和 `.env.*` 已被 `.gitignore` 排除，只有不含真实密钥的 `.env.example` 可以提交。

## 技术栈

- 原生 HTML / CSS / JavaScript
- 本地 Three.js / WebGL 3D 渲染
- 本地 MediaPipe Hands（可选摄像头手势）
- Service Worker / Web App Manifest
- Netlify Functions
- 无构建步骤

## 许可

个人作品，可自由 Fork 学习。
