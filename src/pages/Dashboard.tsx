import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Code2, 
  Users, 
  FolderOpen, 
  TrendingUp, 
  Clock, 
  ArrowRight,
  Plus,
  Activity
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Stats {
  totalPrograms: number;
  totalGroups: number;
  totalFolders: number;
}

interface ActivityItem {
  id: string;
  user_id: string;
  action: string;
  target_type: string;
  target_name: string | null;
  created_at: string;
  profile?: {
    name: string;
  };
}

export default function Dashboard() {
  const { profile, user } = useAuthStore();
  const [stats, setStats] = useState<Stats>({ totalPrograms: 0, totalGroups: 0, totalFolders: 0 });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch program count
      const { count: programCount } = await supabase
        .from('programs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('is_group_program', false);

      // Fetch group count
      const { count: groupCount } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);

      // Fetch folder count
      const { count: folderCount } = await supabase
        .from('folders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);

      setStats({
        totalPrograms: programCount || 0,
        totalGroups: groupCount || 0,
        totalFolders: folderCount || 0,
      });

      // Fetch recent activities
      const { data: activityData } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setActivities(activityData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { 
      label: 'Programs', 
      value: stats.totalPrograms, 
      icon: Code2, 
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      link: '/workspace'
    },
    { 
      label: 'Groups', 
      value: stats.totalGroups, 
      icon: Users, 
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      link: '/groups'
    },
    { 
      label: 'Folders', 
      value: stats.totalFolders, 
      icon: FolderOpen, 
      color: 'text-success',
      bgColor: 'bg-success/10',
      link: '/workspace'
    },
  ];

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <Plus className="w-3 h-3" />;
      case 'edited':
        return <Code2 className="w-3 h-3" />;
      case 'joined':
        return <Users className="w-3 h-3" />;
      default:
        return <Activity className="w-3 h-3" />;
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-success/20 text-success';
      case 'edited':
        return 'bg-primary/20 text-primary';
      case 'joined':
        return 'bg-accent/20 text-accent';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome back, {profile?.name?.split(' ')[0] || 'Developer'}!
        </h1>
        <p className="text-muted-foreground">
          Ready to continue your coding journey? Here's your overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {statCards.map((stat) => (
          <Link key={stat.label} to={stat.link}>
            <Card className="glass-panel hover:border-primary/50 transition-all duration-300 cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Quick Actions
            </CardTitle>
            <CardDescription>Jump into coding right away</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/workspace">
              <Button className="w-full justify-between bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20">
                <span className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  New Program
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/groups">
              <Button className="w-full justify-between bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Create or Join Group
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/workspace">
              <Button className="w-full justify-between bg-success/10 hover:bg-success/20 text-success border border-success/20">
                <span className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  Organize Folders
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest actions</CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No activity yet</p>
                <p className="text-sm">Start coding to see your activity here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(activity.action)}`}>
                      {getActivityIcon(activity.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">
                        <span className="font-medium capitalize">{activity.action}</span>
                        {' '}{activity.target_type}{' '}
                        {activity.target_name && (
                          <span className="text-primary">{activity.target_name}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}