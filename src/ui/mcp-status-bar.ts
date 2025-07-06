
/**
 * Composant de la barre de statut pour afficher l'état de l'API Semantic Search
 */
export class ApiStatusBar {
  private statusBarItem: HTMLElement;
  private isServerRunning: boolean = false;
  private onToggleCallback?: () => void;

  constructor(statusBarItem: HTMLElement) {
    this.statusBarItem = statusBarItem;
    this.setupStatusBarItem();
  }

  private setupStatusBarItem() {
    this.statusBarItem.addClass('api-status-bar');
    this.statusBarItem.style.cursor = 'pointer';
    
    // Ajouter event listener pour le clic
    this.statusBarItem.addEventListener('click', () => {
      if (this.onToggleCallback) {
        this.onToggleCallback();
      }
    });

    // Initialiser l'affichage
    this.updateDisplay();
  }

  /**
   * Met à jour l'affichage de la barre de statut
   */
  private updateDisplay() {
    this.statusBarItem.empty();
    
    if (this.isServerRunning) {
      // API en cours d'exécution - icône verte
      this.statusBarItem.innerHTML = `
        <span style="color: #22c55e; font-weight: bold;">●</span>
        <span style="margin-left: 4px;">API</span>
      `;
      this.statusBarItem.setAttribute('aria-label', 'Semantic Search API is running - Click to stop');
    } else {
      // API arrêtée - icône grise
      this.statusBarItem.innerHTML = `
        <span style="color: #6b7280; font-weight: bold;">●</span>
        <span style="margin-left: 4px;">API</span>
      `;
      this.statusBarItem.setAttribute('aria-label', 'Semantic Search API is stopped - Click to start');
    }
  }

  /**
   * Met à jour l'état du serveur
   */
  setServerRunning(isRunning: boolean) {
    this.isServerRunning = isRunning;
    this.updateDisplay();
  }

  /**
   * Définit la fonction de callback pour le toggle
   */
  setOnToggle(callback: () => void) {
    this.onToggleCallback = callback;
  }

  /**
   * Retourne l'état actuel du serveur
   */
  isRunning(): boolean {
    return this.isServerRunning;
  }

  /**
   * Nettoyage des ressources
   */
  destroy() {
    this.statusBarItem.removeEventListener('click', this.onToggleCallback as any);
  }
}