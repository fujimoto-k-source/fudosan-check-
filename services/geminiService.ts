import { GoogleGenAI } from "@google/genai";
import { ComplianceReport } from "../types";

export async function checkComplianceWithFiles(
  adText: string, 
  evidenceText: string, 
  designFile?: { data: string, mimeType: string },
  location?: { latitude: number, longitude: number }
): Promise<ComplianceReport> {
  // システムの指示に従い、process.env.API_KEY から直接取得
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("APIキーが見つかりません。Vercelの設定が反映されていないか、Redeployが必要です。");
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

【審査のポイント】
1. アクセス: 「徒歩○分」が道路距離80m=1分で計算されているか（Google Maps等で検証）。
2. 周辺施設: 店舗が現在も存在するか（Google Search等で検証）。
3. 禁止表現: 根拠なき「最高」「格安」「日本一」の使用。

【出力】
必ずJSON形式で、results配列、revisedAdCopy、overallCommentを含めてください。
`;

    const parts: any[] = [{ text: prompt }];

    if (designFile) {
      parts.push({
        inlineData: {
          data: designFile.data.split(',')[1] || designFile.data,
          mimeType: designFile.mimeType
        }
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    const cleanedJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedJson) as ComplianceReport;
  } catch (error: any) {
    console.error("Analysis Error:", error);
    throw new Error(error.message || "AIの解析中にエラーが発生しました。");
  }
}
