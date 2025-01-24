import { ReplacementSpecs } from "../../../models/schemas";


export class ReplacementSpecsModificationWapper {
    private replacementSpecs: ReplacementSpecs[] = [];
    public async modifyReplacementSpecs(replacementSpecs: ReplacementSpecs[]): Promise<ReplacementSpecs[]> {
        return replacementSpecs;
    }
}