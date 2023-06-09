import { OpenAIChatMessage, OpenAIConfig } from "./OpenAI.types";
import {
  createParser,
  EventSourceParseCallback,
  ParsedEvent,
  ReconnectInterval,
} from "eventsource-parser";

export const defaultConfig = {
  model: "gpt-3.5-turbo",
  temperature: 0.5,
  max_tokens: 2048,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0.6,
};

export type OpenAIRequest = {
  messages: OpenAIChatMessage[];
} & OpenAIConfig;

export const getOpenAICompletion0 = async (
  token: string,
  payload: OpenAIRequest
) => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify(payload),
  });

  // Check for errors
  if (!response.ok) {
    throw new Error(await response.text());
  }

  let counter = 0;
  const stream = new ReadableStream({
    async start(controller) {
      function onParse(event: ParsedEvent | ReconnectInterval) {
        if (event.type === "event") {
          const data = event.data;
          // https://beta.openai.com/docs/api-reference/completions/create#completions/create-stream
          if (data === "[DONE]") {
            controller.close();
            return;
          }

          try {
            const json = JSON.parse(data);
            const text = json.choices[0].delta?.content || "";
            if (counter < 2 && (text.match(/\n/) || []).length) {
              return;
            }

            const queue = encoder.encode(text);
            controller.enqueue(queue);
            counter++;
          } catch (e) {
            controller.error(e);
          }
        }
      }

      const parser = createParser(onParse);
      for await (const chunk of response.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    },
  });

  

  return stream;
};
export const getOpenAICompletion = async (
  token: string,
  payload: OpenAIRequest
) => {
  const predeterminedResponse = "Now that you have Git on your system, you’ll want to do a few things to customize your Git environment. You should have to do these things only once on any given computer; they’ll stick around between upgrades. You can also change them at any time by running through the commands again. <option-1>";

  let counter = 0;
  const stream = new ReadableStream({
    async start(controller) {
      const responseChunks = predeterminedResponse.split(" ");

      for (const chunk of responseChunks) {
        if (counter < 2 && chunk.includes("\n")) {
          continue;
        }

        const encoder = new TextEncoder();
        const queue = encoder.encode(chunk+" ");
        await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 150)));

        controller.enqueue(queue);
        counter++;
      }

      controller.close();
    },
  });

  return stream;
};