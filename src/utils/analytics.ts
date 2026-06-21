/**
 * AURA Premium Analytics Placeholder Module
 * Handles demo-mode tracking event logging for partner presentation.
 * Logs are color-coded in the console to match AURA's luxury aesthetic.
 */

const LOG_PREFIX_STYLE = "color: #FFFFFF; background: #8E6B4B; padding: 2px 6px; font-weight: bold; border-radius: 2px;";
const LOG_CONTENT_STYLE = "color: #8E6B4B; font-weight: bold;";
const LOG_DATA_STYLE = "color: #111111; font-family: monospace; font-size: 11px;";

export const analytics = {
  trackProductView: (id: string, title: string, price: number) => {
    console.log(
      `%c[AURA Analytics]%c Product View Event`,
      LOG_PREFIX_STYLE,
      LOG_CONTENT_STYLE
    );
    console.log(
      `%cID: ${id}\nTitle: ${title}\nPrice: ${price} EGP`,
      LOG_DATA_STYLE
    );
  },

  trackAddToCart: (id: string, title: string, price: number, size: string, color: string, quantity: number) => {
    console.log(
      `%c[AURA Analytics]%c Add to Cart Event`,
      LOG_PREFIX_STYLE,
      LOG_CONTENT_STYLE
    );
    console.log(
      `%cItem Added:\n- ID: ${id}\n- Title: ${title}\n- Price: ${price} EGP\n- Size: ${size}\n- Color: ${color}\n- Qty: ${quantity}`,
      LOG_DATA_STYLE
    );
  },

  trackCheckoutStart: (cartLength: number, subtotal: number) => {
    console.log(
      `%c[AURA Analytics]%c Checkout Initiated`,
      LOG_PREFIX_STYLE,
      LOG_CONTENT_STYLE
    );
    console.log(
      `%cTotal items in cart: ${cartLength}\nSubtotal: ${subtotal} EGP`,
      LOG_DATA_STYLE
    );
  },

  trackPurchaseSuccess: (orderId: string, cartItems: { title: string; color?: string; size?: string; quantity: number }[], subtotal: number, paymentMethod: string) => {
    console.log(
      `%c[AURA Analytics]%c Purchase Complete Event`,
      LOG_PREFIX_STYLE,
      LOG_CONTENT_STYLE
    );
    const itemDetails = cartItems
      .map((item) => `  * ${item.title} (${item.color}/${item.size}) x${item.quantity}`)
      .join("\n");
    console.log(
      `%cOrder Details:\n- Order ID: ${orderId}\n- Items:\n${itemDetails}\n- Total Subtotal: ${subtotal} EGP\n- Payment Method: ${paymentMethod}`,
      LOG_DATA_STYLE
    );
  }
};
