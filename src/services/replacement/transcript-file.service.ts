import { Intervention } from "../../models/interfaces";
import { SPEAKER_DELIMITER } from "../../constants/delimiters";

export class TranscriptFileService {
    parseTranscript(content: string): Intervention[] {
        const lines = content.split('\n');
        const interventions: Intervention[] = [];
        let currentSpeaker = '';
        let currentText = '';

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            if (line.endsWith(SPEAKER_DELIMITER)) {
                // If we have a previous speaker and text, save it
                if (currentSpeaker && currentText) {
                    interventions.push({
                        speaker: currentSpeaker,
                        text: currentText.trim()
                    });
                }
                // Start new speaker
                currentSpeaker = line.slice(0, -1).trim();
                currentText = '';
            } else {
                // Add to current text
                currentText += (currentText ? ' ' : '') + line;
            }
        }

        // Don't forget to add the last intervention
        if (currentSpeaker && currentText) {
            interventions.push({
                speaker: currentSpeaker,
                text: currentText.trim()
            });
        }

        return interventions;
    }

    getUniqueSpeakers(interventions: Intervention[]): string[] {
        return [...new Set(interventions.map(i => i.speaker))];
    }
}
