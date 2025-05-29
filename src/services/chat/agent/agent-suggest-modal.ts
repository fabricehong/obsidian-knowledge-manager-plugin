import { App, SuggestModal } from "obsidian";

export class AgentSuggestModal extends SuggestModal<string> {
  constructor(app: App, private agents: string[], private onChoose: (agent: string) => void) {
    super(app);
  }

  getSuggestions(query: string): string[] {
    return this.agents.filter(agent =>
      agent.toLowerCase().includes(query.toLowerCase())
    );
  }

  renderSuggestion(agent: string, el: HTMLElement) {
    el.createEl("div", { text: agent });
  }

  onChooseSuggestion(agent: string, evt: MouseEvent | KeyboardEvent) {
    this.onChoose(agent);
  }
}
