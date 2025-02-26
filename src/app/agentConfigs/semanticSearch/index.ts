import greeter from "./greeter"
import vaAgent from "./vaAgent"
import elasticExpert from "./elasticBlogsAgent"
import medicareAgent from "./medicareAgent"
import veteransCrisisLine from "./veteransCrisisLine"
import { injectTransferTools } from "../utils"

greeter.downstreamAgents = [vaAgent, elasticExpert, medicareAgent, veteransCrisisLine]
vaAgent.downstreamAgents = [elasticExpert, medicareAgent, veteransCrisisLine, greeter]
elasticExpert.downstreamAgents = [vaAgent, medicareAgent, veteransCrisisLine, greeter]
medicareAgent.downstreamAgents = [vaAgent, elasticExpert, veteransCrisisLine, greeter]
veteransCrisisLine.downstreamAgents = [vaAgent, elasticExpert, medicareAgent, greeter]

const agents = injectTransferTools([greeter, vaAgent, elasticExpert, medicareAgent, veteransCrisisLine])

export default agents
