export class RunnableSequence {
    static from(steps: any[]): any {
        return {
            invoke: async (input: any) => 'mocked result'
        };
    }
}
