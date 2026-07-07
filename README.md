# 塔罗抽卡 · Tarot Draw

Google AI Studio 一句话生成的单页塔罗 Web 应用，支持手势/鼠标抽卡、牌意解读与结算面板。

## 在线演示

https://peas-47.netlify.app/

## 功能

- 3D 粒子星空背景 + 塔罗牌动画
- 支持鼠标 / 触摸 / 摄像头手势（MediaPipe）三种交互模式
- 正位 / 逆位随机抽取，实时牌意展示
- 抽牌历史面板
- 多牌结算解读（Settlement UI）
- 移动端自适应

## 文件说明

| 文件 | 说明 |
|------|------|
| `tarot.html` | 单文件应用（HTML + CSS + JS 全内联） |
| `tarot-bg.png` | 背景图（主） |
| `tarot-bg.jpg` | 背景图（备用） |
| `netlify.toml` | Netlify 部署配置 |

## 本地运行

任意静态服务器即可，或直接双击打开 `tarot.html`：

```bash
# Python 内置服务器
python3 -m http.server 8080
# 浏览器访问 http://localhost:8080/tarot.html
```

## 部署到 Netlify

1. 将此目录推送到 GitHub
2. Netlify → New site from Git → 选择仓库
3. Build command 留空，Publish directory 设为 `.`
4. `netlify.toml` 已配置根路径重定向到 `tarot.html`

## 技术栈

- 原生 HTML / CSS / JavaScript
- Canvas 粒子渲染
- MediaPipe Hands（可选摄像头手势）
- 无构建步骤，零依赖

## 许可

个人作品，可自由 Fork 学习。
