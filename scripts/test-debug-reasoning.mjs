import { ReadableStream } from "node:stream/web";

const debugReasoning = true;

const lines = [
  'data: {"choices":[{"delta":{"content":"Hello ","reasoning":"step 1"}}]}',
  'data: {"choices":[{"delta":{"content":"world!","reasoning":"step 2"}}]}',
  'data: [DONE]',
];

const stream = new ReadableStream({
  start(controller) {
    for (const line of lines) {
      controller.enqueue(new TextEncoder().encode(line + "\n"));
    }
    controller.close();
  },
});

async function run() {
  const response = new Response(stream);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  const reasoningChunks = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    const parts = chunk.trim().split(/\n+/);
    for (const part of parts) {
      if (part.startsWith('data: [DONE]')) continue;
      if (part.startsWith('data:')) {
        const json = JSON.parse(part.substring(6));
        const delta = json.choices?.[0]?.delta || {};
        if (delta.content) text += delta.content;
        if (delta.reasoning) {
          reasoningChunks.push(delta.reasoning);
          if (debugReasoning) {
            console.log('[reasoning chunk]', delta.reasoning);
          }
        }
      }
    }
  }

  console.log('Response:', text);
  console.log('Reasoning:', reasoningChunks.join('\n'));
}

run();
