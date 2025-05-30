import { Client } from 'langsmith';
import { LangChainTracer } from 'langchain/callbacks';

export function getTracer(langsmithApiKey: string) {
  const client = new Client({ apiKey: langsmithApiKey });
  return new LangChainTracer({ projectName: 'Obsidian-Knowledge-Manager', client });
}
