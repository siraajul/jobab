import { TeamService } from './team.service';

function makePrisma(opts: {
  members: Array<{ id: string; userId: string; role: 'owner' | 'admin' | 'agent' }>;
  conversations?: Array<{ id: string; organizationId: string }>;
}) {
  const audit: Array<Record<string, unknown>> = [];
  return {
    membership: {
      findFirst: async ({ where }: any) =>
        opts.members.find(
          (m) =>
            (where.id ? where.id === m.id : true) &&
            (where.userId ? where.userId === m.userId : true),
        ) ?? null,
      count: async ({ where }: any) =>
        opts.members.filter((m) => m.role === where.role).length,
      delete: jest.fn(async () => undefined),
    },
    invite: {
      create: jest.fn(async ({ data }: any) => ({ id: 'invite_test', ...data })),
      delete: jest.fn(async () => undefined),
      findFirst: async () => null,
    },
    conversation: {
      findFirst: async ({ where }: any) =>
        opts.conversations?.find((c) => c.id === where.id && c.organizationId === where.organizationId) ?? null,
      update: async ({ data }: any) => ({ id: 'c1', ...data }),
    },
    auditEvent: {
      create: jest.fn(async ({ data }: any) => {
        audit.push(data);
        return data;
      }),
    },
    _audit: audit,
  } as any;
}

const fakeSession = {
  generateInviteToken: () => ({ token: 'tok', hash: 'hash' }),
} as any;
const fakeAuth = {} as any;

describe('TeamService', () => {
  it('creates an invite and writes an audit event', async () => {
    const prisma = makePrisma({ members: [{ id: 'm1', userId: 'u1', role: 'owner' }] });
    const svc = new TeamService(prisma, fakeSession, fakeAuth);
    const { invite, token } = await svc.createInvite({
      organizationId: 'org1',
      actorUserId: 'u1',
      actorRole: 'owner',
      email: 'X@Y.com',
      role: 'agent',
    });
    expect(invite.tokenHash).toBe('hash');
    expect(token).toBe('tok');
    expect(prisma._audit[0]).toMatchObject({ action: 'member.invited' });
    // email is lowercased
    expect(prisma.invite.create.mock.calls[0][0].data.email).toBe('x@y.com');
  });

  it('refuses non-owners inviting an owner', async () => {
    const prisma = makePrisma({ members: [{ id: 'm1', userId: 'u1', role: 'admin' }] });
    const svc = new TeamService(prisma, fakeSession, fakeAuth);
    await expect(
      svc.createInvite({
        organizationId: 'org1',
        actorUserId: 'u1',
        actorRole: 'admin',
        email: 'x@y.com',
        role: 'owner',
      }),
    ).rejects.toThrow(/owners/);
  });

  it('refuses removing the last owner', async () => {
    const prisma = makePrisma({
      members: [{ id: 'm1', userId: 'u1', role: 'owner' }],
    });
    // The Test for "owners cannot be removed" needs membership.user; fake it.
    prisma.membership.findFirst = async () =>
      ({ id: 'm1', userId: 'u1', role: 'owner', user: { email: 'a@b.c' } } as any);
    const svc = new TeamService(prisma, fakeSession, fakeAuth);
    await expect(svc.removeMember('org1', 'u1', 'owner', 'm1')).rejects.toThrow(
      /last owner/,
    );
  });

  it('assigns a conversation to a member and logs', async () => {
    const prisma = makePrisma({
      members: [{ id: 'm1', userId: 'u2', role: 'agent' }],
      conversations: [{ id: 'c1', organizationId: 'org1' }],
    });
    const svc = new TeamService(prisma, fakeSession, fakeAuth);
    await svc.assignConversation('org1', 'u1', 'c1', 'u2');
    expect(prisma._audit[0]).toMatchObject({
      action: 'conversation.assigned',
      targetId: 'c1',
      metadata: { assigneeUserId: 'u2' },
    });
  });
});
