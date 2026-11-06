import app from './app';
import { assertJwtConfiguredForRuntime } from './lib/jwtConfig';
import { startAbandonedOrderCleanup } from './jobs/abandonedOrderCleanup';

const PORT = process.env.PORT || 3001;

try {
  assertJwtConfiguredForRuntime();
} catch (error) {
  console.error('❌ JWT configuration error:', error instanceof Error ? error.message : error);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
  startAbandonedOrderCleanup();
});

export default app;
