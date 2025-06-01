import { ItemView, WorkspaceLeaf, Setting, MarkdownRenderer, Notice } from 'obsidian';
import { ChatService, ChatResponse } from './chat.service';
import { parseChatSegments } from './utils/chat-segment.util';
import { ObjectReferenceService } from './utils/object-reference.service';

// Type pour la spécification d'un bouton d'action
export type ActionButtonSpec = {
  action: string;
  buttonLabel: string;
  params: Record<string, string>;
  placeholder: string;
};

export const VIEW_TYPE_CHAT = 'chat-view';

import KnowledgeManagerPlugin from '../../main';

import type { PanelChatMessage } from './chat.service';

export class EditorChatPanel extends ItemView {
  private llmMessageHistory: PanelChatMessage[] = [];

  private agentHeaderEl: HTMLElement | null = null;
  getIcon(): string {
    return 'message-square'; // Icône native Obsidian pour le chat
  }
  private chatService: ChatService;
  private plugin: KnowledgeManagerPlugin;
  private historyEl: HTMLElement;
  private inputEl: HTMLInputElement;
  private sendBtn: HTMLButtonElement;
  private chatHistory: ChatResponse[] = [];

  constructor(leaf: WorkspaceLeaf, chatService: ChatService, plugin: KnowledgeManagerPlugin) {
    super(leaf);
    this.chatService = chatService;
    this.plugin = plugin;
    this.plugin.activeChatPanels.add(this);
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

  /**
   * Affiche un message système en italique dans le chat (non ajouté à l'historique)
   */
  private displaySystemMessage(message: string) {
    if (!this.historyEl) return;
    const sysMsg = document.createElement('div');
    sysMsg.className = 'chat-system-message';
    sysMsg.style.fontStyle = 'italic';
    sysMsg.style.opacity = '0.7';
    sysMsg.style.margin = '6px 0';
    sysMsg.textContent = message;
    this.historyEl.appendChild(sysMsg);
    this.historyEl.scrollTop = this.historyEl.scrollHeight;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    this.agentHeaderEl = contentEl.createEl('div', { cls: 'chat-agent-header', attr: { style: 'display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 2; background: var(--background-primary); border-bottom: 1px solid var(--background-modifier-border); padding: 6px 12px; box-sizing: border-box;' } });
    this.renderAgentHeader();
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
        btn.setButtonText('')
          .setCta()
          .onClick(() => this.handleSend());
        // Icône SVG d’envoi (taille 16, style partagé)
        btn.buttonEl.innerHTML = this.getIconSvg('send');
        btn.buttonEl.title = 'Envoyer';
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

  // Registre d'actions dynamiques (POC)
  private actionRegistry: Record<string, (params: any) => void> = {
    add_to_scratchpad: ({ id }) => {
      const result = ObjectReferenceService.getInstance().getObject(id);
      if (!result) {
        new Notice('Résultat introuvable');
        return;
      }
      // Cherche le premier leaf markdown ouvert
      const leaves = this.app.workspace.getLeavesOfType('markdown');
      const markdownLeaf = leaves.find(leaf => leaf.view && typeof (leaf.view as any).editor !== 'undefined');
      if (markdownLeaf) {
        this.app.workspace.setActiveLeaf(markdownLeaf, { focus: true });
        const editor = (markdownLeaf.view as any).editor;
        editor.replaceSelection(result);
        new Notice('Ajouté au scratchpad');
      } else {
        new Notice('Aucun éditeur markdown trouvé');
      }
    }
  };


  /**
   * Affiche un bouton d'action natif Obsidian avec le label et la callback dynamique
   */
  private renderActionButton(parent: HTMLElement, action: string, buttonLabel: string, params: Record<string, string>) {
    new Setting(parent)
      .addButton((btn) => {
        btn.setButtonText(buttonLabel)
          .setCta()
          .onClick(() => {
            const fn = this.actionRegistry[action];
            if (fn) fn(params);
            else new Notice(`Action inconnue: ${action}`);
          });
      });
  }

  // Type pour la spécification d'un bouton d'action


  async renderHistory() {
    this.historyEl.empty();
    for (const msg of this.chatHistory) {
      const msgDiv = this.historyEl.createDiv({ cls: `chat-msg chat-msg-${msg.role}` });
      if (msg.role === 'user') {
        msgDiv.createSpan({ text: 'Vous : ', cls: 'chat-prefix chat-prefix-user' });
        msgDiv.createSpan({ text: msg.content, cls: 'chat-user-content' });
      } else {
        msgDiv.createSpan({ text: 'Assistant : ', cls: 'chat-prefix chat-prefix-assistant' });
        // 1. Découper le message en segments texte/actions et générer le markdown avec placeholders
        const segments = parseChatSegments(msg.content);
        let markdown = '';
        const actions: ActionButtonSpec[] = [];
        let actionIdx = 0;
        for (const segment of segments) {
          if (segment.type === 'text') {
            markdown += segment.text;
          } else if (segment.type === 'action') {
            const placeholder = `{{ACTION_BTN_${actionIdx}}}`;
            markdown += placeholder;
            actions.push({ action: segment.action, buttonLabel: segment.buttonLabel, params: segment.params, placeholder: placeholder });
            actionIdx++;
          }
        }
        // 2. Rendre le markdown dans un conteneur temporaire
        const temp = document.createElement('span');
        await MarkdownRenderer.renderMarkdown(markdown, temp, '', this);
        // 3. Remplacer chaque placeholder par un bouton inline natif
        this.replaceActionPlaceholdersInline(temp, actions);
        // 4. Ajouter le contenu final au msgDiv
        msgDiv.appendChild(temp);
      }
    }
  }

  /**
   * Remplace les placeholders {{ACTION_BTN_n}} dans le DOM par de vrais boutons inline natifs
   */
  private replaceActionPlaceholdersInline(container: HTMLElement, actions: ActionButtonSpec[]) {
    actions.forEach((action, idx) => {
      const placeholder = `{{ACTION_BTN_${idx}}}`;
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if (node.nodeValue?.includes(placeholder)) {
          // Séparer le texte autour du placeholder
          const [before, after] = node.nodeValue.split(placeholder);
          const frag = document.createDocumentFragment();
          if (before) frag.appendChild(document.createTextNode(before));
          frag.appendChild(this.createInlineActionButton(action.action, action.buttonLabel, action.params));
          if (after) frag.appendChild(document.createTextNode(after));
          node.parentNode?.replaceChild(frag, node);
          break;
        }
      }
    });
  }

  /**
   * Crée un bouton natif Obsidian inline (pas de div, pas de Setting)
   */
  private createInlineActionButton(action: string, buttonLabel: string, params: Record<string, string>) {
    const btn = document.createElement('button');
    btn.textContent = buttonLabel;
    btn.className = 'mod-cta';
    btn.style.display = 'inline-block';
    btn.style.margin = '0 0.2em';
    btn.onclick = () => {
      const fn = this.actionRegistry[action];
      if (fn) fn(params);
      else new Notice(`Action inconnue: ${action}`);
    };
    return btn;
  }

  private getCurrentModelName(): string {
    try {
      const plugin = this.chatService['plugin'];
      const settings = plugin?.settings;
      const configId = settings?.selectedLlmConfiguration;
      const config = settings?.llmConfigurations?.find((c: any) => c.id === configId);
      return config?.model || '';
    } catch (e) { return ''; }
  }

  private renderAgentHeader() {
    if (!this.agentHeaderEl) return;
    this.agentHeaderEl.empty();
    // Container flex
    const container = this.agentHeaderEl.createDiv({
      attr: {
        style: 'display: flex; align-items: center; justify-content: space-between; width: 100%;'
      }
    });
    // Badge agent à gauche
    const modelName = this.getCurrentModelName();
    const agentBadge = container.createDiv({ cls: 'chat-agent-badge', attr: { style: 'display: flex; flex-direction: column; align-items: flex-start; cursor: pointer;' } });
    agentBadge.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: flex-start;">
        <div style="display: flex; align-items: center;">
          <svg viewBox="0 0 24 24" width="20" height="20" style="vertical-align:middle;"><circle cx="12" cy="12" r="10" fill="#b4c9ff"/><rect x="7" y="14" width="10" height="3" rx="1.5" fill="#5561c9"/><circle cx="9" cy="11" r="1.2" fill="#5561c9"/><circle cx="15" cy="11" r="1.2" fill="#5561c9"/></svg>
          <span class="chat-agent-name" style="margin-left: 6px;">${this.chatService.getAgentId?.() ?? ''}</span>
        </div>
        <span class="chat-model-name" style="margin-left: 26px; color: var(--text-muted); font-size: 0.9em;">${modelName ? `model: ${modelName}` : ''}</span>
      </div>
    `;
    agentBadge.title = 'Changer d’agent';
    agentBadge.addEventListener('click', async (e) => {
      e.stopPropagation();
      const agents = this.chatService.getAvailableAgents();
      const app = this.chatService.getApp();
      const { AgentSuggestModal } = await import('./agent/agent-suggest-modal');
      new AgentSuggestModal(app, agents, (selectedAgent: string) => {
        this.chatService.setAgent(selectedAgent);
        this.displaySystemMessage(`Agent sélectionné : ${selectedAgent}`);
        this.updateAgentDisplay(selectedAgent);
      }).open();
    });
    // Corbeille à droite
    const trashBtn = container.createEl('button', { cls: 'chat-header-trash-btn', attr: { style: 'width:24px;height:24px;display:flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;padding:0;margin-left:auto;border-radius:6px;' } });
    trashBtn.innerHTML = this.getIconSvg('trash');
    trashBtn.title = 'Réinitialiser la conversation';
    trashBtn.onclick = () => {
      this.chatService.clearMessageHistory();
      import('./utils/object-reference.service').then(mod => {
        mod.ObjectReferenceService.getInstance().clearAll();
        this.chatHistory = [];
        this.renderHistory();
        new Notice('Conversation réinitialisée');
      });
    };
  }

  public updateAgentDisplay(agentId: string) {
    if (!this.agentHeaderEl) return;
    this.renderAgentHeader();
  }

  public async updateChatService(newChatService: ChatService) {
    // 1. Sauvegarde l’historique courant du service sortant (await car async)
    if (this.chatService.getMessageHistory) {
      this.llmMessageHistory = await this.chatService.getMessageHistory();
    }
    // 2. Réinjecte dans le nouveau service
    await newChatService.setMessageHistory?.(this.llmMessageHistory);
    // 3. Change la référence
    this.chatService = newChatService;
    this.updateAgentDisplay(this.chatService.getAgentId?.() ?? '');
  }

  async onClose() {
    this.contentEl.empty();
    if (this.plugin?.activeChatPanels) {
      this.plugin.activeChatPanels.delete(this);
    }
  }

  /**
   * Retourne le SVG string pour une icône ("send" ou "trash") avec style et taille homogènes
   */
  private getIconSvg(type: 'send' | 'trash'): string {
    if (type === 'send') {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
    } else {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c23c2b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
    }
  }
}
