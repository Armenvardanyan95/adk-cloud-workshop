import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import { openDb } from '@techparts/shared';

// TODO(workshop): Implement the orders tools.
//
// You are building three tools backed by the SQLite `orders` and `customers`
// tables (orders columns: id, customer_id, sku, quantity, total, status,
// order_date, delivered_date):
//   1. get_customer_orders     — list a customer's orders (most recent first).
//   2. get_order_details       — full details for one order id.
//   3. check_return_eligibility — apply the 30-day return policy (from delivery date).
//
// Use openDb() to query the database (see shared/src/db.ts). The tests in
// test/tools.test.ts describe the exact shapes and policy rules you need.

export function getCustomerOrders(input: { customerId: number }): { customer?: any; orders: any[] } {
  // TODO: return `{ customer, orders: [...] }`, or `{ error, orders: [] }` if unknown.
  const db = openDb();
  const customer = db.prepare('SELECT id, name, email FROM customers WHERE id = ?').get(input.customerId);
  if (!customer) return { error: `Customer not found: ${input.customerId}`, orders: [] };

  const orders = db
    .prepare(
      `SELECT o.id, o.sku, o.quantity, o.total, o.status, o.order_date AS orderDate, o.delivered_date AS deliveredDate,
              p.name AS productName
       FROM orders o
       JOIN products p ON o.sku = p.sku
       WHERE o.customer_id = ?
       ORDER BY o.order_date DESC`,
    )
    .all(input.customerId);
  return { customer, orders };
  // throw new Error('Not implemented: getCustomerOrders');
}

export function getOrderDetails(input: { orderId: number }): any {
  // TODO: return the full order, or `{ error }` if unknown.
  const db = openDb();
  const row = db
    .prepare(
      `SELECT o.id, o.customer_id AS customerId, o.sku, o.quantity, o.total, o.status,
              o.order_date AS orderDate, o.delivered_date AS deliveredDate,
              c.name AS customerName, p.name AS productName
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       LEFT JOIN products p ON o.sku = p.sku
       WHERE o.id = ?`,
    )
    .get(input.orderId);
  if (!row) return { error: `Order not found: ${input.orderId}` };
  return row;
  // throw new Error('Not implemented: getOrderDetails');
}

export function checkReturnEligibility(input: { orderId: number }): any {
  // TODO: apply the 30-day-from-delivery policy and return
  // `{ eligible, reason, daysLeft? }`.
  const db = openDb();
  const order = db.prepare('SELECT id, status, delivered_date AS deliveredDate FROM orders WHERE id = ?').get(input.orderId);
  if (!order) return { error: `Order not found: ${input.orderId}` };

  if (order.status === 'returned') {
    return { eligible: false, reason: 'Order has already been returned' };
  }

  if (order.status !== 'delivered' || !order.deliveredDate) {
    return { eligible: false, reason: 'Order has not been delivered' };
  }

  const delivered = new Date(order.deliveredDate).getTime();
  const now = Date.now();
  const daysSince = (now - delivered) / 86_400_000;
  const daysLeft = Math.max(0, Math.ceil(30 - daysSince));

  if (daysSince <= 30) {
    return { eligible: true, daysLeft };
  } else {
    return { eligible: false, reason: 'Return window (30 days from delivery) has passed' };
  }
  // throw new Error('Not implemented: checkReturnEligibility');
}

export const getCustomerOrdersTool = new FunctionTool({
  name: 'get_customer_orders',
  description: "List a customer's orders (most recent first) and basic customer info.",
  parameters: z.object({
    // TODO: define the parameters (e.g. customerId) with .describe() hints.
    customerId: z.number().describe('Numeric customer id to list orders for'),

  }),
  execute: async (args: any) => getCustomerOrders(args ?? { customerId: 0 }),
});

export const getOrderDetailsTool = new FunctionTool({
  name: 'get_order_details',
  description: 'Return full details for a single order id, including customer and product names.',
  parameters: z.object({
    // TODO: define the parameters (e.g. orderId) with .describe() hints.
    orderId: z.number().describe('Order id to look up'),
  }),
  execute: async (args: any) => getOrderDetails(args ?? { orderId: 0 }),
});

export const checkReturnEligibilityTool = new FunctionTool({
  name: 'check_return_eligibility',
  description: 'Check the 30-day-from-delivery return eligibility for an order.',
  parameters: z.object({
    // TODO: define the parameters (e.g. orderId) with .describe() hints.
    orderId: z.number().describe('Order id to check return eligibility for'),
  }),
  execute: async (args: any) => checkReturnEligibility(args ?? { orderId: 0 }),
});
