export async function healthRoutes(app) {
  app.get('/health', async () => {
    return {
      success: true,
      service: 'apisocialjuridico',
      status: 'online',
      timestamp: new Date().toISOString(),
    };
  });
}
