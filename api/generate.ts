
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "AI service is not configured"
      });
    }

    const { prompt, tool } = req.body || {};

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        error: "Please provide a prompt"
      });
    }

    if (prompt.length > 12000) {
      return res.status(400).json({
        error: "Your prompt is too long"
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          instructions:
            "You are Nobex Cademics, a helpful academic learning assistant. Explain concepts clearly, accurately and in student-friendly language.",
          input: `Academic tool: ${String(tool || "Study Assistant").slice(0, 80)}\n\n${prompt}`,
          max_output_tokens: 2000
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "AI request failed"
      });
    }

    const answer = (data.output || [])
      .flatMap((item: any) => item.content || [])
      .filter((item: any) => item.type === "output_text")
      .map((item: any) => item.text)
      .join("\n");

    return res.status(200).json({ answer });

  } catch (error) {
    return res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
}
