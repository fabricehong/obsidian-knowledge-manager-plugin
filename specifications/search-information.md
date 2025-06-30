### Spécification de la commande Obsidian « Synthèse IA sur fichiers liés »

**Date** : 2025-06-30
**Contexte** : Cette spécification décrit une nouvelle fonctionnalité pour un plugin Obsidian existant. Elle permet d’extraire automatiquement une synthèse IA sur plusieurs fichiers liés à partir d’une note structurée contenant une question et une liste de fichiers Obsidian.

---

#### Objectif

Développer une commande Obsidian qui :

1. Lit une note active contenant une question et des liens vers d'autres fichiers Obsidian.
2. Valide la structure de la note et construit un objet structuré (DTO).
3. Pour chaque fichier listé, extrait uniquement le contenu du header `## Original` (ou `## original`) et exécute un prompt IA avec la question comme instruction.
4. Ajoute dans la note active une section « Résultat » contenant les réponses IA, classées par fichier.

Développer une commande Obsidian qui :

1. Lit une note active contenant une question et des liens vers d'autres fichiers Obsidian.
2. Valide la structure de la note et construit un objet structuré (DTO).
3. Pour chaque fichier listé, exécute un prompt IA avec la question comme instruction.
4. Ajoute dans la note active une section « Résultat » contenant les réponses IA, classées par fichier.

---

#### Étapes de traitement

**Remarque sur le traitement itératif**

Le traitement des fichiers doit se faire de manière itérative, fichier par fichier, avec retour utilisateur immédiat :

* Avant de commencer le traitement, la section `# Résultat` est initialisée dans la note active.
* Pour chaque fichier :

    * Une modale avec un loader est affichée, incluant la progression (par exemple : « Traitement du fichier 2 sur 3… »).
    * Une fois l’analyse du fichier terminée, le loader est retiré.
    * Le résultat est immédiatement inséré dans la section `# Résultat` de la note active.
    * La commande passe ensuite au fichier suivant.

Ce comportement permet à l’utilisateur de voir en temps réel l’évolution du traitement, sans attendre la fin complète du processus.

**Remarque sur le traitement itératif**

Le traitement des fichiers doit se faire de manière itérative, fichier par fichier, avec retour utilisateur immédiat :

* Avant de commencer le traitement du premier fichier, la section `# Résultat` est déjà ajoutée ou initialisée dans la note active.
* Pour chaque fichier :

    * Une modale avec un loader (indicateur visuel de progression) est affichée pendant le traitement.
    * Une fois l’analyse du fichier terminée, le loader est retiré.
    * Le résultat de l’analyse est immédiatement inséré ou mis à jour dans la section `# Résultat`, avant de passer au fichier suivant.
* Ce comportement permet de voir les résultats se construire au fur et à mesure dans la note, tout en assurant une meilleure réactivité pour l'utilisateur.

**1. Parsing de la note active**

* La commande lit la note actuellement ouverte dans l'éditeur Obsidian.
* La note doit contenir obligatoirement :

    * Une section `# Question`, suivie d’un paragraphe de texte.
    * Une section `# Fichiers`, contenant une liste de fichiers au format `[[nom du fichier]]`.
* En cas de non-conformité, une erreur explicite est affichée à l'utilisateur. Exemple :

  > ❌ Format invalide : veuillez inclure une section `# Question` et une section `# Fichiers` contenant des liens Obsidian.

**2. Construction du DTO**

* Un objet `InformationResearchDTO` est généré à partir du contenu de la note. Il comprend :

    * `question` : chaîne de caractères extraite sous `# Question`
    * `filePaths` : tableau de chemins de fichiers référencés sous `# Fichiers`

**3. Traitement des fichiers liés**

* Pour chaque fichier de `filePaths` :

    * Lire le contenu du fichier Markdown.
    * Extraire uniquement la section correspondant au header contenant le transcript, tel que défini dans les paramètres du plugin.
    * Si cette section n'existe pas, afficher une erreur spécifique dans la section `# Résultat` (voir plus bas).
    * Construire un prompt IA avec ce contenu et la question.
    * Envoyer le prompt à un service IA et récupérer une sortie textuelle (`SORTIE_IA_n`).
    * Afficher un loader pendant le traitement, puis l’enlever une fois terminé.
    * Insérer immédiatement la réponse dans la section `# Résultat` après traitement de chaque fichier.

**4. Ajout de la section Résultat dans la note**

* Avant de traiter les fichiers, la commande crée une section `# Résultat` vide (ou remplace la section existante si elle est déjà présente).
* Après chaque traitement de fichier, un bloc `## nom du fichier` suivi de la réponse IA est ajouté dynamiquement à cette section.
* Cela permet de construire la section de manière progressive et visible pour l'utilisateur dès les premières réponses.

---

#### Cas d’erreur à traiter

* Note mal structurée → affichage d’un message bloquant.
* Fichier listé introuvable → insertion d’un message d’avertissement dans la section correspondante.
* Section contenant le transcript introuvable (selon le header configuré dans les paramètres du plugin) → insertion d’un bloc de type :

  > ⚠️ Aucune section contenant le transcript n’a été trouvée dans ce fichier.
* Échec de l'appel IA → affichage d’un bloc de type :

  > ⚠️ Erreur lors de l'analyse de ce fichier.

---

#### Hypothèses techniques

* La commande peut modifier le contenu de la note active.
* Les fichiers référencés sont des notes Markdown valides dans le même Vault.
* Le prompt IA est défini ailleurs dans le plugin et accepte deux entrées : `question` et `fichierMarkdown`.

---

#### Analyse des services réutilisables (Documentation technique)

**Date d'analyse** : 2025-06-30

Cette section documente les services et composants existants dans le plugin qui peuvent être réutilisés pour l'implémentation de la fonctionnalité "Synthèse IA sur fichiers liés".

##### Services réellement réutilisables

**1. DocumentStructureService** (`src/services/document/document-structure.service.ts`)
- **Fonction principale** : Parse la structure hiérarchique des notes Obsidian
- **Méthodes clés** :
  - `buildHeaderTree(app: App, file: TFile)` : Lit une note et construit un arbre de headers
  - `findFirstNodeMatchingHeading(root, heading)` : Trouve une section spécifique
- **Exemple d'usage** (extrait de EditorConversationTopicsService) :
```typescript
// Lecture de la structure
const doc = await this.documentStructureService.buildHeaderTree(this.app, markdownView.file);

// Extraction du contenu d'une section
const transcriptNode = this.documentStructureService.findFirstNodeMatchingHeading(
    doc.root, 
    headerContainingTranscript
);
const transcriptContent = transcriptNode.content;

// Ajout d'une nouvelle section
const header = { level: 1, heading: "Résultat", content: generatedContent, children: [] };
doc.root.children.unshift(header);

// Sauvegarde
const newContent = this.documentStructureService.renderToMarkdown(doc.root);
await this.app.vault.modify(markdownView.file, newContent);
```
- **Réutilisation** : Lecture de la note active, extraction des sections # Question et # Fichiers

**2. AICompletionService** (`src/libs/obsidian-utils/src/services/interfaces/ai-completion.interface.ts`)
- **Fonction principale** : Interface standardisée pour appels LLM simples. Permet d'utiliser les modèles et clés d'api configurés dans les settings pour les appels. 
- **Exemple d'usage** (extrait de ConversationTopicsService) :
```typescript
async listTopics(transcription: string, userPrompt: string): Promise<string> {
    const messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
        { role: 'system', content: this.SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
        { role: 'user', content: `Content to process:\n${transcription}` }
    ];
    
    return await this.aiCompletionService.generateTextResponse(messages);
}
```
- **Réutilisation** : Envoi des prompts de synthèse avec question + contenu de fichier

**3. LoadingModal** (`src/ui/loading.modal.ts`)
- **Fonction principale** : Modal simple avec loader et bouton d'annulation
- **Limitations actuelles** : Texte fixe "This may take a minute...", pas de support pour messages de progression
- **Exemple d'usage** (extrait de EditorSpeakerDescriptionService) :
```typescript
// Affichage du modal de chargement
let isCancelled = false;
const loadingModal = new LoadingModal(this.app, () => { isCancelled = true; });
loadingModal.open();

try {
    const result = await this.service.process(content);
    if (isCancelled) return;
    // Traitement du résultat
} finally {
    loadingModal.forceClose();
}
```
- **Options pour Information Research** :
  1. **Étendre LoadingModal** : Ajouter une méthode `updateProgress(message: string)` tout en gardant la rétrocompatibilité
  2. **Créer ProgressModal** : Nouvelle classe spécialisée pour affichage de progression détaillée
  3. **Utiliser LoadingModal tel quel** : Afficher un modal simple pendant tout le processus sans détail de progression

**4. PluginSettings** (`src/models/interfaces.ts`)
- **Propriété réutilisable** : `headerContainingTranscript: string` (défaut: "Original")
- **Réutilisation** : Configuration du header à extraire dans chaque fichier

##### Patterns architecturaux à suivre

**Pattern Editor/Business Logic** (utilisé dans tous les services) :
```typescript
// Service métier pur (testable)
export class InformationResearchService {
    constructor(private aiCompletionService: AICompletionService) {}
    
    async researchInformation(question: string, content: string): Promise<string> {
        const messages = [
            { role: 'system', content: 'Tu es un assistant qui répond aux questions sur des contenus.' },
            { role: 'user', content: question },
            { role: 'user', content: `Contenu à analyser :\n${content}` }
        ];
        return await this.aiCompletionService.generateTextResponse(messages);
    }
}

// Service éditeur (wrapper Obsidian)
export class EditorInformationResearchService {
    constructor(
        private app: App,
        private documentStructureService: DocumentStructureService,
        private informationResearchService: InformationResearchService
    ) {}
    
    async processInformationResearch(markdownView: MarkdownView): Promise<void> {
        // Logique Obsidian + appels aux services métier
    }
}
```

**Pattern de lecture et extraction de contenu** (basé sur EditorSpeakerDescriptionService) :
```typescript
// Lire la structure de la note active
const doc = await this.documentStructureService.buildHeaderTree(this.app, markdownView.file);

// Extraire le contenu d'une section spécifique
private getTranscriptContent(doc: any, headerContainingTranscript: string): string | null {
    const transcriptNode = this.documentStructureService.findFirstNodeMatchingHeading(doc, headerContainingTranscript);
    if (!transcriptNode) {
        new Notice('No transcript section found');
        return null;
    }
    return transcriptNode.content;
}

// Trouver un fichier par path
const abstractFile = this.app.vault.getAbstractFileByPath(filePath);
if (!abstractFile || !(abstractFile instanceof TFile)) {
    throw new Error(`Fichier ${filePath} introuvable`);
}
```

**Pattern d'insertion progressive** (basé sur EditorChunkInsertionService) :
```typescript
// Insertion directe dans l'éditeur sans passer par DocumentStructureService
private insertResultInActiveFile(fileName: string, result: string): void {
    const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    const editor = markdownView?.editor;
    if (!editor) {
        new Notice('Aucun fichier markdown actif.');
        return;
    }
    
    const content = `## ${fileName}\n\n${result}\n\n`;
    editor.replaceRange(content, { line: editor.lastLine(), ch: 0 });
}
```

**Pattern de gestion de modal avec progression** (avec LoadingModal étendu) :
```typescript
// Affichage du modal de chargement avec progression détaillée
let isCancelled = false;
const loadingModal = new LoadingModal(this.app, () => {
    isCancelled = true;
}, 'Initialisation...');
loadingModal.open();

try {
    // Traitement itératif des fichiers avec feedback de progression
    for (let i = 0; i < filePaths.length; i++) {
        if (isCancelled) {
            new Notice('Operation cancelled');
            return;
        }
        
        const filePath = filePaths[i];
        const fileName = filePath.split('/').pop() || filePath;
        
        // Mise à jour de la progression
        loadingModal.updateProgress(`Traitement du fichier ${i + 1} sur ${filePaths.length}: ${fileName}`);
        loadingModal.updateTitle('Information Research');
        
        // Traitement d'un fichier + insertion immédiate du résultat
        const result = await this.processFile(filePath, question);
        this.insertResultInActiveFile(fileName, result);
    }
    
    loadingModal.updateProgress('Traitement terminé !');
} finally {
    // Petit délai pour voir le message final
    setTimeout(() => loadingModal.forceClose(), 500);
}
```

**Pattern de parsing de liens [[filename]]** :
```typescript
// Extraction simple des liens Obsidian
function extractObsidianLinks(content: string): string[] {
    const linkPattern = /\[\[([^\]]+)\]\]/g;
    const links: string[] = [];
    let match;
    
    while ((match = linkPattern.exec(content)) !== null) {
        links.push(match[1]);
    }
    
    return links;
}
```

##### Recommandation pour le modal de progression

**Analyse des options** :

1. **Option 1 - Étendre LoadingModal** :
   - ✅ Réutilise le code existant
   - ✅ Garde la rétrocompatibilité
   - ✅ Ajoute `updateProgress(message: string)` et `updateTitle(title: string)`
   - ⚠️ Modifie une classe existante utilisée ailleurs

2. **Option 2 - Créer ProgressModal** :
   - ✅ N'affecte pas le code existant
   - ✅ Spécialisé pour les progressions détaillées
   - ✅ Peut hériter de LoadingModal ou la dupliquer
   - ⚠️ Code dupliqué si on n'hérite pas

3. **Option 3 - LoadingModal tel quel** :
   - ✅ Aucun développement supplémentaire
   - ❌ Pas de feedback détaillé pour l'utilisateur
   - ❌ Ne respecte pas la spécification (progression fichier par fichier)

**Recommandation** : **Option 1 - Étendre LoadingModal**
- Ajouter une méthode `updateProgress(message: string)` pour mettre à jour le texte de progression
- Ajouter une méthode `updateTitle(title: string)` pour changer le titre
- Garder le constructeur actuel pour la rétrocompatibilité
- Permettre d'initialiser avec un message personnalisé

```typescript
// Extension proposée pour LoadingModal
export class LoadingModal extends Modal {
    private progressTextEl: HTMLElement;
    
    constructor(app: App, onCancel: () => void, initialMessage?: string) {
        // ... code existant ...
        this.progressTextEl = contentEl.createEl('div', { 
            text: initialMessage || 'This may take a minute...',
            cls: 'loading-text'
        });
    }
    
    updateProgress(message: string): void {
        if (this.progressTextEl) {
            this.progressTextEl.textContent = message;
        }
    }
    
    updateTitle(title: string): void {
        this.titleEl.textContent = title;
    }
}
```

##### Services à créer (nouveaux)

**Nom de la commande** : "Information Research"

Basés sur l'analyse, les nouveaux services suivants devront être créés :

1. **InformationResearchDTO** : Interface pour { question: string, filePaths: string[] }
2. **InformationResearchService** : Service métier pur pour traiter une question sur un contenu donné (utilise AICompletionService)
3. **EditorInformationResearchService** : Service éditeur principal qui :
   - Parse les sections # Question et # Fichiers de la note active (via DocumentStructureService)
   - Lit le contenu des fichiers liés et extrait les sections configurées
   - Orchestre le traitement de tous les fichiers
   - Gère l'affichage du modal de progression (LoadingModal étendu)
   - Met à jour progressivement la section # Résultat via l'éditeur direct (pattern EditorChunkInsertionService)

##### Architecture d'intégration

**ServiceContainer** : Les nouveaux services s'intégreront via dependency injection :
```typescript
// Dans service-container.ts
this.informationResearchService = new InformationResearchService(this.aiCompletionService);
this.editorInformationResearchService = new EditorInformationResearchService(
    this.app,
    this.documentStructureService,
    this.informationResearchService
);
```

**Commande** : Enregistrement dans main.ts :
```typescript
this.addCommand({
    id: 'information-research:linked-files',
    name: 'Information Research',
    checkCallback: (checking: boolean) => {
        const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (markdownView) {
            if (!checking) {
                this.serviceContainer.editorInformationResearchService
                    .processInformationResearch(markdownView);
            }
            return true;
        }
        return false;
    }
});
```

---

#### Mode opératoire pour le développement (guidance IA)

Le développement doit se faire en plusieurs étapes progressives clairement délimitées, avec validation à chaque étape par l'utilisateur.

Pour chaque étape, l’IA doit commencer par analyser le code existant afin d’identifier les services, fonctions ou composants déjà implémentés et potentiellement réutilisables. Cette investigation locale précède systématiquement toute proposition de code.

L'utilisateur valide ensuite quels éléments peuvent être exploités. Ce n’est qu’après cette validation que l’IA peut proposer un petit plan pour l’étape en question. Le code ne sera généré qu’à ce moment-là, étape par étape.


**Principe général mis à jour** : Bien que cette spécification contienne une analyse détaillée des services réutilisables, il est recommandé à chaque étape de développement de :

1. **Se baser sur l'analyse de la spécification** comme point de départ
2. **Lire et analyser les fichiers pertinents** pour l'étape en cours afin de :
   - Vérifier les détails d'implémentation
   - Identifier des patterns spécifiques non documentés
   - S'assurer de la cohérence avec le code existant
3. **Proposer un plan concret** pour l'étape basé sur cette analyse fraîche
4. **Faire valider** le plan et l'approche avant l'implémentation
5. **Implémenter** le code étape par étape
6. **Faire valider** le code produit avant de passer à l'étape suivante

**Important** : Ne pas hésiter à relire des sections de code même si elles sont documentées dans cette spécification, car les détails d'implémentation et les nuances peuvent nécessiter une analyse plus approfondie au moment du développement.
