import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';

@Injectable()
export class AccountRecoveryService {
  private readonly log = new Logger(AccountRecoveryService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async request(email: string) {
    this.mail.assertConfigured();
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return { ok: true };
    const token = randomBytes(32).toString('base64url');
    const record = await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hash(token),
        expiresAt: new Date(Date.now() + 30 * 60_000),
      },
    });
    try {
      await this.mail.sendPasswordReset(user.email, token, record.id);
    } catch {
      this.log.error('Password recovery email delivery failed');
      // Do not leave an undelivered token usable or reveal which addresses exist.
      await this.prisma.passwordResetToken.delete({ where: { id: record.id } });
    }
    return { ok: true };
  }

  async reset(token: string, password: string) {
    const hash = this.hash(token);
    const passwordHash = await bcrypt.hash(password, 11);
    await this.prisma.$transaction(async (tx) => {
      const reset = await tx.passwordResetToken.findUnique({ where: { tokenHash: hash } });
      if (!reset)
        throw new BadRequestException('Reset link is invalid or expired. Request a new link.');
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: reset.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1)
        throw new BadRequestException('Reset link is invalid or expired. Request a new link.');
      await tx.user.update({
        where: { id: reset.userId },
        data: { passwordHash, sessionVersion: { increment: 1 } },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: reset.userId, usedAt: null },
        data: { usedAt: new Date() },
      });
    });
    return { ok: true };
  }

  async revokeSessions(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { sessionVersion: { increment: 1 } },
    });
    return { ok: true };
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
