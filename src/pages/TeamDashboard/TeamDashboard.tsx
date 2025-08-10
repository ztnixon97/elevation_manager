// src/pages/TeamDashboard/TeamDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Divider,
  CircularProgress,
  Alert,
  useTheme,
  Card,
  CardContent,
} from '@mui/material';
import TeamMap from './components/TeamMap';
import MembersPanel from './components/MembersPanel';
import ProductsPanel from './components/ProductsPanel';
import TaskOrdersPanel from './components/TaskOrdersPanel';
import ReviewsPanel from './components/ReviewsPanel';
import NotificationsPanel from './components/NotificationsPanel';
import PendingRequestsPanel from './components/PendingRequestsPanel';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

interface Team {
  id: number;
  name: string;
}

interface TeamMember {
  user_id: number;
  username: string;
  role: string;
}

const TeamDashboard: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const parsedTeamId = teamId ? parseInt(teamId, 10) : null;
  const navigate = useNavigate();
  const { userRole, userId, username } = useContext(AuthContext);
  const theme = useTheme();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentTeamRole, setCurrentTeamRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTeamLead, setIsTeamLead] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  // Add a state to track which tabs have been rendered
  const [renderedTabs, setRenderedTabs] = useState<Set<number>>(new Set([0])); // Start with first tab

  useEffect(() => {
    if (!parsedTeamId) {
      setError('Invalid team ID');
      setLoading(false);
      return;
    }

    const fetchTeamData = async () => {
      try {
        // Fetch team details
        const teamResponse = await invoke<string>('get_team', { team_id: parsedTeamId });
        const teamData = JSON.parse(teamResponse);
        setTeam(teamData.data);

        // Fetch team members
        const membersResponse = await invoke<string>('get_team_users', { team_id: parsedTeamId });
        const membersData = JSON.parse(membersResponse);
        setMembers(membersData.data?.members || []);

        // Get current user's role in this team
        const userTeamsResponse = await invoke<string>('get_user_teams');
        const userTeams = JSON.parse(userTeamsResponse).data || [];
        const currentTeam = userTeams.find((t: any) => (t.id ?? t.team_id) === parsedTeamId);
        
        if (currentTeam) {
          const teamRole = currentTeam.role || 'member';
          setCurrentTeamRole(teamRole);
          setIsTeamLead(teamRole === 'team_lead' || userRole === 'admin');
          
          // If team lead, fetch pending requests count
          if (teamRole === 'team_lead' || userRole === 'admin') {
            try {
              const requestsResponse = await invoke<string>('get_pending_team_requests', { 
                team_id: parsedTeamId 
              });
              const requestsData = JSON.parse(requestsResponse);
              setPendingRequestsCount(requestsData.data?.length || 0);
            } catch (err) {
              console.error('Failed to fetch pending requests:', err);
            }
          }
        } else {
          // User is not part of this team
          // Show a warning before redirecting based on role
          setError('You are not a member of this team. Redirecting...');
          setTimeout(() => {
            if (userRole === 'admin' || userRole === 'manager') {
              navigate(`/admin/teams/${parsedTeamId}`);
            } else {
              navigate('/teams');
            }
          }, 1200);
        }
      } catch (err) {
        console.error('Failed to load team data:', err);
        setError(typeof err === 'string' ? err : 'Failed to load team data');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [parsedTeamId, navigate, userRole]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    // Add this tab to the set of rendered tabs
    setRenderedTabs(prev => new Set([...prev, newValue]));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!parsedTeamId) {
    return (
      <Box p={4}>
        <Alert severity="error">Invalid team ID</Alert>
      </Box>
    );
  }

  if (error || !team) {
    return (
      <Box p={4}>
        <Alert severity="error">{error || 'Team not found'}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {team.name} Dashboard
      </Typography>

      <Divider sx={{ mb: 2 }} />

      {/* Map Section */}
      <Box sx={{ flex: '0 0 33vh', overflow: 'hidden' }}>
        <TeamMap teamId={parsedTeamId} />
      </Box>

      {/* Summary and Tabs Section */}
      <Box sx={{ flex: '1 1 auto', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Scrollable Summary Section */}
        <Box sx={{ flex: '0 0 auto', overflowY: 'auto', mb: 2 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(200px, 1fr))', gap: 24 }}>
            <Box>
              <Card sx={{ width: '100%', height: '100%' }}>
                <CardContent>
                  <Typography variant="h6">Team Members</Typography>
                  <Typography variant="h4">{members.length}</Typography>
                </CardContent>
              </Card>
            </Box>
            <Box>
              <Card sx={{ width: '100%', height: '100%' }}>
                <CardContent>
                  <Typography variant="h6">Active Products</Typography>
                  <Typography variant="h4">{/* Add logic to count active products */}</Typography>
                </CardContent>
              </Card>
            </Box>
            <Box>
              <Card sx={{ width: '100%', height: '100%' }}>
                <CardContent>
                  <Typography variant="h6">Pending Reviews</Typography>
                  <Typography variant="h4">{/* Add logic to count pending reviews */}</Typography>
                </CardContent>
              </Card>
            </Box>
            {isTeamLead && (
              <Box>
                <Card sx={{ width: '100%', height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6">Pending Requests</Typography>
                    <Typography variant="h4">{pendingRequestsCount}</Typography>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Box>
        </Box>

        {/* Tabs Section */}
        <Paper sx={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="Members" />
            <Tab label="Products" />
            <Tab label="Task Orders" />
            <Tab label="Reviews" />
            <Tab label="Notifications" />
            {isTeamLead && <Tab label="Pending Requests" />}
          </Tabs>

          <Box sx={{ p: 2, flexGrow: 1, overflow: 'auto' }}>
            {/* Only render the tab content if it's active or has been rendered before */}
            {(activeTab === 0 || renderedTabs.has(0)) && 
              <Box sx={{ display: activeTab === 0 ? 'block' : 'none' }}>
                <MembersPanel teamId={parsedTeamId} members={members} isTeamLead={isTeamLead} />
              </Box>
            }
            {(activeTab === 1 || renderedTabs.has(1)) && 
              <Box sx={{ display: activeTab === 1 ? 'block' : 'none' }}>
                <ProductsPanel teamId={parsedTeamId} isTeamLead={isTeamLead} />
              </Box>
            }
            {(activeTab === 2 || renderedTabs.has(2)) && 
              <Box sx={{ display: activeTab === 2 ? 'block' : 'none' }}>
                <TaskOrdersPanel teamId={parsedTeamId} isTeamLead={isTeamLead} />
              </Box>
            }
            {(activeTab === 3 || renderedTabs.has(3)) && 
              <Box sx={{ display: activeTab === 3 ? 'block' : 'none' }}>
                <ReviewsPanel teamId={parsedTeamId} isTeamLead={isTeamLead} />
              </Box>
            }
            {(activeTab === 4 || renderedTabs.has(4)) && 
              <Box sx={{ display: activeTab === 4 ? 'block' : 'none' }}>
                <NotificationsPanel teamId={parsedTeamId} isTeamLead={isTeamLead} />
              </Box>
            }
            {isTeamLead && (activeTab === 5 || renderedTabs.has(5)) && 
              <Box sx={{ display: activeTab === 5 ? 'block' : 'none' }}>
                <PendingRequestsPanel teamId={parsedTeamId} />
              </Box>
            }
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default TeamDashboard;
