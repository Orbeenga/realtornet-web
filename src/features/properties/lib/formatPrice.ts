const currencyFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0
});

export function formatPrice(price: string | number | null | undefined, currency = "NGN") {
  if (price == null || price === "") {
    return "Price on request";
  }

  const amount = Number(price);

  if (!Number.isFinite(amount)) {
    return `${currency} ${price}`;
  }

  return currencyFormatter.format(amount);
}
