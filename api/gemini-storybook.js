// api/gemini-storybook.js
// Vercel serverless function - 安全調用 Gemini API
// 部署到 /api/gemini-storybook.js

const fetch = require('node-fetch');

// 使用環境變數存放 API 密鑰
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export default async function handler(req, res) {
  // 只允許 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, childName, childAge, interests, emotion, action_desc } = req.body;

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
        params: { key: GEMINI_API_KEY },
      });

      const data = await response.json();
      const storyText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '故事生成失敗';

      return res.status(200).json({ story: storyText });
    }

    // 2️⃣ 生成角色動作序列圖像
    if (action === 'generateCharacterAnimation') {
      // 生成 5 張連續幀的提示詞
      const frames = [
        '開始狀態',
        '進行中第1步',
        '進行中第2步',
        '高潮',
        '結束狀態',
      ];

      const images = [];

      for (let i = 0; i < frames.length; i++) {
        const framePrompt = `
A modern vector art children's book illustration of a 5-year-old girl Star in a fantasy forest. 
She is ${action_desc} and feeling ${emotion}.
Frame ${i + 1}/5: ${frames[i]}.
Style: flat design with subtle gradients for depth, clean geometric shapes, limited color palette (teals, oranges, glowing yellows), minimalistic character design, high contrast, bold and clean. Suitable for a very young audience. Wide angle.
`;

        try {
          const imgResponse = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: framePrompt }] }],
              generationConfig: {
                temperature: 0.7,
              },
            }),
            params: { key: GEMINI_API_KEY },
          });

          const imgData = await imgResponse.json();
          // 這裡應該返回圖像 data，但 Gemini 可能返回 URL 或 base64
          // 根據實際 Gemini API 返回格式調整
          images.push({
            frame: i + 1,
            description: framePrompt,
            // 實際圖像數據會從 Gemini 返回
          });
        } catch (err) {
          console.error(`Frame ${i + 1} generation error:`, err);
        }
      }

      return res.status(200).json({ images });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (error) {
    console.error('Gemini API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
