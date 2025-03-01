import greeter from "./greeter"
import vaAgent from "./vaAgent"
import elasticExpert from "./elasticBlogsAgent"
import medicareAgent from "./medicareAgent"
import { injectTransferTools } from "../utils"

greeter.downstreamAgents = [vaAgent, elasticExpert, medicareAgent]
vaAgent.downstreamAgents = [elasticExpert, medicareAgent, greeter]
elasticExpert.downstreamAgents = [vaAgent, medicareAgent, greeter]
medicareAgent.downstreamAgents = [vaAgent, elasticExpert, greeter]

const agents = injectTransferTools([greeter, vaAgent, elasticExpert, medicareAgent])

export default agents
