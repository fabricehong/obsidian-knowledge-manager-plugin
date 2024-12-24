export class PromptTemplate {
    constructor(config: any) {}
    format(values: any): Promise<string> {
        return Promise.resolve('mocked prompt');
    }
}

export class ChatPromptTemplate {
    constructor(config: any) {}
    format(values: any): Promise<string> {
        return Promise.resolve('mocked chat prompt');
    }
}
