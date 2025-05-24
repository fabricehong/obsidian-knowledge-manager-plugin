// Utilitaire pour obtenir un label unique, humainement lisible et déterministe pour un vector store
// Peut servir de header, d'identifiant, etc.

export function getVectorStoreLabel(vs: any): string {
    let storeLabel = vs?.type ? vs.type : vs?.constructor?.name || 'VectorStore';
    if (storeLabel === 'OLLAMA' && typeof vs.getModelName === 'function') {
        const modelName = vs.getModelName();
        return `Ollama (${modelName})`;
    } else if (storeLabel === 'MEMORY') {
        if (vs.store && vs.store.embeddings && vs.store.embeddings.constructor && vs.store.embeddings.constructor.name === 'OpenAIEmbeddings') {
            return 'Mémoire (OpenAI Embeddings)';
        }
        return 'Mémoire';
    } else {
        return storeLabel;
    }
}
