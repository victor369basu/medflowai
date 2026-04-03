import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export const getAI = () => {
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_GEMINI_API_KEY is not defined");
  }
  return new GoogleGenAI({ apiKey });
};

export const MODELS = {
  FLASH: "gemini-3-flash-preview",
  PRO: "gemini-3.1-pro-preview",
};

export const TRIAGE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    severity: {
      type: Type.STRING,
      enum: ["emergency", "urgent", "routine"],
      description: "The triage severity level.",
    },
    specialty: {
      type: Type.STRING,
      description: "The recommended medical specialty.",
    },
    reasoning: {
      type: Type.STRING,
      description: "Brief clinical reasoning for the assessment.",
    },
    vitals_concern: {
      type: Type.BOOLEAN,
      description: "Whether the vital signs are clinically concerning.",
    },
  },
  required: ["severity", "specialty", "reasoning", "vitals_concern"],
};

export const DIAGNOSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    differential_diagnoses: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          condition: { type: Type.STRING },
          probability: { type: Type.NUMBER, description: "0-1 probability" },
          reasoning: { type: Type.STRING },
        },
        required: ["condition", "probability", "reasoning"],
      },
    },
    primary_diagnosis: { type: Type.STRING },
    confidence_score: { type: Type.NUMBER },
    recommended_tests: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["differential_diagnoses", "primary_diagnosis", "confidence_score", "recommended_tests"],
};

export const TREATMENT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    plan: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING, enum: ["Medication", "Procedure", "Lifestyle", "Follow-up"] },
          action: { type: Type.STRING },
          rationale: { type: Type.STRING },
        },
        required: ["category", "action", "rationale"],
      },
    },
    safety_warnings: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    quality_score: { type: Type.NUMBER, description: "0-100 score of the plan's robustness" },
  },
  required: ["plan", "safety_warnings", "quality_score"],
};
