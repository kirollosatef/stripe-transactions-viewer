// server.js
const express = require('express');
const stripe = require('stripe');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Use the direct Stripe key
const STRIPE_SECRET_KEY = 'sk_test_51K2Fy2C4fLRBbEt4SkCyjGyKqGXHLkWMzB2dSB8XYDpRVf9ktyXnXyXFNpJMaByTe8oZ8HtvitQdJKDyvzKHnrxG00gpNmrIW6';
console.log('Using provided Stripe secret key: Key is present');

// Initialize Stripe with your secret key
let stripeInstance = null;
try {
  stripeInstance = stripe(STRIPE_SECRET_KEY);
  console.log('Stripe initialized successfully');
} catch (error) {
  console.error('Error initializing Stripe:', error);
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to get customer details
app.get('/api/customer/:customerId', async (req, res) => {
  if (!stripeInstance) {
    return res.status(500).json({
      error: 'Stripe not initialized'
    });
  }

  try {
    const customerId = req.params.customerId;
    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }

    const customer = await stripeInstance.customers.retrieve(customerId);
    res.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get recent transactions
app.get('/api/transactions', async (req, res) => {
  if (!stripeInstance) {
    return res.status(500).json({
      error: 'Stripe not initialized'
    });
  }

  try {
    // Create arrays to store our results
    let chargesData = [];
    let payoutsData = [];
    let balanceTransactionsData = [];

    try {
      // Get payments (charges) - include all statuses
      const charges = await stripeInstance.charges.list({
        limit: 100, // Increased limit further
        expand: ['data.customer'] // Expand customer info to get email
      });
      chargesData = charges.data;
      console.log(`Fetched ${chargesData.length} charges`);

      // Log the first charge's customer structure if available
      if (chargesData.length > 0 && chargesData[0].customer) {
        console.log("Sample customer structure:", JSON.stringify(chargesData[0].customer, null, 2));
      }
    } catch (chargeError) {
      console.error('Error fetching charges:', chargeError);
    }

    try {
      // Get payouts
      const payouts = await stripeInstance.payouts.list({
        limit: 50 // Increased limit
      });
      payoutsData = payouts.data;
      console.log(`Fetched ${payoutsData.length} payouts`);
    } catch (payoutError) {
      console.error('Error fetching payouts:', payoutError);
    }

    try {
      // Get balance transactions of all types
      const balanceTransactions = await stripeInstance.balanceTransactions.list({
        limit: 200, // Significantly increased limit to get more transactions
        expand: ['data.source'] // Try to expand source data when possible
      });
      balanceTransactionsData = balanceTransactions.data;
      console.log(`Fetched ${balanceTransactionsData.length} balance transactions`);

      // Log the first transaction's structure if available
      if (balanceTransactionsData.length > 0) {
        console.log("Sample transaction type:", balanceTransactionsData[0].type);
        console.log("Sample transaction status:", balanceTransactionsData[0].status);
      }
    } catch (balanceError) {
      console.error('Error fetching balance transactions:', balanceError);
    }

    res.json({
      charges: chargesData,
      payouts: payoutsData,
      balanceTransactions: balanceTransactionsData
    });
  } catch (error) {
    console.error('Error in API call:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Open your browser and navigate to http://localhost:${port}`);
});