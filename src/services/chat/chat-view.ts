import { ItemView, WorkspaceLeaf, Setting } from 'obsidian';
import { EditorChatService, ChatResponse } from './editor-chat.service';

export const VIEW_TYPE_CHAT = 'chat-view';

export class ChatView extends ItemView {
  getIcon(): string {
    return 'message-square'; // Icône native Obsidian pour le chat
  }
  private chatService: EditorChatService;
  private historyEl: HTMLElement;
  private inputEl: HTMLInputElement;
  private sendBtn: HTMLButtonElement;
  private chatHistory: ChatResponse[] = [];

  constructor(leaf: WorkspaceLeaf, chatService: EditorChatService) {
    super(leaf);
    this.chatService = chatService;
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
    this.renderHistory();
    this.historyEl.scrollTop = this.historyEl.scrollHeight;
  }

  renderHistory() {
    this.historyEl.empty();
    for (const msg of this.chatHistory) {
      const msgDiv = this.historyEl.createDiv({ cls: `chat-msg chat-msg-${msg.role}` });
      msgDiv.setText(`${msg.role === 'user' ? 'Vous' : 'Assistant'} : ${msg.content}`);
    }
  }

  async onClose() {
    this.contentEl.empty();
  }
}
