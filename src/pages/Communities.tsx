import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Community {
  id: string;
  name: string;
  description: string;
  creator_id: string;
  banner_image: string;
  type: 'public' | 'private';
  invite_code: string;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
}

export default function Communities() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'public' as 'public' | 'private'
  });

  useEffect(() => {
    fetchCommunities();
  }, []);

  const fetchCommunities = async () => {
    try {
      const { data: communitiesData, error } = await supabase
        .from('communities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get member counts and check if user is a member
      const communitiesWithStats = await Promise.all(
        communitiesData.map(async (community) => {
          const { count } = await supabase
            .from('community_members')
            .select('*', { count: 'exact', head: true })
            .eq('community_id', community.id);

          const { data: membership } = await supabase
            .from('community_members')
            .select('id')
            .eq('community_id', community.id)
            .eq('user_id', user?.id)
            .maybeSingle();

          return {
            ...community,
            type: community.type as 'public' | 'private',
            banner_image: community.banner_image || '',
            description: community.description || '',
            invite_code: community.invite_code || '',
            member_count: count || 0,
            is_member: !!membership
          };
        })
      );

      setCommunities(communitiesWithStats);
    } catch (error) {
      console.error('Error fetching communities:', error);
      toast({
        title: "Error",
        description: "Failed to load communities",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createCommunity = async () => {
    if (!user || !formData.name.trim()) return;

    try {
      const inviteCode = `COMM-${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`;
      
      const { data, error } = await supabase
        .from('communities')
        .insert({
          name: formData.name,
          description: formData.description,
          creator_id: user.id,
          type: formData.type,
          invite_code: inviteCode
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as admin member
      await supabase
        .from('community_members')
        .insert({
          community_id: data.id,
          user_id: user.id,
          role: 'admin'
        });

      toast({
        title: "Success",
        description: "Community created successfully!"
      });

      setShowCreateDialog(false);
      setFormData({ name: '', description: '', type: 'public' });
      fetchCommunities();
    } catch (error) {
      console.error('Error creating community:', error);
      toast({
        title: "Error",
        description: "Failed to create community",
        variant: "destructive"
      });
    }
  };

  const joinCommunity = async (communityId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('community_members')
        .insert({
          community_id: communityId,
          user_id: user.id,
          role: 'member'
        });

      toast({
        title: "Success",
        description: "Joined community successfully!"
      });

      fetchCommunities();
    } catch (error) {
      console.error('Error joining community:', error);
      toast({
        title: "Error",
        description: "Failed to join community",
        variant: "destructive"
      });
    }
  };

  const leaveCommunity = async (communityId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('community_members')
        .delete()
        .eq('community_id', communityId)
        .eq('user_id', user.id);

      toast({
        title: "Success",
        description: "Left community successfully!"
      });

      fetchCommunities();
    } catch (error) {
      console.error('Error leaving community:', error);
      toast({
        title: "Error",
        description: "Failed to leave community",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Communities</h1>
            <p className="text-muted-foreground mt-2">Connect with your institutions and groups</p>
          </div>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Community
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Community</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Community name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your community"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'public' | 'private' })}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <Button onClick={createCommunity} className="w-full">
                  Create Community
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {communities.map((community) => (
            <Card key={community.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{community.name}</CardTitle>
                  <Badge variant={community.type === 'public' ? 'default' : 'secondary'}>
                    {community.type}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{community.description}</p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {community.member_count} members
                  </div>
                  <div className="flex gap-2">
                    {community.is_member ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/community/${community.id}`)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => leaveCommunity(community.id)}
                        >
                          Leave
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => joinCommunity(community.id)}
                      >
                        Join
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {communities.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No communities yet</h3>
            <p className="text-muted-foreground">Create the first community to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}