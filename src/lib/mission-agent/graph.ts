import { AIMessage, HumanMessage, SystemMessage, type BaseMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { END, MessagesAnnotation, START, StateGraph } from "@langchain/langgraph";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type {
  MissionAgentAction,
  MissionAgentContext,
  MissionChatMessage,
} from "@/lib/demo/types";
import { operationsPlaybook } from "@/lib/mission-agent/playbook";

type RunMissionAgentInput = {
  prompt: string;
  messages: MissionChatMessage[];
  context: MissionAgentContext;
};

type RunMissionAgentOutput = {
  message: string;
  actions: MissionAgentAction[];
};

const systemPrompt = readFileSync(
  join(process.cwd(), "src/lib/mission-agent/system-prompt.md"),
  "utf8",
);

const stringifyForTool = (value: unknown) => JSON.stringify(value, null, 2);

const messageText = (message: BaseMessage) => {
  const content = message.content;
  if (typeof content === "string") return content;
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if ("text" in part && typeof part.text === "string") return part.text;
      return "";
    })
    .filter(Boolean)
    .join("\n");
};

const toLangChainMessages = (messages: MissionChatMessage[]) =>
  messages.slice(-16).map((message) =>
    message.role === "user"
      ? new HumanMessage(message.text)
      : new AIMessage(message.text),
  );

const latestTelemetrySummary = (context: MissionAgentContext) =>
  context.satellites.map((satellite) => {
    const points = context.telemetry[satellite.id] ?? [];
    const point = points[points.length - 1];

    return {
      satellite,
      latestTelemetry: point ?? null,
    };
  });

export async function runMissionAgent({
  prompt,
  messages,
  context,
}: RunMissionAgentInput): Promise<RunMissionAgentOutput> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Set OPENAI_API_KEY before using the LangGraph mission agent.");
  }

  const actions: MissionAgentAction[] = [];

  const readMissionSnapshot = tool(
    ({ satelliteId }) => {
      const satelliteSummaries = latestTelemetrySummary(context);
      const selected = satelliteId
        ? satelliteSummaries.find((item) => item.satellite.id === satelliteId)
        : null;

      return stringifyForTool({
        activeSatelliteId: context.activeSatelliteId,
        selectedSatelliteId: satelliteId ?? context.activeSatelliteId,
        lastInjectedFault: context.lastInjectedFault ?? null,
        satellites: selected ? [selected] : satelliteSummaries,
        recentOperatorMessages: context.operatorMessages.slice(-8),
      });
    },
    {
      name: "read_mission_snapshot",
      description:
        "Read the latest live satellite state, telemetry, active satellite, recent operator feed, and injected fault context.",
      schema: z.object({
        satelliteId: z.string().optional().describe("Optional satellite id to inspect. Omit to inspect all satellites."),
      }),
    },
  );

  const readOperationsPlaybook = tool(
    ({ query }) => {
      const normalizedQuery = query?.toLowerCase().trim();
      const protocols = normalizedQuery
        ? operationsPlaybook.protocols.filter((protocol) =>
            [
              protocol.id,
              protocol.preferredAction,
              ...protocol.faultTypes,
              ...protocol.triggers,
              ...protocol.steps,
            ]
              .join(" ")
              .toLowerCase()
              .includes(normalizedQuery),
          )
        : operationsPlaybook.protocols;

      return stringifyForTool({
        ...operationsPlaybook,
        protocols: protocols.length > 0 ? protocols : operationsPlaybook.protocols,
      });
    },
    {
      name: "read_operations_playbook",
      description:
        "Read the operations playbook, fault protocols, nominal telemetry ranges, and preferred mitigations.",
      schema: z.object({
        query: z.string().optional().describe("Optional fault type, protocol id, telemetry symptom, or action keyword."),
      }),
    },
  );

  const issueMitigationAction = tool(
    ({ type, satelliteId, rationale, targetSatelliteIds }) => {
      const action: MissionAgentAction = {
        type,
        satelliteId,
        rationale,
        targetSatelliteIds,
      };
      actions.push(action);

      return stringifyForTool({
        accepted: true,
        action,
        note: "The UI will apply this mitigation after the LangGraph run returns.",
      });
    },
    {
      name: "issue_mitigation_action",
      description:
        "Issue a mitigation action for the UI to apply. Use this whenever the agent decides to monitor, reroute, or stabilize.",
      schema: z.object({
        type: z.enum(["monitor", "reroute", "stabilize"]).describe("The mitigation to apply."),
        satelliteId: z.string().describe("The satellite id that should receive the action."),
        rationale: z.string().describe("Operational rationale for the decision."),
        targetSatelliteIds: z
          .array(z.string())
          .optional()
          .describe("Healthy peer satellite ids for reroute actions."),
      }),
    },
  );

  const tools = [readMissionSnapshot, readOperationsPlaybook, issueMitigationAction];
  const model = new ChatOpenAI({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  }).bindTools(tools);

  const callModel = async (state: typeof MessagesAnnotation.State) => ({
    messages: [
      await model.invoke([
        new SystemMessage(systemPrompt),
        ...state.messages,
      ]),
    ],
  });

  const graph = new StateGraph(MessagesAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", new ToolNode(tools))
    .addEdge(START, "agent")
    .addConditionalEdges("agent", toolsCondition, ["tools", END])
    .addEdge("tools", "agent")
    .compile();

  const result = await graph.invoke(
    {
      messages: [
        ...toLangChainMessages(messages),
        new HumanMessage(
          `Current operator request: ${prompt}\n\nUse tools before deciding. If a mitigation is warranted, call issue_mitigation_action.`,
        ),
      ],
    },
    { recursionLimit: 8 },
  );

  const finalMessage = result.messages
    .slice()
    .reverse()
    .find((message) => AIMessage.isInstance(message) && !message.tool_calls?.length);

  return {
    message: finalMessage
      ? messageText(finalMessage)
      : "I inspected the mission state but did not receive a final model response.",
    actions,
  };
}
