import { FileExplorer } from '@/components/editor/FileExplorer';
import { CodeEditor } from '@/components/editor/CodeEditor';

export default function Workspace() {
  return (
    <div className="flex h-screen">
      {/* File Explorer - 250px fixed width */}
      <div className="w-64 flex-shrink-0">
        <FileExplorer />
      </div>
      
      {/* Editor - fills remaining space */}
      <div className="flex-1 min-w-0">
        <CodeEditor />
      </div>
    </div>
  );
}