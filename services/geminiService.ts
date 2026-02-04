
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { ComplianceReport } from "../types";

// API Key is automatically handled by the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

const SYSTEM_INSTRUCTION = `
あなたは大手不動産会社の「マーケティング部・広告審査課」に所属する、熟練のコンプライアンス担当者です。
提出された「エビデンス（Excel）」と「デザイン案（AIデータ/画像/PDF）」を照合し、不動産表示の公正競争規約に基づき校閲してください。

【厳守すべき校閲ルール】
1. 地図および周辺施設:
   - Google Mapsを活用し、物件の所在地、周辺施設が「現時点で存在するか」「名称が正しいか」を検証してください。
   - 閉店した店舗が掲載されている場合は「修正要」と判定してください。
2. 徒歩時間の再計算:
   - 実際の道路距離を測定し、「80m=1分（端数切り上げ）」で算出されているか確認してください。
3. 特定用語の制限:
   - 「日本一」「最高」「格安」「完売」等の表現には、客観的な根拠（出典・調査日）の併記が必要です。

【出力形式】
必ずJSON形式で回答してください。JSON以外のテキストを含めないでください。
{
  "results": [
    {
      "item": "項目名",
      "originalContent": "制作物上の記載",
      "factCheckResult": "事実照合結果（具体的な根拠を記載）",
      "judgment": "PASS" | "WARNING" | "FAIL",
      "suggestion": "具体的な修正案",
      "source": "根拠資料名"
    }
  ],
  "revisedAdCopy": "規約に準拠した修正後の完成原稿",
  "overallComment": "総評"
}
`;

export async function checkComplianceWithFiles(
  adText: string, 
  evidenceText: string, 
  designFile?: { data: string, mimeType: string },
  location?: { latitude: number, longitude: number }
): Promise<ComplianceReport> {
  // Re-initialize to ensure latest API key is used
  const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  
  try {
    const parts: any[] = [
      { text: `
【検証対象テキスト】
${adText}

【物件原本データ（Excel）】
${evidenceText}

上記データと添付のデザイン案を照合してください。
特に、Google検索とGoogle Mapsを使用して、周辺店舗の存続状況や駅までの距離を厳格にファクトチェックしてください。
` }
    ];

    if (designFile) {
      parts.push({
        inlineData: {
          data: designFile.data.split(',')[1] || designFile.data,
          mimeType: designFile.mimeType
        }
      });
    }

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
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
    const report = JSON.parse(responseText) as ComplianceReport;
    
    // Extract grounding metadata for sourcing
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      report.groundingSources = groundingChunks as any;
    }

    return report;
  } catch (error) {
    console.error("Compliance Check Error:", error);
    throw error;
  }
}
