interface SendMessageStreamParams {
  notollama: number;
  url: string;
  modelname: string;
  messages: Array<{ role: string; content: string }>;
  context: string;
  apiKey: string
}

/**
 * Sends messages to a chat completion API and yields content chunks as an async generator.
 *
 * @param params - The parameters for the API call.
 * @returns An async generator yielding content chunks.
 * @throws An error if the API call fails or the response body is null.
 */
export async function* sendMessageStream({
   notollama,
   url,
   // apiKey,
   modelname,
   messages,
   context,
   apiKey
 }: SendMessageStreamParams): AsyncGenerator<string, void, unknown> {

  let prompt = context.trim() === "" ? `Given the following chathistory, answer the question accurately and concisely. \n\nChat History:\n${messages.slice(0, messages.length - 1).map(m => m.content).join('\n')}\n\nQuestion: ${messages[messages.length - 1].content}` : `Given the following chathistory, context, answer the question accurately and concisely. If the answer is not in the context, state that you cannot answer from the provided information.\n\nChat History:\n${messages.slice(0, messages.length - 1).map(m => m.content).join('\n')}\n\nContext: ${context}\n\nQuestion: ${messages[messages.length - 1].content}`;
  console.log(prompt)
  let headers_openrouter = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": typeof window !== "undefined" ? window.location.href : "",
    "X-Title": "Batu",
  };
  let headers_ollama = { 'Content-Type': 'application/json' };
  // if (notollama===0 || notollama===2) {
  const response = await fetch(`${url}/v1/chat/completions`, {
    method: "POST",
    headers: (notollama === 0 || notollama === 2 || notollama === 4) ? headers_openrouter : headers_ollama,
    body: JSON.stringify({
      model: modelname,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    let errorMessage = errorData || "Failed to get response";
    try {
      const jsonError = JSON.parse(errorData);
      errorMessage = jsonError.error?.message || errorMessage;
    } catch {
      // Ignore if parsing fails, use the raw text
    }
    throw new Error(errorMessage);
  }

  if (!response.body) {
    throw new Error("Response body is null");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line) => line.replace(/^data: /, "").trim());

    for (const line of lines) {
      if (line === "[DONE]") continue;

      try {
        const parsedLine = JSON.parse(line);
        const content = parsedLine.choices[0]?.delta?.content || "";
        if (content) {
          yield content; // Yield each content chunk
        }
      } catch (e) {
        console.warn("Failed to parse stream line:", line, e);
      }
    }
  }
  // }
  // else{
  //     const requestBody = {
  //         "model": model,
  //         "messages": messages,
  //         "stream": true // Ensure streaming is enabled
  //     };

  //     const response = await fetch(`${lmstudio_url}/v1/chat/completions`, {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify(requestBody)
  //     })
  //     if (!response.ok) {
  //       const errorData = await response.text();
  //       let errorMessage = errorData || "Failed to get response";
  //       try {
  //         const jsonError = JSON.parse(errorData);
  //         errorMessage = jsonError.error?.message || errorMessage;
  //       } catch {
  //         // Ignore if parsing fails, use the raw text
  //       }
  //       throw new Error(errorMessage);
  //     }

  //     if (!response.body) {
  //       throw new Error("Response body is null");
  //     }

  //     const reader = response.body.getReader();
  //     const decoder = new TextDecoder("utf-8");

  //     while (true) {
  //       const { done, value } = await reader.read();
  //       if (done) break;

  //       const chunk = decoder.decode(value);
  //       const lines = chunk
  //         .split("\n")
  //         .filter((line) => line.trim() !== "")
  //         .map((line) => line.replace(/^data: /, "").trim());

  //       for (const line of lines) {
  //         if (line === "[DONE]") continue;

  //         try {
  //           const parsedLine = JSON.parse(line);
  //           const content = parsedLine.choices[0]?.delta?.content || "";
  //           if (content) {
  //             yield content; // Yield each content chunk
  //           }
  //         } catch (e) {
  //           console.warn("Failed to parse stream line:", line, e);
  //         }
  //       }
  //     }

  // }
}