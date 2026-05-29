import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateTagBodySchema, UpdateTagBodySchema } from '@jobab/shared';
import { OrgId } from '../auth/auth.guard';
import { TagsService } from './tags.service';

@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly svc: TagsService) {}

  @Get()
  @ApiOperation({ summary: 'List the org tag palette' })
  list(@OrgId() orgId: string) {
    return this.svc.list(orgId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a tag' })
  create(@OrgId() orgId: string, @Body() body: unknown) {
    const { name, color } = CreateTagBodySchema.parse(body);
    return this.svc.create(orgId, name, color);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rename or recolour a tag' })
  update(@OrgId() orgId: string, @Param('id') id: string, @Body() body: unknown) {
    const patch = UpdateTagBodySchema.parse(body);
    return this.svc.update(orgId, id, patch);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tag (removes it from all conversations)' })
  remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.remove(orgId, id);
  }
}
