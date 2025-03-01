import React from 'react';
import Transcript from './Transcript';
import Events from './Events';
import AudioDancerComponent from './AudioDancerComponent';

interface MainProps {
  userText: string;
  setUserText: (text: string) => void;
  onSendMessage: () => void;
  canSend: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isEventsPaneExpanded: boolean;
}

export function Main({
  userText,
  setUserText,
  onSendMessage,
  canSend,
  localStream,
  remoteStream,
  isEventsPaneExpanded
}: MainProps) {
  return (
    <div className="flex flex-col md:flex-row flex-1 gap-2 px-2 overflow-hidden relative">
      <Transcript
        userText={userText}
        setUserText={setUserText}
        onSendMessage={onSendMessage}
        canSend={canSend}
      />

      <AudioDancerComponent 
        localStream={localStream} 
        remoteStream={remoteStream} 
      />
      
      <Events isExpanded={isEventsPaneExpanded} />
    </div>
  );
}