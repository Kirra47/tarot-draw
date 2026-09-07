# 数值和结构验证

运行命令：`node scripts/verify-meihua.mjs`（在 tarot-draw 根目录）。

退出码：0。

输出：

```json
{"status":"passed","historicalArithmeticFixtures":3,"countFixture":1,"invariantCases":384,"edgeAndInvalidInputs":"passed"}
```

包含观梅、牡丹、两组叩门声三个独立历史算式；物数17加时数10的固定输入；全部64卦×6动爻的单爻差异、反向翻转恢复原卦和互卦范围检查；纯乾三爻动的不同互卦分支；整除、非法类型、缺陷范围及整数溢出检查。

技能结构检查：`python -X utf8 D:/AppData/Codex/active/skills/.system/skill-creator/scripts/quick_validate.py <skill-folder>`，五个目录均退出0，输出 Skill is valid!。首次未加 -X utf8 的检查因系统GBK默认编码失败；启用UTF-8后校验通过，不涉及技能内容修改。

行为盲测原始结果在 blind-results.json，30条全部与预设行为相符。测试未调用线上Qwen、未部署Netlify。
