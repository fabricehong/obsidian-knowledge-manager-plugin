export class YamlValidationError extends Error {
    constructor(
        message: string,
        public readonly filePath: string,
        public readonly details: string
    ) {
        super(`${message} in file ${filePath}: ${details}`);
        this.name = 'YamlValidationError';
    }
}
