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
} from '@mui/material';
import TeamMap from './components/TeamMap';
import MembersPanel from './components/MembersPanel';
import ProductsPanel from './components/ProductsPanel';
import TaskOrdersPanel from './components/TaskOrdersPanel';
import ReviewsPanel from './components/ReviewsPanel';
import NotificationsPanel from './components/NotificationsPanel';
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
  const { userRole } = useContext(AuthContext);
  const theme = useTheme();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentTeamRole, setCurrentTeamRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTeamLead, setIsTeamLead] = useState(false);

  useEffect(() => {
    if (!parsedTeamId) {
      setError('Invalid team ID');
      setLoading(false);
      return;
    }

    const fetchTeamData = async () => {
      try {
        // Fetch team details
        const teamResponse = await invoke<string>('get_team', { teamId: parsedTeamId });
        const teamData = JSON.parse(teamResponse);
        setTeam(teamData.data);

        // Fetch team members
        const membersResponse = await invoke<string>('get_team_users', { teamId: parsedTeamId });
        const membersData = JSON.parse(membersResponse);
        setMembers(membersData.data?.members || []);

        // Get current user's role in this team
        const userTeamsResponse = await invoke<string>('get_user_teams');
        const userTeams = JSON.parse(userTeamsResponse).data || [];
        const currentTeam = userTeams.find((t: any) => t.id === parsedTeamId);
        
        if (currentTeam) {
          const teamRole = currentTeam.role || 'member';
          setCurrentTeamRole(teamRole);
          setIsTeamLead(teamRole === 'team_lead' || userRole === 'admin');
        } else {
          // User is not part of this team, redirect to teams page
          navigate('/teams');
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
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
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
    <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {team.name} Dashboard
      </Typography>
      
      <Divider sx={{ mb: 2 }} />
      
      {/* Map Section */}
      <Paper sx={{ p: 2, mb: 3, height: '40vh', overflow: 'hidden' }}>
        <Typography variant="h6" gutterBottom>
          Team Coverage Map
        </Typography>
        <TeamMap teamId={parsedTeamId} />
      </Paper>
      
      {/* Tabs Section */}
      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
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
        </Tabs>
        
        <Box sx={{ p: 2, flexGrow: 1, overflow: 'auto' }}>
          {activeTab === 0 && <MembersPanel teamId={parsedTeamId} members={members} isTeamLead={isTeamLead} />}
          {activeTab === 1 && <ProductsPanel teamId={parsedTeamId} isTeamLead={isTeamLead} />}
          {activeTab === 2 && <TaskOrdersPanel teamId={parsedTeamId} isTeamLead={isTeamLead} />}
          {activeTab === 3 && <ReviewsPanel teamId={parsedTeamId} isTeamLead={isTeamLead} />}
          {activeTab === 4 && <NotificationsPanel teamId={parsedTeamId} isTeamLead={isTeamLead} />}
        </Box>
      </Paper>
    </Box>
  );
};

export default TeamDashboard;