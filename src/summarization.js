import { settings } from "./config.js"
import { RecursiveTextSplitter } from "./text_splitter.js"
import { Tiktoken } from "tiktoken/lite"
import cl100k_base from "tiktoken/encoders/cl100k_base.json"

// calculate word counts
export function countWords(text) {
  let tmp_zh = text.replace(/[^\u4E00-\u9FFF]/g, "");
  let tmp_en = text.replace(/[^a-zA-Z]/g, " ").trim();
  tmp_en = tmp_en === "" ? [] : tmp_en.split(/\s+/);
  return tmp_zh.length + tmp_en.length;
}

export function countTokens(text) {
  const enc = new Tiktoken(
    cl100k_base.bpe_ranks,
    cl100k_base.special_tokens,
    cl100k_base.pat_str
  )
  const tokens = enc.encode(text)
  enc.free()
  return tokens.length
}

async function chatCompletion(
  input,
  api_key,
  model,
  temperature,
  maxRetries,
  timeout,
  ) {
    let output;
    if (model.startsWith("gpt")) {
      output = chatCompletionOpenAi(
        input,
        api_key,
        model,
        temperature,
        maxRetries,
        timeout,
      );
    } else if (model.startsWith("gemini")) {
      output = chatCompletionGoogle(
        input,
        api_key,
        model,
        temperature,
        maxRetries,
        timeout,
      );
    } else {
      throw new Error("Model is not supported!");
    }
    return output;
  }

// basic openai api call
async function chatCompletionOpenAi(
  input,
  api_key,
  model,
  temperature,
  maxRetries,
  timeout,
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
  const response = await _retry_fetch(
    url,
    headers,
    data,
    maxRetries,
    timeout,
  )
  .then(output => output.choices[0].message.content)
  return response
}

// basic google gemini api call
async function chatCompletionGoogle(
  input,
  api_key,
  model,
  temperature,
  maxRetries,
  timeout,
  ) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${api_key}`;
  const headers = {
    "Content-Type": "application/json",
  };
  const data = {
    "contents": [{
      "parts": [{
        "text": input,
      }]
    }],
    "generationConfig": {
      "temperature": temperature,
      "candidateCount": 1,
    },
  };
  try {
    const response = await _retry_fetch(
      url,
      headers,
      data,
      maxRetries,
      timeout,
    );
    const output = response.candidates[0].content.parts[0].text;
    return output;
  } catch (error) {
    console.error("chatCompletionGoogle:", error.name, error.message, response);
    throw new Error("API call failed!");
  }
}

async function _retry_fetch(
  url,
  headers,
  data,
  maxRetries,
  timeout,
) {
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
      return response
    } catch (error) {
      console.error("_retry_fetch:", error.name, error.message, `(Attempt ${attempt}/${maxRetries})`);
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
const stuffPromptTemplate = settings.STUFF_PROMPT_TEMPLATE;
const mapPromptTemplate = settings.MAP_PROMPT_TEMPLATE;
const reducePromptTemplate = settings.REDUCE_PROMPT_TEMPLATE;
const refinePromptTemplate = settings.REFINE_PROMPT_TEMPLATE;

export async function summarize(
  input,
  api_key,
  model = "gpt-3.5-turbo",
  temperature = 0.2,
  type = "map_reduce",  // stuff, refine
  chunkSize = 1000,
  chunkOverlap = 100,
  maxRetries = 3,
  timeout = 6000,
  elem = document.getElementById("submit"),  // submit button
  ) {
  if (type === "stuff") {
    const output = await chatCompletion(
      substitute(stuffPromptTemplate, {"text": input}),
      api_key,
      model,
      temperature,
      maxRetries,
      timeout,
    );
    return output;
  } else if (type === "map_reduce") {
    const splits = RecursiveTextSplitter(input, chunkSize, chunkOverlap, ["\n\n", "\n", " ", ""], true);
    console.log(splits.map((s) => s.length));
    if (splits.length === 1) {
      throw new Error("Input is too short to be split");
    }
    const jobsTotal = splits.length + 1;
    let jobsDone = 0;
    const textOrig = elem.innerHTML;
    elem.innerHTML = `${textOrig} (${jobsDone}/${jobsTotal})`;
    const map_output = await Promise.all(splits.map(async (s) => {
      const output = await chatCompletion(
        substitute(mapPromptTemplate, {"text": s}),
        api_key,
        model,
        temperature,
        maxRetries,
        timeout,
      ).then((output) => {
        jobsDone += 1;
        elem.innerHTML = `${textOrig} (${jobsDone}/${jobsTotal})`;
        return output;
      });
      return output;
    }));
    console.log(map_output);
    const reduce_output = await chatCompletion(
      substitute(reducePromptTemplate, {"text": map_output.join("\n\n")}),
      api_key,
      model,
      temperature,
      maxRetries,
      timeout,
    );
    return reduce_output;
  } else if (type === "refine") {
    const splits = RecursiveTextSplitter(input, chunkSize, chunkOverlap, ["\n\n", "\n", " ", ""], true);
    console.log(splits.map((s) => s.length));
    if (splits.length === 1) {
      throw new Error("Input is too short to be split");
    }
    const jobsTotal = splits.length;
    let jobsDone = 0;
    const textOrig = elem.innerHTML;
    elem.innerHTML = `${textOrig} (${jobsDone}/${jobsTotal})`;
    let output = await chatCompletion(
      substitute(stuffPromptTemplate, {"text": splits[0]}),
      api_key,
      model,
      temperature,
      maxRetries,
      timeout,
    ).then((output) => {
      jobsDone += 1;
      elem.innerHTML = `${textOrig} (${jobsDone}/${jobsTotal})`;
      return output;
    });
    console.log(output);
    for (let i = 1; i < splits.length; i++) {
      output = await chatCompletion(
        substitute(refinePromptTemplate, {"text": splits[i], "existing_answer": output}),
        api_key,
        model,
        temperature,
        maxRetries,
        timeout,
      ).then((output) => {
        jobsDone += 1;
        elem.innerHTML = `${textOrig} (${jobsDone}/${jobsTotal})`;
        return output;
      });
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
