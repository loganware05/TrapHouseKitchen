import prisma from '../lib/prisma';
import { OrderStatus } from '@prisma/client';
import { sendOrderStatusEmail } from './emailService';

interface SetOrderStatusOptions {
  sendEmail?: boolean;
  emailData?: {
    estimatedTime?: string;
  };
}

/**
 * Centralized function for updating order status
 * Ensures all side-effects (completedAt, emails, etc.) are consistently applied
 */
export async function setOrderStatus(
  orderId: string,
  status: OrderStatus,
  options?: SetOrderStatusOptions
) {
  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      // Automatically stamp completedAt when order reaches COMPLETED status
      ...(status === 'COMPLETED' && { completedAt: new Date() }),
    },
    include: {
      items: {
        include: {
          dish: true,
        },
      },
      user: true,
    },
  });

  // Send status update email to customer if requested
  if (options?.sendEmail && ['PREPARING', 'READY', 'COMPLETED', 'CANCELLED'].includes(status)) {
    sendOrderStatusEmail({
      customerName: order.user.name,
      customerEmail: order.user.email || '',
      orderNumber: order.orderNumber.toString(),
      status,
      estimatedTime: options.emailData?.estimatedTime,
    }).catch(err => console.error('Status email error:', err));
  }

  return order;
}
