# agent-loop

A minimal agent loop in TypeScript, with nothing but `fetch`. It goes with the article
[A minimal agent loop and the four ways it breaks](https://alexander.holbreich.org/posts/2026/agent-loop-anatomy/).

## Prerequisites

- **Node.js 24 or newer.** It runs TypeScript directly, so there is nothing to install or build. Check with `node --version`.
- **An OpenAI-compatible server** with a `/v1/chat/completions` endpoint. Ollama and llama.cpp both work, locally and without an account.
- **A model that supports tool calls.** Without them, the loop gets plain text back and stops after one turn.

## Start a model

Pick one. Each runs in its own terminal and keeps running.

### Ollama

```sh
ollama pull qwen3:8b
OLLAMA_CONTEXT_LENGTH=32768 ollama serve
```

Set the context length. With less than 24 GiB of VRAM, Ollama defaults to 4K, which is too small for this loop. If Ollama already runs as a service, stop it first or set the variable in the service, otherwise this `serve` can't start or the setting is ignored.

### llama.cpp

```sh
llama-server --jinja -c 32768 --port 8080 -hf bartowski/Qwen2.5-7B-Instruct-GGUF:Q4_K_M
```

## Run the loop

From this folder, because the file paths are relative to it:

```sh
# Ollama
BASE_URL=http://localhost:11434/v1 MODEL=qwen3:8b node loop.ts "Make a note from pages/tl-intro.html"

# llama.cpp on port 8080
node loop.ts "Make a note from pages/tl-intro.html"
```

| Variable | Default |
|---|---|
| `BASE_URL` | `http://127.0.0.1:8080/v1` |
| `MODEL` | `local-qwen3.6-35b-a3b`, the model I used |

Progress goes to stderr and the final note to stdout, so add `2>/dev/null` to see only the note.
The first request can take a while, because the server loads the model.

`ECONNREFUSED` means no server is listening at `BASE_URL`. A hosted API needs more: the loop sends no API key, so you would add an `Authorization` header in `loop.ts`.

The `pages/` folder holds two of my own articles as test input.

## Follow the steps

`loop.ts` changes one step at a time, and each step has a tag. To see a fix, compare two tags.

| Tag | What changes |
|---|---|
| `start` | The minimal loop |
| `paged-reader` | `read_file` returns pages, with a hint that never says "last page" |
| `stop-checks` | A turn limit, and a tool that says "page 3 of 5" |
| `tool-errors` | Tool errors go back to the model as tool results |
| `clean-input` | HTML is reduced to text in code, before the model sees it |
| `agent-loop-anatomy` | The final state for the article |

The code is similar to the runs in the article, not the exact files behind its numbers.
The context error in the article comes from llama.cpp. Other servers may handle an oversized request differently.
It is a teaching example: it has no sandbox, so don't give it tools you wouldn't run yourself.
