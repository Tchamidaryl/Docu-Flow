"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import TextStyle from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { cn } from "@/lib/utils/cn";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote,
  Code, Link2, Image as ImageIcon, Table as TableIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Highlighter, CheckSquare, Minus, Undo2, Redo2,
  ChevronDown, Type,
} from "lucide-react";
import { useCallback, useState } from "react";

interface DocumentEditorProps {
  content?: string;
  contentJson?: any;
  onChange?: (html: string, json: any) => void;
  editable?: boolean;
  placeholder?: string;
}

export default function DocumentEditor({
  content = "",
  contentJson,
  onChange,
  editable = true,
  placeholder = "Start writing your document…",
}: DocumentEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: { HTMLAttributes: { class: "not-prose" } } }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline" } }),
      Image.configure({ HTMLAttributes: { class: "rounded-xl max-w-full" } }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      TextStyle,
      Color,
      Placeholder.configure({ placeholder }),
      CharacterCount.configure({ limit: 100000 }),
    ],
    content: contentJson ?? content,
    editable,
    editorProps: {
      attributes: { class: "tiptap-editor focus:outline-none" },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML(), editor.getJSON());
    },
  });

  if (!editor) return <div className="h-[500px] skeleton rounded-xl" />;

  return (
    <div className={cn(
      "border border-border rounded-xl overflow-hidden bg-card",
      editable && "focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all"
    )}>
      {editable && <Toolbar editor={editor} />}
      <div className="tiptap-editor">
        <EditorContent editor={editor} />
      </div>
      {editable && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
          <span className="text-xs text-muted-foreground">
            {editor.storage.characterCount.characters()} characters ·{" "}
            {editor.storage.characterCount.words()} words
          </span>
          <span className="text-xs text-muted-foreground hidden sm:block">
            Ctrl+B Bold · Ctrl+I Italic · Ctrl+K Link
          </span>
        </div>
      )}
    </div>
  );
}

function Toolbar({ editor }: { editor: any }) {
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);

  const setLink = useCallback(() => {
    if (linkUrl === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const addImage = useCallback(() => {
    const url = window.prompt("Image URL");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const addTable = useCallback(() => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  }, [editor]);

  const groups = [
    {
      id: "history",
      items: [
        { icon: Undo2, title: "Undo", action: () => editor.chain().focus().undo().run(), disabled: !editor.can().undo() },
        { icon: Redo2, title: "Redo", action: () => editor.chain().focus().redo().run(), disabled: !editor.can().redo() },
      ],
    },
    {
      id: "format",
      items: [
        { icon: Bold, title: "Bold (Ctrl+B)", action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold") },
        { icon: Italic, title: "Italic (Ctrl+I)", action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic") },
        { icon: UnderlineIcon, title: "Underline (Ctrl+U)", action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive("underline") },
        { icon: Strikethrough, title: "Strikethrough", action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike") },
        { icon: Code, title: "Inline Code", action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive("code") },
        { icon: Highlighter, title: "Highlight", action: () => editor.chain().focus().toggleHighlight().run(), active: editor.isActive("highlight") },
      ],
    },
    {
      id: "headings",
      items: [
        { icon: Heading1, title: "Heading 1", action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive("heading", { level: 1 }) },
        { icon: Heading2, title: "Heading 2", action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }) },
        { icon: Heading3, title: "Heading 3", action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive("heading", { level: 3 }) },
      ],
    },
    {
      id: "lists",
      items: [
        { icon: List, title: "Bullet List", action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList") },
        { icon: ListOrdered, title: "Ordered List", action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList") },
        { icon: CheckSquare, title: "Task List", action: () => editor.chain().focus().toggleTaskList().run(), active: editor.isActive("taskList") },
        { icon: Quote, title: "Blockquote", action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive("blockquote") },
        { icon: Minus, title: "Divider", action: () => editor.chain().focus().setHorizontalRule().run() },
      ],
    },
    {
      id: "align",
      items: [
        { icon: AlignLeft, title: "Align Left", action: () => editor.chain().focus().setTextAlign("left").run(), active: editor.isActive({ textAlign: "left" }) },
        { icon: AlignCenter, title: "Align Center", action: () => editor.chain().focus().setTextAlign("center").run(), active: editor.isActive({ textAlign: "center" }) },
        { icon: AlignRight, title: "Align Right", action: () => editor.chain().focus().setTextAlign("right").run(), active: editor.isActive({ textAlign: "right" }) },
        { icon: AlignJustify, title: "Justify", action: () => editor.chain().focus().setTextAlign("justify").run(), active: editor.isActive({ textAlign: "justify" }) },
      ],
    },
    {
      id: "insert",
      items: [
        { icon: Link2, title: "Insert Link", action: () => setShowLinkInput(true), active: editor.isActive("link") },
        { icon: ImageIcon, title: "Insert Image", action: addImage },
        { icon: TableIcon, title: "Insert Table", action: addTable },
      ],
    },
  ];

  return (
    <div className="border-b border-border bg-muted/30">
      <div className="flex flex-wrap items-center gap-0.5 p-2">
        {groups.map((group, gi) => (
          <div key={group.id} className="flex items-center">
            {gi > 0 && <div className="w-px h-5 bg-border mx-1" />}
            {group.items.map((item) => (
              <button
                key={item.title}
                type="button"
                title={item.title}
                disabled={"disabled" in item ? item.disabled : false}
                onClick={item.action}
                className={cn(
                  "p-1.5 rounded-lg text-sm transition-all",
                  "active" in item && item.active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  "disabled" in item && item.disabled && "opacity-30 cursor-not-allowed"
                )}
              >
                <item.icon className="w-4 h-4" />
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Link input */}
      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 pb-2">
          <input
            type="url"
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setLink()}
            autoFocus
            className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button type="button" onClick={setLink} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90">
            Add
          </button>
          <button type="button" onClick={() => setShowLinkInput(false)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
