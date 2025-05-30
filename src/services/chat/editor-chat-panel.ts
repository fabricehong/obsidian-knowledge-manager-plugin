import { ItemView, WorkspaceLeaf, Setting, MarkdownRenderer } from 'obsidian';
import { ChatService, ChatResponse } from './chat.service';

export const VIEW_TYPE_CHAT = 'chat-view';

export class EditorChatPanel extends ItemView {
  private agentHeaderEl: HTMLElement | null = null;
  getIcon(): string {
    return 'message-square'; // Icône native Obsidian pour le chat
  }
  private chatService: ChatService;
  private historyEl: HTMLElement;
  private inputEl: HTMLInputElement;
  private sendBtn: HTMLButtonElement;
  private chatHistory: ChatResponse[] = [];

  constructor(leaf: WorkspaceLeaf, chatService: ChatService) {
    super(leaf);
    this.chatService = chatService;
    this.chatService.onAgentChange((agentId) => {
      this.updateAgentDisplay(agentId);
    });
  }

  getViewType(): string {
    return VIEW_TYPE_CHAT;
  }

  getDisplayText(): string {
    return 'Chat IA';
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    this.agentHeaderEl = contentEl.createEl('div', { cls: 'chat-agent-header' });
    this.updateAgentDisplay(this.chatService.getAgentId?.() ?? '');
    contentEl.createEl('h2', { text: 'Chat IA' });

    // Historique
    this.historyEl = contentEl.createDiv({ cls: 'chat-history' });
    this.renderHistory();

    // Saisie + bouton
    new Setting(contentEl)
      .addText((text) => {
        this.inputEl = text.inputEl;
        this.inputEl.placeholder = 'Votre message...';
        this.inputEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') this.handleSend();
        });
      })
      .addButton((btn) => {
        this.sendBtn = btn.buttonEl;
        btn.setButtonText('Envoyer')
          .setCta()
          .onClick(() => this.handleSend());
      });
  }

  async handleSend() {
    const message = this.inputEl.value.trim();
    if (!message) return;
    this.inputEl.value = '';
    this.chatHistory.push({ role: 'user', content: message });
    this.renderHistory();
    const response = await this.chatService.postMessage(message);
    this.chatHistory.push(response);
    await this.renderHistory();
    this.historyEl.scrollTop = this.historyEl.scrollHeight;
  }

  async renderHistory() {
    this.historyEl.empty();
    for (const msg of this.chatHistory) {
      const msgDiv = this.historyEl.createDiv({ cls: `chat-msg chat-msg-${msg.role}` });
      if (msg.role === 'user') {
        const prefix = msgDiv.createSpan({ text: 'Vous : ', cls: 'chat-prefix chat-prefix-user' });
        const userText = msgDiv.createSpan({ text: msg.content, cls: 'chat-user-content' });
      } else {
        const prefix = msgDiv.createSpan({ text: 'Assistant : ', cls: 'chat-prefix chat-prefix-assistant' });
        await MarkdownRenderer.renderMarkdown(
          msg.content,
          msgDiv,
          '',
          this
        );
      }
    }
  }

  updateAgentDisplay(agentId: string) {
    if (!this.agentHeaderEl) return;
    // Exemples d'icônes SVG : robot ou bulle de chat
    const agentIcon = `<svg viewBox="0 0 24 24" width="20" height="20" style="vertical-align:middle;"><circle cx="12" cy="12" r="10" fill="#b4c9ff"/><rect x="7" y="14" width="10" height="3" rx="1.5" fill="#5561c9"/><circle cx="9" cy="11" r="1.2" fill="#5561c9"/><circle cx="15" cy="11" r="1.2" fill="#5561c9"/></svg>`;
    // Pour une vraie UX, on pourrait récupérer le nom complet de l'agent via ChatService, ici on affiche juste l'ID
    this.agentHeaderEl.innerHTML = `
      <div class="chat-agent-badge">
        ${agentIcon}
        <span class="chat-agent-name">${agentId}</span>
      </div>
    `;
  }

  async onClose() {
    this.contentEl.empty();
  }
}
