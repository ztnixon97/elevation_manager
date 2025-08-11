// src/pages/teams/TeamsPage.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import TeamsList from './TeamsList';
import TeamCreate from './TeamCreate';

const TeamsPage: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<TeamsList />} />
      <Route path="/create" element={<TeamCreate />} />
    </Routes>
  );
};

export default TeamsPage;