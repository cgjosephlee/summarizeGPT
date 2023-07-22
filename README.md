# summarizeGPT
Summarize your long article on a static website. No backend, no telemetry, no data piracy, all on your browser.

# Usage
Take out your OpenAI API KEY, then just open the [website](https://summarize-gpt-seven.vercel.app/).

Or run locally:
```sh
git clone https://github.com/cgjosephlee/summarizeGPT.git
npm i
npm run dev
```

# Parameters
Provide url parameters to configure.
```
https://summarize-gpt-seven.vercel.app/?api_key=YOUR_KEY&model=gpt-4&t=0.1&type=refine
```
| params | default |
| - | - |
| api_key | null |
| model | gpt-3.5-turbo |
| t (temperature) | 0.2 |
| type | map_reduce (stuff, refine) |
| chunkSize | 1000 |
| chunkOverlap | 100 |

## Prompt
You may edit the prompts and run locally for now.

# How?
- https://python.langchain.com/docs/modules/chains/popular/summarize
- `RecursiveCharacterTextSplitter` is ported to vanilla javascript.
- Chain is decomposed to several api calls.
