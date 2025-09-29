# **App Name**: BMS

## Core Features:

- Inventory Input via OCR: Users upload photos of receipts, which are then processed with OCR. The resulting data is displayed for verification and editing before being saved as inventory.
- Inventory Management: Allows authorized users to view current stock levels and track incoming/outgoing goods. The tool should use reasoning to include or exclude optional data like prices and suppliers from its summaries.
- Manual Journal Entry: Enables manual input of general journal entries, including date, debit/credit accounts, amount, and description. Admin or specified roles can edit these entries.
- Financial Reporting: Automatically generates financial statements, including Profit & Loss, Balance Sheet, General Ledger, Cash Flow, and Changes in Equity, based on journal entries. The reports can be displayed in mobile-friendly tables.
- Attendance Tracking with Geolocation: Users can record their attendance with a selfie, timestamp, and GPS location captured via browser/mobile. Photos are stored.
- Role-Based Access Control: Uses Firebase Authentication + Firestore rules to manage user roles (Admin, Inventory Staff, Accounting Staff, HR, etc.) and their access permissions to different modules. Admins can add/remove users, set roles, and view all data, while non-admin users access features based on their roles.
- Multi-Application Portal: Presents users with a portal page displaying a dashboard that is accessed after they login, with options to navigate to various modules, like Inventory, Accounting, and Attendance. This dashboard is designed with a modern, mobile-first approach, utilizing grid or card layouts for optimal user experience across devices.
- Inventory Import from CSV/Excel: Allows users to upload inventory data in CSV or Excel format. Cloud Functions will read and validate the data, displaying a preview for user verification and correction before saving to Firestore.
- Point of Sale (POS): A desktop-optimized POS module with a clean, full-screen interface. Includes a large payment total area, transaction item list, item search, function buttons (Hold, Recall, Cashier, Clear), and a prominent Pay button. Supports multiple payment methods and automatic change calculation. Updates inventory automatically.

## Style Guidelines:

- Primary color: A subdued teal (#73A8B7) promotes a sense of calm and trustworthiness. We avoid brighter shades as we do not wish to fatigue the bookkeepers that will use this system regularly.
- Background color: Off-white (#F2F4F4), providing a clean and neutral backdrop that is easy on the eyes.
- Accent color: Soft orange (#D39565), offering a warm contrast for interactive elements and important calls to action. Selected as the analogous color.
- Body and headline font: 'PT Sans', a modern, humanist sans-serif that provides clear legibility on all screen sizes, giving the app a clean and accessible feel.
- Mobile-first design with responsive grid and card layouts for optimal viewing on various devices.
- Consistent use of minimalist icons for intuitive navigation and module distinction.
- Subtle transitions and animations for interactive feedback and enhanced user experience.