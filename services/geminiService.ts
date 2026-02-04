import { GoogleGenAI } from "@google/genai";
import { ComplianceReport } from "../types";

export async function checkComplianceWithFiles(
  adText: string, 
  evidenceText: string, 
  designFile?: { data: string, mimeType: string },
  location?: { latitude: number, longitude: number }
): Promise<ComplianceReport> {
  // システムの指示に従い、process.env.API_KEY から直接取得
  // Vercelに設定された環境変数がビルド時に注入されます
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("APIキーが設定されていません。Vercelの管理画面で API_KEY を登録し、Redeployを行ってください。");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const prompt = `
あなたは大手不動産会社の広告審査担当者です。
提供された原本データ（エビデンス）と、ユーザーが作成した広告案を比較し、「不動産の表示に関する公正競争規約」に基づき校閲してください。

【広告案】
${adText}

【物件原本（エビデンス）】
${evidenceText}

【審査の必須ルール】
1. アクセス: 「徒歩○分」が道路距離80m=1分で計算されているか確認。Google Mapsで実際の経路距離を検証。
2. 周辺施設: Google検索を活用し、店舗が現在も営業しているか確認。
3. 特定用語: 根拠なき「最高」「格安」「日本一」等は修正案を提示。

【出力形式】
JSON形式で回答してください。
`;

    const parts: any[] = [{ text: prompt }];

    // 制作物（画像/PDF）がある場合は追加
    if (designFile) {
      parts.push({
        inlineData: {
          data: designFile.data.split(',')[1] || designFile.data,
          mimeType: designFile.mimeType
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: [{ role: 'user', parts }],
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }, { googleMaps: {} }],
        toolConfig: location ? {
          retrievalConfig: {
            latLng: {
              latitude: location.latitude,
              longitude: location.longitude
            }
          }
        } : undefined
      },
    });

    const responseText = response.text || "{}";
    // Markdownの装飾を除去してJSONのみ抽出
    const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedJson) as ComplianceReport;
  } catch (error: any) {
    console.error("Compliance Check Error:", error);
    if (error.message?.includes("API_KEY")) {
      throw new Error("APIキーが無効、または設定されていません。");
    }
    throw new Error("AIによる解析に失敗しました。時間をおいて再度お試しください。");
  }
}
