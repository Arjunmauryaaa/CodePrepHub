import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Language, languageConfig, defaultCode } from '@/stores/editorStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Play,
  Save,
  Plus,
  Trash2,
  Loader2,
  ArrowLeft,
  Users,
  FileCode,
  Copy,
  Check,
  LogOut,
  UserMinus
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';

interface Group {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
}

interface GroupProgram {
  id: string;
  title: string;
  language: string;
  code: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  profile?: {
    name: string;
  };
}

interface GroupMember {
  user_id: string;
  role: 'admin' | 'member';
  profile?: {
    name: string;
  };
}

const languageIcons: Record<string, string> = {
  javascript: '🟨',
  python: '🐍',
  java: '☕',
  cpp: '⚡',
};

export default function GroupWorkspace() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [group, setGroup] = useState<Group | null>(null);
  const [programs, setPrograms] = useState<GroupProgram[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [activeProgram, setActiveProgram] = useState<GroupProgram | null>(null);
  const [code, setCode] = useState(defaultCode.javascript);
  const [language, setLanguage] = useState<Language>('javascript');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newProgramDialog, setNewProgramDialog] = useState(false);
  const [newProgramName, setNewProgramName] = useState('');
  const [newProgramLang, setNewProgramLang] = useState<Language>('javascript');
  const [copied, setCopied] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [removeMemberDialog, setRemoveMemberDialog] = useState<GroupMember | null>(null);

  const currentUserMember = members.find(m => m.user_id === user?.id);
  const isAdmin = currentUserMember?.role === 'admin';

  const fetchGroupData = useCallback(async () => {
    if (!groupId || !user) return;

    try {
      // Fetch group details
      const { data: groupData } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

      if (groupData) setGroup(groupData);

      // Fetch group programs with author profiles
      const { data: programsData } = await supabase
        .from('programs')
        .select('*')
        .eq('group_id', groupId)
        .eq('is_group_program', true)
        .order('updated_at', { ascending: false });

      if (programsData) {
        const authorIds = [...new Set(programsData.map((p) => p.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', authorIds);

        const programsWithAuthors = programsData.map((program) => ({
          ...program,
          profile: profiles?.find((p) => p.id === program.user_id),
        }));
        setPrograms(programsWithAuthors);
      }

      // Fetch members
      const { data: membersData } = await supabase
        .from('group_members')
        .select('user_id, role')
        .eq('group_id', groupId);

      if (membersData) {
        const memberIds = membersData.map((m) => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', memberIds);

        const membersWithProfiles = membersData.map((member) => ({
          ...member,
          profile: profiles?.find((p) => p.id === member.user_id),
        }));
        setMembers(membersWithProfiles);
      }
    } catch (err) {
      console.error('Error fetching group data:', err);
      toast.error('Failed to load group');
    }
  }, [groupId, user]);

  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);

  const selectProgram = (program: GroupProgram) => {
    setActiveProgram(program);
    setCode(program.code || '');
    setLanguage(program.language as Language);
    setOutput('');
    setError(null);
  };

  const createProgram = async () => {
    if (!user || !groupId || !newProgramName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('programs')
        .insert({
          title: newProgramName.trim(),
          language: newProgramLang,
          code: defaultCode[newProgramLang],
          user_id: user.id,
          group_id: groupId,
          is_group_program: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Program created!');
      setNewProgramName('');
      setNewProgramDialog(false);
      fetchGroupData();

      // Auto-select the new program
      if (data) {
        setActiveProgram({ ...data, profile: { name: 'You' } });
        setCode(data.code || '');
        setLanguage(data.language as Language);
      }

      await supabase.from('activities').insert({
        user_id: user.id,
        group_id: groupId,
        action: 'created',
        target_type: 'program',
        target_id: data?.id,
        target_name: newProgramName.trim(),
      });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const saveProgram = async () => {
    if (!activeProgram || !user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('programs')
        .update({ code, language, updated_at: new Date().toISOString() })
        .eq('id', activeProgram.id);

      if (error) throw error;
      toast.success('Program saved!');
      fetchGroupData();

      await supabase.from('activities').insert({
        user_id: user.id,
        group_id: groupId,
        action: 'edited',
        target_type: 'program',
        target_id: activeProgram.id,
        target_name: activeProgram.title,
      });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProgram = async (program: GroupProgram) => {
    if (!confirm(`Delete "${program.title}"?`)) return;

    try {
      const { error } = await supabase.from('programs').delete().eq('id', program.id);
      if (error) throw error;

      toast.success('Program deleted');
      if (activeProgram?.id === program.id) {
        setActiveProgram(null);
        setCode(defaultCode.javascript);
        setLanguage('javascript');
      }
      fetchGroupData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput('');
    setError(null);

    try {
      if (language === 'javascript') {
        const originalLog = console.log;
        const logs: string[] = [];

        console.log = (...args) => {
          logs.push(args.map((arg) =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' '));
        };

        try {
          const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
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
        setOutput(
          `${languageConfig[language].name} execution requires a backend runtime.\n\n` +
          `To run this code:\n` +
          `1. Copy it to a local environment\n` +
          `2. Or integrate with a code execution API\n\n` +
          `Your code has been saved to the group.`
        );
      }
    } catch (err: any) {
      setError(err.message);
      setOutput(`Error: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    if (!activeProgram) {
      setCode(defaultCode[newLang]);
    }
  };

  const copyInviteCode = async () => {
    if (!group) return;
    await navigator.clipboard.writeText(group.invite_code);
    setCopied(true);
    toast.success('Invite code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveGroup = async () => {
    if (!user || !groupId) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('You left the group');
      navigate('/groups');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const removeMember = async (member: GroupMember) => {
    if (!user || !groupId || !isAdmin) return;

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', member.user_id);

      if (error) throw error;

      toast.success(`${member.profile?.name || 'Member'} removed from group`);
      setRemoveMemberDialog(null);
      fetchGroupData();

      await supabase.from('activities').insert({
        user_id: user.id,
        group_id: groupId,
        action: 'removed',
        target_type: 'member',
        target_name: member.profile?.name || 'Unknown',
      });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const getInitials = (name?: string) =>
    name?.split(' ').map((n) => n[0]).join('').toUpperCase() || '?';

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (activeProgram) saveProgram();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runCode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeProgram, code]);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Programs & Members */}
      <div className="w-72 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        {/* Group Header */}
        <div className="p-4 border-b border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/groups')}
            className="mb-3 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Groups
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-foreground truncate">{group?.name}</h2>
              <p className="text-xs text-muted-foreground">{members.length} members</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={copyInviteCode}
            className="w-full mt-3 text-xs"
          >
            {copied ? <Check className="w-3 h-3 mr-2" /> : <Copy className="w-3 h-3 mr-2" />}
            {copied ? 'Copied!' : `Invite: ${group?.invite_code}`}
          </Button>
        </div>

        {/* Programs Section */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-3 flex items-center justify-between border-b border-sidebar-border">
            <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              Programs ({programs.length})
            </span>
            <Dialog open={newProgramDialog} onOpenChange={setNewProgramDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Group Program</DialogTitle>
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

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {programs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileCode className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No programs yet</p>
                  <p className="text-xs">Click + to add one</p>
                </div>
              ) : (
                programs.map((program) => (
                  <div
                    key={program.id}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg cursor-pointer group transition-all',
                      activeProgram?.id === program.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                    )}
                    onClick={() => selectProgram(program)}
                  >
                    <span className="text-base flex-shrink-0">{languageIcons[program.language] || '📄'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{program.title}</p>
                      <p className="text-xs opacity-70 truncate">
                        {program.profile?.name || 'Unknown'}
                      </p>
                    </div>
                    {program.user_id === user?.id && (
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
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Members Section */}
        <div className="border-t border-sidebar-border">
          <div className="p-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">
              Members
            </span>
            {!isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setLeaveDialogOpen(true)}
              >
                <LogOut className="w-3 h-3 mr-1" />
                Leave
              </Button>
            )}
          </div>
          <ScrollArea className="h-32">
            <div className="px-2 pb-2 space-y-1">
              {members.map((member) => (
                <div key={member.user_id} className="flex items-center gap-2 p-2 rounded-lg group">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">
                      {getInitials(member.profile?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground truncate flex-1">
                    {member.profile?.name || 'Unknown'}
                    {member.user_id === user?.id && ' (You)'}
                  </span>
                  {member.role === 'admin' && (
                    <Badge variant="secondary" className="text-[10px] px-1">Admin</Badge>
                  )}
                  {isAdmin && member.user_id !== user?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setRemoveMemberDialog(member)}
                    >
                      <UserMinus className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Leave Group Dialog */}
        <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave Group?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to leave "{group?.name}"? You'll need to rejoin using the invite code.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={leaveGroup} className="bg-destructive hover:bg-destructive/90">
                Leave Group
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Remove Member Dialog */}
        <AlertDialog open={!!removeMemberDialog} onOpenChange={() => setRemoveMemberDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Member?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {removeMemberDialog?.profile?.name || 'this member'} from the group?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => removeMemberDialog && removeMember(removeMemberDialog)} 
                className="bg-destructive hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
          <div className="flex items-center gap-3">
            <Select value={language} onValueChange={(v) => handleLanguageChange(v as Language)}>
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

            {activeProgram ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Editing:</span>
                <Badge variant="secondary">{activeProgram.title}</Badge>
                <span className="text-xs text-muted-foreground">
                  by {activeProgram.profile?.name}
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">
                Select or create a program to start coding
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeProgram && (
              <Button
                variant="outline"
                size="sm"
                onClick={saveProgram}
                disabled={isSaving}
                className="border-border hover:bg-secondary"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save
              </Button>
            )}
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
          <ScrollArea className="flex-1 p-4">
            {error ? (
              <pre className="font-mono text-sm text-destructive whitespace-pre-wrap">{output}</pre>
            ) : (
              <pre className="font-mono text-sm text-foreground whitespace-pre-wrap">
                {output || 'Output will appear here...'}
              </pre>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}