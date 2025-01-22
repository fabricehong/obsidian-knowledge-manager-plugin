export interface Term {
    terme: string;
    definition: string;
    is_new: boolean;
}

export interface Glossary {
    termes: Term[];
}
