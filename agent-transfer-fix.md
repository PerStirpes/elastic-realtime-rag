# Agent Transfer Issue Fix

## Problem Analysis

The issue where the greeter agent sometimes fails to transfer users to a different agent appears to be related to how agent transfers are executed in Next.js with its server-side and client-side rendering contexts. 

The problem analysis identifies several potential issues:

1. **Race Condition**: The agent transfer may be racing with client-side state updates, causing transfers to be missed or overridden
2. **Lack of Transfer Confirmation**: No logging or verification that the transfer was successful on both sides
3. **Client-Side Rendering Issues**: The transfer logic is handled in React hooks which may not synchronize correctly with server events
4. **State Synchronization**: No clear way to confirm that `setSelectedAgentName` took effect before responding to the AI

## Proposed Solution

We'll implement the following changes:

### 1. Enhanced Logging for Agent Transfers

Add detailed logging in the transfer process to track when transfers are requested and whether they succeed.

```typescript
// In useHandleServerEvent.ts - handleAgentTransfer function
const handleAgentTransfer = (args: any, callId?: string) => {
    const destinationAgent = args.destination_agent;

    // Log transfer request
    console.log(`[TRANSFER] Request to transfer to agent: ${destinationAgent}`);

    // Find the requested agent config
    const newAgentConfig = selectedAgentConfigSet?.find((a) => a.name === destinationAgent) || null;

    // Perform the transfer if agent exists
    const transferSuccessful = !!newAgentConfig;
    if (transferSuccessful) {
        console.log(`[TRANSFER] Found destination agent config: ${destinationAgent}`);
        
        // Log current state before transfer
        console.log(`[TRANSFER] Current agent: ${selectedAgentName}`);
        
        // Execute transfer
        setSelectedAgentName(destinationAgent);
        
        // Log after transfer execution
        console.log(`[TRANSFER] Transfer executed to: ${destinationAgent}`);
    } else {
        console.error(`[TRANSFER] FAILED - agent not found: ${destinationAgent}`);
        console.log(`[TRANSFER] Available agents: ${selectedAgentConfigSet?.map(a => a.name).join(', ')}`);
    }

    // Prepare response data
    const transferResult = {
        destination_agent: destinationAgent,
        did_transfer: transferSuccessful,
    };

    // Log the transfer result
    addTranscriptBreadcrumb(`Transfer to ${destinationAgent}`, transferResult);

    // Send result back to AI
    sendClientEvent({
        type: "conversation.item.create",
        item: {
            type: "function_call_output",
            call_id: callId,
            output: JSON.stringify(transferResult),
        },
    });
};
```

### 2. Add Transfer Verification Mechanism

Implement a verification callback that confirms the agent was changed before responding to the AI.

```typescript
// In useHandleServerEvent.ts - handleAgentTransfer function (updated)
const handleAgentTransfer = (args: any, callId?: string) => {
    const destinationAgent = args.destination_agent;
    
    console.log(`[TRANSFER] Request to transfer to agent: ${destinationAgent}`);
    
    // Find the requested agent config
    const newAgentConfig = selectedAgentConfigSet?.find((a) => a.name === destinationAgent) || null;
    
    // Perform the transfer if agent exists
    const transferSuccessful = !!newAgentConfig;
    if (transferSuccessful) {
        console.log(`[TRANSFER] Transferring to agent: ${destinationAgent}`);
        
        // Store current agent for verification
        const previousAgent = selectedAgentName;
        
        // Execute transfer
        setSelectedAgentName(destinationAgent);
        
        // Use setTimeout to verify the transfer completed
        setTimeout(() => {
            // This will run after React state updates have been processed
            console.log(`[TRANSFER] Verification - Previous: ${previousAgent}, Current: ${selectedAgentName}`);
            
            const verifiedSuccess = selectedAgentName === destinationAgent;
            console.log(`[TRANSFER] Verification ${verifiedSuccess ? 'SUCCESS' : 'FAILED'}`);
            
            // Send result back to AI with verified status
            const transferResult = {
                destination_agent: destinationAgent,
                did_transfer: verifiedSuccess,
                verified: true
            };
            
            addTranscriptBreadcrumb(`Transfer to ${destinationAgent}`, transferResult);
            
            sendClientEvent({
                type: "conversation.item.create",
                item: {
                    type: "function_call_output",
                    call_id: callId,
                    output: JSON.stringify(transferResult),
                },
            });
        }, 100); // Small delay to allow React state to update
        
        return; // Early return to prevent immediate response
    } else {
        console.error(`[TRANSFER] FAILED - agent not found: ${destinationAgent}`);
        
        // Prepare failure response
        const transferResult = {
            destination_agent: destinationAgent,
            did_transfer: false,
            reason: "Agent not found"
        };
        
        addTranscriptBreadcrumb(`Transfer to ${destinationAgent} failed`, transferResult);
        
        sendClientEvent({
            type: "conversation.item.create",
            item: {
                type: "function_call_output",
                call_id: callId,
                output: JSON.stringify(transferResult),
            },
        });
    }
};
```

### 3. Add Update Session Trigger After Transfer

Ensure that the session is updated after the agent is changed:

```typescript
// In useHandleServerEvent.ts - handleAgentTransfer function (updated)
const handleAgentTransfer = (args: any, callId?: string) => {
    // ... existing code ...
    
    if (transferSuccessful) {
        console.log(`[TRANSFER] Transferring to agent: ${destinationAgent}`);
        
        // Store current agent for verification
        const previousAgent = selectedAgentName;
        
        // Execute transfer
        setSelectedAgentName(destinationAgent);
        
        // Use setTimeout to verify the transfer completed
        setTimeout(() => {
            // This will run after React state updates have been processed
            console.log(`[TRANSFER] Verification - Previous: ${previousAgent}, Current: ${selectedAgentName}`);
            
            const verifiedSuccess = selectedAgentName === destinationAgent;
            console.log(`[TRANSFER] Verification ${verifiedSuccess ? 'SUCCESS' : 'FAILED'}`);
            
            // Trigger session update to configure the new agent's tools and settings
            if (verifiedSuccess) {
                sendClientEvent({ 
                    type: "session.update.after.transfer",
                    agent: destinationAgent
                }, "Trigger session update after transfer");
            }
            
            // Send result back to AI with verified status
            const transferResult = {
                destination_agent: destinationAgent,
                did_transfer: verifiedSuccess,
                verified: true
            };
            
            // ... rest of the code ...
        }, 100);
    }
};
```

### 4. Improve the Transfer Protocol in greeter.ts

Modify the greeter.ts file to make the transfer process more robust by adding extra checks:

```typescript
// In greeter.ts - modify the prompt section related to transfers

// Add this to the agent instructions:
`When you determine you need to transfer a user to another agent:
1. First tell the user you're going to transfer them
2. Then use the transferAgents function with detailed rationale
3. After the transfer is complete, wait for the function response
4. Verify the did_transfer field in the response is true
5. If transfer was successful, tell the user they've been transferred
6. If transfer failed, apologize and continue helping the user yourself

Example of a good transfer:
"I'll transfer you to our Veteran Affairs Expert who can better assist with your benefits questions."
[Call transferAgents function]
"Great news! You're now connected with our Veteran Affairs Expert who will assist you."
`
```

## Implementation Strategy

1. Add the enhanced logging first to identify where the issue occurs
2. Implement the verification mechanism to ensure transfers complete
3. Add the session update trigger to properly configure the new agent
4. Deploy and monitor the transfer success rate

## Testing and Validation

To validate this fix, we should:

1. Create a test script that repeatedly requests transfers between agents
2. Monitor the logs to see if transfers are completing successfully
3. Compare transfer success rates before and after the changes
4. Test in various network conditions to ensure reliability

The key to fixing this issue is validating that the agent transfer state update has actually completed before responding to the AI. The setTimeout approach gives React time to process the state update, ensuring the new agent is properly configured before the AI continues.