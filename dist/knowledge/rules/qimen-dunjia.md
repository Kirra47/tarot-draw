# 奇门遁甲（本地资料层）

来源：`shenqi-zhimen-pdf`（用户提供的《神奇之门》，张志春；序文语境 1998，PDF 容器创建 2007）。全文不复制进网站，线上只使用结构化摘要和计算结果。

## 采用范围

- 采用书中“时家奇门、无闰拆补法”的起局骨架：节气 → 上/中/下元 → 阳/阴遁局数 → 地盘三奇六仪 → 时干支/旬首 → 值符、值使 → 天盘九星、人盘八门、神盘八神。
- 九宫固定为：1坎北、2坤西南、3震东、4巽东南、5中、6乾西北、7兑西、8艮东北、9离南；中五按书中规则寄坤二。
- 三奇六仪顺序固定为 `戊己庚辛壬癸丁丙乙`；六甲旬首对应 `甲子戊、甲戌己、甲申庚、甲午辛、甲辰壬、甲寅癸`。
- 八门、九星、八神只作为象类和观察镜头，不声称具有可验证的超自然因果，也不输出疾病、诉讼、投资或人身安全的确定判断。

## 局数版本

网站内置书中阳遁/阴遁歌诀的结构化表，并用近似节气日完成演示。节气交接的准确时刻、置闰/超神/接气等其他门派不混入本版本；处在临界日时应显示“请用万年历复核”。

## 计算契约

```json
{
  "method": "qimen-time-family",
  "profile": "shenqi-zhimen-time-family-chaibu-v1",
  "inputs": ["moment", "timezone", "solarTermApproximation", "meihuaHexagramOptional"],
  "outputs": ["dun", "ju", "yuan", "dayGanzhi", "hourGanzhi", "xunHead", "valueFu", "valueShi", "palaceGrid"],
  "uncertainty": "solar-term-boundary-and-school-variant"
}
```

AI 只解释这些已经算出的字段；不能自行改局数、旬首、门星神或补写未提供的原文出处。
