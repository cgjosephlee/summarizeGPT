import { RecursiveTextSplitter } from "./text_splitter.js";

// calculate word counts
export function word_count(text) {
  let tmp_zh = text.replace(/[^\u4E00-\u9FFF]/g, "");
  let tmp_en = text.replace(/[^a-zA-Z]/g, " ").trim();
  tmp_en = tmp_en === "" ? [] : tmp_en.split(/\s+/);
  return tmp_zh.length + tmp_en.length;
}

// basic openai api call
async function chatCompletion(
  input,
  api_key,
  model,
  temperature,
  maxRetries = 3,
  timeout = 6000,
  ) {
  const url = "https://api.openai.com/v1/chat/completions";
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${api_key}`,
  };
  const data = {
    "model": model,
    "temperature": temperature,
    "messages": [
      {
        "role": "user",
        "content": input,
      },
    ],
  };
  // console.log(`API call data: ${JSON.stringify(data)}`);
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        "method": "POST",
        "headers": headers,
        "body": JSON.stringify(data),
        "signal": AbortSignal.timeout(timeout),
      })
      .then(response => response.json())
      .then(output => output.choices[0].message.content)
      return response
    } catch (error) {
      console.error("chatCompletion:", error.name, error.message, `(Attempt ${attempt}/${maxRetries})`);
      if (attempt === maxRetries) {
        throw new Error("API call failed!");
      }
    }
  }
}

// template substitution with parameters in `{__param__}` format
function substitute(template, variables) {
  return template.replace(/\{__(\w+)__\}/g, function(match, variable) {
    return variables.hasOwnProperty(variable) ? variables[variable] : match;
  });
}

// templates
// https://github.com/hwchase17/langchainjs/tree/c09f8310a3a2197e98e188167ee39f04dbe18a1d/langchain/src/chains/summarization
const stuffPromptTemplate = `Write a concise summary of the following:


"{__text__}"


CONCISE SUMMARY:`;

const mapPromptTemplate = stuffPromptTemplate;

const reducePromptTemplate = stuffPromptTemplate;

const refinePromptTemplate = `Your job is to produce a final summary
We have provided an existing summary up to a certain point: "{__existing_answer__}"
We have the opportunity to refine the existing summary
(only if needed) with some more context below.
------------
"{__text__}"
------------

Given the new context, refine the original summary
If the context isn't useful, return the original summary.

REFINED SUMMARY:`;

export async function summarize(
  input,
  api_key,
  model = "gpt-3.5-turbo",
  temperature = 0.2,
  type = "map_reduce",  // stuff, refine
  chunkSize = 1000,
  chunkOverlap = 100,
  ) {
  if (type === "stuff") {
    const output = await chatCompletion(
      substitute(stuffPromptTemplate, {"text": input}),
      api_key,
      model,
      temperature,
    );
    return output;
  } else if (type === "map_reduce") {
    const splits = RecursiveTextSplitter(input, chunkSize, chunkOverlap, ["\n\n", "\n", " ", ""], true);
    console.log(splits.map((s) => s.length));
    if (splits.length === 1) {
      throw new Error("Input is too short to be split");
    }
    const map_output = await Promise.all(splits.map(async (s) => {
      const output = await chatCompletion(
        substitute(mapPromptTemplate, {"text": s}),
        api_key,
        model,
        temperature,
      );
      return output;
    }));
    console.log(map_output);
    const reduce_output = await chatCompletion(
      substitute(reducePromptTemplate, {"text": map_output.join("\n\n")}),
      api_key,
      model,
      temperature,
    );
    return reduce_output;
  } else if (type === "refine") {
    const splits = RecursiveTextSplitter(input, chunkSize, chunkOverlap, ["\n\n", "\n", " ", ""], true);
    console.log(splits.map((s) => s.length));
    if (splits.length === 1) {
      throw new Error("Input is too short to be split");
    }
    let output = await chatCompletion(
      substitute(stuffPromptTemplate, {"text": splits[0]}),
      api_key,
      model,
      temperature,
    );
    console.log(output);
    for (let i = 1; i < splits.length; i++) {
      output = await chatCompletion(
        substitute(refinePromptTemplate, {"text": splits[i], "existing_answer": output}),
        api_key,
        model,
        temperature,
      );
      console.log(output);
    }
    return output
  } else {
    // split only, no summarization
    const splits = RecursiveTextSplitter(input, chunkSize, chunkOverlap, ["\n\n", "\n", " ", ""], true);
    console.log(splits.map((s) => s.length));
    return splits.join("\n");
  }
}
