/**
 * Constantes partagées pour les services d'Information Synthesis
 * Centralise les noms des sections markdown pour éviter la duplication
 */

export const INFORMATION_SYNTHESIS_SECTIONS = {
    QUESTION: 'Question',
    FILES: 'Fichiers', 
    RESULT: 'Résultat',
    TOPIC_SYNTHESIS: 'Synthèse par Sujets'
} as const;

/**
 * Messages d'erreur et de statut standardisés pour les services d'Information Synthesis
 */
export const INFORMATION_SYNTHESIS_MESSAGES = {
    // Messages d'erreur
    NO_ACTIVE_FILE: '❌ Aucun fichier actif trouvé.',
    INVALID_FORMAT: '❌ Format invalide : veuillez inclure une section # Question et une section # Fichiers contenant des liens Obsidian.',
    EMPTY_QUESTION: '❌ La section # Question ne peut pas être vide.',
    NO_OBSIDIAN_LINKS: '❌ Aucun lien Obsidian trouvé dans la section # Fichiers.',
    RESULT_SECTION_EXISTS: '❌ Une section "Résultat" existe déjà. Supprimez-la d\'abord ou renommez-la pour continuer.',
    SYNTHESIS_SECTION_EXISTS: '❌ Une section "Synthèse par Sujets" existe déjà. Supprimez-la d\'abord ou renommez-la pour continuer.',
    EMPTY_RESULTS: '❌ La section "Résultat" est vide. Aucun contenu à synthétiser.',
    NO_RESULT_SECTION: '❌ Aucune section "Résultat" trouvée. Veuillez d\'abord exécuter la commande Information Research.',
    
    // Messages de succès
    SYNTHESIS_SUCCESS: '✅ Synthèse par sujets créée avec succès !',
    
    // Messages de progression
    OPERATION_CANCELLED: 'Opération annulée',
    PROCESSING_FINISHED: 'Traitement terminé !',
    SYNTHESIS_FINISHED: 'Synthèse terminée !',
    
    // Messages d'erreur génériques
    PROCESSING_ERROR: 'Erreur lors du traitement:',
    
    // Messages de progression spécifiques
    RESEARCH_TITLE: 'Information Research',
    SYNTHESIS_TITLE: 'Information Synthesis Summary',
    INITIALIZATION: 'Initialisation...',
    SYNTHESIS_GENERATION: 'Génération de la synthèse...',
    ANALYSIS_AND_SYNTHESIS: 'Analyse des résultats et génération de la synthèse...',
    DOCUMENT_INSERTION: 'Insertion de la synthèse dans le document...'
} as const;

/**
 * Expressions régulières partagées pour les services d'Information Synthesis
 */
export const INFORMATION_SYNTHESIS_PATTERNS = {
    OBSIDIAN_LINK: /\[\[([^\]]+)\]\]/g
} as const;