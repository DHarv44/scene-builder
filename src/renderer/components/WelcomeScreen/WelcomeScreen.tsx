import React from 'react';
import './WelcomeScreen.css';

interface WelcomeScreenProps {
  onNewScene: () => void;
  onOpenScene: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNewScene, onOpenScene }) => {
  return (
    <div className="welcome-screen">
      <h1>Low Sun Scene Builder</h1>
      <p>Visual timeline editor for creating cutscenes</p>
      <div className="welcome-actions">
        <button onClick={onNewScene} className="primary">
          New Scene
        </button>
        <button onClick={onOpenScene}>Open Existing...</button>
      </div>
    </div>
  );
};

export default WelcomeScreen;
