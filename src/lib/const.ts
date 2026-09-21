// Todo List
type TypeNavTabs = {
  label: string;
  value: string;
};

export const NavTabsList: TypeNavTabs[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
];

export type TYPE_PAGINATION = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type TYPE_PAGINATION_META = {
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export type TYPE_TASK_LIST = {
  id?: number;
  task: string;
  createdDate?: string;
  isImportant?: boolean;
  isCompleted?: boolean;
  isEdited?: boolean;
};

export const DataTaskList: TYPE_TASK_LIST[] = [
  {
    id: 1,
    task: "Finish portfolio website",
    createdDate: "2026-09-15T00:17:48.091272",
    isImportant: true,
    isCompleted: false,
    isEdited: false,
  },
  {
    id: 2,
    task: "Study Dutch A2/B1",
    createdDate: "2026-09-15T00:09:04.091272",
    isImportant: false,
    isCompleted: false,
    isEdited: false,
  },
  {
    id: 3,
    task: "Go to gym",
    createdDate: "2026-09-15T00:13:15.091272",
    isImportant: false,
    isCompleted: false,
    isEdited: false,
  },
  {
    id: 4,
    task: "Plan the weekend trip",
    createdDate: "2026-09-15T00:14:55.091272",
    isImportant: false,
    isCompleted: true,
    isEdited: false,
  },
];

// Meal Cart Data
type OrderStatus = "PENDING" | "PROCESSING" | "DELIVERED" | "CANCELLED";

export type Order = {
  orderNumber: string;
  customerName: string;
  orderDate: string;
  totalAmount: number;
  status: OrderStatus;
};

export type OrderTrend = {
  date: string;
  orderCount: number;
};

export type Product = {
  productId: number;
  productName: string;
  quantitySold: number;
};

export type UserRole = "ADMIN" | "STAFF" | "CUSTOMER";

export type AppUser = {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
};

export const USERS: AppUser[] = [
  {
    id: 4,
    email: "staff1@mealcart.com",
    fullName: "Liam de Vries",
    role: "STAFF",
  },
  {
    id: 5,
    email: "staff2@mealcart.com",
    fullName: "Fatima Rahman",
    role: "STAFF",
  },
  {
    id: 6,
    email: "staff3@mealcart.com",
    fullName: "Tom Bakker",
    role: "STAFF",
  },
];

export const ROLE_STYLES: Record<UserRole, string> = {
  ADMIN: "bg-red-500/10 text-red-500 border-red-500/20",
  STAFF: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  CUSTOMER: "bg-lime-500/10 text-lime-500 border-lime-500/20",
};

export const TOP_PRODUCTS: Product[] = [
  { productId: 5, productName: "Chicken Breast", quantitySold: 30 },
  { productId: 16, productName: "Broccoli", quantitySold: 29 },
  { productId: 4, productName: "Bananas", quantitySold: 28 },
  { productId: 8, productName: "Brown Rice", quantitySold: 27 },
  { productId: 12, productName: "Sourdough Bread", quantitySold: 23 },
];

export const ORDER_TRENDS: OrderTrend[] = [
  { date: "2026-08-25", orderCount: 3 },
  { date: "2026-08-26", orderCount: 2 },
  { date: "2026-08-27", orderCount: 3 },
  { date: "2026-08-28", orderCount: 2 },
  { date: "2026-08-29", orderCount: 1 },
  { date: "2026-08-30", orderCount: 0 },
  { date: "2026-08-31", orderCount: 0 },
];

export const TIME_FILTER_LIST = [
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "last_7_days" },
  { label: "Last 30 days", value: "last_30_days" },
];

export const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  PROCESSING: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  DELIVERED: "bg-lime-500/10 text-lime-500 border-lime-500/20",
  CANCELLED: "bg-red-500/10 text-red-500 border-red-500/20",
};

export const ORDERS_LIST: Order[] = [
  {
    orderNumber: "MC10019",
    customerName: "Daan Visser",
    orderDate: "2026-08-29T00:07:48.091272",
    totalAmount: 7.85,
    status: "CANCELLED",
  },
  {
    orderNumber: "MC10023",
    customerName: "Lucas van den Berg",
    orderDate: "2026-08-28T10:07:48.102224",
    totalAmount: 53.32,
    status: "PROCESSING",
  },
  {
    orderNumber: "MC10021",
    customerName: "Emma Bakker",
    orderDate: "2026-08-28T08:07:48.096223",
    totalAmount: 10.15,
    status: "DELIVERED",
  },
  {
    orderNumber: "MC10037",
    customerName: "Noah de Vries",
    orderDate: "2026-08-27T19:07:48.149372",
    totalAmount: 6.45,
    status: "PENDING",
  },
  {
    orderNumber: "MC10015",
    customerName: "Noah de Vries",
    orderDate: "2026-08-27T19:07:48.078215",
    totalAmount: 35.39,
    status: "PROCESSING",
  },
  {
    orderNumber: "MC10016",
    customerName: "Emma Bakker",
    orderDate: "2026-08-27T10:07:48.081219",
    totalAmount: 29.98,
    status: "CANCELLED",
  },
  {
    orderNumber: "MC10042",
    customerName: "Mia Peters",
    orderDate: "2026-08-26T15:07:48.160417",
    totalAmount: 49.35,
    status: "PENDING",
  },
  {
    orderNumber: "MC10034",
    customerName: "Noah de Vries",
    orderDate: "2026-08-26T07:07:48.140372",
    totalAmount: 15.33,
    status: "PROCESSING",
  },
  {
    orderNumber: "MC10041",
    customerName: "Emma Bakker",
    orderDate: "2026-08-25T18:07:48.158374",
    totalAmount: 15.54,
    status: "DELIVERED",
  },
  {
    orderNumber: "MC10028",
    customerName: "Mia Peters",
    orderDate: "2026-08-25T16:07:48.119418",
    totalAmount: 12.98,
    status: "CANCELLED",
  },
];
