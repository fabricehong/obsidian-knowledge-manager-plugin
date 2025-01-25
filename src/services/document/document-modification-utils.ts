import { HeaderNode, RootNode } from "../../models/interfaces";
import { YamlService } from "./yaml.service";

export class DocumentModificationService {

    constructor(private yamlService: YamlService<any>) {}

    modifyDocumentWithReplacementHeader(doc: RootNode, yamlContent: string, header: string): void {
        const codeBlock = this.yamlService.toYamlBlock(yamlContent);
        const newHeader = Object.assign(new HeaderNode(), {
            level: 1,
            heading: header,
            content: codeBlock,
        });
        doc.children.unshift(newHeader);
    }

    addGlossarySection(doc: RootNode, sectionStr: string) {
        const header = new HeaderNode();
        header.level = 1;
        header.heading = "Glossaire";
        header.content = sectionStr;
        
        doc.children.unshift(header);
        return true;
    }
}

