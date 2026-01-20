const API_KEY = 'AIzaSyDGN_BlNx9KDfAgP5uLgBC8Wy52KZ2IwF4';
const MODEL = 'gemma-3-1b-it'; // Use a Gemma model for testing
const QUERY = 'table listing various time zone and differences';

async function testStreaming() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': API_KEY,
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: QUERY
        }]
      }],
      generationConfig: {
        temperature: 0.9,
        topK: 1,
        topP: 1.0,
        maxOutputTokens: 2048,
        responseModalities: ['TEXT']
      }
    }),
  });

  if (!response.ok) {
    console.error('Error:', await response.text());
    return;
  }

  if (!response.body) {
    console.error('No response body');
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let chunkCount = 0;
  let startTime = Date.now();

  console.log('Starting stream...');

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          try {
            const parsedData = JSON.parse(data);
            const content = parsedData.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (content) {
              chunkCount++;
              const elapsed = Date.now() - startTime;
              console.log(`Chunk ${chunkCount} at ${elapsed}ms: "${content}"`);
            }
          } catch (e) {
            console.warn('Failed to parse:', line, e);
          }
        }
      }
    }
  } catch (error) {
    console.error('Stream error:', error);
  }

  const totalTime = Date.now() - startTime;
  console.log(`Total chunks: ${chunkCount}, Total time: ${totalTime}ms`);

  if (chunkCount > 1 && totalTime > 1000) {
    console.log('✓ Streaming appears to be working (multiple chunks over time)');
  } else if (chunkCount === 1) {
    console.log('✗ Not streaming: Received all content in one chunk');
  } else {
    console.log('? Uncertain: Check logs');
  }
}

testStreaming().catch(console.error);