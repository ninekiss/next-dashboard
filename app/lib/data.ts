import { sql } from '@vercel/postgres';
import { db } from './db';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  User,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';

export async function fetchRevenue() {
  // Add noStore() here to prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).

  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // const data = await sql<Revenue>`SELECT * FROM revenue`;
    const data = await new Promise<{ rows: Revenue[] }>((resolve, reject) => {
      db.all<Revenue>(`SELECT * FROM revenue`, (err, rows) => {
        resolve({ rows });
      });
    });

    console.log('Data fetch completed after 3 seconds.');

    return data.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  try {
    console.log('Fetching invoices data...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const data = await new Promise<{ rows: LatestInvoiceRaw[] }>(
      (resolve, reject) => {
        db.all<LatestInvoiceRaw>(
          `
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5`,
          (err, rows) => {
            resolve({ rows });
          },
        );
      },
    );

    const latestInvoices = data.rows.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));

    console.log('Data fetch completed after 2 seconds.');

    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const invoiceCountPromise = new Promise<{ rows: { count: number }[] }>(
      (resolve, reject) => {
        db.all<{ count: number }>(
          `SELECT COUNT(id) as count FROM invoices`,
          (err, rows) => resolve({ rows }),
        );
      },
    );
    const customerCountPromise = new Promise<{ rows: { count: number }[] }>(
      (resolve, reject) => {
        db.all<{ count: number }>(
          `SELECT COUNT(id) as count FROM customers`,
          (err, rows) => resolve({ rows }),
        );
      },
    );
    const invoiceStatusPromise = new Promise<{
      rows: { paid: number; pending: number }[];
    }>((resolve, reject) => {
      db.all<{ paid: number; pending: number }>(
        `SELECT
      SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
      FROM invoices`,
        (err, rows) => resolve({ rows }),
      );
    });

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const numberOfInvoices = Number(data[0].rows[0].count ?? '0');
    const numberOfCustomers = Number(data[1].rows[0].count ?? '0');
    const totalPaidInvoices = formatCurrency(data[2].rows[0].paid ?? '0');
    const totalPendingInvoices = formatCurrency(data[2].rows[0].pending ?? '0');

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const invoices = await new Promise<{
      rows: InvoicesTable[];
    }>((resolve, reject) => {
      db.all<InvoicesTable>(
        `SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name LIKE '${`%${query}%`}' OR
        customers.email LIKE '${`%${query}%`}' OR
        invoices.amount LIKE '${`%${query}%`}' OR
        invoices.date LIKE '${`%${query}%`}' OR
        invoices.status LIKE '${`%${query}%`}'
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}`,
        (err, rows) => resolve({ rows }),
      );
    });

    return invoices.rows;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    const count = await new Promise<{
      rows: { count: number }[];
    }>((resolve, reject) => {
      db.all<{ count: number }>(
        `SELECT COUNT(*) as count
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
      customers.name LIKE '${`%${query}%`}' OR
      customers.email LIKE '${`%${query}%`}' OR
      invoices.amount LIKE '${`%${query}%`}' OR
      invoices.date LIKE '${`%${query}%`}' OR
      invoices.status LIKE '${`%${query}%`}'`,
        (err, rows) => resolve({ rows }),
      );
    });

    const totalPages = Math.ceil(Number(count.rows[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  try {
    const data = await new Promise<{
      rows: InvoiceForm[];
    }>((resolve) => {
      db.all<InvoiceForm>(
        `SELECT
          invoices.id,
          invoices.customer_id,
          invoices.amount,
          invoices.status
        FROM invoices
        WHERE invoices.id = '${id}';`,
        (err, rows) => resolve({ rows }),
      );
    });

    const invoice = data.rows.map((invoice) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    return invoice[0];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  try {
    const data = await new Promise<{
      rows: CustomerField[];
    }>((resolve, reject) => {
      db.all<CustomerField>(
        `
        SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
      `,
        (err, rows) => resolve({ rows }),
      );
    });

    const customers = data.rows;
    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await sql<CustomersTableType>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}

export async function getUser(email: string) {
  try {
    const user = await sql`SELECT * FROM users WHERE email=${email}`;
    return user.rows[0] as User;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}
