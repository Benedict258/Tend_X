import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import AdminPanel from '@/components/AdminPanel';
import { User, Settings, Plus, QrCode, Calendar, Users, Bell, MessageSquare, LogOut } from 'lucide-react';

const Index = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const isAdmin = profile?.role === 'admin';

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Welcome to TendX
            </h1>
            <p className="text-xl text-muted-foreground mt-2">
              Welcome back, {profile?.full_name || 'User'}! Ready to manage attendance?
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={isAdmin ? 'default' : 'secondary'}>
              {isAdmin ? 'Admin' : 'User'}
            </Badge>
            <div className="flex items-center gap-2">
              <Link to="/profile">
                <Button variant="outline" className="flex items-center gap-2">
                  {profile?.profile_picture ? (
                    <img 
                      src={profile.profile_picture} 
                      alt="Profile" 
                      className="w-4 h-4 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  Profile
                </Button>
              </Link>
              <Link to="/settings">
                <Button variant="outline" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              </Link>
              <Button variant="outline" onClick={handleSignOut} className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Admin Panel */}
        {isAdmin && (
          <div className="mb-8">
            <AdminPanel />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isAdmin && (
            <>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/create-space')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5 text-primary" />
                    Create Space
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Create a new attendance space for your class, event, or custom purpose.
                  </p>
                  <Button className="w-full" onClick={() => navigate('/create-space')}>
                    Create New Space
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/dashboard')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-primary" />
                    Manage Attendance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    View and manage attendance records for your spaces.
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => navigate('/dashboard')}>
                    View Dashboard
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    Quick Join
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Enter an attendance code to quickly join a session.
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => {
                    const code = prompt('Enter attendance code:');
                    if (code) navigate(`/attend/${code}`);
                  }}>
                    Enter Code
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-accent" />
                Join Space
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Enter an attendance code to join a session.
              </p>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  const code = prompt('Enter attendance code:');
                  if (code) navigate(`/attend/${code}`);
                }}
              >
                Enter Code
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/communities')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                Communities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Join or create communities to connect with others.
              </p>
              <Button variant="outline" className="w-full" onClick={() => navigate('/communities')}>
                View Communities
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/notifications')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-accent" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Stay updated with invites and announcements.
              </p>
              <Button variant="outline" className="w-full" onClick={() => navigate('/notifications')}>
                View Notifications
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/settings')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-accent" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Manage your account preferences and security settings.
              </p>
              <Button variant="outline" className="w-full" onClick={() => navigate('/settings')}>
                Open Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">0</div>
                  <div className="text-sm text-muted-foreground">
                    {isAdmin ? 'Created Spaces' : 'Joined Spaces'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">0</div>
                  <div className="text-sm text-muted-foreground">
                    {isAdmin ? 'Total Attendees' : 'Attendance Records'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">0</div>
                  <div className="text-sm text-muted-foreground">
                    {isAdmin ? 'Active Events' : 'Communities Joined'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
