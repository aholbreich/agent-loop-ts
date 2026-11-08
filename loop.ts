// loop.ts: a minimal agent loop against any OpenAI-compatible endpoint.
// Run: node loop.ts "Make a note from pages/tl-intro.html"
import { readFileSync } from "node:fs";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:8080/v1";
const MODEL = process.env.MODEL ?? "local-qwen3.6-35b-a3b";

type ToolCall = { id: string; function: { name: string; arguments: string } };
type Message = { role: string; content?: string; tool_calls?: ToolCall[]; tool_call_id?: string };

// What the model sees: a name, a description and a JSON schema per tool.
const toolSchemas = [{
  type: "function",
  function: {
    name: "read_file",
    description: "Read a local text file and return its contents.",
    parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  },
}];

// What actually runs: plain code, chosen by name.
const tools: Record<string, (args: any) => string> = {
  read_file: ({ path }) => readFileSync(path, "utf-8"),
};

// The whole conversation. The API remembers nothing, so we keep it.
const messages: Message[] = [
  { role: "system", content: "You are a curator. Read the file you are given, then reply with a note of at most five lines: the key facts and the source." },
  { role: "user", content: process.argv[2] },
];

while (true) {
  // 1. send everything: system prompt, history, tool schemas
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, tools: toolSchemas }),
  });
  const body = await res.json();
  if (body.error) throw new Error(body.error.message);
  console.error(`· prompt tokens: ${body.usage?.prompt_tokens}`);
  const reply: Message = body.choices[0].message;

  // 2. remember the model's reply
  messages.push(reply);

  // 3. no tool calls? then this is the answer
  if (!reply.tool_calls?.length) {
    console.log(reply.content);
    break;
  }

  // 4. run each requested tool, append its result, go again
  for (const call of reply.tool_calls) {
    console.error(`→ ${call.function.name} ${call.function.arguments}`);
    const result = tools[call.function.name](JSON.parse(call.function.arguments));
    messages.push({ role: "tool", tool_call_id: call.id, content: result });
  }
}
