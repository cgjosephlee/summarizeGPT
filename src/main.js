import "./style.css"
import { settings } from "./config.js"
import { summarize, countWords, countTokens } from "./summarization.js"

// parameters
const urlParams = new URLSearchParams(window.location.search);
const API_KEY = urlParams.get("api_key");
if (API_KEY === null) {
  urlParams.set("api_key", window.prompt("Please enter your OpenAI API key:", ""));
  window.location.search = urlParams.toString();
}
const MODEL = urlParams.has("model") ? urlParams.get("model") : settings.MODEL;
const TEMPERATURE = urlParams.has("t") ? parseFloat(urlParams.get("t")) : settings.TEMPERATURE;
const TYPE = urlParams.has("type") ? urlParams.get("type") : settings.TYPE;
const CHUNK_SIZE = urlParams.has("chunkSize") ? parseInt(urlParams.get("chunkSize")) : settings.CHUNK_SIZE;
const CHUNK_OVERLAP = urlParams.has("chunkOverlap") ? parseInt(urlParams.get("chunkOverlap")) : settings.CHUNK_OVERLAP;
const TIMEOUT = urlParams.has("timeout") ? parseInt(urlParams.get("timeout")) : settings.TIMEOUT;

document.querySelector("#app").innerHTML = `
  <div>
    <h1>SummarizeGPT</h1>
    <textarea id="user-input" rows="10" cols="50"></textarea>
    <p/>
    <p id="input-count"></p>
    <button id="submit" type="button">Submit</button>
    <button id="clear" type="button">Clear</button>
    <p/>
    <textarea id="llm-output" rows="10" cols="50" readonly style="display:none;"></textarea>
    <button id="copy" type="button" style="display:none;">Copy</button>
    <p/>
    <p id="input-parameter" style="color:grey"></p>
    <p/>
    <footer>
      <p style="color:grey">© 2023 Joseph Lee, <a href="https://github.com/cgjosephlee/summarizeGPT">GitHub</a></p>
    </footer>
  <div>
`

const taUserInput = document.getElementById("user-input");
const pInputCount = document.getElementById("input-count");
const pInputParameter = document.getElementById("input-parameter");
const taLLMOutput = document.getElementById("llm-output");
const btnSubmit = document.getElementById("submit");
const btnClear = document.getElementById("clear");
const btnCopy = document.getElementById("copy");

taUserInput.innerHTML = "Enter text here"
pInputCount.innerHTML = "Characters: 0<br>Words: 0<br>Tokens: 0"
pInputParameter.innerHTML = `<i>Model: ${MODEL}<br>Temperature: ${TEMPERATURE}<br>Type: ${TYPE}<br>Chunk size: ${CHUNK_SIZE}<br>Chunk overlap: ${CHUNK_OVERLAP}<br>Timeout: ${TIMEOUT} ms</i>`

taUserInput.addEventListener("blur", () => {
  const l = taUserInput.value.length
  const c = countWords(taUserInput.value)
  const t = countTokens(taUserInput.value)
  pInputCount.innerHTML = `Characters: ${l}<br>Words: ${c}<br>Tokens: ${t}`
})

btnSubmit.addEventListener("click", () => {
  btnSubmit.disabled = true
  btnSubmit.innerHTML = "Loading..."
  const input = taUserInput.value
  summarize(
    input,
    API_KEY,
    MODEL,
    TEMPERATURE,
    TYPE,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
    3,
    TIMEOUT,
  ).then(output => {
    btnSubmit.disabled = false
    btnSubmit.innerHTML = "Submit"
    taLLMOutput.innerHTML = output
    taLLMOutput.style.display = "inline"
    btnCopy.style.display = "inline"
  }).catch(error => {
    btnSubmit.disabled = false
    btnSubmit.innerHTML = "Submit"
    alert("Failed to summarize text!")
    taLLMOutput.innerHTML = error
    taLLMOutput.style.display = "inline"
  })
})

btnClear.addEventListener("click", () => {
  taUserInput.value = ""
  pInputCount.innerHTML = "Characters: 0<br>Words: 0<br>Tokens: 0"
  taLLMOutput.innerHTML = ""
  taLLMOutput.style.display = "none"
  btnCopy.style.display = "none"
})

btnCopy.addEventListener("click", () => {
  navigator.clipboard.writeText(taLLMOutput.value)
  .then(() => {
    alert("Copied to clipboard!")
  })
})
