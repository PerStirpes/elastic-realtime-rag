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

      <div className="flex-shrink-0 flex items-center justify-center w-full md:w-auto order-last md:order-none" style={{ minHeight: "235px" }}>
        <AudioDancerComponent 
          localStream={localStream} 
          remoteStream={remoteStream} 
        />
      </div>
      
      <Events isExpanded={isEventsPaneExpanded} />
    </div>
  );
}