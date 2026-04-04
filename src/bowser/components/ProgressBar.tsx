import React from 'react';

interface ProgressBarProps {
  isLoading: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div className="progress-bar-container" role="progressbar" aria-label="Loading">
      <div className="progress-bar-indicator" />
    </div>
  );
};
