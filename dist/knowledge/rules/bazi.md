# 四柱八字命盘接口（首轮草案）

状态：`interface-only / calendar-engine-required`

来源：`yuanhai-ziping-ctp`、`sanming-tonghui-ctp`

## 必填字段

```text
birthDateTime: 出生日期和准确时间
birthPlace: 出生地（至少国家/地区与城市）
timezone: 出生时区，需保留历史夏令时信息
calendarMode: 公历输入，内部转换到节气与干支
```

## 计算边界

- 月柱必须绑定节气算法，而不是简单按公历月份切换。
- 日柱、时柱和真太阳时选项必须使用同一历法版本并记录版本号。
- 十神、五行强弱、大运起运等规则存在派别差异，结果必须带 `schoolId`。
- 在历法引擎和规则版本锁定前，只允许展示输入摘要与“待排盘”，不生成命运结论。

## 结果记录

```json
{
  "method": "bazi",
  "sourceIds": ["yuanhai-ziping-ctp", "sanming-tonghui-ctp"],
  "schoolId": null,
  "calendarVersion": null,
  "pillars": {"year": null, "month": null, "day": null, "hour": null},
  "status": "not-calculated"
}
```
