import { DoubleMetaphoneAlgorithm } from './doubleMetaphone';

describe.skip('DoubleMetaphoneAlgorithm', () => {
    const algorithm = new DoubleMetaphoneAlgorithm();

    test('encodes words correctly', () => {
        // Test cases from the double-metaphone documentation
        expect(algorithm.encode('GestE')).toBe('KST');
        expect(algorithm.encode('Guest')).toBe('KST');
        expect(algorithm.encode('kieste')).toBe('KST');
        expect(algorithm.encode('lui')).toBe('L');
        expect(algorithm.encode('l')).toBe('L');
        expect(algorithm.encode('lu')).toBe('L');
        expect(algorithm.encode('lee')).toBe('L');
    });

    test('big text', () => {
        const text = `
Alors, pour les apps, en fait, je m'occupe de tout ce qui est cote marketing, donc experience client.  J'ai aussi les distributeurs automatiques dans mon scope et puis tout ce qui est fer tic, donc billetterie automatique.  Et moi, c'est assez recent.  En fait, ma prise de poste, elle date de fevrier.  Par contre, ca fait onze ans que je suis au TPG, donc j'ai fait plusieurs services chez marketing, vente et communication.  Et juste avant, en fait, j'etais a la tarification et je m'occupais de tout ce qui est projets nationaux, de l'Alliance Swisspass, tout ce qui est en lien avec la tarification nationale, en fait.`
        expect(algorithm.encode(text)).toBe('');
    });
});
