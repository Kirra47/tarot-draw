---
name: 星象塔罗
description: 给自己和朋友使用的简明牌面与起卦观照工具
colors:
  primary: "#a55246"
  primary-hover: "#ba6253"
  night: "#0d1013"
  dark-surface: "#1c2024"
  dark-surface-raised: "#252a2e"
  desk: "#1a1d20"
  desk-raised: "#25282b"
  desk-ink: "#f2eadc"
  desk-muted: "#b2a797"
  desk-soft: "#c8bba9"
  desk-line: "#555047"
  text: "#f2eadc"
  text-soft: "#d7ccba"
  text-muted: "#b9ad9c"
  brass: "#c9ab79"
  line: "#55504a"
typography:
  display:
    fontFamily: "STSong, Songti SC, Noto Serif SC, SimSun, serif"
    fontSize: "clamp(34px, 3.8vw, 54px)"
    fontWeight: 500
    lineHeight: 1.18
  title:
    fontFamily: "Microsoft YaHei UI, PingFang SC, Noto Sans SC, sans-serif"
    fontSize: "21px"
    fontWeight: 650
    lineHeight: 1.45
  body:
    fontFamily: "Microsoft YaHei UI, PingFang SC, Noto Sans SC, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "Microsoft YaHei UI, PingFang SC, Noto Sans SC, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.45
rounded:
  control: "6px"
  section: "8px"
  shell: "14px"
spacing:
  compact: "8px"
  control: "16px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#fff3e6"
    rounded: "{rounded.control}"
    padding: "15px 17px"
    height: "54px"
  question-field:
    backgroundColor: "{colors.desk-raised}"
    textColor: "{colors.desk-ink}"
    rounded: "8px"
    padding: "14px 15px"
  mode-choice:
    backgroundColor: "#22262a"
    textColor: "#d0c3af"
    rounded: "0px"
    padding: "9px 7px"
    height: "60px"
  structure-panel:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.section}"
    padding: "18px"
---

## Overview

**Creative North Star: “静室观象”**

一间安静的暗色观测室：左侧是会真实分层转动的彩色 3×3×3 魔方，右侧是连续的墨色提问台。魔方是唯一多色物件；暖象牙色保证阅读，旧铜负责结构，朱砂只标明主要动作。氛围来自物件、排版和适度的光，不靠霓虹、星空贴图或堆叠神秘符号。

**Key Characteristics:**

- 墨灰黑承载观测空间与输入工作台；旧铜与少量朱砂承担状态提示。
- 中文衬线展示标题与系统黑体正文形成轻重对比。
- 大块面、细分隔和克制圆角，让操作区成为完整控制面而非卡片集合。

**The Instrument Rule.** 状态、分隔和材质都要有信息作用；装饰不能与问题、牌面或卦象争夺注意力。

**The Quiet Surface Rule.** 以连续表面和明确间距组织层级；卡片只用于确实需要区分的独立内容。

## Colors

配色以中性的墨灰黑为底，暖象牙色负责阅读，朱砂强调主要动作，旧铜用于次级状态与微弱标记。六色贴片只属于魔方，不扩散成全站彩虹。

### Primary
- **朱砂**：用于主要动作；普通选中状态优先使用旧铜线与深浅反差。

### Secondary
- **旧铜**：用于次级状态、细线、焦点提示和几何体的微弱高光，不承担大面积填充。

### Neutral
- **墨夜**：页面与暗部背景，保留观看深度。
- **烟灰**：操作面板、输入区和专业内容，与背景拉开差异。
- **暖象牙**：标题与正文；柔和暖灰用于次级说明。
- **冷灰银**：魔方边线与细分隔，亮度低于正文。

## Typography

**Display Font:** STSong / Songti SC（回退 Noto Serif SC、SimSun）  
**Body Font:** Microsoft YaHei UI / PingFang SC（回退 Noto Sans SC）  
**Label/Mono Font:** 标签沿用正文黑体，不另设伪技术字体。

**Character:** 衬线字用于品牌标题与少量结果标题；黑体承担表单、状态和长篇正文，优先保证窄屏可读。

### Hierarchy
- **Display**（500，34–46px，1.28 行高）：固定展示区主标题。
- **Title**（600–650，16–22px，约 1.4 行高）：操作区与结果区标题。
- **Body**（400，15–17px，1.7–1.9 行高）：问题、说明与解读正文。
- **Label**（600，12–15px，约 1.45 行高）：字段和状态；小字不承载唯一的关键说明。

**The Two-Voice Rule.** 展示衬线负责气质，界面黑体负责行动与理解；长正文不排成装饰性标题。

## Layout

桌面入口是一张尺寸克制的双栏工作台：左侧暗场展示魔方、标题、说明和步骤，右侧用连续的深墨表面承载问题、方式选择和主操作。窄屏让入口从视口顶部开始，整页自然滚动，不在表单上方制造大片空白；输入、方式选择、设置和主操作保持单列可读。展开设置独立滚动，底部操作不覆盖设置内容。结果页限制阅读宽度，牌面或卦象结构清楚呈现，长篇细节按需展开。

## Elevation & Depth

入口以两级墨色和一层清晰边界分区；面板轻微浮起，内部不重复套卡。阴影只用于浮出的设置或通知。魔方有深色实体骨架、六种可辨的贴片、克制边缘与真实 3D 分层转动；贴片跟随小块运动，不依屏幕朝向重新着色。动效使用缓动而非匀速，系统减少动态效果时保持安静。

**The Face-First Rule.** 几何体先读成有体积的物件，再读到边线；边线不是主视觉本身。

## Shapes

输入与按钮采用紧凑的小圆角（约 6–7px），专业内容使用稍大的圆角（约 8px），入口外壳约 13px。主要分组通过间距和一层边界组织，避免处处圆角、成排胶囊和多层套卡。

## Components

### Buttons
- **Primary:** 朱砂实底、暖白字，桌面约 54px 高，手机约 52px 高。
- **Secondary:** 暗底或透明底，以细边界与旧铜文字表达，不与主操作争重。
- **Focus:** 明确可见的暖铜色键盘焦点环。

### Inputs / Fields
- 提问和选择区域使用深墨色工作面与暖象牙色文字；输入项比工作面略亮，边界低调但清楚。
- 占位文字仍须可读；焦点通过边框与窄光环表达，不用大面积发光。

### Choice rows
- 塔罗、起卦和二合一使用同一分段选择条；选中态以暖深底、旧铜下划线和文字反差识别。
- 次级选项不再各自套一张圆角卡片。

### Cards / Containers
- 默认用连续表面与细分隔；需要独立阅读或展开的专业结构才使用围合容器。
- 设置内容独立滚动，完成操作与设置正文分开。

### Signature component: the turning cube
- 由真实 3×3×3 小立方体组成，按层围绕中心轴转动；不以整体自转代替拧层。
- 使用深色骨架与六种有辨识度但不过亮的贴片：红、橙、暖白、黄、绿、蓝；优先呈现体积和真实层转，不做发光玩具或纯线框。

## Do's and Don'ts

### Do:
- **Do** keep the main question, reading mode, and primary action easy to find.
- **Do** use the cube's real faces and layer turns as the signature material.
- **Do** check desktop and narrow mobile layouts; preserve readable text and touch targets.
- **Do** use progressive disclosure for settings and long technical detail.

### Don't:
- **Don't** copy another game's layout or use a generic cyber palette.
- **Don't** use decorative English, starfield motifs, or piles of occult symbols.
- **Don't** make outlines brighter than cube faces or reveal every rear edge through the object.
- **Don't** build the interface from nested cards, excessive pills, or long instructional copy.
