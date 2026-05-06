import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Home,
  Laptop,
  Mail,
  MapPin,
  MessageCircle,
  Minus,
  Phone,
  Package,
  Plus,
  QrCode,
  ReceiptText,
  Search,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Star,
  Trash2,
  Truck,
  UserRound,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";

const BUSINESS_CONFIG = {
  businessName: "NEW JERSEY MULTISERVICE & DESIGN",
  tagline: "Reliable solutions, sales, and service for your devices",
  description:
    "We help residential customers and small businesses with computers, supplies, technical support, and practical technology solutions.",
  phone: "9089167015",
  whatsappNumber: "19089167015",
  email: "payments@americanpcandsupply.com",
  address: "United States",
  currency: "USD",
  businessHours: "Monday to Saturday, 9:00 AM - 6:00 PM",
  paymentLinks: {
    stripe: "https://buy.stripe.com/REPLACE_THIS_LINK",
    square: "https://square.link/u/REPLACE_THIS_LINK",
    paypal: "https://paypal.me/REPLACE_THIS_LINK",
    cashapp: "https://cash.app/$REPLACE",
    crypto: "https://commerce.coinbase.com/REPLACE_THIS_LINK",
    bitpay: "https://bitpay.com/invoice/REPLACE_THIS_LINK",
    kraken: "https://www.kraken.com/krak",
    monero: "https://www.getmonero.org/",
    zelleInfo: "Send Zelle to payments@americanpcandsupply.com",
  },
  krakTag: "@engelsguzman",
  krakQrImage: "/krak-engelsguzman-qr.jpg",
  moneroAddress:
    "42KDphgWR6Nb3qfFK8WUEVEtvLkjYmwitUrSQcSVrmG6LbLp1LCQCjeLbuZKgn7jPd73eZRuYrKih2BTQAPCxkqeRv4oyNV",
  moneroQrImage: "/monero-qr.svg",
};

const SERVICES: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    title: "Computer and supply sales",
    description:
      "Computers, accessories, parts, peripherals, and supplies for customers and small businesses.",
    icon: Laptop,
  },
  {
    title: "Technical support",
    description:
      "Help with setup, installation, diagnostics, cleaning, optimization, and common computer issues.",
    icon: Wrench,
  },
  {
    title: "Orders and delivery",
    description:
      "Quotes, special orders, and local delivery coordination depending on availability.",
    icon: Truck,
  },
];

type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  imageUrl?: string;
  imageAlt?: string;
  specs: string[];
  featured?: boolean;
};

type CartState = Record<string, number>;

type Customer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  company: string;
  notes: string;
  createdAt: string;
};

const EMPTY_CUSTOMER = {
  name: "",
  phone: "",
  email: "",
  address: "",
  company: "",
  notes: "",
};

const CUSTOMER_STORAGE_KEY = "portal-pagos-customers-v1";
const CUSTOMER_SEED_VERSION = "2026-05-05-address-import-v1";
const CUSTOMER_SEED_VERSION_KEY = "portal-pagos-customer-seed-version";
const BITPAY_URL_STORAGE_KEY = "portal-pagos-bitpay-url";
const KRAK_URL_STORAGE_KEY = "portal-pagos-krak-url";
const MONERO_ADDRESS_STORAGE_KEY = "portal-pagos-monero-address";

function getLastNameSortKey(name: string) {
  const cleanName = name.trim().replace(/\s+/g, " ");
  const parts = cleanName.split(" ").filter(Boolean);
  const lastName = parts.at(-1) || cleanName;
  const firstNames = parts.slice(0, -1).join(" ");
  return `${lastName} ${firstNames}`.trim().toLowerCase();
}

function getLastNameInitial(name: string) {
  return getLastNameSortKey(name).charAt(0).toUpperCase();
}

function sortCustomersByLastName(customers: Customer[]) {
  return [...customers].sort((first, second) => {
    const lastNameComparison = getLastNameSortKey(first.name).localeCompare(
      getLastNameSortKey(second.name),
      undefined,
      { sensitivity: "base" },
    );

    if (lastNameComparison !== 0) return lastNameComparison;
    return first.address.localeCompare(second.address, undefined, { sensitivity: "base" });
  });
}

function createSeedCustomers(customerSeed: Array<{ name: string; address: string }>): Customer[] {
  return sortCustomersByLastName(
    customerSeed.map((customer, index) => ({
      id: `seed-${index + 1}`,
      name: customer.name,
      phone: "",
      email: "",
      address: customer.address,
      company: "",
      notes: "Imported customer address list.",
      createdAt: "2026-05-05T00:00:00.000Z",
    })),
  );
}

function customerKey(customer: Pick<Customer, "name" | "address">) {
  return `${customer.name}|${customer.address}`
    .trim()
    .toLowerCase()
    .replace(/[.,#]/g, "")
    .replace(/\s+/g, " ");
}

function mergeSeedCustomers(customers: Customer[], seedCustomers: Customer[]) {
  const existingKeys = new Set(customers.map(customerKey));
  const missingSeedCustomers = seedCustomers.filter((customer) => !existingKeys.has(customerKey(customer)));
  return sortCustomersByLastName([...missingSeedCustomers, ...customers]);
}

function normalizePublicPaymentUrl(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";
  return /^https?:\/\//i.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`;
}

function getKrakUrlError(value: string) {
  const normalizedUrl = normalizePublicPaymentUrl(value);
  if (!normalizedUrl) return "";

  try {
    const url = new URL(normalizedUrl);
    if (url.protocol !== "https:") {
      return "Use an https:// link for Krak payments.";
    }
    if (url.hostname.toLowerCase() === "krak.app") {
      return "krak.app is not opening securely. Use the paylink from inside the Krak app or the official Kraken/Krak page.";
    }
    return "";
  } catch {
    return "Enter a valid Krak paylink or Kraktag URL.";
  }
}

function getMoneroAddressError(value: string) {
  const address = value.trim();
  if (!address) return "";
  if (address.length < 90 || address.length > 110) {
    return "Monero addresses are usually 95 to 106 characters long.";
  }
  if (!/^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/.test(address)) {
    return "Enter a valid Monero address without spaces or special characters.";
  }
  return "";
}

const PRODUCTS: Product[] = [
  {
    id: "premium-business-laptop-pro",
    name: "Premium Business Laptop Pro",
    category: "Business laptop",
    description:
      "Premium laptop for work, office tasks, studies, fast browsing, video calls, and daily productivity.",
    price: 670,
    imageUrl:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Premium laptop on a desk",
    specs: ["Intel Core i7 / Ryzen 7", "16GB RAM", "512GB SSD", "Windows 11 Pro"],
    featured: true,
  },
  {
    id: "executive-all-in-one-workstation",
    name: "Executive All-in-One Workstation",
    category: "All-in-one computer",
    description:
      "Elegant system for reception, office, small business, or a professional desk with integrated display.",
    price: 645,
    imageUrl:
      "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=900&q=80",
    imageAlt: "All-in-one workstation on an office desk",
    specs: ["Full HD display", "16GB RAM", "512GB SSD", "Wi-Fi + Bluetooth"],
    featured: true,
  },
  {
    id: "creator-mini-pc-premium-kit",
    name: "Creator Mini PC Premium Kit",
    category: "Professional mini PC",
    description:
      "Powerful compact computer for office work, content, sales, administration, or limited space.",
    price: 595,
    imageUrl:
      "https://images.unsplash.com/photo-1593640495253-23196b27a87f?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Compact computer workstation setup",
    specs: ["Compact design", "16GB RAM", "1TB SSD", "Dual monitor support"],
  },
  {
    id: "premium-office-desktop-bundle",
    name: "Premium Office Desktop Bundle",
    category: "Desktop + accessories",
    description:
      "Complete office package with computer, keyboard, mouse, and initial setup included.",
    price: 575,
    imageUrl:
      "https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Office desktop computer bundle",
    specs: ["Business desktop", "24-inch monitor", "Keyboard and mouse", "Basic installation"],
  },
  {
    id: "secure-business-network-pack",
    name: "Secure Business Network Pack",
    category: "Network and security",
    description:
      "Package to improve internet, Wi-Fi, and basic security for an office, store, or small business.",
    price: 525,
    imageUrl:
      "https://images.unsplash.com/photo-1606904825846-647eb07f5be2?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Business network router and cables",
    specs: ["Premium router", "Secure configuration", "Guest network", "Wi-Fi optimization"],
  },
  {
    id: "premium-pos-starter-package",
    name: "Premium POS Starter Package",
    category: "Point of sale",
    description:
      "Starter kit for businesses that need to accept payments, organize sales, and begin with a POS system.",
    price: 495,
    imageUrl:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Point of sale payment terminal",
    specs: ["Compatible tablet or terminal", "Payment base", "Initial setup", "Basic support"],
  },
  {
    id: "professional-monitor-dual-setup",
    name: "Professional Monitor Dual Setup",
    category: "Premium monitors",
    description:
      "Two-monitor setup for office work, productivity, accounting, sales, or remote work.",
    price: 485,
    imageUrl:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Dual monitor professional office setup",
    specs: ["2 Full HD monitors", "Cables included", "Basic stand", "Optional installation"],
  },
  {
    id: "business-security-camera-starter-kit",
    name: "Business Security Camera Starter Kit",
    category: "Security cameras",
    description:
      "Starter camera system to monitor an entrance, office, storage room, or small business.",
    price: 650,
    imageUrl:
      "https://images.unsplash.com/photo-1557324232-b8917d3c3dcb?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Security camera installed on a building",
    specs: ["HD cameras", "Mobile access", "Local/cloud recording", "Configuration included"],
    featured: true,
  },
  {
    id: "network-maintenance-support",
    name: "Network Maintenance and Support",
    category: "Business support",
    description:
      "Ongoing maintenance and technical support for business networks, Wi-Fi, routers, and connected devices.",
    price: 475,
    imageUrl:
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Network server equipment and support",
    specs: ["Network diagnostics", "Router and Wi-Fi support", "Device connectivity", "Security review"],
    featured: true,
  },
  {
    id: "payroll-support",
    name: "Payroll Support",
    category: "Business support",
    description:
      "Payroll assistance for small businesses that need organized employee payment records and recurring support.",
    price: 525,
    imageUrl:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Payroll documents and calculator",
    specs: ["Employee payroll setup", "Payment record organization", "Recurring payroll support", "Basic reports"],
  },
  {
    id: "accounting-support",
    name: "Accounting Support",
    category: "Business support",
    description:
      "Bookkeeping and accounting support for small businesses that need clearer records and monthly organization.",
    price: 575,
    imageUrl:
      "https://images.unsplash.com/photo-1554224154-26032fced8bd?auto=format&fit=crop&w=900&q=80",
    imageAlt: "Accounting paperwork and financial reports",
    specs: ["Bookkeeping assistance", "Expense organization", "Monthly summaries", "Document review"],
  },
];

type SectionKey = "home" | "catalog" | "cart" | "clients" | "services" | "pay" | "crypto" | "policies";
type PaymentMethod = keyof typeof BUSINESS_CONFIG.paymentLinks;

function money(value: string | number) {
  const number = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: BUSINESS_CONFIG.currency,
    minimumFractionDigits: 2,
  }).format(Number.isFinite(number) ? number : 0);
}

function Header({
  activeSection,
  cartCount,
  setActiveSection,
}: {
  activeSection: SectionKey;
  cartCount: number;
  setActiveSection: (section: SectionKey) => void;
}) {
  const navItems: Array<[SectionKey, string, LucideIcon]> = [
    ["home", "Home", Home],
    ["services", "Services", Star],
    ["catalog", "Catalog", Package],
    ["cart", "Cart", ShoppingCart],
    ["pay", "Pay", CreditCard],
    ["crypto", "Crypto", QrCode],
    ["policies", "Policies", FileText],
  ];
  const localNavItems: Array<[SectionKey, string, LucideIcon]> = import.meta.env.DEV
    ? [...navItems.slice(0, 4), ["clients", "Clients", Users], ...navItems.slice(4)]
    : navItems;

  return (
    <header className="sticky top-0 z-30 border-b border-blue-100 bg-white/95 shadow-sm backdrop-blur">
      <div className="h-1 bg-red-600" />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button
          className="flex min-w-0 items-center gap-3 text-left"
          onClick={() => setActiveSection("home")}
        >
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-white p-1 shadow-sm ring-1 ring-slate-200">
            <img
              alt={`${BUSINESS_CONFIG.businessName} logo`}
              className="h-full w-full object-contain"
              src="/logo.svg"
            />
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate font-bold leading-tight">{BUSINESS_CONFIG.businessName}</p>
            <p className="truncate text-xs text-slate-500">{BUSINESS_CONFIG.tagline}</p>
          </div>
        </button>

        <nav className="grid grid-cols-3 gap-1 rounded-lg bg-blue-50 p-1 ring-1 ring-blue-100 sm:grid-cols-7">
          {localNavItems.map(([key, label, Icon]) => (
            <button
              className={`flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                activeSection === key
                  ? "bg-blue-900 text-white shadow-sm"
                  : "text-blue-900 hover:bg-white hover:text-red-700"
              }`}
              key={key}
              onClick={() => setActiveSection(key)}
            >
              <span className="relative">
                <Icon className="h-4 w-4" />
                {key === "cart" && cartCount > 0 ? (
                  <span className="absolute -right-2.5 -top-2.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-black text-white">
                    {cartCount}
                  </span>
                ) : null}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

function HomeSection({ setActiveSection }: { setActiveSection: (section: SectionKey) => void }) {
  const whatsappUrl = `https://wa.me/${BUSINESS_CONFIG.whatsappNumber}?text=${encodeURIComponent(
    `Hello, I would like information about ${BUSINESS_CONFIG.businessName}.`,
  )}`;

  return (
    <section className="grid gap-8 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        initial={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.35 }}
      >
        <p className="mb-3 inline-flex rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-sm">
          Reliable service and secure payments
        </p>
        <h1 className="text-4xl font-black tracking-normal text-blue-950 sm:text-5xl lg:text-6xl">
          {BUSINESS_CONFIG.businessName}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">{BUSINESS_CONFIG.description}</p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-900 px-6 py-4 font-bold text-white shadow-sm transition hover:bg-blue-800"
            onClick={() => setActiveSection("services")}
          >
            <Star className="h-5 w-5" />
            View services
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-4 font-bold text-white shadow-sm transition hover:bg-red-700"
            onClick={() => setActiveSection("catalog")}
          >
            <Package className="h-5 w-5" />
            Shop products
          </button>
          <a
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-4 font-bold text-red-700 shadow-sm ring-1 ring-red-100 transition hover:bg-red-50"
            href={whatsappUrl}
            rel="noreferrer"
            target="_blank"
          >
            <MessageCircle className="h-5 w-5" />
            Contact on WhatsApp
          </a>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            [Wrench, "Multiservice support"],
            [Laptop, "Technology solutions"],
            [CreditCard, "Online payments"],
          ].map(([Icon, label]) => (
            <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-blue-100" key={label as string}>
              <Icon className="h-6 w-6 text-red-600" />
              <p className="mt-2 text-sm font-bold">{label as string}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-blue-100"
        initial={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.35, delay: 0.08 }}
      >
        <div className="rounded-lg bg-blue-950 p-6 text-white">
          <div className="mb-5 grid place-items-center rounded-lg bg-white p-4 ring-4 ring-red-600/20">
            <img
              alt={`${BUSINESS_CONFIG.businessName} logo`}
              className="max-h-44 w-full object-contain"
              src="/logo.svg"
            />
          </div>
          <p className="text-sm font-semibold text-red-200">Business information</p>
          <h2 className="mt-2 text-2xl font-black">Ready to help you</h2>
          <div className="mt-6 space-y-4 text-sm text-slate-200">
            <p className="flex items-center gap-3">
              <Phone className="h-5 w-5" /> {BUSINESS_CONFIG.phone}
            </p>
            <p className="flex items-center gap-3">
              <Mail className="h-5 w-5" /> {BUSINESS_CONFIG.email}
            </p>
            <p className="flex items-center gap-3">
              <MapPin className="h-5 w-5" /> {BUSINESS_CONFIG.address}
            </p>
            <p className="flex items-center gap-3">
              <Clock className="h-5 w-5" /> {BUSINESS_CONFIG.businessHours}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="lg:col-span-2">
        <div className="grid gap-4 rounded-lg bg-white p-5 shadow-sm ring-1 ring-blue-100 md:grid-cols-4">
          <a
            className="flex items-center gap-3 rounded-lg bg-blue-50 p-4 font-bold text-blue-950 transition hover:bg-blue-100"
            href={`tel:${BUSINESS_CONFIG.phone}`}
          >
            <Phone className="h-5 w-5 text-red-600" />
            Call us
          </a>
          <a
            className="flex items-center gap-3 rounded-lg bg-blue-50 p-4 font-bold text-blue-950 transition hover:bg-blue-100"
            href={whatsappUrl}
            rel="noreferrer"
            target="_blank"
          >
            <MessageCircle className="h-5 w-5 text-red-600" />
            WhatsApp
          </a>
          <a
            className="flex items-center gap-3 rounded-lg bg-blue-50 p-4 font-bold text-blue-950 transition hover:bg-blue-100"
            href={`mailto:${BUSINESS_CONFIG.email}`}
          >
            <Mail className="h-5 w-5 text-red-600" />
            Email
          </a>
          <button
            className="flex items-center gap-3 rounded-lg bg-blue-900 p-4 font-bold text-white transition hover:bg-blue-800"
            onClick={() => setActiveSection("pay")}
          >
            <CreditCard className="h-5 w-5 text-red-200" />
            Pay online
          </button>
        </div>
      </div>
    </section>
  );
}

function ServicesSection() {
  return (
    <section className="py-10">
      <div className="mb-8 text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-red-600">Services</p>
        <h2 className="mt-2 text-3xl font-black text-blue-950 sm:text-4xl">What we offer</h2>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
          Practical computer sales, supplies, and technical service for home and business customers.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {SERVICES.map((service) => {
          const Icon = service.icon;
          return (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border-t-4 border-red-600 bg-white p-6 shadow-sm ring-1 ring-blue-100"
              initial={{ opacity: 0, y: 14 }}
              key={service.title}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-4 inline-flex rounded-lg bg-blue-50 p-3">
                <Icon className="h-7 w-7 text-blue-900" />
              </div>
              <h3 className="text-xl font-black">{service.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{service.description}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function CatalogSection({
  addToCart,
  cart,
  setActiveSection,
}: {
  addToCart: (productId: string) => void;
  cart: CartState;
  setActiveSection: (section: SectionKey) => void;
}) {
  const categories = ["All", ...Array.from(new Set(PRODUCTS.map((product) => product.category)))];
  const [selectedCategory, setSelectedCategory] = useState("All");

  const visibleProducts =
    selectedCategory === "All"
      ? PRODUCTS
      : PRODUCTS.filter((product) => product.category === selectedCategory);

  const productInquiryUrl = (productName: string, price: number) =>
    `https://wa.me/${BUSINESS_CONFIG.whatsappNumber}?text=${encodeURIComponent(
      `Hello, I am interested in ${productName} listed at ${money(price)}.`,
    )}`;

  return (
    <section className="py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-red-600">Premium catalog</p>
          <h2 className="mt-2 text-3xl font-black text-blue-950 sm:text-4xl">
            Products from $475 to $670
          </h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            Premium selections for customers, offices, and small businesses. Prices are subject to
            availability, taxes, and delivery.
          </p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700"
          onClick={() => setActiveSection("cart")}
        >
          <ShoppingCart className="h-4 w-4" />
          View cart
        </button>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {categories.map((category) => (
          <button
            className={`shrink-0 rounded-lg border px-4 py-2 text-sm font-bold transition ${
              selectedCategory === category
                ? "border-blue-900 bg-blue-900 text-white"
                : "border-blue-100 bg-white text-blue-900 hover:bg-blue-50"
            }`}
            key={category}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {visibleProducts.map((product) => (
          <motion.article
            animate={{ opacity: 1, y: 0 }}
            className="flex min-h-[260px] flex-col overflow-hidden rounded-lg border-t-4 border-blue-900 bg-white shadow-sm ring-1 ring-blue-100 transition hover:-translate-y-0.5 hover:shadow-md"
            initial={{ opacity: 0, y: 14 }}
            key={product.id}
            transition={{ duration: 0.3 }}
          >
            {product.imageUrl ? (
              <div className="relative aspect-[4/3] bg-blue-50">
                <img
                  alt={product.imageAlt || product.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  src={product.imageUrl}
                />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-blue-950/45 to-transparent" />
              </div>
            ) : null}

            <div className="flex items-start justify-between gap-3 p-5 pb-0">
              <div>
                <span className="inline-flex rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-900">
                  {product.category}
                </span>
                {product.featured ? (
                  <span className="ml-2 inline-flex rounded-md bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700">
                    Featured
                  </span>
                ) : null}
              </div>
              <Package className="h-6 w-6 text-red-500" />
            </div>

            <div className="flex flex-1 flex-col p-5 pt-0">
              <h3 className="mt-4 text-xl font-black text-blue-950">{product.name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{product.description}</p>

              <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-700">
                {product.specs.map((spec) => (
                  <li className="flex items-start gap-2" key={spec}>
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                    <span>{spec}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5 rounded-lg bg-blue-50 p-4 ring-1 ring-blue-100">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-500">Price</p>
                  <p className="text-2xl font-black text-red-600">{money(product.price)}</p>
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-500">
                  Contact us to confirm availability before purchase.
                </p>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
                  onClick={() => addToCart(product.id)}
                >
                  <ShoppingCart className="h-4 w-4" />
                  {cart[product.id] ? `In cart (${cart[product.id]})` : "Add"}
                </button>
                <a
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-100 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-50"
                  href={productInquiryUrl(product.name, product.price)}
                  rel="noreferrer"
                  target="_blank"
                >
                  <MessageCircle className="h-4 w-4" />
                  Ask
                </a>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function CartSection({
  cartItems,
  cartTotal,
  clearCart,
  setActiveSection,
  updateCartQuantity,
}: {
  cartItems: Array<{ product: Product; quantity: number; lineTotal: number }>;
  cartTotal: number;
  clearCart: () => void;
  setActiveSection: (section: SectionKey) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
}) {
  const whatsappOrderUrl = `https://wa.me/${BUSINESS_CONFIG.whatsappNumber}?text=${encodeURIComponent(
    `Hello, I would like to place this order:\n\n${cartItems
      .map((item) => `${item.quantity} x ${item.product.name} - ${money(item.lineTotal)}`)
      .join("\n")}\n\nTotal: ${money(cartTotal)}`,
  )}`;

  return (
    <section className="grid gap-6 py-10 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-blue-100 sm:p-7">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-red-600">Shopping cart</p>
            <h2 className="mt-2 text-3xl font-black text-blue-950">Review your order</h2>
          </div>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-100 px-4 py-3 text-sm font-bold text-blue-900 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={cartItems.length === 0}
            onClick={clearCart}
          >
            <Trash2 className="h-4 w-4" />
            Clear cart
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50 p-8 text-center">
            <ShoppingCart className="mx-auto h-12 w-12 text-blue-300" />
            <h3 className="mt-4 text-xl font-black text-blue-950">Your cart is empty</h3>
            <p className="mt-2 text-sm text-slate-600">Add products or services from the catalog.</p>
            <button
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
              onClick={() => setActiveSection("catalog")}
            >
              <Package className="h-4 w-4" />
              Go to catalog
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {cartItems.map((item) => (
              <article
                className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm"
                key={item.product.id}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-4">
                    {item.product.imageUrl ? (
                      <img
                        alt={item.product.imageAlt || item.product.name}
                        className="h-20 w-24 shrink-0 rounded-lg object-cover ring-1 ring-blue-100"
                        loading="lazy"
                        src={item.product.imageUrl}
                      />
                    ) : null}
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-red-600">
                        {item.product.category}
                      </p>
                      <h3 className="mt-1 text-lg font-black text-blue-950">{item.product.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">{money(item.product.price)} each</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="inline-flex items-center rounded-lg border border-blue-100 bg-blue-50">
                      <button
                        aria-label={`Decrease ${item.product.name}`}
                        className="grid h-10 w-10 place-items-center text-blue-900 transition hover:bg-white"
                        onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="grid h-10 min-w-10 place-items-center px-3 text-sm font-black text-blue-950">
                        {item.quantity}
                      </span>
                      <button
                        aria-label={`Increase ${item.product.name}`}
                        className="grid h-10 w-10 place-items-center text-blue-900 transition hover:bg-white"
                        onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="min-w-24 text-right">
                      <p className="text-lg font-black text-red-600">{money(item.lineTotal)}</p>
                      <button
                        className="mt-1 text-xs font-bold text-slate-500 underline-offset-4 hover:text-red-700 hover:underline"
                        onClick={() => updateCartQuantity(item.product.id, 0)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <aside className="space-y-5">
        <div className="rounded-lg bg-blue-950 p-6 text-white shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-red-200">Cart total</p>
              <p className="mt-2 text-4xl font-black">{money(cartTotal)}</p>
            </div>
            <div className="rounded-lg bg-red-600 p-3">
              <ShoppingCart className="h-7 w-7" />
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm text-slate-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Confirm availability before final purchase
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Checkout total can be paid in the portal
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Send the full order by WhatsApp
            </div>
          </div>
        </div>

        <button
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-4 text-base font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={cartItems.length === 0}
          onClick={() => setActiveSection("pay")}
        >
          <CreditCard className="h-5 w-5" />
          Checkout
        </button>

        <a
          className={`flex w-full items-center justify-center gap-2 rounded-lg border px-5 py-4 text-base font-bold transition ${
            cartItems.length === 0
              ? "pointer-events-none border-slate-200 text-slate-300"
              : "border-red-100 bg-white text-red-700 hover:bg-red-50"
          }`}
          href={whatsappOrderUrl}
          rel="noreferrer"
          target="_blank"
        >
          <MessageCircle className="h-5 w-5" />
          Send order by WhatsApp
        </a>
      </aside>
    </section>
  );
}

function CustomersSection({
  customers,
  deleteCustomer,
  saveCustomer,
}: {
  customers: Customer[];
  deleteCustomer: (customerId: string) => void;
  saveCustomer: (customer: Omit<Customer, "id" | "createdAt">) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedInitial, setSelectedInitial] = useState("All");
  const [form, setForm] = useState(EMPTY_CUSTOMER);
  const lastNameInitials = Array.from(
    new Set(customers.map((customer) => getLastNameInitial(customer.name)).filter(Boolean)),
  ).sort();

  const filteredCustomers = sortCustomersByLastName(
    customers.filter((customer) => {
      const cleanQuery = query.trim().toLowerCase();
      const searchable = [
        customer.name,
        customer.phone,
        customer.email,
        customer.address,
        customer.company,
        customer.notes,
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = searchable.includes(cleanQuery);
      const matchesInitial =
        Boolean(cleanQuery) || selectedInitial === "All" || getLastNameInitial(customer.name) === selectedInitial;
      return matchesQuery && matchesInitial;
    }),
  );

  const handleSave = () => {
    if (!form.name.trim() && !form.phone.trim() && !form.email.trim()) return;
    saveCustomer({
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      company: form.company.trim(),
      notes: form.notes.trim(),
    });
    setForm(EMPTY_CUSTOMER);
  };

  const fieldClass =
    "w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-500 focus:bg-white";

  return (
    <section className="grid gap-6 py-10 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-blue-100 sm:p-7">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-wide text-red-600">Client database</p>
          <h2 className="mt-2 text-3xl font-black text-blue-950">Add a customer</h2>
          <p className="mt-2 text-sm text-slate-600">
            Save the information you need for fast contact and lookup from this computer.
          </p>
          {!import.meta.env.DEV ? (
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-800">
              Public web mode: keep private customer data off this page unless a private login is added.
            </p>
          ) : null}
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold">Customer name</span>
            <input
              className={fieldClass}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Example: Maria Rodriguez"
              value={form.name}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Phone</span>
              <input
                className={fieldClass}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="9085551234"
                value={form.phone}
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold">Email</span>
              <input
                className={fieldClass}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="client@email.com"
                type="email"
                value={form.email}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold">Company / reference</span>
            <input
              className={fieldClass}
              onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
              placeholder="Business name, invoice, or reference"
              value={form.company}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold">Address</span>
            <input
              className={fieldClass}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              placeholder="Street, city, state"
              value={form.address}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold">Notes</span>
            <textarea
              className={`${fieldClass} resize-none`}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Services, products, preferences, pending balance..."
              rows={4}
              value={form.notes}
            />
          </label>

          <button
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-900 px-5 py-4 text-base font-bold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={!form.name.trim() && !form.phone.trim() && !form.email.trim()}
            onClick={handleSave}
          >
            <Plus className="h-5 w-5" />
            Save customer
          </button>
        </div>
      </div>

      <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-blue-100 sm:p-7">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-red-600">
              {filteredCustomers.length} of {customers.length} saved customers
            </p>
            <h2 className="mt-2 text-3xl font-black text-blue-950">Quick access</h2>
          </div>
          <label className="relative block md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-blue-100 bg-blue-50 py-3 pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-blue-300 focus:bg-white"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search first or last name"
              value={query}
            />
          </label>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {["All", ...lastNameInitials].map((initial) => (
            <button
              className={`grid h-9 min-w-9 shrink-0 place-items-center rounded-lg border px-3 text-sm font-black transition ${
                selectedInitial === initial
                  ? "border-blue-900 bg-blue-900 text-white"
                  : "border-blue-100 bg-white text-blue-900 hover:bg-blue-50"
              }`}
              key={initial}
              onClick={() => setSelectedInitial(initial)}
            >
              {initial}
            </button>
          ))}
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50 p-8 text-center">
            <UserRound className="mx-auto h-12 w-12 text-blue-300" />
            <h3 className="mt-4 text-xl font-black text-blue-950">No customers found</h3>
            <p className="mt-2 text-sm text-slate-600">
              Add your first customer or adjust the search.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((customer) => {
              const cleanPhone = customer.phone.replace(/\D/g, "");
              const whatsappUrl = cleanPhone
                ? `https://wa.me/${cleanPhone.startsWith("1") ? cleanPhone : `1${cleanPhone}`}`
                : "";

              return (
                <article
                  className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm"
                  key={customer.id}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-50">
                          <UserRound className="h-6 w-6 text-blue-900" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate text-lg font-black text-blue-950">{customer.name}</h3>
                          {customer.company ? (
                            <p className="truncate text-sm font-semibold text-red-600">{customer.company}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        {customer.phone ? (
                          <p className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-blue-900" />
                            {customer.phone}
                          </p>
                        ) : null}
                        {customer.email ? (
                          <p className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-blue-900" />
                            {customer.email}
                          </p>
                        ) : null}
                        {customer.address ? (
                          <p className="flex items-center gap-2 sm:col-span-2">
                            <MapPin className="h-4 w-4 text-blue-900" />
                            {customer.address}
                          </p>
                        ) : null}
                      </div>

                      {customer.notes ? (
                        <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                          {customer.notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid min-w-36 gap-2">
                      {customer.phone ? (
                        <a
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-green-700"
                          href={whatsappUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp
                        </a>
                      ) : null}
                      {customer.phone ? (
                        <a
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-100 px-3 py-2 text-sm font-bold text-blue-900 transition hover:bg-blue-50"
                          href={`tel:${customer.phone}`}
                        >
                          <Phone className="h-4 w-4" />
                          Call
                        </a>
                      ) : null}
                      {customer.email ? (
                        <a
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-100 px-3 py-2 text-sm font-bold text-blue-900 transition hover:bg-blue-50"
                          href={`mailto:${customer.email}`}
                        >
                          <Mail className="h-4 w-4" />
                          Email
                        </a>
                      ) : null}
                      <button
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-100 px-3 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50"
                        onClick={() => deleteCustomer(customer.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function PaymentSection({
  bitpayUrl,
  cartItems,
  cartTotal,
  krakUrl,
  moneroAddress,
}: {
  bitpayUrl: string;
  cartItems: Array<{ product: Product; quantity: number; lineTotal: number }>;
  cartTotal: number;
  krakUrl: string;
  moneroAddress: string;
}) {
  const [customerName, setCustomerName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState(
    cartItems.length
      ? `Order: ${cartItems.map((item) => `${item.quantity} x ${item.product.name}`).join(", ")}`
      : "",
  );
  const [method, setMethod] = useState<PaymentMethod>("stripe");
  const [showZelle, setShowZelle] = useState(false);

  useEffect(() => {
    if (cartTotal > 0 && !amount) {
      setAmount(String(cartTotal));
    }
    if (cartItems.length && !notes) {
      setNotes(`Order: ${cartItems.map((item) => `${item.quantity} x ${item.product.name}`).join(", ")}`);
    }
  }, [amount, cartItems, cartTotal, notes]);

  const paymentUrl = useMemo(() => {
    const selected =
      method === "bitpay"
        ? bitpayUrl
        : method === "kraken"
          ? krakUrl
          : method === "monero"
            ? ""
          : BUSINESS_CONFIG.paymentLinks[method];
    if (!selected || method === "zelleInfo") return "";

    const params = new URLSearchParams();
    if (customerName) params.set("customer", customerName);
    if (invoiceNumber) params.set("invoice", invoiceNumber);
    if (amount) params.set("amount", amount);
    if (notes) params.set("note", notes);

    const query = params.toString();
    return query ? `${selected}${selected.includes("?") ? "&" : "?"}${query}` : selected;
  }, [bitpayUrl, customerName, invoiceNumber, amount, notes, method, krakUrl]);

  const whatsappMessage = useMemo(() => {
    const text = `Hello, I am ${customerName || "a customer"}. I would like to confirm a payment${
      invoiceNumber ? ` for invoice ${invoiceNumber}` : ""
    }${amount ? ` for ${money(amount)}` : ""}.`;
    return `https://wa.me/${BUSINESS_CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;
  }, [customerName, invoiceNumber, amount]);

  const isReady = customerName.trim() && amount && Number(amount) > 0;
  const needsBitpaySetup = method === "bitpay" && !bitpayUrl;
  const needsKrakSetup = method === "kraken" && !krakUrl && !BUSINESS_CONFIG.krakTag;
  const needsMoneroSetup = method === "monero" && !moneroAddress;

  const handlePay = () => {
    if (method === "zelleInfo") {
      setShowZelle(true);
      return;
    }
    if (method === "monero") return;
    if (!isReady || needsBitpaySetup || needsKrakSetup || needsMoneroSetup) return;
    window.open(paymentUrl, "_blank", "noopener,noreferrer");
  };

  const paymentMethods: Array<[PaymentMethod, string, LucideIcon]> = [
    ["stripe", "Card / Apple Pay", CreditCard],
    ["square", "Square", Smartphone],
    ["paypal", "PayPal", CreditCard],
    ["cashapp", "Cash App", Smartphone],
    ["crypto", "Crypto checkout", QrCode],
    ["bitpay", "BitPay", QrCode],
    ["kraken", "Kraken / Krak Pay", QrCode],
    ["monero", "Monero (XMR)", QrCode],
    ["zelleInfo", "Zelle", ReceiptText],
  ];

  return (
    <section className="grid gap-6 py-10 lg:grid-cols-[1.05fr_0.95fr]">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-blue-100 sm:p-7"
        initial={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.35 }}
      >
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-red-600">Payment portal</p>
          <h2 className="mt-1 text-2xl font-bold text-blue-950">Complete your details</h2>
          <p className="mt-2 text-sm text-slate-600">
            Your payment is processed through a secure provider. We do not store card numbers.
          </p>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-semibold">Customer name</span>
            <input
              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-500 focus:bg-white"
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Example: John Smith"
              value={customerName}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold">Invoice / reference</span>
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-500 focus:bg-white"
                onChange={(event) => setInvoiceNumber(event.target.value)}
                placeholder="Example: INV-1025"
                value={invoiceNumber}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold">Amount to pay</span>
              <div className="mt-2 flex rounded-lg border border-slate-200 bg-slate-50 focus-within:border-slate-500 focus-within:bg-white">
                <span className="flex items-center px-4 font-semibold text-slate-500">$</span>
                <input
                  className="w-full rounded-r-lg bg-transparent px-2 py-3 outline-none"
                  min="1"
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={amount}
                />
              </div>
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold">Optional note</span>
            <textarea
              className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-500 focus:bg-white"
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Example: Deposit, outstanding balance, completed service..."
              rows={3}
              value={notes}
            />
          </label>

          <div>
            <span className="text-sm font-semibold">Payment method</span>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              {paymentMethods.map(([key, label, Icon]) => (
                <button
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition ${
                    method === key
                      ? "border-blue-900 bg-blue-900 text-white"
                      : "border-blue-100 bg-blue-50 hover:bg-blue-100"
                  }`}
                  key={key}
                  onClick={() => {
                    setMethod(key);
                    setShowZelle(false);
                  }}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {showZelle ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold">Zelle information</p>
              <p className="mt-1 text-sm text-slate-600">{BUSINESS_CONFIG.paymentLinks.zelleInfo}</p>
              <p className="mt-2 text-xs text-slate-500">
                After sending, share a screenshot or confirmation by WhatsApp.
              </p>
            </div>
          ) : null}

          {!isReady ? (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>To continue, enter the customer name and an amount greater than $0.</p>
            </div>
          ) : null}

          {needsBitpaySetup ? (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Add your BitPay Quick Checkout URL in the Crypto section before accepting BitPay payments.</p>
            </div>
          ) : null}

          {needsKrakSetup ? (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Add your Krak paylink or Kraktag link in the Crypto section before accepting Krak payments.</p>
            </div>
          ) : null}

          {needsMoneroSetup ? (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Add your Monero receiving address in the Crypto section before accepting XMR payments.</p>
            </div>
          ) : null}

          {method === "kraken" && BUSINESS_CONFIG.krakTag ? (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <p className="font-semibold text-blue-950">Krak payment instructions</p>
              <p className="mt-1 text-sm text-slate-700">
                Open Krak and send the payment to{" "}
                <span className="font-black text-red-700">{BUSINESS_CONFIG.krakTag}</span>. Include
                your invoice or reference in the note.
              </p>
              <img
                alt={`Krak QR code for ${BUSINESS_CONFIG.krakTag}`}
                className="mx-auto mt-4 max-w-72 rounded-lg bg-white object-contain p-2 ring-1 ring-blue-100"
                src={BUSINESS_CONFIG.krakQrImage}
              />
            </div>
          ) : null}

          {method === "monero" && moneroAddress ? (
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <p className="font-semibold text-blue-950">Monero payment instructions</p>
              <p className="mt-1 text-sm text-slate-700">
                Send XMR to this address and include your invoice/reference when confirming by WhatsApp.
              </p>
              <img
                alt="Monero payment QR code"
                className="mx-auto mt-4 max-w-72 rounded-lg bg-white object-contain p-3 ring-1 ring-blue-100"
                src={BUSINESS_CONFIG.moneroQrImage}
              />
              <p className="mt-3 break-all rounded-lg bg-white p-3 font-mono text-xs font-bold text-blue-950 ring-1 ring-blue-100">
                {moneroAddress}
              </p>
              <p className="mt-2 text-xs font-semibold text-slate-600">
                Confirm the current XMR equivalent before sending. Monero transactions are irreversible.
              </p>
            </div>
          ) : null}

          <button
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-4 text-base font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={!isReady || needsBitpaySetup || needsKrakSetup || needsMoneroSetup}
            onClick={handlePay}
          >
            <ShieldCheck className="h-5 w-5" />
            {method === "monero" ? "Use Monero instructions" : `Pay now ${amount ? money(amount) : ""}`}
          </button>
        </div>
      </motion.div>

      <aside className="space-y-6">
        <div className="rounded-lg bg-blue-950 p-6 text-white shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-300">Total to pay</p>
              <p className="mt-2 text-4xl font-black">{amount ? money(amount) : "$0.00"}</p>
            </div>
            <div className="rounded-lg bg-red-600 p-3">
              <ReceiptText className="h-7 w-7" />
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm text-slate-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Automatic receipt depending on the processor
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Mobile payment compatible
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> No cards are stored on this page
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-blue-100">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-red-50 p-3">
              <QrCode className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Payment QR</h3>
              <p className="text-sm text-slate-600">Print it or send it by message.</p>
            </div>
          </div>

          <div className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-blue-200 bg-blue-50 p-6 text-center">
            <div>
              <QrCode className="mx-auto h-20 w-20 text-blue-300" />
              <p className="mt-4 text-sm font-semibold text-slate-700">Place your QR code here</p>
              <p className="mt-1 text-xs text-slate-500">
                Once you have your real payment link, generate a QR code and add it here.
              </p>
            </div>
          </div>

          <a
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-100 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-50"
            href={whatsappMessage}
            rel="noreferrer"
            target="_blank"
          >
            <MessageCircle className="h-4 w-4" />
            Confirm by WhatsApp
          </a>
        </div>
      </aside>
    </section>
  );
}

function CryptoSection({
  bitpayUrl,
  krakUrl,
  moneroAddress,
  setBitpayUrl,
  setKrakUrl,
  setMoneroAddress,
}: {
  bitpayUrl: string;
  krakUrl: string;
  moneroAddress: string;
  setBitpayUrl: (url: string) => void;
  setKrakUrl: (url: string) => void;
  setMoneroAddress: (address: string) => void;
}) {
  const [draftBitpayUrl, setDraftBitpayUrl] = useState(bitpayUrl);
  const [draftKrakUrl, setDraftKrakUrl] = useState(krakUrl);
  const [draftMoneroAddress, setDraftMoneroAddress] = useState(moneroAddress);
  const [savedBitpayUrl, setSavedBitpayUrl] = useState(false);
  const [savedKrakUrl, setSavedKrakUrl] = useState(false);
  const [savedMoneroAddress, setSavedMoneroAddress] = useState(false);
  const krakUrlError = getKrakUrlError(draftKrakUrl);
  const moneroAddressError = getMoneroAddressError(draftMoneroAddress);

  const saveBitpayUrl = () => {
    setBitpayUrl(normalizePublicPaymentUrl(draftBitpayUrl));
    setSavedBitpayUrl(true);
  };

  const saveKrakUrl = () => {
    if (krakUrlError) return;
    setKrakUrl(normalizePublicPaymentUrl(draftKrakUrl));
    setSavedKrakUrl(true);
  };

  const saveMoneroAddress = () => {
    if (moneroAddressError) return;
    setMoneroAddress(draftMoneroAddress.trim());
    setSavedMoneroAddress(true);
  };

  const cryptoOptions = [
    {
      name: "Coinbase Business / Crypto Checkout",
      description:
        "A professional checkout option for accepting crypto or stablecoin payments with a business-friendly payment flow.",
      link: BUSINESS_CONFIG.paymentLinks.crypto,
    },
    {
      name: "BitPay",
      description:
        "Connect your BitPay Quick Checkout URL so customers can pay invoices or orders with supported crypto.",
      link: bitpayUrl,
    },
    {
      name: "Kraken / Krak Pay",
      description:
        `Customers can pay through Krak by sending funds to ${BUSINESS_CONFIG.krakTag}.`,
      link: krakUrl || BUSINESS_CONFIG.paymentLinks.kraken,
    },
    {
      name: "Monero (XMR)",
      description:
        "Accept privacy-focused XMR payments by sharing your Monero receiving address with customers.",
      link: BUSINESS_CONFIG.paymentLinks.monero,
    },
  ];

  return (
    <section className="py-10">
      <div className="mb-8 text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-red-600">Crypto payments</p>
        <h2 className="mt-2 text-3xl font-black text-blue-950 sm:text-4xl">
          Accept crypto professionally
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
          Use a payment processor to create invoices, confirm transactions, and avoid manual wallet
          errors before delivering products or services.
        </p>
      </div>

      <div className="mb-6 rounded-lg bg-white p-5 shadow-sm ring-1 ring-blue-100 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <p className="text-sm font-bold uppercase tracking-wide text-red-600">BitPay setup</p>
            <h3 className="mt-1 text-2xl font-black text-blue-950">Connect Quick Checkout</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              In BitPay, go to Payment tools, open Quick Checkout for Web, copy your account URL,
              and paste it here. This portal stores only that public checkout URL.
            </p>
          </div>
          <div className="min-w-0 flex-1">
            <label className="block">
              <span className="text-sm font-semibold">BitPay Quick Checkout URL</span>
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:bg-white"
                onChange={(event) => {
                  setDraftBitpayUrl(event.target.value);
                  setSavedBitpayUrl(false);
                }}
                placeholder="https://..."
                value={draftBitpayUrl}
              />
            </label>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800"
                onClick={saveBitpayUrl}
              >
                <ShieldCheck className="h-4 w-4" />
                Save BitPay link
              </button>
              {bitpayUrl ? (
                <a
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-100 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-50"
                  href={bitpayUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <QrCode className="h-4 w-4" />
                  Test link
                </a>
              ) : null}
            </div>
            {savedBitpayUrl ? (
              <p className="mt-2 text-sm font-semibold text-green-700">BitPay link saved.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-lg bg-white p-5 shadow-sm ring-1 ring-blue-100 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <p className="text-sm font-bold uppercase tracking-wide text-red-600">Krak setup</p>
            <h3 className="mt-1 text-2xl font-black text-blue-950">Connect Krak Pay</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              In the Krak app, create or copy your public paylink, payment request link, or Kraktag
              link and paste it here. This portal stores only that public payment link.
            </p>
            <div className="mt-3 rounded-lg bg-blue-50 p-4 ring-1 ring-blue-100">
              <p className="text-sm font-semibold text-slate-600">Current Krak account</p>
              <p className="mt-1 text-2xl font-black text-red-700">{BUSINESS_CONFIG.krakTag}</p>
              <p className="mt-1 text-sm text-slate-600">
                Customers can open Krak and send payment to this Kraktag.
              </p>
              <img
                alt={`Krak QR code for ${BUSINESS_CONFIG.krakTag}`}
                className="mx-auto mt-4 max-w-80 rounded-lg bg-white object-contain p-2 ring-1 ring-blue-100"
                src={BUSINESS_CONFIG.krakQrImage}
              />
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-700">
              Do not use krak.app if your browser shows an SSL error.
            </p>
          </div>
          <div className="min-w-0 flex-1">
            <label className="block">
              <span className="text-sm font-semibold">Krak paylink or Kraktag URL</span>
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-500 focus:bg-white"
                onChange={(event) => {
                  setDraftKrakUrl(event.target.value);
                  setSavedKrakUrl(false);
                }}
                placeholder="https://..."
                value={draftKrakUrl}
              />
            </label>
            {krakUrlError ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{krakUrlError}</p>
              </div>
            ) : null}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={Boolean(krakUrlError)}
                onClick={saveKrakUrl}
              >
                <ShieldCheck className="h-4 w-4" />
                Save Krak link
              </button>
              {krakUrl ? (
                <a
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-100 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-50"
                  href={krakUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <QrCode className="h-4 w-4" />
                  Test link
                </a>
              ) : null}
            </div>
            {savedKrakUrl ? (
              <p className="mt-2 text-sm font-semibold text-green-700">Krak link saved.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-lg bg-white p-5 shadow-sm ring-1 ring-blue-100 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <p className="text-sm font-bold uppercase tracking-wide text-red-600">Monero setup</p>
            <h3 className="mt-1 text-2xl font-black text-blue-950">Accept XMR payments</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Paste your public Monero receiving address here. Customers will see the address when
              they choose Monero at checkout.
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-700">
              Never paste your seed phrase, private spend key, or private view key.
            </p>
            <img
              alt="Monero payment QR code"
              className="mx-auto mt-4 max-w-80 rounded-lg bg-white object-contain p-3 ring-1 ring-blue-100"
              src={BUSINESS_CONFIG.moneroQrImage}
            />
          </div>
          <div className="min-w-0 flex-1">
            <label className="block">
              <span className="text-sm font-semibold">Monero receiving address</span>
              <textarea
                className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs outline-none transition focus:border-slate-500 focus:bg-white"
                onChange={(event) => {
                  setDraftMoneroAddress(event.target.value);
                  setSavedMoneroAddress(false);
                }}
                placeholder="Paste your public XMR address"
                rows={4}
                value={draftMoneroAddress}
              />
            </label>
            {moneroAddressError ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{moneroAddressError}</p>
              </div>
            ) : null}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={Boolean(moneroAddressError)}
                onClick={saveMoneroAddress}
              >
                <ShieldCheck className="h-4 w-4" />
                Save Monero address
              </button>
            </div>
            {savedMoneroAddress ? (
              <p className="mt-2 text-sm font-semibold text-green-700">Monero address saved.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {cryptoOptions.map((option) => (
          <motion.article
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border-t-4 border-blue-900 bg-white p-6 shadow-sm ring-1 ring-blue-100"
            initial={{ opacity: 0, y: 14 }}
            key={option.name}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-4 inline-flex rounded-lg bg-red-50 p-3">
              <QrCode className="h-7 w-7 text-red-600" />
            </div>
            <h3 className="text-xl font-black text-blue-950">{option.name}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{option.description}</p>
            <a
              className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition ${
                option.link
                  ? "bg-blue-900 text-white hover:bg-blue-800"
                  : "pointer-events-none bg-slate-200 text-slate-500"
              }`}
              href={option.link || "#"}
              rel="noreferrer"
              target="_blank"
            >
              <ShieldCheck className="h-4 w-4" />
              Pay with crypto
            </a>
          </motion.article>
        ))}
      </div>

      <div className="mt-6 rounded-lg bg-amber-50 p-6 text-amber-900 ring-1 ring-amber-100">
        <h3 className="text-lg font-black">Important notice</h3>
        <p className="mt-2 text-sm leading-6">
          Crypto payments can be irreversible and may vary by network, fee, and market price. Always
          confirm the amount, network, processor confirmation, and order details before delivering
          products or services.
        </p>
      </div>
    </section>
  );
}

function PoliciesSection() {
  return (
    <section className="py-10">
      <div className="mb-8 text-center">
        <p className="text-sm font-bold uppercase tracking-wide text-red-600">Policies</p>
        <h2 className="mt-2 text-3xl font-black text-blue-950 sm:text-4xl">Basic business terms</h2>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
          This section helps customers and payment processors understand how the business works.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <div className="rounded-lg border-t-4 border-blue-900 bg-white p-6 shadow-sm ring-1 ring-blue-100">
          <h3 className="text-xl font-black text-blue-950">Payments</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Payments may be made by card, Stripe, Square, PayPal, Cash App, or Zelle depending on
            availability. Invoice payments should include a reference or invoice number.
          </p>
        </div>

        <div className="rounded-lg border-t-4 border-red-600 bg-white p-6 shadow-sm ring-1 ring-blue-100">
          <h3 className="text-xl font-black text-blue-950">Refunds</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Refunds are reviewed case by case. Opened products, completed services, or special
            orders may not be refundable unless defective or previously agreed in writing.
          </p>
        </div>

        <div className="rounded-lg border-t-4 border-amber-500 bg-white p-6 shadow-sm ring-1 ring-blue-100">
          <h3 className="text-xl font-black text-blue-950">Contact</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            For questions, changes, or support, contact us by phone, WhatsApp, or email. We respond
            during business hours.
          </p>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [activeSection, setActiveSection] = useState<SectionKey>("home");
  const [cart, setCart] = useState<CartState>({});
  const [bitpayUrl, setBitpayUrl] = useState(() => {
    try {
      return window.localStorage.getItem(BITPAY_URL_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });
  const [krakUrl, setKrakUrl] = useState(() => {
    try {
      return window.localStorage.getItem(KRAK_URL_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });
  const [moneroAddress, setMoneroAddress] = useState(() => {
    try {
      return window.localStorage.getItem(MONERO_ADDRESS_STORAGE_KEY) || BUSINESS_CONFIG.moneroAddress;
    } catch {
      return BUSINESS_CONFIG.moneroAddress;
    }
  });
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try {
      const savedCustomers = window.localStorage.getItem(CUSTOMER_STORAGE_KEY);
      return savedCustomers ? (JSON.parse(savedCustomers) as Customer[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const loadLocalCustomers = async () => {
      const seedVersion = window.localStorage.getItem(CUSTOMER_SEED_VERSION_KEY);
      if (seedVersion === CUSTOMER_SEED_VERSION) return;

      const localSeedModule = "./data/customerSeed.local";
      const { customerSeed } = await import(/* @vite-ignore */ localSeedModule);
      const seedCustomers = createSeedCustomers(customerSeed);
      setCustomers((currentCustomers) => mergeSeedCustomers(currentCustomers, seedCustomers));
      window.localStorage.setItem(CUSTOMER_SEED_VERSION_KEY, CUSTOMER_SEED_VERSION);
    };

    void loadLocalCustomers();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(BITPAY_URL_STORAGE_KEY, bitpayUrl);
  }, [bitpayUrl]);

  useEffect(() => {
    window.localStorage.setItem(KRAK_URL_STORAGE_KEY, krakUrl);
  }, [krakUrl]);

  useEffect(() => {
    window.localStorage.setItem(MONERO_ADDRESS_STORAGE_KEY, moneroAddress);
  }, [moneroAddress]);

  useEffect(() => {
    if (!import.meta.env.DEV && activeSection === "clients") {
      setActiveSection("home");
    }
  }, [activeSection]);

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([productId, quantity]) => {
          const product = PRODUCTS.find((item) => item.id === productId);
          if (!product || quantity <= 0) return null;
          return {
            product,
            quantity,
            lineTotal: product.price * quantity,
          };
        })
        .filter((item): item is { product: Product; quantity: number; lineTotal: number } => item !== null),
    [cart],
  );

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cartItems.reduce((total, item) => total + item.lineTotal, 0);

  const addToCart = (productId: string) => {
    setCart((currentCart) => ({
      ...currentCart,
      [productId]: (currentCart[productId] || 0) + 1,
    }));
    setActiveSection("cart");
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    setCart((currentCart) => {
      const nextCart = { ...currentCart };
      if (quantity <= 0) {
        delete nextCart[productId];
      } else {
        nextCart[productId] = quantity;
      }
      return nextCart;
    });
  };

  const clearCart = () => setCart({});

  const saveCustomer = (customer: Omit<Customer, "id" | "createdAt">) => {
    setCustomers((currentCustomers) =>
      sortCustomersByLastName([
        {
          ...customer,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        },
        ...currentCustomers,
      ]),
    );
  };

  const deleteCustomer = (customerId: string) => {
    setCustomers((currentCustomers) => currentCustomers.filter((customer) => customer.id !== customerId));
  };

  return (
    <div className="min-h-screen bg-blue-50 text-slate-900">
      <Header activeSection={activeSection} cartCount={cartCount} setActiveSection={setActiveSection} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {activeSection === "home" && <HomeSection setActiveSection={setActiveSection} />}
        {activeSection === "catalog" && (
          <CatalogSection addToCart={addToCart} cart={cart} setActiveSection={setActiveSection} />
        )}
        {activeSection === "cart" && (
          <CartSection
            cartItems={cartItems}
            cartTotal={cartTotal}
            clearCart={clearCart}
            setActiveSection={setActiveSection}
            updateCartQuantity={updateCartQuantity}
          />
        )}
        {import.meta.env.DEV && activeSection === "clients" && (
          <CustomersSection
            customers={customers}
            deleteCustomer={deleteCustomer}
            saveCustomer={saveCustomer}
          />
        )}
        {activeSection === "services" && <ServicesSection />}
        {activeSection === "pay" && (
          <PaymentSection
            bitpayUrl={bitpayUrl}
            cartItems={cartItems}
            cartTotal={cartTotal}
            krakUrl={krakUrl}
            moneroAddress={moneroAddress}
          />
        )}
        {activeSection === "crypto" && (
          <CryptoSection
            bitpayUrl={bitpayUrl}
            krakUrl={krakUrl}
            moneroAddress={moneroAddress}
            setBitpayUrl={setBitpayUrl}
            setKrakUrl={setKrakUrl}
            setMoneroAddress={setMoneroAddress}
          />
        )}
        {activeSection === "policies" && <PoliciesSection />}
      </main>

      <footer className="mt-10 border-t border-blue-100 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} {BUSINESS_CONFIG.businessName}. All rights reserved.
          </p>
          <p>
            {BUSINESS_CONFIG.address} · {BUSINESS_CONFIG.phone}
          </p>
        </div>
      </footer>
    </div>
  );
}
