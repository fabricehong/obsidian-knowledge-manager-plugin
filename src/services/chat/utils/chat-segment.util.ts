interface TextSegment {
  type: 'text';
  text: string;
}

interface ActionSegment {
  type: 'action';
  action: string;
  buttonLabel: string;
  params: Record<string, string>;
}

export type ChatMessageSegment = TextSegment | ActionSegment;

/**
 * Utilitaire pour parser une chaîne en segments ChatMessageSegment
 * (déplacé depuis EditorChatPanel pour réutilisation)
 */
export function parseChatSegments(content: string): ChatMessageSegment[] {
  const actionPattern = /action:\/\/(\w+)(?:\((?:"|')([^"']+)(?:"|')\))?(\?[^\s]+)?/g;
  const segments: ChatMessageSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = actionPattern.exec(content))) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', text: content.slice(lastIndex, match.index) });
    }
    const action = match[1];
    const buttonLabel = match[2] || 'Action';
    let params: Record<string, string> = {};
    if (match[3]) {
      const paramString = match[3].slice(1); // enlever le ?
      for (const pair of paramString.split('&')) {
        const [k, v] = pair.split('=');
        params[k] = v;
      }
    }
    segments.push({ type: 'action', action, buttonLabel, params });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    segments.push({ type: 'text', text: content.slice(lastIndex) });
  }
  return segments;
}

/**
 * Génère un string d'action à partir d'un ActionSegment
 * Exemple : action://add_to_scratchpad("Ajouter au scratchpad")?id=123
 */
export function generateActionString(segment: ActionSegment): string {
  const label = segment.buttonLabel.replace(/"/g, '\"');
  const params = Object.entries(segment.params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return `action://${segment.action}("${label}")${params ? `?${params}` : ''}`;
}
