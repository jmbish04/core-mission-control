/**
 * UIFactoryAgent - Agent endpoint for UI Factory Worker
 * 
 * This agent accepts tasks and generates UI components/code.
 * It's designed to be called via RPC from the OrchestratorAgent.
 */

import { Agent, type AgentNamespace, routeAgentRequest } from "agents";
import type { Ai, AiModels } from "@cloudflare/workers-types";
import z from "zod";

const FALLBACK_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast" as keyof AiModels;

/**
 * Task input schema for UI Factory Agent
 */
const UITaskSchema = z.object({
	task: z.string().describe("The UI task to complete (e.g., 'create_login_form')"),
	description: z.string().describe("Detailed description of what needs to be built"),
	requirements: z.array(z.string()).optional().describe("Additional requirements or constraints"),
});

export type UITaskInput = z.infer<typeof UITaskSchema>;

/**
 * UI Factory result schema
 */
const UIResultSchema = z.object({
	status: z.enum(["complete", "error"]),
	result: z.string().describe("The generated HTML/React code"),
	components: z.array(z.string()).optional().describe("List of component names created"),
	error: z.string().optional(),
});

export type UIResult = z.infer<typeof UIResultSchema>;

/**
 * Environment interface for UI Factory Worker
 */
export interface UIFactoryEnv {
	UIFactoryAgent: AgentNamespace<UIFactoryAgent>;
	AI: Ai;
	DEFAULT_MODEL?: string;
}

/**
 * UIFactoryAgent - Generates UI components based on task descriptions
 */
export class UIFactoryAgent extends Agent<UIFactoryEnv, never> {
	/**
	 * Process a UI task and generate the corresponding code
	 * This method is callable via RPC from other agents
	 * 
	 * @param input - Task description and requirements
	 * @returns Generated UI code and status
	 */
	async processTask(input: UITaskInput): Promise<UIResult> {
		const prompt = buildGenerationPrompt(input);

		try {
			const envBinding = (this as unknown as { env: UIFactoryEnv }).env;
			const aiBinding = envBinding?.AI;
			if (!aiBinding) {
				throw new Error("AI binding is not available for UIFactoryAgent");
			}

			const modelName = (envBinding?.DEFAULT_MODEL as keyof AiModels | undefined) ?? FALLBACK_MODEL;

			const aiResult = await aiBinding.run(modelName, {
				prompt,
				temperature: 0.2,
				max_output_tokens: 1200,
			});

			const structured = parseAiStructuredResponse(aiResult);
			const validated = UIResultSchema.safeParse(structured);

			if (!validated.success) {
				throw new Error(`AI response failed validation: ${validated.error.message}`);
			}

			return validated.data;
		} catch (error) {
			return {
				status: "error",
				result: "",
				error: error instanceof Error ? error.message : "Unknown error occurred",
			};
		}
	}

	/**
	 * Handle HTTP requests (for direct access or health checks)
	 */
	async onRequest(request: Request): Promise<Response> {
		const url = new URL(request.url);

		// Health check endpoint
		if (url.pathname === "/health") {
			return new Response(JSON.stringify({ status: "healthy", agent: "UIFactoryAgent" }), {
				headers: { "Content-Type": "application/json" },
			});
		}

		return new Response("Not found", { status: 404 });
	}
}

/**
 * Worker entrypoint - Routes requests to the agent
 */

export default {
	async fetch(request: Request, env: UIFactoryEnv): Promise<Response> {
		// Route agent requests (WebSocket/RPC)
		const agentResponse = await routeAgentRequest(request, env, { cors: true });
		if (agentResponse) {
			return agentResponse;
		}

		// Fallback for non-agent requests
		return new Response("Not found", { status: 404 });
	},
};

function buildGenerationPrompt(input: UITaskInput): string {
	const requirements = input.requirements && input.requirements.length > 0
		? `Additional requirements: ${input.requirements.join(", ")}.`
		: "";

	return `You are a UI Factory Agent specialized in generating production-ready React (TypeScript) components using Tailwind CSS.\n\nReturn a JSON object with keys: \\\"status\\\", \\\"result\\\", \\\"components\\\", and optionally \\\"error\\\".\n- status must be \\\"complete\\\" when code generation succeeds or \\\"error\\\" if you encounter a blocking issue.\n- result must contain the full component implementation (React + Tailwind CSS).\n- components should list the component names declared in the code.\n- error should only be present when status is \\\"error\\\".\n\nTask: ${input.task}\nDescription: ${input.description}\n${requirements}\n\nEnsure the returned value is valid JSON, without additional commentary.`;
}

function parseAiStructuredResponse(aiResult: unknown): unknown {
	if (typeof aiResult === "string") {
		return safeJsonParse(aiResult);
	}

	if (aiResult && typeof aiResult === "object") {
		const response = (aiResult as Record<string, unknown>).response;
		if (typeof response === "string") {
			return safeJsonParse(response);
		}

		const results = (aiResult as Record<string, unknown>).results;
		if (Array.isArray(results)) {
			const first = results[0] as Record<string, unknown> | undefined;
			if (first && typeof first.response === "string") {
				return safeJsonParse(first.response);
			}
		}
	}

	throw new Error("AI response did not include a parsable JSON payload");
}

function safeJsonParse(payload: string): unknown {
	try {
		return JSON.parse(payload);
	} catch (error) {
		throw new Error("Failed to parse AI response as JSON");
	}
}
