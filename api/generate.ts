

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

const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

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

    const geminiUrl =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";

    const requestBody = {
      systemInstruction: {
        parts: [
          {
            text:
              "You are Nobex Cademics, a professional academic learning assistant. Help university students understand difficult subjects. Explain concepts accurately, clearly and in simple student-friendly language. Use headings, examples and step-by-step explanations where appropriate. Give educational answers and maintain academic accuracy.",
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
    };

    let response: Response | null = null;
    let data: any = null;

    // Retry temporary Gemini errors up to 3 times.
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        response = await fetch(geminiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": geminiKey,
          },
          body: JSON.stringify(requestBody),
        });

        data = await response.json();

        if (response.ok) {
          break;
        }

        const retryableStatuses = [
          429, 500, 502, 503, 504,
        ];

        if (
          !retryableStatuses.includes(response.status) ||
          attempt === 3
        ) {
          break;
        }

        console.warn(
          `Gemini temporary error ${response.status}. Retry ${attempt + 1}/3.`
        );

        await wait(1000 * Math.pow(2, attempt));
      } catch (error) {
        console.error("Gemini connection error:", error);

        if (attempt === 3) {
          throw error;
        }

        await wait(1000 * Math.pow(2, attempt));
      }
    }

    if (!response || !response.ok) {
      console.error("Gemini API error:", {
        status: response?.status,
        error: data?.error || data,
      });

      return res.status(502).json({
        error:
          "The AI service is temporarily busy. Please try again shortly.",
      });
    }

    const answer = (
      data.candidates?.[0]?.content?.parts || []
    )
      .map((part: any) => part.text || "")
      .join("\n")
      .trim();

    if (!answer) {
      console.error("Gemini returned no text:", data);

      return res.status(502).json({
        error: "The AI service returned an empty response.",
      });
    }

    // Reserve a free trial only after Gemini succeeds.
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
