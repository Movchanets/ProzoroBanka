type TiptapNode = {
  type?: string;
  text?: string;
  content?: TiptapNode[];
};

function collectText(node: TiptapNode, chunks: string[]) {
  if (node.text) {
    chunks.push(node.text);
  }

  if (node.content) {
    node.content.forEach((child) => collectText(child, chunks));
    if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'codeBlock') {
      chunks.push('\n');
    }
  }
}

export function extractTextFromTiptapJson(contentJson?: string, fallback = ''): string {
  if (!contentJson) {
    return fallback;
  }

  try {
    const root = JSON.parse(contentJson) as TiptapNode;
    const chunks: string[] = [];
    collectText(root, chunks);
    const result = chunks.join('').replace(/\n{2,}/g, '\n').trim();
    return result || fallback;
  } catch {
    return contentJson;
  }
}
