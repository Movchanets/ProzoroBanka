import type { ReactNode } from 'react';

type TiptapMark = {
  type?: string;
  attrs?: {
    href?: string;
  };
};

type TiptapNode = {
  type?: string;
  text?: string;
  marks?: TiptapMark[];
  attrs?: {
    level?: number;
  };
  content?: TiptapNode[];
};

interface TiptapContentViewProps {
  contentJson?: string;
  fallbackText: string;
  testId: string;
}

function parseTiptapJson(contentJson?: string): TiptapNode | null {
  if (!contentJson) {
    return null;
  }

  try {
    return JSON.parse(contentJson) as TiptapNode;
  } catch {
    return null;
  }
}

function applyMarks(text: ReactNode, marks?: TiptapMark[]): ReactNode {
  if (!marks || marks.length === 0) {
    return text;
  }

  return marks.reduceRight<ReactNode>((acc, mark, index) => {
    const key = `mark-${index}`;

    switch (mark.type) {
      case 'bold':
        return <strong key={key}>{acc}</strong>;
      case 'italic':
        return <em key={key}>{acc}</em>;
      case 'underline':
        return <span key={key} className="underline">{acc}</span>;
      case 'strike':
        return <span key={key} className="line-through">{acc}</span>;
      case 'code':
        return <code key={key} className="rounded bg-muted/40 px-1 py-0.5 text-[0.85em]">{acc}</code>;
      case 'link':
        return (
          <a
            key={key}
            href={mark.attrs?.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            {acc}
          </a>
        );
      default:
        return acc;
    }
  }, text);
}

function renderNode(node: TiptapNode, key: string): ReactNode {
  const children = node.content?.map((child, index) => renderNode(child, `${key}-${index}`)) ?? [];

  switch (node.type) {
    case 'doc':
      return <>{children}</>;
    case 'paragraph':
      return <p key={key} className="leading-6 text-sm text-foreground">{children.length > 0 ? children : <br />}</p>;
    case 'heading': {
      const level = Math.min(Math.max(node.attrs?.level ?? 2, 1), 6);
      if (level <= 2) {
        return <h3 key={key} className="text-base font-semibold text-foreground">{children}</h3>;
      }

      return <h4 key={key} className="text-sm font-semibold text-foreground">{children}</h4>;
    }
    case 'bulletList':
      return <ul key={key} className="list-disc space-y-1 pl-5 text-sm text-foreground">{children}</ul>;
    case 'orderedList':
      return <ol key={key} className="list-decimal space-y-1 pl-5 text-sm text-foreground">{children}</ol>;
    case 'listItem':
      return <li key={key}>{children}</li>;
    case 'hardBreak':
      return <br key={key} />;
    case 'text':
      return <span key={key}>{applyMarks(node.text ?? '', node.marks)}</span>;
    default:
      return <span key={key}>{children}</span>;
  }
}

export function TiptapContentView({ contentJson, fallbackText, testId }: TiptapContentViewProps) {
  const parsed = parseTiptapJson(contentJson);

  if (!parsed) {
    return <p className="text-sm leading-6 text-foreground" data-testid={testId}>{fallbackText}</p>;
  }

  return (
    <div className="space-y-2" data-testid={testId}>
      {renderNode(parsed, 'root')}
    </div>
  );
}
