import React, { useRef, useEffect, useState } from 'react';

interface WysiwygEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const WysiwygEditor: React.FC<WysiwygEditorProps> = ({ 
  value, 
  onChange, 
  placeholder = "Write your email content here..." 
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    if (!isHtmlMode && editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || `<p>${placeholder}</p>`;
    }
    if (isHtmlMode && textareaRef.current && textareaRef.current.value !== value) {
      setHtmlContent(value || `<p>${placeholder}</p>`);
    }
  }, [value, placeholder, isHtmlMode]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  // Toolbar command functions
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const handleLinkClick = () => {
    const url = window.prompt('Enter link URL:', 'https://example.com');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const handleImageClick = () => {
    const url = window.prompt('Enter image URL:', 'https://placehold.co/600x400');
    if (url) {
      execCommand('insertImage', url);
    }
  };

  const setFontSize = (size: string) => {
    execCommand('fontSize', '3'); // Using fontSize 3 as base, then apply style
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = size;
      try {
        range.surroundContents(span);
      } catch (e) {
        span.appendChild(range.extractContents());
        range.insertNode(span);
      }
      selection.removeAllRanges();
      handleInput();
    }
  };

  const setTextColor = (color: string) => {
    execCommand('foreColor', color);
  };

  const toggleHtmlMode = () => {
    if (isHtmlMode) {
      // Switching from HTML to visual mode
      if (textareaRef.current) {
        const htmlValue = textareaRef.current.value;
        setHtmlContent(htmlValue);
        onChange(htmlValue);
        if (editorRef.current) {
          editorRef.current.innerHTML = htmlValue;
        }
      }
    } else {
      // Switching from visual to HTML mode
      if (editorRef.current) {
        const htmlValue = editorRef.current.innerHTML;
        setHtmlContent(htmlValue);
        onChange(htmlValue);
      }
    }
    setIsHtmlMode(!isHtmlMode);
  };

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const htmlValue = e.target.value;
    setHtmlContent(htmlValue);
    onChange(htmlValue);
  };

  const formatHtml = () => {
    if (textareaRef.current) {
      let html = textareaRef.current.value;
      
      // Basic HTML formatting
      html = html
        .replace(/>\s*</g, '>\n<')  // Add newlines between tags
        .replace(/^\s+|\s+$/gm, '') // Trim whitespace
        .split('\n')
        .map((line, index, arr) => {
          // Simple indentation logic
          const openTags = (line.match(/</g) || []).length;
          const closeTags = (line.match(/\//g) || []).length;
          const prevLine = arr[index - 1] || '';
          const prevOpenTags = (prevLine.match(/</g) || []).length - (prevLine.match(/\//g) || []).length;
          
          let indent = Math.max(0, prevOpenTags - (line.startsWith('</') ? 1 : 0));
          return '  '.repeat(indent) + line.trim();
        })
        .join('\n');
      
      setHtmlContent(html);
      onChange(html);
    }
  };

  const clearContent = () => {
    const emptyContent = `<p>${placeholder}</p>`;
    setHtmlContent(emptyContent);
    onChange(emptyContent);
    if (editorRef.current) {
      editorRef.current.innerHTML = emptyContent;
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const clipboardData = e.clipboardData;
    const pastedText = clipboardData.getData('text/plain');
    const pastedHtml = clipboardData.getData('text/html');
    
    // If HTML content is available, use it; otherwise use plain text
    const contentToInsert = pastedHtml || pastedText;
    
    if (isHtmlMode && textareaRef.current) {
      // In HTML mode, insert at cursor position in textarea
      const textarea = textareaRef.current;
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      const currentValue = textarea.value;
      const newValue = currentValue.substring(0, startPos) + contentToInsert + currentValue.substring(endPos);
      
      setHtmlContent(newValue);
      onChange(newValue);
      
      // Restore cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = startPos + contentToInsert.length;
        textarea.focus();
      }, 0);
    } else if (!isHtmlMode) {
      // In visual mode, use document.execCommand to insert content
      if (pastedHtml) {
        // Insert HTML content
        document.execCommand('insertHTML', false, pastedHtml);
      } else {
        // Insert plain text
        document.execCommand('insertText', false, pastedText);
      }
      handleInput();
    }
  };

  return (
    <div className="w-full border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
      {/* Toolbar */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-600">
        <div className="flex flex-wrap items-center">
          <div className="flex items-center space-x-1 rtl:space-x-reverse flex-wrap">
            {/* Bold Button */}
            <button 
              type="button"
              onClick={() => execCommand('bold')}
              className="p-1.5 text-gray-500 rounded-sm cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600"
              title="Bold"
            >
              <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5h4.5a3.5 3.5 0 1 1 0 7H8m0-7v7m0-7H6m2 7h6.5a3.5 3.5 0 1 1 0 7H8m0-7v7m0 0H6"/>
              </svg>
            </button>

            {/* Italic Button */}
            <button 
              type="button"
              onClick={() => execCommand('italic')}
              className="p-1.5 text-gray-500 rounded-sm cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600"
              title="Italic"
            >
              <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m8.874 19 6.143-14M6 19h6.33m-.66-14H18"/>
              </svg>
            </button>

            {/* Underline Button */}
            <button 
              type="button"
              onClick={() => execCommand('underline')}
              className="p-1.5 text-gray-500 rounded-sm cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600"
              title="Underline"
            >
              <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M6 19h12M8 5v9a4 4 0 0 0 8 0V5M6 5h4m4 0h4"/>
              </svg>
            </button>

            {/* Strike Button */}
            <button 
              type="button"
              onClick={() => execCommand('strikeThrough')}
              className="p-1.5 text-gray-500 rounded-sm cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600"
              title="Strikethrough"
            >
              <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 6.2V5h12v1.2M7 19h6m.2-14-1.677 6.523M9.6 19l1.029-4M5 5l6.523 6.523M19 19l-7.477-7.477"/>
              </svg>
            </button>

            {/* Link Button */}
            <button 
              type="button"
              onClick={handleLinkClick}
              className="p-1.5 text-gray-500 rounded-sm cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600"
              title="Add Link"
            >
              <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.213 9.787a3.391 3.391 0 0 0-4.795 0l-3.425 3.426a3.39 3.39 0 0 0 4.795 4.794l.321-.304m-.321-4.49a3.39 3.39 0 0 0 4.795 0l3.424-3.426a3.39 3.39 0 0 0-4.794-4.795l-1.028.961"/>
              </svg>
            </button>

            <div className="px-1">
              <span className="block w-px h-4 bg-gray-300 dark:bg-gray-600"></span>
            </div>

            {/* Text Alignment */}
            <button 
              type="button"
              onClick={() => execCommand('justifyLeft')}
              className="p-1.5 text-gray-500 rounded-sm cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600"
              title="Align Left"
            >
              <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 6h8m-8 4h12M6 14h8m-8 4h12"/>
              </svg>
            </button>

            <button 
              type="button"
              onClick={() => execCommand('justifyCenter')}
              className="p-1.5 text-gray-500 rounded-sm cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600"
              title="Align Center"
            >
              <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 6h8M6 10h12M8 14h8M6 18h12"/>
              </svg>
            </button>

            <button 
              type="button"
              onClick={() => execCommand('justifyRight')}
              className="p-1.5 text-gray-500 rounded-sm cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600"
              title="Align Right"
            >
              <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 6h-8m8 4H6m12 4h-8m8 4H6"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Second row of buttons */}
        <div className="flex items-center gap-2 pt-2 flex-wrap">
          {/* Font Size Buttons */}
          <div className="flex gap-1">
            <button 
              type="button"
              onClick={() => setFontSize('12px')}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200"
              title="Small Text"
            >
              12px
            </button>
            <button 
              type="button"
              onClick={() => setFontSize('16px')}
              className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200"
              title="Normal Text"
            >
              16px
            </button>
            <button 
              type="button"
              onClick={() => setFontSize('20px')}
              className="px-2 py-1 text-base bg-gray-100 hover:bg-gray-200 rounded text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200"
              title="Large Text"
            >
              20px
            </button>
            <button 
              type="button"
              onClick={() => setFontSize('24px')}
              className="px-2 py-1 text-lg bg-gray-100 hover:bg-gray-200 rounded text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200"
              title="Extra Large Text"
            >
              24px
            </button>
          </div>

          <div className="px-1">
            <span className="block w-px h-4 bg-gray-300 dark:bg-gray-600"></span>
          </div>

          {/* Color Buttons */}
          <div className="flex gap-1">
            <button 
              type="button"
              onClick={() => setTextColor('#000000')}
              className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
              style={{ backgroundColor: '#000000' }}
              title="Black"
            />
            <button 
              type="button"
              onClick={() => setTextColor('#FF0000')}
              className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
              style={{ backgroundColor: '#FF0000' }}
              title="Red"
            />
            <button 
              type="button"
              onClick={() => setTextColor('#0000FF')}
              className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
              style={{ backgroundColor: '#0000FF' }}
              title="Blue"
            />
            <button 
              type="button"
              onClick={() => setTextColor('#008000')}
              className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400"
              style={{ backgroundColor: '#008000' }}
              title="Green"
            />
          </div>

          <div className="px-1">
            <span className="block w-px h-4 bg-gray-300 dark:bg-gray-600"></span>
          </div>

          {/* Typography Buttons */}
          <button 
            type="button"
            onClick={() => execCommand('formatBlock', 'h1')}
            className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200"
            title="Heading 1"
          >
            H1
          </button>
          <button 
            type="button"
            onClick={() => execCommand('formatBlock', 'h2')}
            className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200"
            title="Heading 2"
          >
            H2
          </button>
          <button 
            type="button"
            onClick={() => execCommand('formatBlock', 'p')}
            className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded text-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200"
            title="Paragraph"
          >
            P
          </button>

          <div className="px-1">
            <span className="block w-px h-4 bg-gray-300 dark:bg-gray-600"></span>
          </div>

          {/* List Buttons */}
          <button 
            type="button"
            onClick={() => execCommand('insertUnorderedList')}
            className="p-1.5 text-gray-500 rounded-sm cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600"
            title="Bullet List"
          >
            <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M9 8h10M9 12h10M9 16h10M4.99 8H5m-.02 4h.01m0 4H5"/>
            </svg>
          </button>

          <button 
            type="button"
            onClick={() => execCommand('insertOrderedList')}
            className="p-1.5 text-gray-500 rounded-sm cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600"
            title="Numbered List"
          >
            <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6h8m-8 6h8m-8 6h8M4 16a2 2 0 1 1 3.321 1.5L4 20h5M4 5l2-1v6m-2 0h4"/>
            </svg>
          </button>

          {/* Image Button */}
          <button 
            type="button"
            onClick={handleImageClick}
            className="p-1.5 text-gray-500 rounded-sm cursor-pointer hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600"
            title="Add Image"
          >
            <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M13 10a1 1 0 0 1 1-1h.01a1 1 0 1 1 0 2H14a1 1 0 0 1-1-1Z" clipRule="evenodd"/>
              <path fillRule="evenodd" d="M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12c0 .556-.227 1.06-.593 1.422A.999.999 0 0 1 20.5 20H4a2.002 2.002 0 0 1-2-2V6Zm6.892 12 3.833-5.356-3.99-4.322a1 1 0 0 0-1.549.097L4 12.879V6h16v9.95l-3.257-3.619a1 1 0 0 0-1.557.088L11.2 18H8.892Z" clipRule="evenodd"/>
            </svg>
          </button>

          <div className="px-1">
            <span className="block w-px h-4 bg-gray-300 dark:bg-gray-600"></span>
          </div>

          {/* HTML Mode Toggle */}
          <button 
            type="button"
            onClick={toggleHtmlMode}
            className={`px-3 py-1.5 text-sm font-medium rounded text-white transition-colors ${
              isHtmlMode 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-gray-500 hover:bg-gray-600'
            }`}
            title={isHtmlMode ? "Switch to Visual Editor" : "Switch to HTML Editor"}
          >
            {isHtmlMode ? (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Visual
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                HTML
              </span>
            )}
          </button>

          {/* HTML Mode Tools */}
          {isHtmlMode && (
            <>
              <button 
                type="button"
                onClick={formatHtml}
                className="px-2 py-1.5 text-xs bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded transition-colors"
                title="Format HTML"
              >
                Format
              </button>
              <button 
                type="button"
                onClick={clearContent}
                className="px-2 py-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                title="Clear Content"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="px-4 py-2 bg-white rounded-b-lg dark:bg-gray-800">
        {!isHtmlMode ? (
          /* Visual Editor */
          <div 
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onPaste={handlePaste}
            className="block w-full px-0 text-sm text-gray-800 bg-white border-0 dark:bg-gray-800 focus:ring-0 dark:text-white dark:placeholder-gray-400 min-h-[200px] focus:outline-none"
            style={{ whiteSpace: 'pre-wrap' }}
            suppressContentEditableWarning={true}
          />
        ) : (
          /* HTML Source Editor */
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={htmlContent}
              onChange={handleHtmlChange}
              onPaste={handlePaste}
              className="block w-full px-0 text-sm text-gray-800 bg-white border-0 dark:bg-gray-800 focus:ring-0 dark:text-white dark:placeholder-gray-400 min-h-[200px] focus:outline-none font-mono resize-none"
              placeholder="Paste or edit your HTML code here..."
              style={{ whiteSpace: 'pre-wrap' }}
            />
            <div className="absolute top-2 right-2 text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              HTML Mode
            </div>
          </div>
        )}
      </div>
      
      {/* HTML Format Help */}
      {isHtmlMode && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 rounded-b-lg">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium mb-1">HTML Mode Tips:</p>
                <ul className="space-y-1">
                  <li>• Paste formatted content from websites or email templates</li>
                  <li>• Use standard HTML tags: &lt;p&gt;, &lt;h1&gt;, &lt;strong&gt;, &lt;a href=""&gt;, &lt;img src=""&gt;</li>
                  <li>• Switch back to Visual mode to continue with toolbar formatting</li>
                </ul>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const sampleHtml = `<h1 style="color: #333; font-family: Arial, sans-serif;">Welcome to Our Newsletter!</h1>
<p style="font-family: Arial, sans-serif; line-height: 1.6;">Dear Subscriber,</p>
<p style="font-family: Arial, sans-serif; line-height: 1.6;">We're excited to share some <strong>amazing updates</strong> with you this month.</p>
<div style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid #007bff; margin: 20px 0;">
  <h2 style="color: #007bff; margin-top: 0;">Featured Content</h2>
  <p style="margin-bottom: 0;">Check out our latest blog post about email marketing best practices.</p>
</div>
<p style="font-family: Arial, sans-serif; line-height: 1.6;">
  <a href="https://example.com" style="color: #007bff; text-decoration: none;">Visit our website</a> for more information.
</p>
<p style="font-family: Arial, sans-serif; line-height: 1.6; color: #666; font-size: 14px;">
  Best regards,<br>The Team
</p>`;
                    setHtmlContent(sampleHtml);
                    onChange(sampleHtml);
                  }}
                  className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                >
                  Newsletter Template
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const promoHtml = `<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 40px 20px;">
    <h1 style="margin: 0; font-size: 28px;">🎉 Special Offer!</h1>
    <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Limited time only</p>
  </div>
  <div style="background-color: #ffffff; padding: 30px 20px;">
    <h2 style="color: #333; margin-top: 0;">Get 50% Off Everything!</h2>
    <p style="color: #666; line-height: 1.6;">Don't miss this incredible opportunity to save on all our products and services.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://example.com/offer" style="background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Shop Now</a>
    </div>
    <p style="color: #999; font-size: 14px; text-align: center;">*Offer valid until end of month</p>
  </div>
</div>`;
                    setHtmlContent(promoHtml);
                    onChange(promoHtml);
                  }}
                  className="px-2 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
                >
                  Promo Template
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const loanSettlementHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Exclusive Loan Settlement Offer</title>
    <!-- Use a style block for responsive CSS media queries -->
    <style>
        /* Base styles for all clients */
        body, html {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            word-break: break-word;
            font-family: 'Inter', Arial, sans-serif;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
            line-height: 1.5;
        }
        table, td {
            mso-table-lspace: 0pt !important;
            mso-table-rspace: 0pt !important;
            border-collapse: collapse !important;
        }
        /* Mobile specific styles (responsive design) */
        @media screen and (max-width: 600px) {
            .full-width-mobile {
                width: 100% !important;
                max-width: 100% !important;
            }
            .content-padding {
                padding: 15px 20px !important;
            }
            .header-text {
                font-size: 24px !important;
                line-height: 1.2 !important;
            }
            .cta-button {
                padding: 12px 25px !important;
                font-size: 16px !important;
            }
            .footer-text {
                font-size: 12px !important;
            }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f6;">

    <!-- Wrapper Table (Ensures full email background color) -->
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: auto; background-color: #f4f7f6;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <!-- Content Container Table (Max width of email content) -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="full-width-mobile" style="max-width: 600px; margin: auto; border-radius: 8px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
                    
                    <!-- 1. Header & Logo -->
                    <tr>
                        <td bgcolor="#004aad" align="center" style="padding: 25px 30px; border-bottom: 4px solid #32c4a9;">
                            <a href="#" target="_blank" style="text-decoration: none;">
                                <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: 700;">
                                    [Company Name]
                                </h1>
                                <!-- Placeholder for an image logo:
                                <img src="https://placehold.co/150x40/004aad/ffffff?text=LOGO" width="150" height="40" alt="Company Logo" border="0" style="display: block; font-family: Arial, sans-serif; font-size: 18px; color: #ffffff;">
                                -->
                            </a>
                        </td>
                    </tr>

                    <!-- 2. Main Content Area -->
                    <tr>
                        <td class="content-padding" style="padding: 30px 40px; font-size: 15px; color: #333333;">
                            
                            <p style="margin: 0 0 20px;">
                                Dear **[Client Name]**,
                            </p>

                            <h2 class="header-text" style="font-size: 28px; color: #004aad; margin: 0 0 15px; font-weight: 700; line-height: 1.3;">
                                Your Exclusive Loan Settlement Offer
                            </h2>

                            <p style="margin: 0 0 20px;">
                                We are pleased to present a special, limited-time opportunity to resolve your outstanding balance on **Account #[12345678]**. We understand financial challenges, and this offer is designed to help you secure a fresh start.
                            </p>

                            <!-- Settlement Details Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0; background-color: #eaf5ff; border-radius: 6px; border: 1px solid #cce0f2;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <p style="margin: 0 0 10px; font-size: 18px; color: #004aad; font-weight: 600;">
                                            Current Balance: <span style="font-weight: 700; float: right;">$10,500.00</span>
                                        </p>
                                        <p style="margin: 0 0 20px; font-size: 18px; color: #004aad; font-weight: 600;">
                                            **One-Time Settlement Offer:** <span style="font-size: 22px; font-weight: 800; color: #32c4a9; float: right;">$6,300.00</span>
                                        </p>
                                        <hr style="border: none; border-top: 1px dashed #cccccc; margin: 15px 0;">
                                        <p style="margin: 0; font-size: 15px; color: #555555; text-align: center;">
                                            **You save: $4,200.00** (a 40% reduction)
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 0 0 20px; font-size: 16px;">
                                To accept this offer, the full settlement payment of **$6,300.00** must be received by **[Offer Expiration Date, e.g., November 30, 2025]**.
                            </p>
                            
                            <!-- Call to Action Button -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 40px 0 30px;">
                                <tr>
                                    <td align="center">
                                        <!-- CTA link (inline styling is crucial for buttons) -->
                                        <a href="[LINK_TO_PAYMENT_PORTAL]" target="_blank" style="background-color: #32c4a9; border: 1px solid #2da68e; color: #ffffff; padding: 14px 35px; display: inline-block; border-radius: 30px; font-size: 18px; font-weight: 700; text-decoration: none; mso-padding-alt: 0; text-align: center;">
                                            <span class="cta-button" style="mso-text-raise: 15pt; line-height: 100%;">
                                                Finalize Settlement Now
                                            </span>
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0 0 10px; font-size: 14px; color: #888888; text-align: center;">
                                *This is a time-sensitive offer. Please act before the expiration date to secure these savings.*
                            </p>
                            
                            <p style="margin: 30px 0 0;">
                                If you have any questions or would like to discuss a payment plan, please reply to this email or call us at **[1-800-555-LOAN]**.
                            </p>
                            <p style="margin: 0;">
                                Sincerely,<br>
                                The [Company Name] Resolutions Team
                            </p>

                        </td>
                    </tr>

                    <!-- 3. Footer -->
                    <tr>
                        <td bgcolor="#e0e0e0" align="center" class="content-padding" style="padding: 25px 40px; border-top: 1px solid #cccccc; font-size: 13px; color: #555555;">
                            
                            <p class="footer-text" style="margin: 0 0 15px;">
                                **[Company Name]** | [Street Address] | [City, State, Zip]
                            </p>

                            <p class="footer-text" style="margin: 0 0 15px; line-height: 1.8;">
                                <a href="[PRIVACY_POLICY_LINK]" target="_blank" style="color: #004aad; text-decoration: underline;">Privacy Policy</a> &bull; 
                                <a href="[CONTACT_US_LINK]" target="_blank" style="color: #004aad; text-decoration: underline;">Contact Us</a>
                            </p>

                            <!-- Unsubscribe/Disclaimer -->
                            <p class="footer-text" style="margin: 0; font-size: 11px; color: #888888;">
                                You are receiving this email because it pertains to your account with [Company Name]. If you wish to not receive future communications, please 
                                <a href="[UNSUBSCRIBE_LINK]" target="_blank" style="color: #888888; text-decoration: underline;">unsubscribe here</a>.
                            </p>

                        </td>
                    </tr>

                </table>
                <!-- End Content Container Table -->
            </td>
        </tr>
    </table>
    <!-- End Wrapper Table -->
</body>
</html>`;
                    setHtmlContent(loanSettlementHtml);
                    onChange(loanSettlementHtml);
                  }}
                  className="px-2 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded transition-colors"
                >
                  Loan Settlement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WysiwygEditor;