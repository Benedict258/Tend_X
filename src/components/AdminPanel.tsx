import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Users, Calendar, BarChart3, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AdminPanel = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  if (profile?.role !== 'admin') {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Admin Panel
          <Badge variant="default" className="ml-auto">Admin</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/create-space')}
            className="flex flex-col items-center gap-2 h-auto py-3"
          >
            <Calendar className="h-4 w-4" />
            <span className="text-xs">Create Event</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="flex flex-col items-center gap-2 h-auto py-3"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="text-xs">Dashboard</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/communities')}
            className="flex flex-col items-center gap-2 h-auto py-3"
          >
            <Users className="h-4 w-4" />
            <span className="text-xs">Communities</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/settings')}
            className="flex flex-col items-center gap-2 h-auto py-3"
          >
            <Settings className="h-4 w-4" />
            <span className="text-xs">Settings</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminPanel;