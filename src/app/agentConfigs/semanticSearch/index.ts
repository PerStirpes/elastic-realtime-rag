import greeter from "./greeter"
import vaAgent from "./vaAgent"
import elasticExpert from "./elasticBlogsAgent"
import medicareAgent from "./medicareAgent"
import irsAgent from "./irsAgent"
import { injectTransferTools } from "../utility"

greeter.downstreamAgents = [vaAgent, elasticExpert, medicareAgent, irsAgent]
vaAgent.downstreamAgents = [elasticExpert, medicareAgent, greeter, irsAgent]
elasticExpert.downstreamAgents = [vaAgent, medicareAgent, greeter, irsAgent]
medicareAgent.downstreamAgents = [vaAgent, elasticExpert, greeter, irsAgent]

const agents = injectTransferTools([greeter, vaAgent, elasticExpert, medicareAgent, irsAgent])

export default agents
