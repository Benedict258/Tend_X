import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, ArrowLeft, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Community {
  id: string;
  name: string;
  description: string;
  creator_id: string;
  type: 'public' | 'private';
  invite_code: string;
  created_at: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  author_id: string;
  community_id: string;
  space_id?: string;
  is_public: boolean;
  created_at: string;
  author?: {
    full_name: string;
    user_id: string;
  };
}

export default function CommunityDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postData, setPostData] = useState({
    title: '',
    content: '',
    is_public: true
  });

  useEffect(() => {
    if (id) {
      fetchCommunityDetails();
      fetchPosts();
    }
  }, [id]);

  const fetchCommunityDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCommunity({
        ...data,
        type: data.type as 'public' | 'private'
      });
    } catch (error) {
      console.error('Error fetching community:', error);
      toast({
        title: "Error",
        description: "Failed to load community details",
        variant: "destructive"
      });
    }
  };

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('community_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch author details separately to avoid foreign key issues
      const postsWithAuthors = await Promise.all(
        (data || []).map(async (post) => {
          const { data: author } = await supabase
            .from('users')
            .select('full_name, user_id')
            .eq('id', post.author_id)
            .maybeSingle();

          return {
            ...post,
            author: author || { full_name: 'Unknown', user_id: '' }
          };
        })
      );

      setPosts(postsWithAuthors);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createPost = async () => {
    if (!user || !postData.title.trim() || !postData.content.trim()) return;

    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          title: postData.title,
          content: postData.content,
          author_id: user.id,
          community_id: id,
          is_public: postData.is_public
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post created successfully!"
      });

      setShowCreatePost(false);
      setPostData({ title: '', content: '', is_public: true });
      fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive"
      });
    }
  };

  if (loading || !community) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate('/communities')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Communities
          </Button>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{community.name}</CardTitle>
                <p className="text-muted-foreground mt-2">{community.description}</p>
              </div>
              <Badge variant={community.type === 'public' ? 'default' : 'secondary'}>
                {community.type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Community
              </div>
              <Dialog open={showCreatePost} onOpenChange={setShowCreatePost}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Post
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Post</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Title</label>
                      <Input
                        value={postData.title}
                        onChange={(e) => setPostData({ ...postData, title: e.target.value })}
                        placeholder="Post title"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Content</label>
                      <Textarea
                        value={postData.content}
                        onChange={(e) => setPostData({ ...postData, content: e.target.value })}
                        placeholder="Write your post content"
                        rows={6}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_public"
                        checked={postData.is_public}
                        onChange={(e) => setPostData({ ...postData, is_public: e.target.checked })}
                      />
                      <label htmlFor="is_public" className="text-sm">Public post</label>
                    </div>
                    <Button onClick={createPost} className="w-full">
                      Create Post
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Posts</h2>
          
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No posts yet</h3>
              <p className="text-muted-foreground">Be the first to share something with the community!</p>
            </div>
          ) : (
            posts.map((post) => (
              <Card key={post.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{post.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        By {post.author?.full_name || 'Unknown'} • {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {post.is_public && (
                      <Badge variant="outline">Public</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap">{post.content}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}