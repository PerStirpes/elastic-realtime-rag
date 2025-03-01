import { useState, useEffect } from 'react';

export function useEventsPaneState() {
  const [isEventsPaneExpanded, setIsEventsPaneExpanded] = useState<boolean>(false);
  
  useEffect(() => {
    const storedLogsExpanded = localStorage.getItem("logsExpanded");
    if (storedLogsExpanded) {
      setIsEventsPaneExpanded(storedLogsExpanded === "true");
    }
  }, []);
  
  useEffect(() => {
    localStorage.setItem("logsExpanded", isEventsPaneExpanded.toString());
  }, [isEventsPaneExpanded]);
  
  return { 
    isEventsPaneExpanded, 
    setIsEventsPaneExpanded 
  };
}