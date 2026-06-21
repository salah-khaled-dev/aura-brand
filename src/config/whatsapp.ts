export const WHATSAPP_CONFIG = {
  phoneNumber: "201000000000",
  defaultMessage: "مرحباً، أريد الاستفسار عن منتجات AURA",
};

export const getWhatsAppUrl = (message?: string) => {
  const text = message || WHATSAPP_CONFIG.defaultMessage;
  return `https://wa.me/${WHATSAPP_CONFIG.phoneNumber}?text=${encodeURIComponent(text)}`;
};
