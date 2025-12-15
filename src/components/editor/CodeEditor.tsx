import { useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { useEditorStore, Language, languageConfig, defaultCode } from '@/stores/editorStore';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Square, Loader2, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

export function CodeEditor() {
  const { 
    code, 
    language, 
    output, 
    isRunning, 
    error,
    activeProgram,
    setCode, 
    setLanguage, 
    setOutput, 
    setIsRunning,
    setError,
    clearOutput,
    setActiveProgram
  } = useEditorStore();
  const { user } = useAuthStore();
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    if (!activeProgram) {
      setCode(defaultCode[newLanguage]);
    }
  };

  const runCode = useCallback(async () => {
    setIsRunning(true);
    clearOutput();

    try {
      // For JavaScript, we can run in browser
      if (language === 'javascript') {
        const originalLog = console.log;
        const logs: string[] = [];
        
        console.log = (...args) => {
          logs.push(args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' '));
        };

        try {
          const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
          const fn = new AsyncFunction(code);
          await fn();
          setOutput(logs.join('\n') || 'Code executed successfully (no output)');
        } catch (err: any) {
          setError(err.message);
          setOutput(`Error: ${err.message}`);
        } finally {
          console.log = originalLog;
        }
      } else {
        // For other languages, show a message about execution
        setOutput(`${languageConfig[language].name} execution requires a backend runtime.\n\nTo run this code:\n1. Copy it to a local environment\n2. Or integrate with a code execution API\n\nCode saved to your workspace.`);
      }
    } catch (err: any) {
      setError(err.message);
      setOutput(`Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  }, [code, language, setIsRunning, clearOutput, setOutput, setError]);

  const saveProgram = useCallback(async () => {
    if (!activeProgram || !user) return;

    try {
      const { error } = await supabase
        .from('programs')
        .update({ code, updated_at: new Date().toISOString() })
        .eq('id', activeProgram.id);

      if (error) throw error;
      toast.success('Program saved');

      // Log activity
      await supabase.from('activities').insert({
        user_id: user.id,
        action: 'edited',
        target_type: 'program',
        target_id: activeProgram.id,
        target_name: activeProgram.title,
      });
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    }
  }, [activeProgram, code, user]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeProgram) {
          saveProgram();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runCode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [runCode, saveProgram, activeProgram]);

  return (
    <div className="flex flex-col h-full bg-editor-bg">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <Select value={language} onValueChange={(val) => handleLanguageChange(val as Language)}>
            <SelectTrigger className="w-36 bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(languageConfig).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activeProgram && (
            <span className="text-sm text-muted-foreground">
              Editing: <span className="text-primary font-medium">{activeProgram.title}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeProgram && (
            <Button
              variant="outline"
              size="sm"
              onClick={saveProgram}
              className="border-border hover:bg-secondary"
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={clearOutput}
            className="border-border hover:bg-secondary"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
          
          <Button
            onClick={runCode}
            disabled={isRunning}
            className="bg-success hover:bg-success/90 text-success-foreground"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={languageConfig[language].monacoLang}
          value={code}
          onChange={(value) => setCode(value || '')}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
            minimap: { enabled: true, maxColumn: 80 },
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            padding: { top: 16, bottom: 16 },
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
          }}
        />
      </div>

      {/* Output Panel */}
      <div className="h-48 bg-card border-t border-border flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 bg-secondary/50 border-b border-border">
          <span className="text-sm font-medium text-muted-foreground">Output</span>
          {isRunning && (
            <span className="flex items-center gap-2 text-xs text-primary">
              <Loader2 className="w-3 h-3 animate-spin" />
              Executing...
            </span>
          )}
        </div>
        <div className="flex-1 overflow-auto p-4 font-mono text-sm editor-scrollbar">
          {error ? (
            <pre className="text-destructive whitespace-pre-wrap">{output}</pre>
          ) : (
            <pre className="text-foreground whitespace-pre-wrap">{output || 'Output will appear here...'}</pre>
          )}
        </div>
      </div>
    </div>
  );
}