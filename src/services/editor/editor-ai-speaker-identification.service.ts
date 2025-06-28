import { Editor, Notice, MarkdownView } from 'obsidian';
import { PluginSettings } from '../../settings/settings';
import { EditorDocumentService } from '../document/editor-document.service';
import { YamlService } from '../document/yaml.service';
import { SpeakerIdentificationService, FullSpeakerIdentificationOutput } from '../ai/speaker-identification.service';
import { ReplacementSpecs, ReplacementSpec } from '../../models/schemas';

export class EditorAISpeakerIdentificationService {

    constructor(
        private settings: PluginSettings,
        private speakerIdentificationService: SpeakerIdentificationService,
        private editorDocumentService: EditorDocumentService,
        private yamlService: YamlService<ReplacementSpecs>,
        private transcriptFileService: any, // Type as appropriate
    ) {}

    async identifyAndWriteSpeakers(editor: Editor, view: MarkdownView): Promise<void> {
        try {
            new Notice('Starting AI Speaker Identification...');

            const doc = await this.editorDocumentService.getDocument(view);
            const transcriptContent = await this.editorDocumentService.getHeaderContent(doc.root, this.settings.headerContainingTranscript);

            if (!transcriptContent || !transcriptContent.trim()) {
                new Notice('Transcript section is empty or not found. Cannot identify speakers.');
                return;
            }

            const interventions = this.transcriptFileService.parseTranscript(transcriptContent);
            const uniqueSpeakerLabels = this.transcriptFileService.getUniqueSpeakers(interventions);
            if (uniqueSpeakerLabels.length === 0) {
                new Notice('No speaker labels (e.g., "Speaker A:") found in the transcript.');
                return;
            }
            
            new Notice('Identifying speakers using AI... This may take a moment.');
            const fullOutput: FullSpeakerIdentificationOutput = await this.speakerIdentificationService.identifySpeakers(
                transcriptContent,
                uniqueSpeakerLabels
            );

            // --- Part 1: Create Main Output (ReplacementSpecs YAML) ---
            const mainOutputSpecsArray: ReplacementSpec[] = [];
            
            // Resolve speakers programmatically using exclusions and hypotheses
            const resolvedSpeakers = this.resolveSpeakersFromHypotheses(
                uniqueSpeakerLabels, 
                fullOutput.exclusions, 
                fullOutput.hypotheses
            );

            for (const speakerLabel of uniqueSpeakerLabels) {
                const resolvedName = resolvedSpeakers[speakerLabel] || speakerLabel;
                
                // Create replacement spec: replace "Speaker A" with "Paul" (without colons)
                mainOutputSpecsArray.push({
                    target: resolvedName,               // What we want to replace with (e.g., "Paul")
                    toSearch: [speakerLabel]           // What we want to find and replace (e.g., "Speaker A")
                });
            }

            const finalMainOutputSpecs: ReplacementSpecs = {
                category: "Speakers", // This matches the category from createReplacementSpecsFromSpeakers
                replacements: mainOutputSpecsArray
            };

            const mainYamlContent = this.yamlService.toYaml(finalMainOutputSpecs);
            const mainOutputBlock = this.yamlService.toYamlBlock(mainYamlContent);

            // --- Part 2: Create Debug Output (Markdown with JSON) ---
            const debugHeaderTitle = "Speaker Identification Debug";
            const exclusionsJson = JSON.stringify(fullOutput.exclusions, null, 2);
            const hypothesesJson = JSON.stringify(fullOutput.hypotheses, null, 2);

            const debugMarkdownContent = `\n### Exclusions\n\n\`\`\`json\n${exclusionsJson}\n\`\`\`\n\n### Hypotheses\n\n\`\`\`json\n${hypothesesJson}\n\`\`\`\n`;

            // --- Part 3: Update Document ---
            // (already declared above, reuse 'doc')

            // Add/replace main output section (using replacementsHeader from settings)
            // Add/replace main output section
            const mainHeaderTitle = this.settings.replacementsHeader;
            const mainExistingNodeIndex = doc.root.children.findIndex(node => node.heading === mainHeaderTitle);
            if (mainExistingNodeIndex !== -1) {
                doc.root.children.splice(mainExistingNodeIndex, 1);
            }
            this.editorDocumentService.addHeaderToDocument(doc.root, mainHeaderTitle, mainOutputBlock);

            // Add/replace debug data section
            // Add/replace debug data section
            // const debugHeaderTitle = "Speaker Identification Debug"; // Already defined
            const debugExistingNodeIndex = doc.root.children.findIndex(node => node.heading === debugHeaderTitle);
            if (debugExistingNodeIndex !== -1) {
                doc.root.children.splice(debugExistingNodeIndex, 1);
            }
            this.editorDocumentService.addHeaderToDocument(doc.root, debugHeaderTitle, debugMarkdownContent);
            
            await this.editorDocumentService.writeDocument(doc);

            new Notice('AI Speaker Identification complete. Results added to the document.');

        } catch (error) {
            console.error("Error during AI speaker identification and writing:", error);
            new Notice(`Error identifying speakers: ${error.message || 'An unknown error occurred'}. Check console for details.`);
        }
    }

    /**
     * Resolve speakers programmatically based on exclusions and hypotheses
     * Phase 3: Apply logic to determine final speaker names
     */
    private resolveSpeakersFromHypotheses(
        allSpeakerLabels: string[],
        exclusions: { [speaker: string]: string[] },
        hypotheses: { [speaker: string]: Array<{ nom: string; raison: string; score: number }> }
    ): { [speaker: string]: string } {
        const resolved: { [speaker: string]: string } = {};

        for (const speakerLabel of allSpeakerLabels) {
            // Get hypotheses for this speaker
            const speakerHypotheses = hypotheses[speakerLabel] || [];
            
            // Get exclusions for this speaker  
            const speakerExclusions = exclusions[speakerLabel] || [];
            
            // Filter hypotheses by removing excluded names
            const validHypotheses = speakerHypotheses.filter(
                hypothesis => !speakerExclusions.includes(hypothesis.nom)
            );
            
            // Sort valid hypotheses by score descending (highest probability first)
            const sortedValidHypotheses = validHypotheses.sort((a, b) => b.score - a.score);
            
            // Debug logging to understand what's happening
            console.log(`${speakerLabel}:`, {
                hypotheses: speakerHypotheses.map(h => `${h.nom}(${h.score})`),
                exclusions: speakerExclusions,
                validAfterFilter: sortedValidHypotheses.map(h => `${h.nom}(${h.score})`)
            });
            
            if (sortedValidHypotheses.length === 1) {
                // Exactly one valid hypothesis -> use it
                resolved[speakerLabel] = sortedValidHypotheses[0].nom;
            } else if (sortedValidHypotheses.length > 1) {
                // Multiple hypotheses -> take the one with highest score
                resolved[speakerLabel] = sortedValidHypotheses[0].nom;
                console.log(`${speakerLabel}: Selected highest score hypothesis: ${sortedValidHypotheses[0].nom} (score: ${sortedValidHypotheses[0].score})`);
            } else if (speakerHypotheses.length > 0) {
                // If all hypotheses were filtered out by exclusions -> cannot resolve
                // Exclusions have absolute priority over hypotheses
                console.warn(`${speakerLabel}: All hypotheses excluded. Cannot resolve (fallback to original label).`);
            }
            // If 0 valid hypotheses (either filtered or none originally) -> don't add to resolved (will fallback to original label)
        }

        return resolved;
    }
}