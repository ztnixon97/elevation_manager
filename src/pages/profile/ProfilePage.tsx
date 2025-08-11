// src/pages/profile/ProfilePage.tsx
import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const ProfilePage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Profile
      </Typography>
      
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            User Profile Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            User profile interface will be implemented here, including:
          </Typography>
          <ul>
            <li>Personal information management</li>
            <li>Password change</li>
            <li>Team memberships</li>
            <li>Activity history</li>
            <li>Notification preferences</li>
          </ul>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProfilePage;