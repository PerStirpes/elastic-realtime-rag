import greeter from "./greeter"
import vaAgent from "./vaAgent"
import elasticExpert from "./elasticBlogsAgent"
import medicareAgent from "./medicareAgent"
import irsAgent from "./irsAgent"
import { injectTransferTools } from "../utility"
import bioguideAgent from "./bioguideAgent"

greeter.downstreamAgents = [vaAgent, elasticExpert, medicareAgent, irsAgent, bioguideAgent]
vaAgent.downstreamAgents = [elasticExpert, medicareAgent, greeter, irsAgent, bioguideAgent]
elasticExpert.downstreamAgents = [vaAgent, medicareAgent, greeter, irsAgent, bioguideAgent]
medicareAgent.downstreamAgents = [vaAgent, elasticExpert, greeter, irsAgent, bioguideAgent]
irsAgent.downstreamAgents = [vaAgent, elasticExpert, greeter, medicareAgent, bioguideAgent]

const agents = injectTransferTools([greeter, vaAgent, elasticExpert, medicareAgent, irsAgent, bioguideAgent])

export default agents
