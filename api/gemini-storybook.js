// api/gemini-storybook.js
// Vercel serverless function - 安全調用 Gemini API

export default async function handler(req, res) {
  // 1. 確保只允許 POST 方法
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 抓取 Vercel 後台設定的環境變數
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    console.error("抓不到 API Key，請檢查 Vercel 環境變數設定！");
    return res.status(500).json({ error: 'Missing API Key' });
  }

  // ✅ 直接使用 2.0-flash 模型，並把金鑰放在網址參數中
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

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
- 為下一步的選擇（動作 + 情緒）埋下伏筆

回應格式：只返回故事文本，不要任何額外說明。
`;

      // 直接使用 Node.js 內建的 fetch，不需要 require('node-fetch')
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: storyPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 200,
          },
        }),
      });

      // 檢查 Google API 是否有報錯
      if (!response.ok) {
        const errLog = await response.text();
        console.error("Gemini API 報錯:", errLog);
        throw new Error(`Google AI 拒絕了請求，狀態碼：${response.status}`);
      }

      const data = await response.json();
      const storyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '故事生成失敗';

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
