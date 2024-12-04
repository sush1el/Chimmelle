// PaymongoHandler.js
class PaymongoHandler {
  static PAYMONGO_SECRET_KEY = 'sk_test_9f8wuPoVqwmFA1g6Kx4upSRX'; // Replace with your test secret key
  static PAYMONGO_PUBLIC_KEY = 'pk_test_1vtaAUQW1xkrMtCtHiSQL5ry'; // Replace with your test public key
  
  static async createPaymentIntent(amount, description, orderId) {
    try {
      // Validate amount
      if (!amount || amount <= 0) {
        throw new Error('Invalid amount specified');
      }

      // Create success and failure URLs with order ID
      const successUrl = `${window.location.origin}/payment-success?orderId=${orderId}`;
      const failedUrl = `${window.location.origin}/payment-failed?orderId=${orderId}`;

      const response = await fetch('https://api.paymongo.com/v1/payment_intents', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(this.PAYMONGO_SECRET_KEY + ':')}`
        },
        body: JSON.stringify({
          data: {
            attributes: {
              amount: Math.round(amount * 100), // Convert to smallest currency unit (centavos)
              payment_method_allowed: ['gcash', 'grab_pay', 'card'],
              payment_method_options: {
                gcash: {
                  success_url: successUrl,
                  failed_url: failedUrl,
                  redirect: {
                    success: successUrl,
                    failed: failedUrl
                  }
                }
              },
              description: description,
              currency: 'PHP',
              capture_type: 'automatic',
              metadata: {
                orderId: orderId
              }
            }
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.errors?.[0]?.detail || 'Failed to create payment intent');
      }

      // Store payment intent ID in session storage
      sessionStorage.setItem('currentPaymentIntentId', data.data.id);
      sessionStorage.setItem('currentOrderId', orderId);

      return data.data;
    } catch (error) {
      console.error('PayMongo payment intent creation error:', error);
      throw new Error(`Payment intent creation failed: ${error.message}`);
    }
  }

  static async createSource(amount, orderId) {
    try {
      const response = await fetch('https://api.paymongo.com/v1/sources', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(this.PAYMONGO_PUBLIC_KEY + ':')}`
        },
        body: JSON.stringify({
          data: {
            attributes: {
              amount: Math.round(amount * 100),
              redirect: {
                success: `${window.location.origin}/payment-success?orderId=${orderId}`,
                failed: `${window.location.origin}/payment-failed?orderId=${orderId}`
              },
              type: 'gcash',
              currency: 'PHP'
            }
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.errors?.[0]?.detail || 'Failed to create payment source');
      }

      return data.data;
    } catch (error) {
      console.error('PayMongo source creation error:', error);
      throw new Error(`Payment source creation failed: ${error.message}`);
    }
  }

  static async createPaymentMethod(paymentType) {
    try {
      const response = await fetch('https://api.paymongo.com/v1/payment_methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(this.PAYMONGO_PUBLIC_KEY + ':')}`
        },
        body: JSON.stringify({
          data: {
            attributes: {
              type: paymentType
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create payment method');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('PayMongo payment method creation error:', error);
      throw error;
    }
  }

  static async attachPaymentIntent(paymentIntentId, paymentMethodId) {
    try {
      const response = await fetch(`https://api.paymongo.com/v1/payment_intents/${paymentIntentId}/attach`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(this.PAYMONGO_SECRET_KEY + ':')}`
        },
        body: JSON.stringify({
          data: {
            attributes: {
              payment_method: paymentMethodId,
              client_key: paymentIntentId
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to attach payment intent');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('PayMongo payment intent attachment error:', error);
      throw error;
    }
  }

  // In PaymongoHandler.js
static async processPayment(amount, description) {
  try {
    // Validate input parameters
    if (!amount || isNaN(amount) || amount <= 0) {
      throw new Error('Invalid amount specified');
    }

    // Get checkout data and validate
    const checkoutData = JSON.parse(sessionStorage.getItem('checkoutData'));
    if (!checkoutData || !checkoutData.items || checkoutData.items.length === 0) {
      throw new Error('Invalid checkout data');
    }

    // Create payment source for GCash
    const source = await this.createSource(amount, 'temp-order-id'); // Use a temporary ID

    if (!source || !source.attributes || !source.attributes.redirect) {
      throw new Error('Invalid payment source response');
    }

    // Store the source ID 
    sessionStorage.setItem('currentSourceId', source.id);

    // Return the checkout URL
    return source.attributes.redirect.checkout_url;
  } catch (error) {
    console.error('Payment processing error:', error);
    throw new Error(`Payment processing failed: ${error.message}`);
  }
}
}


window.PaymongoHandler = PaymongoHandler;