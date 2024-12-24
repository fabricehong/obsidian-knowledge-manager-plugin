import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
	openAIApiKey: string;
}

interface DiffuseResult {
    content: string;
    metadata: {
        timestamp: string;
        fileName: string;
    };
    parsed: {
        summary: string;
    };
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default',
	openAIApiKey: ''
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	private model: ChatOpenAI | undefined;
	private chain: RunnableSequence | undefined;

	async onload() {
		await this.loadSettings();
		
		// Initialize the LangChain components
		this.initializeLangChain();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// Add the diffuse command
		this.addCommand({
			id: 'diffuse-note',
			name: 'Diffuse current note',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						this.diffuseNote(markdownView);
					}
					return true;
				}
				return false;
			}
		});

		// Add the summarize command
		this.addCommand({
			id: 'summarize-note',
			name: 'Summarize current note',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					if (!checking) {
						this.summarizeNote(markdownView);
					}
					return true;
				}
				return false;
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	private initializeLangChain() {
		if (!this.settings.openAIApiKey) {
			this.model = undefined;
			this.chain = undefined;
			return;
		}

		this.model = new ChatOpenAI({
			openAIApiKey: this.settings.openAIApiKey,
			temperature: 0,
			modelName: "gpt-3.5-turbo",
		});

		const summarizePrompt = PromptTemplate.fromTemplate(
			`Summarize the following text in a concise way:
			
			{text}
			
			Summary:`
		);

		this.chain = RunnableSequence.from([
			summarizePrompt,
			this.model,
			new StringOutputParser(),
		]);
	}

	async diffuseNote(markdownView: MarkdownView) {
		if (!this.settings.openAIApiKey) {
			new Notice('Please set your OpenAI API key in the plugin settings');
			return;
		}

		const editor = markdownView.editor;
		const content = editor.getValue();
		const fileName = markdownView.file?.basename || 'untitled';
		
		try {
			new Notice('Diffusing note...');
			
			// Create the diffusion result
			const result: DiffuseResult = {
				content: content,
				metadata: {
					timestamp: new Date().toISOString(),
					fileName: fileName
				}
			};
			
			console.log('Diffuse result:', result);
			new Notice('Note has been diffused! Check the console for details.');
			return result;
		} catch (error) {
			console.error('Error during diffusion:', error);
			new Notice('Error during diffusion. Check the console for details.');
		}
	}

	async summarizeNote(markdownView: MarkdownView) {
		if (!this.settings.openAIApiKey) {
			new Notice('Please set your OpenAI API key in the plugin settings');
			return;
		}

		if (!this.chain) {
			new Notice('LangChain not properly initialized. Please check your API key.');
			return;
		}

		const editor = markdownView.editor;
		const content = editor.getValue();
		
		try {
			new Notice('Summarizing note...');
			const summary = await this.chain.invoke({
				text: content
			});
			
			console.log('Summary result:', summary);
			new Notice('Note has been summarized! Check the console for details.');
			return summary;
		} catch (error) {
			console.error('Error during summarization:', error);
			new Notice('Error during summarization. Check the console for details.');
		}
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('OpenAI API Key')
			.setDesc('Enter your OpenAI API key')
			.addText(text => text
				.setPlaceholder('Enter your key')
				.setValue(this.plugin.settings.openAIApiKey)
				.onChange(async (value) => {
					this.plugin.settings.openAIApiKey = value;
					await this.plugin.saveSettings();
					(this.plugin as any).initializeLangChain();
				}));

		new Setting(containerEl)
			.setName('Setting')
			.setDesc('Description')
			.addText(text => text
				.setPlaceholder('Enter your setting')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
