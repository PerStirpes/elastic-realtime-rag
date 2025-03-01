import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { AgentConfig } from '@/app/types';
import { allAgentSets, defaultAgentSetKey } from '@/app/agentConfigs';

export function useAgentSelection() {
  const searchParams = useSearchParams();
  const [selectedAgentName, setSelectedAgentName] = useState<string>("");
  const [selectedAgentConfigSet, setSelectedAgentConfigSet] = useState<AgentConfig[] | null>(null);
  
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

    setSelectedAgentName(agentKeyToUse);
    setSelectedAgentConfigSet(agents);
  }, [searchParams]);

  const handleSelectedAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAgentName = e.target.value;
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