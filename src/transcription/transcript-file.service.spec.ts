import { TranscriptFileService } from "./transcript-file.service";

describe('TranscriptFileService', () => {
    let service: TranscriptFileService;

    beforeEach(() => {
        service = new TranscriptFileService();
    });

    describe('parseTranscript', () => {
        it('should parse a simple transcript with one speaker', () => {
            const content = 'Speaker 1:\nHello world';
            const expected = [{
                speaker: 'Speaker 1',
                text: 'Hello world'
            }];
            expect(service.parseTranscript(content)).toEqual(expected);
        });

        it('should parse a transcript with multiple speakers', () => {
            const content = 'Speaker 1:\nHello\nSpeaker 2:\nHi there\nSpeaker 1:\nHow are you?';
            const expected = [
                {
                    speaker: 'Speaker 1',
                    text: 'Hello'
                },
                {
                    speaker: 'Speaker 2',
                    text: 'Hi there'
                },
                {
                    speaker: 'Speaker 1',
                    text: 'How are you?'
                }
            ];
            expect(service.parseTranscript(content)).toEqual(expected);
        });

        it('should handle multi-line interventions', () => {
            const content = 'Speaker 1:\nThis is a long\nmulti-line intervention\nwith three lines';
            const expected = [{
                speaker: 'Speaker 1',
                text: 'This is a long multi-line intervention with three lines'
            }];
            expect(service.parseTranscript(content)).toEqual(expected);
        });

        it('should handle empty lines between interventions', () => {
            const content = 'Speaker 1:\nHello\n\nSpeaker 2:\nHi there\n\nSpeaker 1:\nBye';
            const expected = [
                {
                    speaker: 'Speaker 1',
                    text: 'Hello'
                },
                {
                    speaker: 'Speaker 2',
                    text: 'Hi there'
                },
                {
                    speaker: 'Speaker 1',
                    text: 'Bye'
                }
            ];
            expect(service.parseTranscript(content)).toEqual(expected);
        });

        it('should handle speakers with special characters', () => {
            const content = 'Dr. Smith (MD):\nHello\nMr. O\'Brien:\nHi there';
            const expected = [
                {
                    speaker: 'Dr. Smith (MD)',
                    text: 'Hello'
                },
                {
                    speaker: 'Mr. O\'Brien',
                    text: 'Hi there'
                }
            ];
            expect(service.parseTranscript(content)).toEqual(expected);
        });

        it('should handle empty content', () => {
            expect(service.parseTranscript('')).toEqual([]);
        });

        it('should handle content with only whitespace', () => {
            expect(service.parseTranscript('   \n  \n  ')).toEqual([]);
        });

        it('should handle content without any valid interventions', () => {
            const content = 'Just some text\nwithout any speakers';
            expect(service.parseTranscript(content)).toEqual([]);
        });

        it('should trim whitespace from speaker names and text', () => {
            const content = '  Speaker 1:  \n  Hello world  \n  Speaker 2:   \n   Hi there   ';
            const expected = [
                {
                    speaker: 'Speaker 1',
                    text: 'Hello world'
                },
                {
                    speaker: 'Speaker 2',
                    text: 'Hi there'
                }
            ];
            expect(service.parseTranscript(content)).toEqual(expected);
        });
    });
});
