/// <reference types="vite/client" />

declare global {
  interface Window {
    electronAPI?: {
      getProducts: (args?: any) => Promise<any>;
      searchProduct: (searchTerm: string) => Promise<any>;
      createTransaction: (transactionData: any) => Promise<any>;
      getTransaction: (transactionId: string) => Promise<any>;
      printReceipt: (receiptData: any) => Promise<any>;
      getPrinters: () => Promise<any>;
      platform: string;
      versions: {
        node: string;
        chrome: string;
        electron: string;
      };
    };
  }
}

export {};