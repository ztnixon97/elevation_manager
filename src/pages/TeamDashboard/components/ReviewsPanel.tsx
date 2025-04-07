// src/pages/TeamDashboard/components/ReviewsPanel.tsx - updated to use the new component

import React from 'react';
import TeamReviewsPanel from '../../../components/TeamReviewPanel';

interface ReviewsPanelProps {
  teamId: number;
  isTeamLead: boolean;
}

const ReviewsPanel: React.FC<ReviewsPanelProps> = ({ teamId, isTeamLead }) => {
  return (
    <TeamReviewsPanel teamId={teamId} isTeamLead={isTeamLead} />
  );
};

export default ReviewsPanel;