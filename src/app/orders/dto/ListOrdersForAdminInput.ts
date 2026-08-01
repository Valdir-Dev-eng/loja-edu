export const AdminOrderTab = {
    PAID: "paid",
    PENDING: "pending",
    REFUNDED: "refunded",
} as const;

export type AdminOrderTab = (typeof AdminOrderTab)[keyof typeof AdminOrderTab];

export interface ListOrdersForAdminInput {
    tab: AdminOrderTab;
}
