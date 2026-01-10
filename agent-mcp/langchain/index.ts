import type { AgentRuntime } from "../agent"
import { AptosAccountAddressTool } from "./account/index"
import {
	JouleLendTokenTool,
} from "./joule/index"

import type { ToolsNameList } from "../types"

export const createAptosTools = (agent: AgentRuntime, config: { filter?: ToolsNameList[] } = {}) => {
    const tools = [
		new AptosAccountAddressTool(agent),

        // Joule tools
		new JouleLendTokenTool(agent),
    ]
    return config.filter ? tools.filter((tool) => config?.filter?.includes(tool.name as ToolsNameList)) : tools

}


export * from "./account/index"
export * from "./joule/index"