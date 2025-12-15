import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useGroupStore } from '@/stores/groupStore';
import { useEditorStore, Language, defaultCode, languageConfig } from '@/stores/editorStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  UserPlus,
  Crown,
  Code2,
  Copy,
  Check,
  ArrowRight,
  FolderOpen,
  Eye,
  Edit3
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Group {
  id: string;
  name: string;
  description: string | null;
  invite_code: string;
  created_by: string;
  created_at: string;
}

interface GroupMember {
  id: string;
  user_id: string;
  group_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profile?: {
    name: string;
    email: string;
    avatar_url: string | null;
  };
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

export default function Groups() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { setActiveProgram, setCode, setLanguage } = useEditorStore();
  const { groups, setGroups, activeGroup, setActiveGroup, members, setMembers } = useGroupStore();
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [addProgramDialogOpen, setAddProgramDialogOpen] = useState(false);
  const [viewProgramDialogOpen, setViewProgramDialogOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<GroupProgram | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [groupPrograms, setGroupPrograms] = useState<GroupProgram[]>([]);
  const [newProgramName, setNewProgramName] = useState('');
  const [newProgramLang, setNewProgramLang] = useState<Language>('javascript');
  const [newProgramCode, setNewProgramCode] = useState(defaultCode.javascript);

  const fetchGroups = useCallback(async () => {
    if (!user) return;

    try {
      const { data: memberData } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (memberData && memberData.length > 0) {
        const groupIds = memberData.map((m) => m.group_id);
        const { data: groupsData } = await supabase
          .from('groups')
          .select('*')
          .in('id', groupIds);

        if (groupsData) {
          setGroups(groupsData);
        }
      } else {
        setGroups([]);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      setLoading(false);
    }
  }, [user, setGroups]);

  const fetchGroupDetails = useCallback(async (groupId: string) => {
    if (!user) return;

    try {
      // Fetch members with profiles
      const { data: membersData } = await supabase
        .from('group_members')
        .select(`
          id,
          user_id,
          group_id,
          role,
          joined_at
        `)
        .eq('group_id', groupId);

      if (membersData) {
        // Fetch profiles for members
        const userIds = membersData.map((m) => m.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email, avatar_url')
          .in('id', userIds);

        const membersWithProfiles = membersData.map((member) => ({
          ...member,
          profile: profiles?.find((p) => p.id === member.user_id),
        }));

        setMembers(membersWithProfiles as any);
      }

      // Fetch group programs
      const { data: programsData } = await supabase
        .from('programs')
        .select('id, title, language, code, user_id, created_at, updated_at')
        .eq('group_id', groupId)
        .eq('is_group_program', true)
        .order('updated_at', { ascending: false });

      if (programsData) {
        // Get profiles for program authors
        const authorIds = [...new Set(programsData.map((p) => p.user_id))];
        const { data: authorProfiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', authorIds);

        const programsWithAuthors = programsData.map((program) => ({
          ...program,
          profile: authorProfiles?.find((p) => p.id === program.user_id),
        }));

        setGroupPrograms(programsWithAuthors as any);
      }
    } catch (err) {
      console.error('Error fetching group details:', err);
    }
  }, [user, setMembers]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    if (activeGroup) {
      fetchGroupDetails(activeGroup.id);
    }
  }, [activeGroup, fetchGroupDetails]);

  const createGroup = async () => {
    if (!user || !newGroupName.trim()) return;

    try {
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: newGroupName.trim(),
          description: newGroupDesc.trim() || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as admin
      const { error: memberError } = await supabase.from('group_members').insert({
        user_id: user.id,
        group_id: groupData.id,
        role: 'admin',
      });

      if (memberError) throw memberError;

      toast.success('Group created successfully!');
      setNewGroupName('');
      setNewGroupDesc('');
      setCreateDialogOpen(false);
      fetchGroups();

      await supabase.from('activities').insert({
        user_id: user.id,
        group_id: groupData.id,
        action: 'created',
        target_type: 'group',
        target_name: newGroupName.trim(),
      });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const joinGroup = async () => {
    if (!user || !inviteCode.trim()) return;

    try {
      // Find group by invite code
      const { data: groupData, error: findError } = await supabase
        .from('groups')
        .select('*')
        .eq('invite_code', inviteCode.trim())
        .single();

      if (findError || !groupData) {
        toast.error('Invalid invite code');
        return;
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('user_id', user.id)
        .eq('group_id', groupData.id)
        .maybeSingle();

      if (existingMember) {
        toast.error('You are already a member of this group');
        return;
      }

      // Join the group
      const { error: joinError } = await supabase.from('group_members').insert({
        user_id: user.id,
        group_id: groupData.id,
        role: 'member',
      });

      if (joinError) throw joinError;

      toast.success(`Joined "${groupData.name}" successfully!`);
      setInviteCode('');
      setJoinDialogOpen(false);
      fetchGroups();

      await supabase.from('activities').insert({
        user_id: user.id,
        group_id: groupData.id,
        action: 'joined',
        target_type: 'group',
        target_name: groupData.name,
      });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const addGroupProgram = async () => {
    if (!user || !activeGroup || !newProgramName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('programs')
        .insert({
          title: newProgramName.trim(),
          language: newProgramLang,
          code: newProgramCode,
          user_id: user.id,
          group_id: activeGroup.id,
          is_group_program: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Program added to group!');
      setNewProgramName('');
      setNewProgramCode(defaultCode.javascript);
      setNewProgramLang('javascript');
      setAddProgramDialogOpen(false);
      fetchGroupDetails(activeGroup.id);

      await supabase.from('activities').insert({
        user_id: user.id,
        group_id: activeGroup.id,
        action: 'created',
        target_type: 'program',
        target_id: data.id,
        target_name: newProgramName.trim(),
      });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const openProgramInEditor = (program: GroupProgram) => {
    // Navigate to workspace with the program loaded
    setActiveProgram({
      ...program,
      folder_id: null,
      is_group_program: true,
      group_id: activeGroup?.id || null,
    } as any);
    setCode(program.code || '');
    setLanguage(program.language as Language);
    navigate('/workspace');
  };

  const copyInviteLink = async () => {
    if (!activeGroup) return;
    
    await navigator.clipboard.writeText(activeGroup.invite_code);
    setCopied(true);
    toast.success('Invite code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getInitials = (name?: string) =>
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?';

  const languageIcons: Record<string, string> = {
    javascript: '🟨',
    python: '🐍',
    java: '☕',
    cpp: '⚡',
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Groups</h1>
          <p className="text-muted-foreground">Collaborate and learn together</p>
        </div>

        <div className="flex gap-3">
          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-border">
                <UserPlus className="w-4 h-4 mr-2" />
                Join Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join a Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Invite Code</Label>
                  <Input
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Enter invite code..."
                  />
                </div>
                <Button onClick={joinGroup} className="w-full">
                  Join Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Group Name</Label>
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g., DSA Study Group"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Textarea
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    placeholder="What's this group about?"
                    rows={3}
                  />
                </div>
                <Button onClick={createGroup} className="w-full">
                  Create Group
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Groups List */}
        <div className="lg:col-span-1">
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="text-lg">Your Groups</CardTitle>
              <CardDescription>{groups.length} groups</CardDescription>
            </CardHeader>
            <CardContent>
              {groups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No groups yet</p>
                  <p className="text-xs mt-1">Create or join a group to collaborate</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {groups.map((group) => (
                      <div
                        key={group.id}
                        className={`p-3 rounded-lg cursor-pointer transition-all ${
                          activeGroup?.id === group.id
                            ? 'bg-primary/10 border border-primary/30'
                            : 'hover:bg-muted/50 border border-transparent'
                        }`}
                        onClick={() => setActiveGroup(group)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{group.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Created {formatDistanceToNow(new Date(group.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Group Details */}
        <div className="lg:col-span-2">
          {activeGroup ? (
            <Card className="glass-panel">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{activeGroup.name}</CardTitle>
                    {activeGroup.description && (
                      <CardDescription className="mt-1">{activeGroup.description}</CardDescription>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyInviteLink}
                    className="border-border"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 mr-2 text-success" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    {copied ? 'Copied!' : `Code: ${activeGroup.invite_code}`}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="programs">
                  <TabsList className="bg-muted">
                    <TabsTrigger value="programs">
                      <Code2 className="w-4 h-4 mr-2" />
                      Programs ({groupPrograms.length})
                    </TabsTrigger>
                    <TabsTrigger value="members">
                      <Users className="w-4 h-4 mr-2" />
                      Members ({members.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="programs" className="mt-4">
                    {/* Add Program Button */}
                    <div className="mb-4">
                      <Dialog open={addProgramDialogOpen} onOpenChange={setAddProgramDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="bg-primary hover:bg-primary/90">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Program
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Add Program to Group</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Program Name</Label>
                                <Input
                                  value={newProgramName}
                                  onChange={(e) => setNewProgramName(e.target.value)}
                                  placeholder="e.g., Binary Search"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Language</Label>
                                <Select 
                                  value={newProgramLang} 
                                  onValueChange={(v) => {
                                    setNewProgramLang(v as Language);
                                    setNewProgramCode(defaultCode[v as Language]);
                                  }}
                                >
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
                            </div>
                            <div className="space-y-2">
                              <Label>Code</Label>
                              <Textarea
                                value={newProgramCode}
                                onChange={(e) => setNewProgramCode(e.target.value)}
                                placeholder="Paste your code here..."
                                rows={12}
                                className="font-mono text-sm"
                              />
                            </div>
                            <Button onClick={addGroupProgram} className="w-full">
                              Add Program to Group
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {groupPrograms.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No programs yet</p>
                        <p className="text-sm mt-1">Click "Add Program" to share code with your group</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[350px]">
                        <div className="space-y-2">
                          {groupPrograms.map((program) => (
                            <div
                              key={program.id}
                              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-border/50"
                            >
                              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-xl">
                                {languageIcons[program.language] || '📄'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">{program.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  by <span className="text-primary">{program.profile?.name || 'Unknown'}</span> •{' '}
                                  {formatDistanceToNow(new Date(program.updated_at), { addSuffix: true })}
                                </p>
                              </div>
                              <Badge variant="secondary" className="text-xs mr-2">
                                {languageConfig[program.language as Language]?.name || program.language}
                              </Badge>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedProgram(program);
                                    setViewProgramDialogOpen(true);
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openProgramInEditor(program)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </TabsContent>

                  <TabsContent value="members" className="mt-4">
                    <ScrollArea className="h-[350px]">
                      <div className="space-y-2">
                        {members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={member.profile?.avatar_url || ''} />
                              <AvatarFallback className="bg-primary/20 text-primary">
                                {getInitials(member.profile?.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground truncate">
                                  {member.profile?.name || 'Unknown User'}
                                </p>
                                {member.role === 'admin' && (
                                  <Crown className="w-4 h-4 text-warning" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {member.profile?.email}
                              </p>
                            </div>
                            <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                              {member.role}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-panel h-full flex items-center justify-center">
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">Select a group</p>
                <p className="text-sm mt-1">Choose a group from the list to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* View Program Dialog */}
      <Dialog open={viewProgramDialogOpen} onOpenChange={setViewProgramDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-xl">{languageIcons[selectedProgram?.language || ''] || '📄'}</span>
              {selectedProgram?.title}
              <Badge variant="secondary">
                {languageConfig[selectedProgram?.language as Language]?.name || selectedProgram?.language}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Created by <span className="text-primary">{selectedProgram?.profile?.name}</span> •{' '}
              {selectedProgram && formatDistanceToNow(new Date(selectedProgram.updated_at), { addSuffix: true })}
            </div>
            <ScrollArea className="h-[400px] rounded-lg border border-border bg-editor-bg">
              <pre className="p-4 font-mono text-sm text-foreground whitespace-pre-wrap">
                {selectedProgram?.code}
              </pre>
            </ScrollArea>
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  if (selectedProgram) {
                    navigator.clipboard.writeText(selectedProgram.code || '');
                    toast.success('Code copied to clipboard!');
                  }
                }}
                variant="outline"
                className="flex-1"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Code
              </Button>
              <Button 
                onClick={() => {
                  if (selectedProgram) {
                    openProgramInEditor(selectedProgram);
                    setViewProgramDialogOpen(false);
                  }
                }}
                className="flex-1"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Open in Editor
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}