// Fonctions utilitaires de validation pour le chat

/**
 * Validation stricte de l'entrée (sécurité)
 */
export function validateSearchInput(input: any): void {
  if (!input.query || input.query.length > 500) {
    throw new Error("La requête doit faire entre 1 et 500 caractères");
  }
  const dangerousPatterns = [/</i, /javascript:/i, /onload=/i];
  if (dangerousPatterns.some(pattern => pattern.test(input.query))) {
    throw new Error("Requête contenant des caractères non autorisés");
  }
  if (input.maxResults > 100) {
    input.maxResults = 100;
  }
}

