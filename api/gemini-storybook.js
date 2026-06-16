// api/gemini-storybook.js
// 披著 Gemini 外皮，但骨子裡是 Groq (Llama 3) 的後端！🤣

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 抓取 Vercel 後台設定的 GROQ 鑰匙
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  
  if (!GROQ_API_KEY) {
    console.error("老大！找不到 GROQ_API_KEY，你是不是忘記去 Vercel 設定了？");
    return res.status(500).json({ error: 'Missing Groq API Key' });
  }

  // Groq 的 API 網址 (跟 OpenAI 的格式一模一樣，超好串)
  const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

  try {
    const { action, childName, childAge, interests } = req.body;

    // 1️⃣ 生成故事內容
    if (action === 'generateStory') {
      const storyPrompt = `
你是一位兒童繪本作家。請為一個 ${childAge} 歲的小朋友生成一個互動故事。

小朋友信息：
- 名字：${childName}
- 年齡：${childAge}
- 興趣：${interests}

請生成一個開場故事（2-3 句話）。故事應該：
- 讓 ${childName} 成為主角
- 包含奇幻冒險元素
- 適合 ${childAge} 歲的小朋友
- 為下一步的選擇埋下伏筆
- ⚠️ 強烈要求：必須完全使用「繁體中文（台灣習慣用語）」回覆！

回應格式：只返回故事文本，不要任何打招呼或額外說明。
`;

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}` // Groq 規定鑰匙要放這裡
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile", // 使用地表最強大的開源模型之一！
          messages: [{ role: "user", content: storyPrompt }],
          temperature: 0.7,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        const errLog = await response.text();
        console.error("Groq 罷工啦:", errLog);
        throw new Error(`Groq 拒絕請求，狀態碼：${response.status}`);
      }

      const data = await response.json();
      // Groq 回傳的格式跟 Gemini 不一樣，這邊幫你抓對位置了
      const storyText = data?.choices?.[0]?.message?.content || '故事生成失敗';

      return res.status(200).json({ story: storyText });
    }

    // 2️⃣ 角色動作序列圖像（防呆處理）
    if (action === 'generateCharacterAnimation') {
      return res.status(200).json({ images: [] });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    console.error('後端大爆炸:', error);
    return res.status(500).json({ error: error.message });
  }
}
