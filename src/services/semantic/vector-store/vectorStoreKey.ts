// Génère une clé unique, stable et humaine pour chaque instance de vector store
// Cette clé doit être utilisée partout (mapping, header, recherche, etc.)

export function getVectorStoreKey(vs: any): string {
    let type = vs?.type || vs?.constructor?.name || 'VectorStore';
    if (type === 'OLLAMA' && typeof vs.getModelName === 'function') {
        return `OLLAMA_${vs.getModelName()}`;
    } else if (type === 'MEMORY') {
        if (vs.store && vs.store.embeddings && vs.store.embeddings.constructor && vs.store.embeddings.constructor.name === 'OpenAIEmbeddings') {
            return 'MEMORY_OPENAI';
        }
        return 'MEMORY_GENERIC';
    } else {
        return type;
    }
}
