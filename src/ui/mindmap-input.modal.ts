import { App, Modal, TextAreaComponent } from 'obsidian';

export class MindmapInputModal extends Modal {
    private mindmap: string;
    private onSubmit: (mindmap: string) => void;

    constructor(app: App, onSubmit: (mindmap: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Add title
        contentEl.createEl('h2', { text: 'Enter Mindmap' });

        // Create description
        contentEl.createEl('p', { 
            text: 'Please enter your mindmap in an indented format (using tabs).',
            cls: 'mindmap-description' 
        });

        // Create textarea for mindmap input
        const textAreaComponent = new TextAreaComponent(contentEl)
            .setPlaceholder('Enter your mindmap here...')
            .onChange((value) => {
                this.mindmap = value;
            });
        
        // Set some styling for the textarea
        textAreaComponent.inputEl.addClass('mindmap-textarea');
        textAreaComponent.inputEl.rows = 10;
        textAreaComponent.inputEl.cols = 50;

        // Create submit button
        const submitButton = contentEl.createEl('button', {
            text: 'Create Documentation',
            cls: 'mod-cta'
        });
        
        submitButton.addEventListener('click', () => {
            if (this.mindmap?.trim()) {
                this.onSubmit(this.mindmap);
                this.close();
            }
        });

        // Add some basic styling
        this.addStyles();
    }

    private addStyles() {
        const { contentEl } = this;
        
        contentEl.createEl('style', {
            text: `
                .mindmap-description {
                    margin-bottom: 15px;
                }
                .mindmap-textarea {
                    width: 100%;
                    min-height: 200px;
                    margin-bottom: 15px;
                    font-family: monospace;
                }
            `
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
