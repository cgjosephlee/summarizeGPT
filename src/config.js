const settings = {
    MODEL: import.meta.env.VITE_MODEL,
    TEMPERATURE: parseFloat(import.meta.env.VITE_TEMPERATURE),
    TYPE: import.meta.env.VITE_TYPE,
    CHUNK_SIZE: parseInt(import.meta.env.VITE_CHUNK_SIZE),
    CHUNK_OVERLAP: parseInt(import.meta.env.VITE_CHUNK_OVERLAP),
    MAX_RETRIES: parseInt(import.meta.env.VITE_MAX_RETRIES) || 3,
    TIMEOUT: parseInt(import.meta.env.VITE_TIMEOUT) || 6000,
    STUFF_PROMPT_TEMPLATE: import.meta.env.VITE_STUFF_PROMPT_TEMPLATE,
    MAP_PROMPT_TEMPLATE: import.meta.env.VITE_MAP_PROMPT_TEMPLATE,
    REDUCE_PROMPT_TEMPLATE: import.meta.env.VITE_REDUCE_PROMPT_TEMPLATE,
    REFINE_PROMPT_TEMPLATE: import.meta.env.VITE_REFINE_PROMPT_TEMPLATE,
}
console.log("default settings:", settings)
export { settings }
