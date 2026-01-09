import type { z } from "zod"

export interface ActionExample {
	input: Record<string, any>
	output: Record<string, any>
	explanation: string
}

export type Handler = (
	agent: any, // Replace with the actual type of the move-agent
	input: Record<string, any>
) => Promise<Record<string, any>>

export interface Action {
	name: string
	similes: string[]
	description: string
	examples: ActionExample[][]
	schema: z.ZodType<any>
	handler: Handler
}