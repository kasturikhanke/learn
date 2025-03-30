import Replicate from "replicate";

// Add this temporary debug code
console.log("All environment variables:", process.env);

export async function POST(request) {
  // Add debug logging
  console.log("Environment variables available:", {
    hasToken: !!process.env.REPLICATE_API_TOKEN,
    tokenPrefix: process.env.REPLICATE_API_TOKEN?.substring(0, 4)
  });

  if (!process.env.REPLICATE_API_TOKEN) {
    console.error("REPLICATE_API_TOKEN is not set. Current value:", process.env.REPLICATE_API_TOKEN);
    return Response.json({ 
      error: "API configuration error - Missing REPLICATE_API_TOKEN",
      details: "Please ensure REPLICATE_API_TOKEN is set in your environment variables"
    }, { status: 500 });
  }

  try {
    const { item1, item2 } = await request.json();
    
    if (!item1 || !item2) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    const cleanText1 = item1.split(' ')[1] || item1; // Fallback to full text if split fails
    const cleanText2 = item2.split(' ')[1] || item2; // Fallback to full text if split fails
    
    const prompt = `
    IMPORTANT: Generate a REAL, EXISTING academic or professional field that represents the intersection of these topics, NOT a made-up term by combining these two topics: "${cleanText1}" and "${cleanText2}".

    The new word should be a topic that represents the intersection of both fields, NOT just a simple concatenation of the words.

    Examples of good combinations:
    - Nature + Music = "Bioacoustics" (the study of sound in nature)
    - Technology + Art = "MediaArt" (art created with new technologies)
    - Science + History = "Archaeometry" (scientific analysis of archaeological finds)
    - Food + Technology = "Molecular Gastronomy" (applying scientific techniques to cooking)
    - Space + Biology = "Astrobiology" (study of life in the universe)

    Create a word or compound term (can have a space if needed) that genuinely represents the intersection of both topics. The term should be a real discipline or concept.

    Return ONLY a valid JSON object with the format:
    {
      "name": "YourNewConcept"
    }`;

    const systemPrompt = "You are a concept generator. Generate interesting academic or scientific concepts by combining different fields of study. Return only valid JSON with a single combined concept name.";
    
    const input = {
      prompt: prompt,
      system_prompt: systemPrompt,
      max_new_tokens: 512,
      prompt_template: "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{system_prompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
    };

    let fullResponse = "";
    try {
      for await (const event of replicate.stream("meta/meta-llama-3-8b-instruct", { input })) {
        fullResponse += event;
      }
    } catch (streamError) {
      console.error("Streaming error:", streamError);
      return Response.json({ error: "Error streaming response" }, { status: 500 });
    }

    if (!fullResponse) {
      return Response.json({ error: "No response from AI" }, { status: 500 });
    }

    return Response.json({ response: fullResponse });
  } catch (error) {
    console.error("API Error:", error);
    return Response.json({ 
      error: "Failed to get AI response",
      details: error.message 
    }, { status: 500 });
  }
} 