import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SELECT = { id: true, name: true, color: true, createdAt: true } as const;

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.tag.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      select: SELECT,
    });
  }

  async create(organizationId: string, name: string, color = 'slate') {
    await this.assertNameFree(organizationId, name);
    return this.prisma.tag.create({
      data: { organizationId, name, color },
      select: SELECT,
    });
  }

  async update(
    organizationId: string,
    id: string,
    patch: { name?: string; color?: string },
  ) {
    const tag = await this.prisma.tag.findFirst({ where: { id, organizationId } });
    if (!tag) throw new NotFoundException('tag not found');
    if (patch.name && patch.name.toLowerCase() !== tag.name.toLowerCase()) {
      await this.assertNameFree(organizationId, patch.name, id);
    }
    return this.prisma.tag.update({ where: { id }, data: patch, select: SELECT });
  }

  async remove(organizationId: string, id: string) {
    const tag = await this.prisma.tag.findFirst({ where: { id, organizationId } });
    if (!tag) throw new NotFoundException('tag not found');
    // ConversationTag rows cascade-delete with the tag.
    await this.prisma.tag.delete({ where: { id } });
    return { ok: true };
  }

  private async assertNameFree(organizationId: string, name: string, exceptId?: string) {
    const dup = await this.prisma.tag.findFirst({
      where: {
        organizationId,
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
    });
    if (dup) throw new ConflictException('a tag with that name already exists');
  }
}
