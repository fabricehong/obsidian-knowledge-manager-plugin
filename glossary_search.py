# -*- coding: utf-8 -*-
"""Glossary AI Search"""

import openai
from typing import TypeVar, Generic, Callable, Tuple, Dict, List
from pydantic import BaseModel

# Typing
T = TypeVar('T')

# Models
class Terme(BaseModel):
    terme: str
    definition: str
    is_new: bool

class Glossaire(BaseModel):
    termes: List[Terme]

# Functions
def get_structured_completion(messages, response_format: type[T]) -> Tuple[T, str]:
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4", messages=messages
        )
        structured = response_format.parse_obj(response['choices'][0]['message']['content'])
        raw = response['choices'][0]['message']['content']
        return structured, raw
    except ValidationError as e:
        print(f"Error parsing LLM response: {e}")
        return response_format()  # Empty response

def print_terms(glossary: Glossaire):
    print([f'{term.terme} ({term.is_new})' for term in glossary.termes])

def get_glossary_repr(glossary: Glossaire) -> str:
    return '\n'.join([f'{term.terme} : {term.definition}' for term in glossary.termes])

def dict_from_glossary(glossary: Glossaire) -> Dict[str, str]:
    return {term.terme: term.definition for term in glossary.termes}

def get_glossary_for_unknown_terms(content: str, max_try: int) -> Glossaire:
    glossary_system_prompt = """
    Tu es un assistant chargé de construire un glossaire à partir d'une transcription de meeting d'entreprise.
    Pour chaque terme interne à l'entreprise que tu trouves dans ce meeeting, détermine leur
    signification à partir de la transcription.
    Si la transcription ne te permets pas de déterminer leur signification du terme,
    alors mets simplement "-" comme définition.

    Si c'est ta première itération de construction de glossaire, is_new sera toujours true.
    """

    initial_glossary_prompt = f"""Voici la transcription:
{content}
""".strip()

    messages = [
        {"role": "system", "content": glossary_system_prompt},
        {"role": "user", "content": initial_glossary_prompt}
    ]

    glossary, raw = get_structured_completion(messages, Glossaire)
    final_glossary = glossary

    print('Iteration 0:')
    print_terms(glossary)

    for index in range(max_try):
        messages.append({"role": "assistant", "content": raw})
        messages.append({"role": "user", "content": 'fait un double check. liste uniquement les oublis ou les modifications.'})
        glossary, raw = get_structured_completion(messages, Glossaire)

        print(f'Iteration {index}:')
        print_terms(glossary)

        # Update terms in final_glossary
        updated_terms = {term.terme: term for term in glossary.termes}
        final_glossary_dict = {term.terme: term for term in final_glossary.termes}
        final_glossary_dict.update(updated_terms)
        final_glossary.termes = list(final_glossary_dict.values())

        # Check for new terms
        nb_new = len([term for term in glossary.termes if term.is_new])

        if nb_new == 0:
            print('No new terms found. Stopping.')
            return final_glossary

    print(f'Max number of try reached ({max_try})')
    return final_glossary

# Usage Example
if __name__ == "__main__":
    transcription = "Voici un exemple de transcription avec des termes à vérifier."  # Example transcription
    glossary = get_glossary_for_unknown_terms(transcription, 5)
    print("\nGlossary:")
    print(get_glossary_repr(glossary))
