import { App, Modal, Setting } from 'obsidian';
import { ChunkTransformService } from './indexing/ChunkTransformService';

export class SelectChunkTransformTechniqueModal extends Modal {
  private techniques: ChunkTransformService[];
  private onSelect: (technique: ChunkTransformService) => void;
  private selectedId: string;

  constructor(app: App, techniques: ChunkTransformService[], onSelect: (technique: ChunkTransformService) => void) {
    super(app);
    this.techniques = techniques;
    this.onSelect = onSelect;
    this.selectedId = techniques[0]?.technique ?? '';
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl('h3', { text: 'Choisissez une technique de transformation' });

    new Setting(contentEl)
      .setName('Technique')
      .addDropdown(drop => {
        this.techniques.forEach(t => {
          drop.addOption(t.technique, t.technique);
        });
        drop.setValue(this.selectedId);
        drop.onChange((value) => {
          this.selectedId = value;
        });
      });

    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });
    const confirmBtn = buttonContainer.createEl('button', { text: 'Valider', cls: 'mod-cta' });
    confirmBtn.onclick = () => {
      const selected = this.techniques.find(t => t.technique === this.selectedId);
      if (selected) {
        this.onSelect(selected);
        this.close();
      }
    };
  }

  onClose() {
    this.contentEl.empty();
  }
}
