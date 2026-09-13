# 梅花易数规则契约（首轮草案）

状态：`candidate / full-text-verification-required`

来源：`meihua-yishu-wikisource`

## 资料范围

首轮只覆盖象数易理、体用生克、断占总诀三组内容，重点索引：先天八卦数、卦象与五行、年月日时起卦、互卦、变卦、体用、十应和事类。原文和现代解释必须分开保存。

## 计算输入

```text
calendarMode: traditional-lunar | civil-calendar
localDateTime: 用户选择的本地日期时间
timezone: IANA 时区
location: 可选，仅用于命盘或真太阳时扩展
question: 用户问题（只作为语境，不参与隐藏改写）
```

## 候选规则（未启用）

- 先天八卦数候选映射：乾 1、兑 2、离 3、震 4、巽 5、坎 6、艮 7、坤 8。
- 起卦结果需要明确记录上卦、下卦、动爻、互卦和变卦，不能只把结果交给语言模型猜。
- 体卦、用卦的角色必须与采用的版本绑定；常见表述是体为主、用为事，但需要在导入的章节位置上核对。
- 五行生克、旺衰和应期不可跨版本静默拼接；发生冲突时显示“规则版本不同”。

## 结果记录

```json
{
  "method": "meihua",
  "sourceId": "meihua-yishu-wikisource",
  "sourceLocation": "待全文校对后填写",
  "inputs": {},
  "hexagrams": {"upper": null, "lower": null, "movingLine": null, "mutual": null, "changed": null},
  "bodyUse": {"body": null, "use": null},
  "status": "unverified"
}
```

在全文校对完成前，网站只能展示来源和待验证状态，不能把本文件的候选规则当作最终断占。
