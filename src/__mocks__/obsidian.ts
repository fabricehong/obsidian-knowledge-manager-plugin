export class Notice {
    constructor(message: string) {
        // Mock implementation
    }
}

export class TFile {
    path: string;
    name: string;
    
    constructor(path: string) {
        this.path = path;
        this.name = path.split('/').pop() || '';
    }
}

export class Vault {
    adapter: any;
    
    async read(file: TFile): Promise<string> {
        return '';
    }
    
    async modify(file: TFile, data: string): Promise<void> {
        // Mock implementation
    }
}

export class App {
    vault: Vault;
    
    constructor() {
        this.vault = new Vault();
    }
}
