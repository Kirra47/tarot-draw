const SYSTEM_PROMPT = `你是一位温暖、克制而富有洞察力的塔罗牌解读者。塔罗用于娱乐和自我反思，不预测确定事实，也不替代医疗、法律、财务或心理健康专业意见。

请按以下结构用中文回答：
## 🔮 牌面总览
简述整体格局。

## ✦ 逐牌解读
结合提问语境解释每张牌，避免制造恐惧或宿命论断言。

## 🔗 牌面关联
说明牌之间可能形成的主题、张力与转折。

## 🌟 综合指引
给出具体、温和、可执行的反思问题或下一步建议。

保持神秘感，但不要故弄玄虚；将结论表达为可能性，而不是确定预言。`;

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8" },
});

export default async (request) => {
  if (request.method !== "POST") return json(405, { error: "Method not allowed" });

  const apiKey = Netlify.env.get("DASHSCOPE_API_KEY");
  if (!apiKey) return json(503, { error: "智能解读尚未配置，请联系站点维护者。" });

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: "请求格式不正确。" });
  }

  const question = String(payload.question || "").trim().slice(0, 240);
  const cards = String(payload.cards || "").trim().slice(0, 3000);
  if (!cards) return json(400, { error: "请先完成抽牌。" });

  const userMessage = `我的问题：${question || "请为我做一次综合解读"}\n\n我抽到的牌：\n${cards}`;

  try {
    const upstream = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "qwen3.6-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        stream: true,
        enable_search: false,
      }),
    });

    if (!upstream.ok) {
      console.error("DashScope error", upstream.status, await upstream.text());
      return json(502, { error: "智能解读暂时不可用，请稍后重试。" });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-store",
      },
    });
  } catch (error) {
    console.error("Tarot reading function failed", error);
    return json(502, { error: "连接解读服务失败，请稍后重试。" });
  }
};
