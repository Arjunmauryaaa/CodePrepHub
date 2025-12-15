import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useEditorStore, Language, defaultCode } from '@/stores/editorStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Folder,
  FolderPlus,
  FilePlus,
  ChevronRight,
  ChevronDown,
  FileCode,
  Trash2,
  MoreHorizontal,
  Plus
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FolderItem {
  id: string;
  name: string;
  user_id: string;
  parent_id: string | null;
}

interface ProgramItem {
  id: string;
  title: string;
  language: string;
  code: string;
  folder_id: string | null;
  user_id: string;
  is_group_program: boolean;
  created_at: string;
}

const languageIcons: Record<string, string> = {
  javascript: '🟨',
  python: '🐍',
  java: '☕',
  cpp: '⚡',
};

export function FileExplorer() {
  const { user } = useAuthStore();
  const { setActiveProgram, setCode, setLanguage, activeProgram } = useEditorStore();
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [newProgramDialog, setNewProgramDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newProgramName, setNewProgramName] = useState('');
  const [newProgramLang, setNewProgramLang] = useState<Language>('javascript');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    const [foldersRes, programsRes] = await Promise.all([
      supabase.from('folders').select('*').eq('user_id', user.id).order('name'),
      supabase.from('programs').select('*').eq('user_id', user.id).eq('is_group_program', false).order('title'),
    ]);

    if (foldersRes.data) setFolders(foldersRes.data);
    if (programsRes.data) setPrograms(programsRes.data);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const createFolder = async () => {
    if (!user || !newFolderName.trim()) return;

    try {
      const { error } = await supabase.from('folders').insert({
        name: newFolderName.trim(),
        user_id: user.id,
        parent_id: selectedFolder,
      });

      if (error) throw error;

      toast.success('Folder created');
      setNewFolderName('');
      setNewFolderDialog(false);
      fetchData();

      await supabase.from('activities').insert({
        user_id: user.id,
        action: 'created',
        target_type: 'folder',
        target_name: newFolderName.trim(),
      });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const createProgram = async () => {
    if (!user || !newProgramName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('programs')
        .insert({
          title: newProgramName.trim(),
          language: newProgramLang,
          code: defaultCode[newProgramLang],
          folder_id: selectedFolder,
          user_id: user.id,
          is_group_program: false,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Program created');
      setNewProgramName('');
      setNewProgramDialog(false);
      fetchData();

      // Open the new program
      if (data) {
        setActiveProgram(data as any);
        setCode(data.code || '');
        setLanguage(data.language as Language);
      }

      await supabase.from('activities').insert({
        user_id: user.id,
        action: 'created',
        target_type: 'program',
        target_id: data?.id,
        target_name: newProgramName.trim(),
      });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteProgram = async (program: ProgramItem) => {
    if (!confirm(`Delete "${program.title}"?`)) return;

    try {
      const { error } = await supabase.from('programs').delete().eq('id', program.id);
      if (error) throw error;

      toast.success('Program deleted');
      if (activeProgram?.id === program.id) {
        setActiveProgram(null);
        setCode(defaultCode.javascript);
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteFolder = async (folder: FolderItem) => {
    if (!confirm(`Delete folder "${folder.name}" and all its contents?`)) return;

    try {
      // Delete programs in folder first
      await supabase.from('programs').delete().eq('folder_id', folder.id);
      const { error } = await supabase.from('folders').delete().eq('id', folder.id);
      if (error) throw error;

      toast.success('Folder deleted');
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openProgram = (program: ProgramItem) => {
    setActiveProgram(program as any);
    setCode(program.code || '');
    setLanguage(program.language as Language);
  };

  const rootFolders = folders.filter((f) => !f.parent_id);
  const rootPrograms = programs.filter((p) => !p.folder_id);

  const renderFolder = (folder: FolderItem, depth = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const childFolders = folders.filter((f) => f.parent_id === folder.id);
    const childPrograms = programs.filter((p) => p.folder_id === folder.id);

    return (
      <div key={folder.id}>
        <div
          className={cn(
            'flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded cursor-pointer group',
            'text-sm text-muted-foreground hover:text-foreground transition-colors'
          )}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => toggleFolder(folder.id)}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
          )}
          <Folder className="w-4 h-4 flex-shrink-0 text-warning" />
          <span className="flex-1 truncate">{folder.name}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFolder(folder.id);
                  setNewProgramDialog(true);
                }}
              >
                <FilePlus className="w-4 h-4 mr-2" />
                New Program
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFolder(folder);
                }}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {isExpanded && (
          <div>
            {childFolders.map((f) => renderFolder(f, depth + 1))}
            {childPrograms.map((p) => renderProgram(p, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderProgram = (program: ProgramItem, depth = 0) => (
    <div
      key={program.id}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded cursor-pointer group',
        'text-sm transition-colors',
        activeProgram?.id === program.id
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground'
      )}
      style={{ paddingLeft: `${24 + depth * 16}px` }}
      onClick={() => openProgram(program)}
    >
      <FileCode className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 truncate">{program.title}</span>
      <span className="text-xs opacity-60">{languageIcons[program.language] || '📄'}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          deleteProgram(program);
        }}
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-sidebar-border">
      {/* Header */}
      <div className="p-3 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
            Explorer
          </span>
          <div className="flex gap-1">
            <Dialog open={newFolderDialog} onOpenChange={setNewFolderDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <FolderPlus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Folder</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Folder Name</Label>
                    <Input
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="e.g., DSA, Arrays, Strings..."
                    />
                  </div>
                  <Button onClick={createFolder} className="w-full">
                    Create Folder
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={newProgramDialog} onOpenChange={setNewProgramDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setSelectedFolder(null)}
                >
                  <FilePlus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Program</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Program Name</Label>
                    <Input
                      value={newProgramName}
                      onChange={(e) => setNewProgramName(e.target.value)}
                      placeholder="e.g., Binary Search, Quick Sort..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select value={newProgramLang} onValueChange={(v) => setNewProgramLang(v as Language)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="java">Java</SelectItem>
                        <SelectItem value="cpp">C++</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={createProgram} className="w-full">
                    Create Program
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* File Tree */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {rootFolders.length === 0 && rootPrograms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Folder className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No files yet</p>
              <p className="text-xs mt-1">Create a folder or program to get started</p>
            </div>
          ) : (
            <>
              {rootFolders.map((folder) => renderFolder(folder))}
              {rootPrograms.map((program) => renderProgram(program))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}