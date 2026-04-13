import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { Button } from '@/components/ui/button';

type TiptapPostEditorProps = {
  value?: string;
  onChange: (nextJson: string) => void;
  placeholder?: string;
  testId?: string;
};

function parseInitialJson(value?: string) {
  if (!value) {
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  }

  try {
    return JSON.parse(value);
  } catch {
    return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] };
  }
}

export function TiptapPostEditor({ value, onChange, placeholder, testId = 'campaign-post-editor' }: TiptapPostEditorProps) {
  const { t } = useTranslation();
  const [linkInputValue, setLinkInputValue] = useState('');
  const [isLinkEditorOpen, setIsLinkEditorOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
      }),
    ],
    content: parseInitialJson(value),
    editorProps: {
      attributes: {
        class: 'min-h-[180px] rounded-b-xl border border-border bg-background px-3 py-2 text-sm focus-visible:outline-hidden',
        'data-testid': `${testId}-content`,
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(JSON.stringify(currentEditor.getJSON()));
    },
  });

  useEffect(() => {
    if (!editor || value === undefined) {
      return;
    }

    const currentJson = JSON.stringify(editor.getJSON());
    if (currentJson !== value) {
      editor.commands.setContent(parseInitialJson(value));
    }
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  const characterCount = editor.state.doc.textContent.length;

  const openLinkEditor = () => {
    const previousUrl = editor.getAttributes('link').href;
    setLinkInputValue(previousUrl ?? '');
    setIsLinkEditorOpen(true);
  };

  const applyLink = () => {
    const trimmedUrl = linkInputValue.trim();
    if (!trimmedUrl) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      setIsLinkEditorOpen(false);
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: trimmedUrl }).run();
    setIsLinkEditorOpen(false);
  };

  const toolbarButtonClassName = 'h-8 rounded-lg px-2.5 text-xs transition-colors duration-200';

  return (
    <div className="space-y-2" data-testid={testId}>
      <div className="flex flex-wrap gap-1 rounded-t-xl border border-border bg-muted/35 p-1.5" data-testid={`${testId}-toolbar`}>
        <Button
          type="button"
          variant={editor.isActive('bold') ? 'default' : 'ghost'}
          size="sm"
          className={toolbarButtonClassName}
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          aria-label={t('campaigns.posts.editor.bold')}
          data-testid={`${testId}-bold`}
        >
          {t('campaigns.posts.editor.bold')}
        </Button>
        <Button
          type="button"
          variant={editor.isActive('italic') ? 'default' : 'ghost'}
          size="sm"
          className={toolbarButtonClassName}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          aria-label={t('campaigns.posts.editor.italic')}
          data-testid={`${testId}-italic`}
        >
          {t('campaigns.posts.editor.italic')}
        </Button>
        <Button
          type="button"
          variant={editor.isActive('underline') ? 'default' : 'ghost'}
          size="sm"
          className={toolbarButtonClassName}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          disabled={!editor.can().chain().focus().toggleUnderline().run()}
          aria-label={t('campaigns.posts.editor.underline')}
          data-testid={`${testId}-underline`}
        >
          {t('campaigns.posts.editor.underline')}
        </Button>
        <Button
          type="button"
          variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
          size="sm"
          className={toolbarButtonClassName}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={!editor.can().chain().focus().toggleHeading({ level: 2 }).run()}
          aria-label={t('campaigns.posts.editor.heading')}
          data-testid={`${testId}-heading`}
        >
          {t('campaigns.posts.editor.heading')}
        </Button>
        <Button
          type="button"
          variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
          size="sm"
          className={toolbarButtonClassName}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          disabled={!editor.can().chain().focus().toggleBulletList().run()}
          aria-label={t('campaigns.posts.editor.bulletList')}
          data-testid={`${testId}-bullet-list`}
        >
          {t('campaigns.posts.editor.bulletList')}
        </Button>
        <Button
          type="button"
          variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
          size="sm"
          className={toolbarButtonClassName}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          disabled={!editor.can().chain().focus().toggleOrderedList().run()}
          aria-label={t('campaigns.posts.editor.orderedList')}
          data-testid={`${testId}-ordered-list`}
        >
          {t('campaigns.posts.editor.orderedList')}
        </Button>
        <Button
          type="button"
          variant={editor.isActive('codeBlock') ? 'default' : 'ghost'}
          size="sm"
          className={toolbarButtonClassName}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          disabled={!editor.can().chain().focus().toggleCodeBlock().run()}
          aria-label={t('campaigns.posts.editor.codeBlock')}
          data-testid={`${testId}-code-block`}
        >
          {t('campaigns.posts.editor.codeBlock')}
        </Button>
        <Button
          type="button"
          variant={editor.isActive('link') ? 'default' : 'ghost'}
          size="sm"
          className={toolbarButtonClassName}
          onClick={openLinkEditor}
          aria-label={t('campaigns.posts.editor.link')}
          data-testid={`${testId}-link`}
        >
          {t('campaigns.posts.editor.link')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={toolbarButtonClassName}
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          aria-label={t('campaigns.posts.editor.clearFormatting')}
          data-testid={`${testId}-clear-formatting`}
        >
          {t('campaigns.posts.editor.clearFormatting')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={toolbarButtonClassName}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          aria-label={t('campaigns.posts.editor.undo')}
          data-testid={`${testId}-undo`}
        >
          {t('campaigns.posts.editor.undo')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={toolbarButtonClassName}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          aria-label={t('campaigns.posts.editor.redo')}
          data-testid={`${testId}-redo`}
        >
          {t('campaigns.posts.editor.redo')}
        </Button>
      </div>
      {isLinkEditorOpen ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background px-3 py-2" data-testid={`${testId}-link-editor`}>
          <input
            type="url"
            value={linkInputValue}
            onChange={(event) => setLinkInputValue(event.target.value)}
            placeholder={t('campaigns.posts.editor.linkPrompt', 'Вкажіть URL посилання')}
            className="h-9 min-w-[220px] flex-1 rounded-lg border border-border bg-background px-2.5 text-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            data-testid={`${testId}-link-url-input`}
          />
          <Button type="button" size="sm" onClick={applyLink} data-testid={`${testId}-link-apply`}>
            {t('common.save', 'Зберегти')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              editor.chain().focus().extendMarkRange('link').unsetLink().run();
              setIsLinkEditorOpen(false);
            }}
            data-testid={`${testId}-link-remove`}
          >
            {t('campaigns.posts.editor.removeLink')}
          </Button>
        </div>
      ) : null}
      {placeholder ? (
        <p className="text-xs text-muted-foreground" data-testid={`${testId}-placeholder`}>
          {placeholder}
        </p>
      ) : null}
      <div className="flex items-center justify-between text-xs text-muted-foreground" data-testid={`${testId}-meta`}>
        <span>{t('campaigns.posts.editor.shortcutHint', 'Підказка: Ctrl/Cmd + B, I, U для форматування')}</span>
        <span data-testid={`${testId}-character-count`}>{t('campaigns.posts.editor.characterCount', { count: characterCount })}</span>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
