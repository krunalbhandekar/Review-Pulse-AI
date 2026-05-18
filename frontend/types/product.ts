export type EmailMode = "send" | "draft";

export interface Product {
  id: string;
  userId: string;
  productName: string;
  playstoreAppId?: string | null;
  appstoreAppId?: string | null;
  googleDocId?: string | null;
  emailTo?: string | null;
  lookbackWeeks: number;
  emailMode: EmailMode;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  productName: string;
  playstoreAppId?: string;
  appstoreAppId?: string;
  googleDocId?: string;
  emailTo?: string;
  lookbackWeeks: number;
  emailMode: EmailMode;
}
