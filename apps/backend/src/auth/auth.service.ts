import { Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { MemberRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';

const BCRYPT_COST = 11;

export interface AuthenticatedContext {
  userId: string;
  email: string;
  name: string | null;
  memberships: Array<{
    id: string;
    organizationId: string;
    role: MemberRole;
  }>;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly session: SessionService,
  ) {}

  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_COST);
  }

  async verifyPassword(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }

  async login(email: string, password: string): Promise<{ user: AuthenticatedContext; cookie: { value: string; maxAge: number } }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { memberships: { include: { organization: { select: { id: true } } } } },
    });
    if (!user || !user.passwordHash) throw new UnauthorizedException('invalid credentials');
    const ok = await this.verifyPassword(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('invalid credentials');
    const cookie = this.session.sign(user.id);
    return {
      user: this.toAuthContext(user),
      cookie,
    };
  }

  async loadFromSession(cookieValue: string | undefined): Promise<AuthenticatedContext | null> {
    const payload = this.session.verify(cookieValue);
    if (!payload) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: payload.uid },
      include: { memberships: { include: { organization: { select: { id: true } } } } },
    });
    if (!user) return null;
    return this.toAuthContext(user);
  }

  private toAuthContext(user: {
    id: string;
    email: string;
    name: string | null;
    memberships: Array<{ id: string; organizationId: string; role: MemberRole }>;
  }): AuthenticatedContext {
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      memberships: user.memberships.map((m) => ({
        id: m.id,
        organizationId: m.organizationId,
        role: m.role,
      })),
    };
  }
}
