import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });

export interface AnalysisResult {
  isHit: boolean;
  partHit: string;
  speedKmh: number;
  pitch: { x: number; z: number };
  impact: { x: number; y: number; z: number };
  reasoning: string;
  references?: { title: string; url: string }[];
}

export async function analyzeCricketVideo(videoBase64: string, mimeType: string): Promise<AnalysisResult> {
  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [
      {
        inlineData: {
          data: videoBase64,
          mimeType: mimeType,
        },
      },
      {
        text: `Analyze this cricket delivery for an LBW (Leg Before Wicket) decision. 
        Determine if the ball would have hit the stumps. Use Google Search to verify cricket rules or similar scenarios if needed.
        
        Provide the following details in JSON format:
        - isHit: boolean (true if it would hit the stumps)
        - partHit: string (which stump it would hit: 'off', 'middle', 'leg', or 'missing')
        - speedKmh: estimated speed of the delivery in km/h
        - pitch: { x: number, z: number } (where it pitches on the pitch. x is lateral [-1.5 to 1.5], z is longitudinal [0 to 20.12])
        - impact: { x: number, y: number, z: number } (where it impacts the batsman or stumps. y is height [0 to 1.5])
        - reasoning: a brief explanation of the decision.
        
        The pitch is 20.12m long. The stumps are at z=20.12. x=0 is the center of the pitch.
        Return ONLY the JSON object.`,
      },
    ],
    config: {
      temperature: 0, // Ensure deterministic output
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isHit: { type: Type.BOOLEAN },
          partHit: { type: Type.STRING },
          speedKmh: { type: Type.NUMBER },
          pitch: {
            type: Type.OBJECT,
            properties: {
              x: { type: Type.NUMBER },
              z: { type: Type.NUMBER }
            },
            required: ["x", "z"]
          },
          impact: {
            type: Type.OBJECT,
            properties: {
              x: { type: Type.NUMBER },
              y: { type: Type.NUMBER },
              z: { type: Type.NUMBER }
            },
            required: ["x", "y", "z"]
          },
          reasoning: { type: Type.STRING }
        },
        required: ["isHit", "partHit", "speedKmh", "pitch", "impact", "reasoning"]
      }
    }
  });

  try {
    const result: AnalysisResult = JSON.parse(response.text || "{}");
    
    // Extract grounding references
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      result.references = chunks
        .filter(chunk => chunk.web)
        .map(chunk => ({
          title: chunk.web!.title || "Reference",
          url: chunk.web!.uri
        }));
    }
    
    return result;
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    throw new Error("Analysis failed");
  }
}
