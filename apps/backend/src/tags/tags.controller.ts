import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CreateTagBodySchema, UpdateTagBodySchema } from '@jobab/shared';
import { OrgId } from '../auth/auth.guard';
import {
  ApiAuthCookie,
  ApiAuthErrors,
  ApiNotFound,
  ApiZodBody,
  ApiZodCreated,
  ApiZodOk,
  ApiZodOkArray,
} from '../swagger/decorators';
import { TagsService } from './tags.service';

@ApiTags('tags')
@ApiAuthCookie()
@ApiAuthErrors()
@Controller('tags')
export class TagsController {
  constructor(private readonly svc: TagsService) {}

  @Get()
  @ApiOperation({
    summary: 'List the org tag palette',
    description:
      'Tags are shared across the whole org and used to triage conversations ' +
      '("Priority", "Top Client", "VIP", etc.). Render them as coloured chips in the UI.',
  })
  @ApiZodOkArray('Tag', 'All tags belonging to the active org.')
  list(@OrgId() orgId: string) {
    return this.svc.list(orgId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a tag',
    description:
      'Tag names are unique within an org. The colour is one of the brand palette enum values.',
  })
  @ApiZodBody('CreateTagBody', 'Name + colour for the new tag.')
  @ApiZodCreated('Tag', 'The newly-created tag.')
  create(@OrgId() orgId: string, @Body() body: unknown) {
    const { name, color } = CreateTagBodySchema.parse(body);
    return this.svc.create(orgId, name, color);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Rename or recolour a tag',
    description: 'Partial update — supply only the fields you want to change.',
  })
  @ApiParam({ name: 'id', description: 'Tag ID to update.', example: 'cm0tag123' })
  @ApiZodBody('UpdateTagBody', 'Partial patch.')
  @ApiZodOk('Tag', 'The updated tag.')
  @ApiNotFound('Tag')
  update(@OrgId() orgId: string, @Param('id') id: string, @Body() body: unknown) {
    const patch = UpdateTagBodySchema.parse(body);
    return this.svc.update(orgId, id, patch);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a tag',
    description:
      'Permanent — also removes the tag from every conversation it was attached to. There is no undo.',
  })
  @ApiParam({ name: 'id', description: 'Tag ID to delete.' })
  @ApiZodOk('Tag', 'The deleted tag (for optimistic UI removal).')
  @ApiNotFound('Tag')
  remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.remove(orgId, id);
  }
}
