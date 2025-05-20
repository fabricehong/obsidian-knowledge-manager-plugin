// Modèle pour les chunks atomiques avec hiérarchie

export enum ChunkHierarchyType {
    Directory = "directory",
    File = "file",
    Header = "header"
}

export interface ChunkHierarchyLevel {
    name: string; // Nom du répertoire, du fichier (sans extension), ou du header
    type: ChunkHierarchyType;
}

export interface Chunk {
    markdown: string; // Le texte markdown du chunk (le plus profond possible)
    hierarchy: ChunkHierarchyLevel[]; // Liste ordonnée des niveaux (du root au chunk)
}
