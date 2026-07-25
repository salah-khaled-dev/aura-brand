"use client";

import React, { useRef } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { MediaPicker } from './MediaPicker';
import { Media } from '@/data/mock/media';

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'strong', 'em', 'span', 'div', 'br'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel'],
};
import { 
  IconBold, 
  IconItalic, 
  IconUnderline, 
  IconList, 
  IconListNumbers, 
  IconLink, 
  IconPhoto, 
  IconAlignLeft, 
  IconAlignCenter, 
  IconAlignRight, 
  IconH1, 
  IconH2, 
  IconQuote 
} from '@tabler/icons-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

const ToolbarButton = ({ icon: Icon, onClick, title }: { icon: any, onClick: () => void, title: string }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className="p-1.5 hover:bg-[var(--admin-bg-hover)] rounded-[var(--admin-radius-sm)] text-[var(--admin-text-base)] transition-colors"
  >
    <Icon size={18} stroke={1.5} />
  </button>
);

export function RichTextEditor({ value, onChange, placeholder = 'اكتب هنا...', minHeight = '300px' }: RichTextEditorProps) {
  const [mediaPickerOpen, setMediaPickerOpen] = React.useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  const execCommand = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      onChange(DOMPurify.sanitize(editorRef.current.innerHTML, SANITIZE_CONFIG));
    }
  };

  const handleMediaInsert = (media: Media | Media[]) => {
    const selected = Array.isArray(media) ? media[0] : media;
    if (selected) {
      execCommand('insertImage', selected.url);
    }
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    onChange(DOMPurify.sanitize(e.currentTarget.innerHTML, SANITIZE_CONFIG));
  };

  // Only set innerHTML on first mount if it's empty to avoid cursor jumping
  React.useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      // Very basic sync for controlled component
      // In a real integration (e.g. Quill/TinyMCE) this is handled better
      editorRef.current.innerHTML = DOMPurify.sanitize(value, SANITIZE_CONFIG);
    }
  }, []);

  return (
    <div className="flex flex-col bg-[var(--admin-bg-base)]">
      {/* Toolbar */}
      <div className="border-b border-[var(--admin-border-base)] bg-[var(--admin-bg-elevated)] p-1.5 flex flex-wrap gap-1 items-center">
        <ToolbarButton icon={IconBold} onClick={() => execCommand('bold')} title="عريض" />
        <ToolbarButton icon={IconItalic} onClick={() => execCommand('italic')} title="مائل" />
        <ToolbarButton icon={IconUnderline} onClick={() => execCommand('underline')} title="تسطير" />
        <div className="w-px h-5 bg-[var(--admin-border-strong)] mx-1" />
        <ToolbarButton icon={IconH1} onClick={() => execCommand('formatBlock', 'H1')} title="عنوان رئيسي" />
        <ToolbarButton icon={IconH2} onClick={() => execCommand('formatBlock', 'H2')} title="عنوان فرعي" />
        <ToolbarButton icon={IconQuote} onClick={() => execCommand('formatBlock', 'BLOCKQUOTE')} title="اقتباس" />
        <div className="w-px h-5 bg-[var(--admin-border-strong)] mx-1" />
        <ToolbarButton icon={IconList} onClick={() => execCommand('insertUnorderedList')} title="قائمة نقطية" />
        <ToolbarButton icon={IconListNumbers} onClick={() => execCommand('insertOrderedList')} title="قائمة رقمية" />
        <div className="w-px h-5 bg-[var(--admin-border-strong)] mx-1" />
        <ToolbarButton icon={IconAlignRight} onClick={() => execCommand('justifyRight')} title="محاذاة لليمين" />
        <ToolbarButton icon={IconAlignCenter} onClick={() => execCommand('justifyCenter')} title="محاذاة للوسط" />
        <ToolbarButton icon={IconAlignLeft} onClick={() => execCommand('justifyLeft')} title="محاذاة لليسار" />
        <div className="w-px h-5 bg-[var(--admin-border-strong)] mx-1" />
        <ToolbarButton icon={IconLink} onClick={() => {
          const url = prompt('أدخل الرابط:');
          if (url) execCommand('createLink', url);
        }} title="إدراج رابط" />
        <ToolbarButton icon={IconPhoto} onClick={() => setMediaPickerOpen(true)} title="إدراج صورة" />
      </div>

      {/* Editor Area */}
      <div 
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="p-4 outline-none prose prose-sm max-w-none prose-headings:font-bold prose-a:text-[var(--admin-primary)] prose-img:rounded-[var(--admin-radius-md)] text-[var(--admin-text-base)]"
        style={{ minHeight }}
        dir="rtl"
        data-placeholder={placeholder}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value, SANITIZE_CONFIG) }}
      />
      
      {/* Mock CSS for placeholder if empty */}
      <style dangerouslySetInnerHTML={{__html: `
        div[contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: var(--admin-text-muted);
          pointer-events: none;
          display: block; /* For Firefox */
        }
      `}} />

      <MediaPicker 
        open={mediaPickerOpen} 
        onClose={() => setMediaPickerOpen(false)} 
        onSelect={handleMediaInsert}
        allowedTypes={['image']}
      />
    </div>
  );
}
