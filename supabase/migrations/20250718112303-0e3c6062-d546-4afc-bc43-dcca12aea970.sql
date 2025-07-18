-- Create communities table
CREATE TABLE public.communities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  creator_id UUID NOT NULL,
  banner_image TEXT,
  type TEXT NOT NULL DEFAULT 'public' CHECK (type IN ('public', 'private')),
  invite_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create community members table
CREATE TABLE public.community_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- Create posts table
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL,
  community_id UUID REFERENCES public.communities(id) ON DELETE CASCADE,
  space_id UUID REFERENCES public.spaces(id) ON DELETE SET NULL,
  images TEXT[],
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('event_invite', 'community_invite', 'attendance_reminder', 'general')),
  read BOOLEAN NOT NULL DEFAULT false,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event invites table
CREATE TABLE public.event_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL,
  invitee_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(space_id, invitee_id)
);

-- Enable Row Level Security
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for communities
CREATE POLICY "Public communities are visible to everyone" 
ON public.communities FOR SELECT 
USING (type = 'public' OR creator_id = auth.uid());

CREATE POLICY "Users can create communities" 
ON public.communities FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Community creators can update their communities" 
ON public.communities FOR UPDATE 
USING (auth.uid() = creator_id);

CREATE POLICY "Community creators can delete their communities" 
ON public.communities FOR DELETE 
USING (auth.uid() = creator_id);

-- RLS Policies for community members
CREATE POLICY "Community members can view memberships" 
ON public.community_members FOR SELECT 
USING (
  user_id = auth.uid() OR 
  community_id IN (
    SELECT id FROM public.communities WHERE creator_id = auth.uid()
  )
);

CREATE POLICY "Users can join communities" 
ON public.community_members FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Community admins can manage members" 
ON public.community_members FOR UPDATE 
USING (
  community_id IN (
    SELECT id FROM public.communities WHERE creator_id = auth.uid()
  )
);

CREATE POLICY "Users can leave communities" 
ON public.community_members FOR DELETE 
USING (
  user_id = auth.uid() OR 
  community_id IN (
    SELECT id FROM public.communities WHERE creator_id = auth.uid()
  )
);

-- RLS Policies for posts
CREATE POLICY "Users can view public posts" 
ON public.posts FOR SELECT 
USING (
  is_public = true OR 
  author_id = auth.uid() OR
  (community_id IS NOT NULL AND community_id IN (
    SELECT community_id FROM public.community_members WHERE user_id = auth.uid()
  ))
);

CREATE POLICY "Users can create posts" 
ON public.posts FOR INSERT 
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their posts" 
ON public.posts FOR UPDATE 
USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their posts" 
ON public.posts FOR DELETE 
USING (auth.uid() = author_id);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for event invites
CREATE POLICY "Users can view invites they sent or received" 
ON public.event_invites FOR SELECT 
USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

CREATE POLICY "Users can create event invites" 
ON public.event_invites FOR INSERT 
WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Invitees can update invite status" 
ON public.event_invites FOR UPDATE 
USING (auth.uid() = invitee_id);

-- Add triggers for updated_at
CREATE TRIGGER update_communities_updated_at
  BEFORE UPDATE ON public.communities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_invites_updated_at
  BEFORE UPDATE ON public.event_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate invite codes
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'COMM-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_community_members_user_id ON public.community_members(user_id);
CREATE INDEX idx_community_members_community_id ON public.community_members(community_id);
CREATE INDEX idx_posts_author_id ON public.posts(author_id);
CREATE INDEX idx_posts_community_id ON public.posts(community_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_event_invites_invitee_id ON public.event_invites(invitee_id);
CREATE INDEX idx_event_invites_space_id ON public.event_invites(space_id);