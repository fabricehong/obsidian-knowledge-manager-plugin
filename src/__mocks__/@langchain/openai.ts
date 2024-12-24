export class ChatOpenAI {
    constructor(config: any) {}
    
    invoke(messages: any[]): Promise<string> {
        return Promise.resolve('mocked response');
    }
}
