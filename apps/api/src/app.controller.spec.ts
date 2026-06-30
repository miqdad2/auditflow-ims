import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const mockAppService = {
  getHealth: () => ({ status: 'ok', service: 'RECAFCO AuditFlow ISO API' }),
  getFullHealth: () => Promise.resolve({ status: 'ok', service: 'RECAFCO AuditFlow ISO API' }),
  getDatabaseHealth: () => Promise.resolve({ status: 'ok' }),
  getStorageHealth: () => ({ status: 'ok' }),
};

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: mockAppService }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return health status', async () => {
      const result = await appController.getHealth();
      expect(result.status).toBe('ok');
      expect(result.service).toBe('RECAFCO AuditFlow ISO API');
    });
  });
});
