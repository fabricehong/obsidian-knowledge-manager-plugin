import { App, Notice, ButtonComponent, Modal, Setting } from 'obsidian';
import type { VectorStore } from '../semantic/vector-store/VectorStore';

/**
 * Service dédié à l'export d'embeddings + métadonnées pour Embedding Projector
 * - Affiche les modales de sélection (vector store puis collection)
 * - Extrait les embeddings + métadonnées
 * - Génère les fichiers TSV
 * - Gère la sauvegarde dans le vault
 */
export class EditorEmbeddingExportService {
  constructor(
    private app: App,
    private vectorStores: VectorStore[]
  ) {}

  /**
   * Lance le workflow complet d'export pour Embedding Projector
   */
  async exportEmbeddingsForProjector() {
    // 1. Afficher modale choix vector store
    const selectedVectorStore = await this.showVectorStoreSelectionModal();
    if (!selectedVectorStore) {
      new Notice('Export annulé : aucun vector store sélectionné.');
      return;
    }
    // 2. Afficher modale choix collection
    const selectedCollection = await this.showCollectionSelectionModal(selectedVectorStore);
    if (!selectedCollection) {
      new Notice('Export annulé : aucune collection sélectionnée.');
      return;
    }
    // 3. Extraire embeddings + métadonnées
    const { embeddings, metadata } = this.extractEmbeddingsAndMetadata(selectedVectorStore, selectedCollection);
    console.log('[EmbeddingExport] Embeddings:', embeddings);
    console.log('[EmbeddingExport] Metadata:', metadata);
    // 4. Générer fichiers TSV
    const { vectorsTSV, metadataTSV } = this.generateTSVFiles(embeddings, metadata);
    console.log('[EmbeddingExport] vectors.tsv:', vectorsTSV);
    console.log('[EmbeddingExport] metadata.tsv:', metadataTSV);
    // 5. Sauvegarder sur le disque avec nom prédéfini et file picker
    await this.saveFilesToDiskWithLinks(
      vectorsTSV,
      metadataTSV,
      selectedVectorStore.id,
      selectedCollection
    );
    new Notice('Export Embedding Projector terminé avec succès !');
  }

  /**
   * Affiche une modale pour sélectionner un vector store
   * Retourne une Promise résolue avec le VectorStore choisi (ou undefined si annulé)
   */
  private showVectorStoreSelectionModal(): Promise<VectorStore | undefined> {
    const { app, vectorStores } = this;
    return new Promise((resolve) => {
      let resolved = false;
      class VectorStoreModal extends Modal {
        constructor(app: App, private vectorStores: VectorStore[]) {
          super(app);
        }
        onOpen() {
          this.titleEl.setText('Sélectionnez un Vector Store');
          this.contentEl.empty();
          this.vectorStores.forEach((vs) => {
            const setting = new Setting(this.contentEl)
              .setName(vs.id || 'VectorStore')
              .addButton((btn: ButtonComponent) => btn
                .setButtonText('Choisir')
                .setCta()
                .onClick(() => {
                  if (!resolved) {
                    resolved = true;
                    this.close();
                    resolve(vs);
                  }
                })
              );
            setting.settingEl.classList.add('modal-button-container');
          });
        }
        onClose() {
          this.contentEl.empty();
          if (!resolved) {
            resolved = true;
            resolve(undefined);
          }
        }
      }
      new VectorStoreModal(app, vectorStores).open();
    });
  }

  /**
   * Affiche une modale pour sélectionner une collection d'un vector store donné
   * Retourne une Promise résolue avec le nom de la collection (ou undefined si annulé)
   */
  private showCollectionSelectionModal(vectorStore: VectorStore): Promise<string | undefined> {
    return new Promise((resolve) => {
      let collections: string[] = [];
      try {
        collections = vectorStore.getAllCollections();
      } catch (e) {
        new Notice("Erreur lors de la récupération des collections du vector store.");
        resolve(undefined);
        return;
      }
      if (!collections.length) {
        new Notice("Aucune collection trouvée dans ce vector store.");
        resolve(undefined);
        return;
      }
      const { app } = this;
      let resolved = false;
      class CollectionModal extends Modal {
        constructor(app: App, private collections: string[]) {
          super(app);
        }
        onOpen() {
          this.titleEl.setText('Sélectionnez une collection');
          this.contentEl.empty();
          this.collections.forEach((col) => {
            const setting = new Setting(this.contentEl)
              .setName(col)
              .addButton((btn: ButtonComponent) => btn
                .setButtonText('Choisir')
                .setCta()
                .onClick(() => {
                  if (!resolved) {
                    resolved = true;
                    this.close();
                    resolve(col);
                  }
                })
              );
            setting.settingEl.classList.add('modal-button-container');
          });
        }
        onClose() {
          this.contentEl.empty();
          if (!resolved) {
            resolved = true;
            resolve(undefined);
          }
        }
      }
      new CollectionModal(app, collections).open();
    });
  }

  /**
   * Extrait les embeddings (vecteurs) et les métadonnées pour une collection donnée
   * Retourne un objet { embeddings: number[][], metadata: any[] }
   */
  private extractEmbeddingsAndMetadata(vectorStore: VectorStore, collection: string): { embeddings: number[][], metadata: any[] } {
    const documents = vectorStore.getAllDocuments(collection);
    const embeddings: number[][] = [];
    const metadata: any[] = [];
    for (const doc of documents) {
      if (Array.isArray(doc.embedding)) {
        embeddings.push(doc.embedding);
      } else {
        embeddings.push([]);
      }
      // Construction du champ title : filepath + ' -> ' + header[0] + ...
      let title = '';
      if (doc.filepath) {
        title += doc.filepath;
      }
      if (Array.isArray(doc.header) && doc.header.length > 0) {
        for (const h of doc.header) {
          title += ' -> ' + h;
        }
      }
      metadata.push({ title });
    }
    return { embeddings, metadata };
  }

  /**
   * Génère le contenu TSV pour les embeddings et les métadonnées
   * Retourne un objet { vectorsTSV, metadataTSV }
   */
  private generateTSVFiles(embeddings: number[][], metadata: any[]): { vectorsTSV: string, metadataTSV: string } {
    // Génération du TSV des embeddings (une ligne par vecteur, valeurs séparées par \t)
    const vectorsTSV = embeddings.map(vec => vec.join('\t')).join('\n');

    // Génération du TSV des métadonnées
    let metadataTSV = '';
    if (metadata.length > 0) {
      const columns = Object.keys(metadata[0]);
      if (columns.length === 1) {
        // Pas d'en-tête si une seule colonne (Embedding Projector)
        for (const meta of metadata) {
          metadataTSV += (meta[columns[0]] !== undefined ? String(meta[columns[0]]) : '') + '\n';
        }
      } else {
        // En-tête + lignes si plusieurs colonnes
        metadataTSV += columns.join('\t') + '\n';
        for (const meta of metadata) {
          const row = columns.map(col => (meta[col] !== undefined ? String(meta[col]) : '')).join('\t');
          metadataTSV += row + '\n';
        }
      }
      metadataTSV = metadataTSV.trim();
    }
    return { vectorsTSV, metadataTSV };
  }

  /**
   * Affiche une modale avec deux boutons pour télécharger séparément vectors.tsv et metadata.tsv
   */
  private async saveFilesToDiskWithLinks(
    vectorsTSV: string,
    metadataTSV: string,
    vectorStoreId: string,
    collection: string
  ) {
    const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const baseName = `${dateStr}_${vectorStoreId}_${collection}`;

    class DownloadBothModal extends Modal {
      constructor(app: App) {
        super(app);
      }
      onOpen() {
        this.titleEl.setText('Exporter pour Embedding Projector');
        this.contentEl.empty();

        new Setting(this.contentEl)
          .setName(`${baseName}_vectors.tsv`)
          .addButton((btn: ButtonComponent) =>
            btn
              .setButtonText('Télécharger les vecteurs')
              .setCta()
              .onClick(() => {
                const blob = new Blob([vectorsTSV], { type: 'text/tab-separated-values;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${baseName}_vectors.tsv`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }, 100);
              })
          );

        if (metadataTSV && metadataTSV.trim().length > 0) {
          new Setting(this.contentEl)
            .setName(`${baseName}_metadata.tsv`)
            .addButton((btn: ButtonComponent) =>
              btn
                .setButtonText('Télécharger les métadonnées')
                .setCta()
                .onClick(() => {
                  const blob = new Blob([metadataTSV], { type: 'text/tab-separated-values;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${baseName}_metadata.tsv`;
                  document.body.appendChild(a);
                  a.click();
                  setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }, 100);
                })
            );
        } else {
          new Setting(this.contentEl)
            .setName('Aucune métadonnée exportée (metadata.tsv vide).');
        }
      }
      onClose() {
        this.contentEl.empty();
      }
    }

    new DownloadBothModal(this.app).open();
  }
}




