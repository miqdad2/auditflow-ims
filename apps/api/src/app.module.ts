import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE, APP_FILTER } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { RolesModule } from './modules/roles/roles.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { TaskListsModule } from './modules/task-lists/task-lists.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { PagesModule } from './modules/pages/pages.module';
import { FileAttachmentsModule } from './modules/file-attachments/file-attachments.module';
import { AuditChecklistsModule } from './modules/audit-checklists/audit-checklists.module';
import { NcrCapaModule } from './modules/ncr-capa/ncr-capa.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { UsersModule } from './modules/users/users.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { LinkedRecordsModule } from './modules/linked-records/linked-records.module';
import { SystemErrorsModule } from './modules/system-errors/system-errors.module';
import { ReportsModule } from './modules/reports/reports.module';
import { BusinessActionsModule } from './modules/business-actions/business-actions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RealtimeModule,
    AuditLogModule,
    AuthModule,
    UsersModule,
    DepartmentsModule,
    RolesModule,
    NotificationsModule,
    WorkspacesModule,
    TaskListsModule,
    TasksModule,
    DocumentsModule,
    PagesModule,
    FileAttachmentsModule,
    AuditChecklistsModule,
    NcrCapaModule,
    DashboardModule,
    LinkedRecordsModule,
    SystemErrorsModule,
    ReportsModule,
    BusinessActionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
