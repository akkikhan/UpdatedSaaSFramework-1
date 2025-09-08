import SaaSAuth from '../src';

describe('SaaSAuth middleware', () => {
  const auth = new SaaSAuth({ apiKey: 'test', baseUrl: 'https://example.com' });
  const mw = auth.middleware();

  it('returns 401 when no token is provided', async () => {
    const req: any = { headers: {} };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await mw(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
