# 八宅风水（本地资料层）

来源：`bazhai-fengshui-brief-docx`（用户提供的《八宅风水简介》，作者元数据 yangjie，文档创建 2014）。

## 采用范围

- 站在宅中心面向主要出入口：面向为“向”，相反方向为“坐”；以坐向所属后天八卦定宅卦。
- 东四宅：坎、离、震、巽；西四宅：乾、坤、艮、兑。
- 网站使用一份明确标注为“常见排法”的四吉四凶方向表，并把位置建议写成可核对的布局提示；这不是对所有八宅流派的统一裁判。
- 命卦需要出生资料、历法和派别约定，当前不自动猜测，也不把宅卦当作个人命盘。

## 位置提示

资料中给出的可操作层是：四吉位可优先观察门、主房、书房、客厅、卧室等；四凶位可观察厕所、灶、储藏、排水等低处。网站把它写成传统建议，不能替代建筑规范、消防、电气、结构、卫生或居住安全判断。

## 计算契约

```json
{
  "method": "bazhai-direction",
  "profile": "bazhai-brief-direction-v1",
  "inputs": ["houseFacingDirection"],
  "outputs": ["sittingDirection", "houseTrigram", "group", "auspicious", "inauspicious"],
  "uncertainty": "measurement-and-school-variant"
}
```
