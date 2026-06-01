// `langfuse` (via its `langfuse-core` dep) ships dynamic ESM imports that
// Jest's CJS-only loader can't follow. We don't need real tracing in unit
// tests, so stub the top-level package at module-load — the chain to
// langfuse-core never executes.
jest.mock('langfuse', () => ({ Langfuse: class {} }));

import { AgentService } from './agent.service';
import { LlmCallResult, LlmProvider } from './llm/provider';

/**
 * Unit tests for the agent loop. Everything around the loop is stubbed —
 * the goal is to nail down the loop's behaviour:
 *   1. Bails when the conversation is human/closed.
 *   2. Records an AgentRun even when the loop throws.
 *   3. Unknown / failing tool calls return error envelopes (don't crash the loop).
 *   4. Sends the final reply via the messenger when present.
 *   5. Re-throws on loop error so BullMQ retries.
 */

type AnyFn = jest.Mock;

function makePrisma(over: Record<string, unknown> = {}) {
  return {
    conversation: {
      findUniqueOrThrow: jest.fn(async () => ({
        id: 'c1',
        organizationId: 'org1',
        status: 'bot',
        organization: { aiInstructions: null },
      })),
    },
    message: {
      findMany: jest.fn(async () => [
        { sender: 'customer', content: 'hi', attachments: null, createdAt: new Date() },
      ]),
    },
    agentRun: { create: jest.fn(async () => ({})) },
    product: { findMany: jest.fn(async () => []) },
    ...over,
  } as never;
}

function makeService(deps: Partial<Record<string, unknown>> = {}) {
  const prisma = (deps.prisma as ReturnType<typeof makePrisma>) ?? makePrisma();
  const llm = (deps.llm as LlmProvider) ?? {
    name: 'stub',
    call: jest.fn(
      async (): Promise<LlmCallResult> => ({
        text: 'hello',
        toolCalls: [],
        inputTokens: 1,
        outputTokens: 1,
        costUsd: 0,
      }),
    ),
  };
  const messenger = (deps.messenger as { sendText: AnyFn }) ?? {
    sendText: jest.fn(async () => undefined),
  };
  const env = {
    get: jest.fn((k: string) => {
      if (k === 'LLM_MODEL') return 'stub-model';
      if (k === 'LLM_MAX_ITERATIONS') return 3;
      if (k === 'LLM_MAX_OUTPUT_TOKENS') return 200;
      return undefined;
    }),
  };
  const trace = {
    startTrace: jest.fn(() => ({})),
    logGeneration: jest.fn(),
    logToolCall: jest.fn(),
    endTrace: jest.fn(),
  };
  const service = new AgentService(
    prisma,
    {} as never, // catalog
    messenger as never,
    {} as never, // guardrail
    llm,
    {} as never, // vision
    { available: false } as never, // embeddings
    env as never,
    trace as never,
    {} as never, // whatsapp
  );
  return { service, prisma, llm, messenger, env, trace };
}

describe('AgentService.handleMessage', () => {
  it('bails early when the conversation is human (merchant takeover)', async () => {
    const prisma = makePrisma({
      conversation: {
        findUniqueOrThrow: jest.fn(async () => ({
          id: 'c1',
          organizationId: 'org1',
          status: 'human',
          organization: { aiInstructions: null },
        })),
      },
    });
    const { service, llm, messenger } = makeService({ prisma });
    await service.handleMessage('c1', 'm1');
    expect(llm.call as AnyFn).not.toHaveBeenCalled();
    expect(messenger.sendText as AnyFn).not.toHaveBeenCalled();
  });

  it('bails early when the conversation is closed', async () => {
    const prisma = makePrisma({
      conversation: {
        findUniqueOrThrow: jest.fn(async () => ({
          id: 'c1',
          organizationId: 'org1',
          status: 'closed',
          organization: { aiInstructions: null },
        })),
      },
    });
    const { service, llm } = makeService({ prisma });
    await service.handleMessage('c1', 'm1');
    expect(llm.call as AnyFn).not.toHaveBeenCalled();
  });

  it('sends the final reply via the messenger', async () => {
    const { service, messenger } = makeService();
    await service.handleMessage('c1', 'm1');
    expect(messenger.sendText as AnyFn).toHaveBeenCalledWith('c1', 'hello', undefined);
  });

  it('records an AgentRun even when the loop throws', async () => {
    const llm: LlmProvider = {
      name: 'stub',
      call: jest.fn(async () => {
        throw new Error('provider boom');
      }),
    };
    const prisma = makePrisma();
    const { service } = makeService({ prisma, llm });
    await expect(service.handleMessage('c1', 'm1')).rejects.toThrow('provider boom');
    expect(prisma.agentRun.create as AnyFn).toHaveBeenCalledTimes(1);
    const createArg = (prisma.agentRun.create as AnyFn).mock.calls[0][0];
    expect(createArg.data.toolCalls).toMatchObject({ error: 'provider boom' });
  });

  it('does not send a reply when finalText is empty and there is no loop error', async () => {
    const llm: LlmProvider = {
      name: 'stub',
      call: jest.fn(async () => ({
        text: '   ',
        toolCalls: [],
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
      })),
    };
    const { service, messenger } = makeService({ llm });
    await service.handleMessage('c1', 'm1');
    expect(messenger.sendText as AnyFn).not.toHaveBeenCalled();
  });

  it('stops looping when iter count hits LLM_MAX_ITERATIONS', async () => {
    // Always return a tool call → loop runs until cap → no final text → no
    // sendText. With max=3 the LLM should be called exactly 3 times.
    const llm: LlmProvider = {
      name: 'stub',
      call: jest.fn(async () => ({
        toolCalls: [{ id: 'tc1', name: 'no_such_tool', arguments: {} }],
        inputTokens: 1,
        outputTokens: 1,
        costUsd: 0,
      })),
    };
    const { service, messenger } = makeService({ llm });
    await service.handleMessage('c1', 'm1');
    expect(llm.call as AnyFn).toHaveBeenCalledTimes(3);
    expect(messenger.sendText as AnyFn).not.toHaveBeenCalled();
  });
});
