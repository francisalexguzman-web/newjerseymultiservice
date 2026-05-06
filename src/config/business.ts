export type PaymentLink = {
  id: string;
  title: string;
  description: string;
  amountLabel?: string;
  href: string;
  accent: "teal" | "indigo" | "rose" | "amber";
};

export const businessConfig = {
  businessName: "NEW JERSEY MULTISERVICE & DESIGN",
  tagline: "Secure payment portal",
  phone: "9089167015",
  email: "payments@yourbusiness.com",
  address: "Available for payments 24/7",
  whatsappMessage: "Hello, I need help with my payment.",
  paymentLinks: [
    {
      id: "balance",
      title: "Pay outstanding balance",
      description: "Use this link to settle an invoice or active balance.",
      amountLabel: "Variable amount",
      href: "https://example.com/pay-balance",
      accent: "teal",
    },
    {
      id: "monthly",
      title: "Monthly payment",
      description: "Recurring payment for a service, membership, or monthly plan.",
      amountLabel: "$49.00",
      href: "https://example.com/pay-monthly",
      accent: "indigo",
    },
    {
      id: "deposit",
      title: "Deposit or advance",
      description: "Reserve your service with an initial payment.",
      amountLabel: "$25.00",
      href: "https://example.com/pay-deposit",
      accent: "amber",
    },
  ] satisfies PaymentLink[],
};
