import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { AgentConfig } from '@/app/types';
import { allAgentSets, defaultAgentSetKey } from '@/app/agentConfigs';

export function useAgentSelection() {
  const searchParams = useSearchParams();
  const [selectedAgentName, setSelectedAgentNameInternal] = useState<string>("");
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState<AgentConfig[] | null>(null);
  
  // Add a wrapper around setSelectedAgentName to add logging
  const setSelectedAgentName = useCallback((newAgentName: string) => {
    console.log(`[AGENT-SELECTION] Changing agent from "${selectedAgentName}" to "${newAgentName}"`);
    
    if (selectedAgentConfigSet) {
      const agentExists = selectedAgentConfigSet.some(agent => agent.name === newAgentName);
      if (!agentExists) {
        console.error(`[AGENT-SELECTION] ERROR: Agent "${newAgentName}" not found in config set!`);
        console.log(`[AGENT-SELECTION] Available agents: ${selectedAgentConfigSet.map(a => a.name).join(', ')}`);
        return; // Don't set invalid agent names
      }
    } else {
      console.warn(`[AGENT-SELECTION] Warning: selectedAgentConfigSet is null when setting agent to "${newAgentName}"`);
    }
    
    setSelectedAgentNameInternal(newAgentName);
    console.log(`[AGENT-SELECTION] Agent change completed to "${newAgentName}"`);
  }, [selectedAgentName, selectedAgentConfigSet]);
  
  useEffect(() => {
    let finalAgentConfig = searchParams.get("agentConfig");
    if (!finalAgentConfig || !allAgentSets[finalAgentConfig]) {
      finalAgentConfig = defaultAgentSetKey;
      const url = new URL(window.location.toString());
      url.searchParams.set("agentConfig", finalAgentConfig);
      window.location.replace(url.toString());
      return;
    }

    const agents = allAgentSets[finalAgentConfig];
    const agentKeyToUse = agents[0]?.name || "";
    
    console.log(`[AGENT-SELECTION] Initial config setup: ${finalAgentConfig}, setting agent to "${agentKeyToUse}"`);
    console.log(`[AGENT-SELECTION] Available agents: ${agents.map(a => a.name).join(', ')}`);

    setSelectedAgentNameInternal(agentKeyToUse);
    setSelectedAgentConfigSet(agents);
  }, [searchParams]);

  // Log when the selected agent actually changes
  useEffect(() => {
    if (selectedAgentName) {
      console.log(`[AGENT-SELECTION] Agent state updated to: "${selectedAgentName}"`);
    }
  }, [selectedAgentName]);

  const handleSelectedAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAgentName = e.target.value;
    console.log(`[AGENT-SELECTION] Manual agent change via dropdown to "${newAgentName}"`);
    setSelectedAgentName(newAgentName);
  };

  const agentSetKey = searchParams.get("agentConfig") || "default";

  return {
    selectedAgentName,
    setSelectedAgentName,
    selectedAgentConfigSet,
    handleSelectedAgentChange,
    agentSetKey
  };
}