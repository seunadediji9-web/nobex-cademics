
import { createClient } from "@supabase/supabase-js";

declare const process: {
  env: {
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_ANON_KEY?: string;
    GEMINI_API_KEY?: string;
  };
};

const allowedTools = [
  "pdf_summarizer",
  "better_explanations",
  "image_explainer",
  "cbt_generator",
  "deep_research",
  "deep_thinking",
  "ai_motion_lessons",
  "ai_tutor",
];

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!supabaseUrl || !supabaseKey || !geminiKey) {
      return res.status(500).json({
        error: "Server configuration is incomplete",
      });
    }

    const authorization = req.headers.authorization || "";

    const token = authorization.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";

    if (!token) {
      return res.status(401).json({
        error: "Please sign in to continue",
      });
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: userData, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !userData.user) {
      return res.status(401).json({
        error: "Your session is invalid. Please sign in again.",
      });
    }

    const { prompt, tool } = req.body || {};

    if (
      typeof prompt !== "string" ||
      !prompt.trim() ||
      prompt.length > 12000
    ) {
      return res.status(400).json({
        error: "Please provide a valid prompt (maximum 12,000 characters).",
      });
    }

    if (!allowedTools.includes(tool)) {
      return res.status(400).json({
        error: "Invalid AI feature selected.",
      });
    }

    // Reserve one free trial for this authenticated student.
    const { data: remaining, error: trialError } =
      await supabase.rpc("reserve_feature_trial", {
        p_feature_key: tool,
      });

    if (trialError) {
      return res.status(403).json({
        error: trialError.message.includes(
          "No free trials remaining"
        )
          ? "You have used all your free trials for this feature."
          : "Unable to verify your free trial. Please try again.",
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text:
                  "You are Nobex Cademics, a helpful academic learning assistant. Explain concepts clearly, accurately, and in student-friendly language. Use structured headings and examples where helpful.",
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Academic tool: ${tool}\n\n${prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 2000,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);

      return res.status(502).json({
        error:
          "The AI service could not complete your request. Please try again.",
      });
    }

    const answer = (
      data.candidates?.[0]?.content?.parts || []
    )
      .map((part: any) => part.text || "")
      .join("\n")
      .trim();

    if (!answer) {
      return res.status(502).json({
        error: "The AI service returned an empty response.",
      });
    }

    return res.status(200).json({
      answer,
      trials_remaining: remaining,
    });

  } catch (error) {
    console.error("AI generation error:", error);

    return res.status(500).json({
      error: "Something went wrong. Please try again.",
    });
  }
}
