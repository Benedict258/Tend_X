-- Create spaces table for attendance sessions
CREATE TABLE public.spaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Class', 'Event', 'Custom')),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  required_fields JSONB DEFAULT '[]'::jsonb,
  qr_code TEXT,
  unique_code TEXT NOT NULL UNIQUE,
  public_link TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paused', 'closed')),
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance_records table for submissions
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Enable RLS on both tables
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for spaces
CREATE POLICY "Admins can manage their own spaces" 
ON public.spaces 
FOR ALL 
USING (admin_id = auth.uid())
WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Everyone can view open spaces" 
ON public.spaces 
FOR SELECT 
USING (status = 'open');

-- RLS policies for attendance_records
CREATE POLICY "Admins can view records for their spaces" 
ON public.attendance_records 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.spaces 
    WHERE spaces.id = attendance_records.space_id 
    AND spaces.admin_id = auth.uid()
  )
);

CREATE POLICY "Anyone can submit attendance" 
ON public.attendance_records 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own records" 
ON public.attendance_records 
FOR SELECT 
USING (user_id = auth.uid());

-- Create function to generate unique codes
CREATE OR REPLACE FUNCTION public.generate_space_code()
RETURNS TEXT AS $$
BEGIN
  RETURN 'TEND-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger for spaces
CREATE TRIGGER update_spaces_updated_at
BEFORE UPDATE ON public.spaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_spaces_admin_id ON public.spaces(admin_id);
CREATE INDEX idx_spaces_unique_code ON public.spaces(unique_code);
CREATE INDEX idx_attendance_records_space_id ON public.attendance_records(space_id);
CREATE INDEX idx_attendance_records_user_id ON public.attendance_records(user_id);