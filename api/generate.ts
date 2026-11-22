import { createClient } from "@supabase/supabase-js";

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
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !supabaseKey || !openaiKey) {
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

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

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
        error: trialError.message.includes("No free trials remaining")
          ? "You have used all your free trials for this feature."
          : "Unable to verify your free trial. Please try again.",
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          instructions:
            "You are Nobex Cademics, a helpful academic learning assistant. Explain concepts clearly, accurately, and in student-friendly language.",
          input: `Academic tool: ${tool}\n\n${prompt}`,
          max_output_tokens: 2000,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        error: "The AI service could not complete your request. Please try again.",
      });
    }

    const answer = (data.output || [])
      .flatMap((item: any) => item.content || [])
      .filter((item: any) => item.type === "output_text")
      .map((item: any) => item.text)
      .join("\n");

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
    return res.status(500).json({
      error: "Something went wrong. Please try again.",
    });
  }
  }
      
