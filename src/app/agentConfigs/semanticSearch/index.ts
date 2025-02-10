import greeter from "./greeter"
import vaAgent from "./vaAgent"
import elasticExpert from "./elasticBlogsAgent"
import medicareAgent from "./medicareAgent"
import veteransCrisisLine from "./veteransCrisisLine"
import { injectTransferTools } from "../utils"

greeter.downstreamAgents = [vaAgent, elasticExpert, medicareAgent, veteransCrisisLine]
vaAgent.downstreamAgents = [elasticExpert, medicareAgent, veteransCrisisLine]
elasticExpert.downstreamAgents = [vaAgent, medicareAgent, veteransCrisisLine]
medicareAgent.downstreamAgents = [vaAgent, elasticExpert, veteransCrisisLine]
veteransCrisisLine.downstreamAgents = [vaAgent, elasticExpert, medicareAgent]

const agents = injectTransferTools([greeter, vaAgent, elasticExpert, medicareAgent, veteransCrisisLine])

export default agents
