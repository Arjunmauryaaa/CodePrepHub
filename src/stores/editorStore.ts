import { create } from 'zustand';

export type Language = 'javascript' | 'python' | 'java' | 'cpp';

interface Program {
  id: string;
  title: string;
  language: Language;
  code: string;
  folder_id: string | null;
  user_id: string;
  group_id: string | null;
  is_group_program: boolean;
  created_at: string;
  updated_at: string;
}

interface Folder {
  id: string;
  name: string;
  user_id: string;
  parent_id: string | null;
  created_at: string;
}

interface EditorState {
  activeProgram: Program | null;
  programs: Program[];
  folders: Folder[];
  code: string;
  language: Language;
  output: string;
  isRunning: boolean;
  error: string | null;
  setActiveProgram: (program: Program | null) => void;
  setPrograms: (programs: Program[]) => void;
  setFolders: (folders: Folder[]) => void;
  setCode: (code: string) => void;
  setLanguage: (language: Language) => void;
  setOutput: (output: string) => void;
  setIsRunning: (isRunning: boolean) => void;
  setError: (error: string | null) => void;
  clearOutput: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeProgram: null,
  programs: [],
  folders: [],
  code: '// Start coding here...\nconsole.log("Hello, CodePrep Hub!");',
  language: 'javascript',
  output: '',
  isRunning: false,
  error: null,
  setActiveProgram: (activeProgram) => set({ activeProgram }),
  setPrograms: (programs) => set({ programs }),
  setFolders: (folders) => set({ folders }),
  setCode: (code) => set({ code }),
  setLanguage: (language) => set({ language }),
  setOutput: (output) => set({ output }),
  setIsRunning: (isRunning) => set({ isRunning }),
  setError: (error) => set({ error }),
  clearOutput: () => set({ output: '', error: null }),
}));

export const languageConfig: Record<Language, { name: string; extension: string; monacoLang: string }> = {
  javascript: { name: 'JavaScript', extension: 'js', monacoLang: 'javascript' },
  python: { name: 'Python', extension: 'py', monacoLang: 'python' },
  java: { name: 'Java', extension: 'java', monacoLang: 'java' },
  cpp: { name: 'C++', extension: 'cpp', monacoLang: 'cpp' },
};

export const defaultCode: Record<Language, string> = {
  javascript: '// JavaScript\nconsole.log("Hello, World!");',
  python: '# Python\nprint("Hello, World!")',
  java: '// Java\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
  cpp: '// C++\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
};