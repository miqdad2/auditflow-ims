import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private svc: NotificationsService) {}

  @Get()
  findAll(
    @CurrentUser() user: Record<string, unknown>,
    @Query('unread') unread?: string,
    @Query('category') category?: string,
  ) {
    return this.svc.findForUser(user.id as string, {
      unreadOnly: unread === 'true',
      category:   category || undefined,
    });
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: Record<string, unknown>) {
    return this.svc.getUnreadCount(user.id as string).then((count) => ({ count }));
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.svc.markRead(id, user.id as string).then(() => ({ ok: true }));
  }

  @Patch(':id/unread')
  markUnread(@Param('id') id: string, @CurrentUser() user: Record<string, unknown>) {
    return this.svc.markUnread(id, user.id as string).then(() => ({ ok: true }));
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: Record<string, unknown>) {
    return this.svc.markAllRead(user.id as string).then(() => ({ ok: true }));
  }
}
