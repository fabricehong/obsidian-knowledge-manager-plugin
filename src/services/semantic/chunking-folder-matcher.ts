// Fonction utilitaire pour matcher un chemin de fichier avec un dossier de config
export function isFileInChunkingFolder(filePath: string, folder: string): boolean {
    if (!folder) return false;
    // Normalisation : retire les slashs de fin pour folder, et de début pour filePath
    const normalizedFolder = folder.replace(/\/+$/, '');
    const normalizedFilePath = filePath.replace(/^\/+/, '');
    // Le matching doit être "folder/" ou égalité stricte
    return (
        normalizedFilePath === normalizedFolder ||
        normalizedFilePath.startsWith(normalizedFolder + '/')
    );
}
