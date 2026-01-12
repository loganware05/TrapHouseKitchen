import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL || 'TrapHouse Kitchen <orders@traphousekitchen.com>';
const RESTAURANT_NAME = 'TrapHouse Kitchen';
const RESTAURANT_ADDRESS = '123 Main Street, Birmingham, AL 35203';
const RESTAURANT_PHONE = '(205) 555-1234';
const RESTAURANT_EMAIL = 'info@traphousekitchen.com';

interface OrderEmailData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  orderDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  tip: number;
  total: number;
  paymentStatus: string;
  prepTime: number;
  specialInstructions?: string;
}

interface OrderStatusEmailData {
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  status: string;
  estimatedTime?: string;
}

interface PasswordResetEmailData {
  name: string;
  email: string;
  resetToken: string;
  resetUrl: string;
}

// Generate order confirmation email HTML
function generateOrderConfirmationHTML(data: OrderEmailData): string {
  const estimatedPickup = new Date();
  estimatedPickup.setMinutes(estimatedPickup.getMinutes() + data.prepTime);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: #ffffff; border-radius: 10px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #ea580c;">
          <h1 style="color: #ea580c; margin: 0; font-size: 28px;">🍽️ ${RESTAURANT_NAME}</h1>
        </div>

        <!-- Success Message -->
        <div style="text-align: center; background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <div style="font-size: 48px; margin-bottom: 10px;">✓</div>
          <h2 style="color: #16a34a; margin: 0 0 10px 0; font-size: 24px;">Order Confirmed!</h2>
          <p style="color: #166534; margin: 0;">Thank you for your order, ${data.customerName}!</p>
        </div>

        <!-- Order Number -->
        <div style="text-align: center; background-color: #fef3c7; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">Order Number</p>
          <p style="margin: 5px 0 0 0; color: #92400e; font-size: 24px; font-weight: bold;">#${data.orderNumber}</p>
        </div>

        <!-- Pickup Time -->
        <div style="background-color: #fef3f2; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h3 style="color: #ea580c; margin: 0 0 10px 0; font-size: 18px;">⏰ Estimated Pickup Time</h3>
          <p style="margin: 0; font-size: 28px; font-weight: bold; color: #ea580c;">
            ${estimatedPickup.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
          </p>
          <p style="margin: 5px 0 0 0; color: #7c2d12; font-size: 14px;">
            Preparation time: approximately ${data.prepTime} minutes
          </p>
        </div>

        <!-- Order Items -->
        <div style="margin-bottom: 25px;">
          <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">Order Details</h3>
          ${data.items.map(item => `
            <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
              <div>
                <strong style="color: #1f2937;">${item.quantity}x ${item.name}</strong>
                <div style="color: #6b7280; font-size: 14px;">$${item.price.toFixed(2)} each</div>
              </div>
              <div style="font-weight: bold; color: #1f2937;">
                $${(item.price * item.quantity).toFixed(2)}
              </div>
            </div>
          `).join('')}
          
          ${data.specialInstructions ? `
            <div style="background-color: #f9fafb; padding: 12px; border-radius: 6px; margin-top: 12px;">
              <strong style="color: #1f2937; font-size: 14px;">Special Instructions:</strong>
              <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">${data.specialInstructions}</p>
            </div>
          ` : ''}
        </div>

        <!-- Payment Summary -->
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #6b7280;">Subtotal:</span>
            <span style="color: #1f2937; font-weight: 600;">$${data.subtotal.toFixed(2)}</span>
          </div>
          ${data.tip > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span style="color: #6b7280;">Tip:</span>
              <span style="color: #1f2937; font-weight: 600;">$${data.tip.toFixed(2)}</span>
            </div>
          ` : ''}
          <div style="border-top: 2px solid #e5e7eb; padding-top: 12px; margin-top: 12px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #1f2937; font-size: 18px; font-weight: bold;">Total:</span>
              <span style="color: #ea580c; font-size: 24px; font-weight: bold;">$${data.total.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 8px;">
              <span style="color: #6b7280; font-size: 14px;">Payment Status:</span>
              <span style="color: ${data.paymentStatus === 'PAID' ? '#16a34a' : '#ca8a04'}; font-weight: 600; font-size: 14px;">
                ${data.paymentStatus === 'PAID' ? '✓ Paid' : 'Pay on Pickup'}
              </span>
            </div>
          </div>
        </div>

        <!-- Pickup Location -->
        <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
          <h3 style="color: #1e40af; margin: 0 0 12px 0; font-size: 18px;">📍 Pickup Location</h3>
          <p style="margin: 0 0 5px 0; font-weight: bold; color: #1e3a8a; font-size: 16px;">${RESTAURANT_NAME}</p>
          <p style="margin: 0; color: #3b82f6; font-size: 14px;">${RESTAURANT_ADDRESS}</p>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #bfdbfe;">
            <p style="margin: 0 0 5px 0; color: #1e3a8a; font-size: 14px;">
              📞 <a href="tel:${RESTAURANT_PHONE.replace(/[^0-9]/g, '')}" style="color: #1e40af; text-decoration: none;">${RESTAURANT_PHONE}</a>
            </p>
            <p style="margin: 0; color: #1e3a8a; font-size: 14px;">
              ✉️ <a href="mailto:${RESTAURANT_EMAIL}" style="color: #1e40af; text-decoration: none;">${RESTAURANT_EMAIL}</a>
            </p>
          </div>
        </div>

        <!-- What's Next -->
        <div style="background-color: #fef3f2; border-left: 4px solid #ea580c; padding: 15px; margin-bottom: 20px;">
          <h3 style="color: #7c2d12; margin: 0 0 10px 0; font-size: 16px;">What's Next?</h3>
          <ol style="margin: 0; padding-left: 20px; color: #7c2d12;">
            <li style="margin-bottom: 5px;">We'll start preparing your order right away</li>
            <li style="margin-bottom: 5px;">You'll receive updates as your order progresses</li>
            <li style="margin-bottom: 5px;">Come pick up around ${estimatedPickup.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</li>
            ${data.paymentStatus === 'UNPAID' ? '<li style="margin-bottom: 5px;"><strong>Bring $' + data.total.toFixed(2) + ' for payment at pickup</strong></li>' : ''}
          </ol>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p style="margin: 0 0 5px 0;">Thank you for choosing ${RESTAURANT_NAME}!</p>
          <p style="margin: 0;">Questions? Contact us at <a href="mailto:${RESTAURANT_EMAIL}" style="color: #ea580c; text-decoration: none;">${RESTAURANT_EMAIL}</a></p>
          <p style="margin: 10px 0 0 0; color: #9ca3af;">Order placed on ${data.orderDate}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generate order status update email HTML
function generateOrderStatusHTML(data: OrderStatusEmailData): string {
  const statusMessages: { [key: string]: { title: string; color: string; message: string; icon: string } } = {
    PREPARING: {
      title: 'Order is Being Prepared',
      color: '#ea580c',
      message: 'Our chef is working on your order right now!',
      icon: '👨‍🍳'
    },
    READY: {
      title: 'Order is Ready for Pickup!',
      color: '#16a34a',
      message: 'Your order is ready! Come pick it up whenever you\'re ready.',
      icon: '✅'
    },
    COMPLETED: {
      title: 'Order Completed',
      color: '#16a34a',
      message: 'Thank you for picking up your order! We hope you enjoyed it.',
      icon: '🎉'
    },
    CANCELLED: {
      title: 'Order Cancelled',
      color: '#dc2626',
      message: 'Your order has been cancelled. If you have questions, please contact us.',
      icon: '❌'
    }
  };

  const statusInfo = statusMessages[data.status] || statusMessages.PREPARING;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Status Update</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: #ffffff; border-radius: 10px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #ea580c;">
          <h1 style="color: #ea580c; margin: 0; font-size: 28px;">🍽️ ${RESTAURANT_NAME}</h1>
        </div>

        <!-- Status Update -->
        <div style="text-align: center; background-color: ${statusInfo.color}15; border-radius: 8px; padding: 30px; margin-bottom: 25px;">
          <div style="font-size: 64px; margin-bottom: 15px;">${statusInfo.icon}</div>
          <h2 style="color: ${statusInfo.color}; margin: 0 0 10px 0; font-size: 24px;">${statusInfo.title}</h2>
          <p style="color: #4b5563; margin: 0; font-size: 16px;">${statusInfo.message}</p>
        </div>

        <!-- Order Number -->
        <div style="text-align: center; background-color: #fef3c7; border-radius: 8px; padding: 15px; margin-bottom: 25px;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">Order Number</p>
          <p style="margin: 5px 0 0 0; color: #92400e; font-size: 24px; font-weight: bold;">#${data.orderNumber}</p>
        </div>

        ${data.status === 'READY' && data.estimatedTime ? `
          <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: center;">
            <h3 style="color: #16a34a; margin: 0 0 10px 0;">Ready for Pickup</h3>
            <p style="margin: 0; color: #166534; font-size: 14px;">Come anytime to pick up your order</p>
          </div>
        ` : ''}

        <!-- Pickup Location -->
        <div style="background-color: #eff6ff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h3 style="color: #1e40af; margin: 0 0 12px 0; font-size: 16px;">📍 Pickup Location</h3>
          <p style="margin: 0 0 5px 0; font-weight: bold; color: #1e3a8a;">${RESTAURANT_NAME}</p>
          <p style="margin: 0; color: #3b82f6; font-size: 14px;">${RESTAURANT_ADDRESS}</p>
          <p style="margin: 10px 0 0 0; color: #1e3a8a; font-size: 14px;">
            📞 ${RESTAURANT_PHONE}
          </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p style="margin: 0 0 5px 0;">Thank you for choosing ${RESTAURANT_NAME}!</p>
          <p style="margin: 0;">Questions? Contact us at <a href="mailto:${RESTAURANT_EMAIL}" style="color: #ea580c; text-decoration: none;">${RESTAURANT_EMAIL}</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generate password reset email HTML
function generatePasswordResetHTML(data: PasswordResetEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: #ffffff; border-radius: 10px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #ea580c;">
          <h1 style="color: #ea580c; margin: 0; font-size: 28px;">🍽️ ${RESTAURANT_NAME}</h1>
        </div>

        <!-- Message -->
        <div style="margin-bottom: 25px;">
          <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 22px;">Password Reset Request</h2>
          <p style="color: #4b5563; margin: 0 0 15px 0;">Hi ${data.name},</p>
          <p style="color: #4b5563; margin: 0 0 15px 0;">
            We received a request to reset your password for your ${RESTAURANT_NAME} account. 
            Click the button below to create a new password:
          </p>
        </div>

        <!-- Reset Button -->
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.resetUrl}" style="display: inline-block; background-color: #ea580c; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
            Reset Password
          </a>
        </div>

        <!-- Alternative Link -->
        <div style="background-color: #f9fafb; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="margin: 0; word-break: break-all; color: #ea580c; font-size: 14px;">
            <a href="${data.resetUrl}" style="color: #ea580c;">${data.resetUrl}</a>
          </p>
        </div>

        <!-- Expiry Notice -->
        <div style="background-color: #fef3f2; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 20px;">
          <p style="margin: 0; color: #7c2d12; font-size: 14px;">
            <strong>⚠️ Important:</strong> This link will expire in 1 hour for security reasons.
          </p>
        </div>

        <!-- Security Note -->
        <div style="margin-bottom: 20px;">
          <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">
            <strong>Didn't request this?</strong> You can safely ignore this email. Your password will not be changed.
          </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p style="margin: 0 0 5px 0;">Thank you for choosing ${RESTAURANT_NAME}!</p>
          <p style="margin: 0;">Questions? Contact us at <a href="mailto:${RESTAURANT_EMAIL}" style="color: #ea580c; text-decoration: none;">${RESTAURANT_EMAIL}</a></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Send order confirmation email
export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY not configured - email not sent');
    return false;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `Order Confirmed - ${RESTAURANT_NAME} #${data.orderNumber}`,
      html: generateOrderConfirmationHTML(data),
    });

    console.log(`✅ Order confirmation email sent to ${data.customerEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send order confirmation email:', error);
    return false;
  }
}

// Send order status update email
export async function sendOrderStatusEmail(data: OrderStatusEmailData): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY not configured - email not sent');
    return false;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `Order Update - ${RESTAURANT_NAME} #${data.orderNumber}`,
      html: generateOrderStatusHTML(data),
    });

    console.log(`✅ Order status email sent to ${data.customerEmail}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send order status email:', error);
    return false;
  }
}

// Send password reset email
export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY not configured - email not sent');
    return false;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: `Password Reset - ${RESTAURANT_NAME}`,
      html: generatePasswordResetHTML(data),
    });

    console.log(`✅ Password reset email sent to ${data.email}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    return false;
  }
}

// Send email to chef about new order
export async function sendNewOrderNotificationToChef(orderData: OrderEmailData): Promise<boolean> {
  if (!process.env.RESEND_API_KEY || !process.env.CHEF_EMAIL) {
    console.warn('⚠️ Email not configured - chef notification not sent');
    return false;
  }

  const chefHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Order</title>
    </head>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
      <h1 style="color: #ea580c;">🔔 New Order Received!</h1>
      <div style="background: #fef3f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2>Order #${orderData.orderNumber}</h2>
        <p><strong>Customer:</strong> ${orderData.customerName}</p>
        <p><strong>Time:</strong> ${orderData.orderDate}</p>
        <p><strong>Items:</strong></p>
        <ul>
          ${orderData.items.map(item => `<li>${item.quantity}x ${item.name}</li>`).join('')}
        </ul>
        <p><strong>Total:</strong> $${orderData.total.toFixed(2)}</p>
        <p><strong>Payment:</strong> ${orderData.paymentStatus === 'PAID' ? 'Paid Online' : 'Cash on Pickup'}</p>
        ${orderData.specialInstructions ? `<p><strong>Special Instructions:</strong> ${orderData.specialInstructions}</p>` : ''}
      </div>
      <p>Estimated prep time: ${orderData.prepTime} minutes</p>
    </body>
    </html>
  `;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: process.env.CHEF_EMAIL,
      subject: `🔔 New Order #${orderData.orderNumber} - ${RESTAURANT_NAME}`,
      html: chefHTML,
    });

    console.log(`✅ Chef notification email sent`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send chef notification:', error);
    return false;
  }
}
