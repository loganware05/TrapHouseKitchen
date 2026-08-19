import app from './app';
import { startAbandonedOrderCleanup } from './jobs/abandonedOrderCleanup';

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV}`);
  startAbandonedOrderCleanup();
});

export default app;
