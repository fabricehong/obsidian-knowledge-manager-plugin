export class StringOutputParser {
    parse(input: string): Promise<string> {
        return Promise.resolve(input);
    }
}
