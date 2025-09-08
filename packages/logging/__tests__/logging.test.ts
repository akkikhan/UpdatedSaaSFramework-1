import SaaSLogging, { LogLevel } from '../src';

describe('SaaSLogging', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as any;
  });

  it('flushes queued log entries', async () => {
    const logger = new SaaSLogging({ apiKey: 'test', baseUrl: 'https://example.com', batchSize: 1, flushInterval: 1000 });
    await logger.log(LogLevel.INFO, 'hello');
    await logger.flush();
    expect(global.fetch).toHaveBeenCalled();
    await logger.destroy();
  });
});
