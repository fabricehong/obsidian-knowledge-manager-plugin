import { App, Modal, Setting } from 'obsidian';
import { EditorChatService, ChatResponse } from './editor-chat.service';

export class ChatModal extends Modal {
  private chatService: EditorChatService;
  private historyEl: HTMLElement;
  private inputEl: HTMLInputElement;
  private sendBtn: HTMLButtonElement;
  private chatHistory: ChatResponse[] = [];

  constructor(app: App, chatService: EditorChatService) {
    super(app);
    this.chatService = chatService;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h2', { text: 'Chat' });

    // Zone historique
    this.historyEl = contentEl.createDiv({ cls: 'chat-history' });
    this.renderHistory();

    // Champ de saisie et bouton
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

  private async handleSend() {
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

  private renderHistory() {
    this.historyEl.empty();
    for (const msg of this.chatHistory) {
      const msgDiv = this.historyEl.createDiv({ cls: `chat-msg chat-msg-${msg.role}` });
      msgDiv.setText(`${msg.role === 'user' ? 'Vous' : 'Assistant'} : ${msg.content}`);
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}
