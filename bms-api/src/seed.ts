import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting BMS database seeding...');

  // Clear existing data (in development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Clearing existing data...');
    
    // Delete in reverse order to avoid foreign key constraints
    await prisma.journalEntryItem.deleteMany();
    await prisma.journalEntry.deleteMany();
    await prisma.chartOfAccount.deleteMany();
    await prisma.cashDrawerActivity.deleteMany();
    await prisma.cashDrawerSession.deleteMany();
    await prisma.message.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.inventoryLog.deleteMany();
    await prisma.purchaseItem.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.transactionItem.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.systemSettings.deleteMany();
    
    console.log('✅ Existing data cleared');
  }

  // 1. Create Branches
  console.log('🏢 Creating branches...');
  const mainBranch = await prisma.branch.create({
    data: {
      name: 'Cabang Utama Jakarta',
      address: 'Jl. Sudirman No. 123, Jakarta Pusat, DKI Jakarta 10220',
      phone: '+62 21 5555 1234',
      isActive: true
    }
  });

  const secondBranch = await prisma.branch.create({
    data: {
      name: 'Cabang Surabaya',
      address: 'Jl. Ahmad Yani No. 456, Surabaya, Jawa Timur 60234',
      phone: '+62 31 5555 2345',
      isActive: true
    }
  });

  const thirdBranch = await prisma.branch.create({
    data: {
      name: 'Cabang Bandung',
      address: 'Jl. Dago No. 789, Bandung, Jawa Barat 40135',
      phone: '+62 22 5555 3456',
      isActive: true
    }
  });

  const branches = [mainBranch, secondBranch, thirdBranch];

  // 2. Create Users
  console.log('👥 Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@bms.co.id',
      password: hashedPassword,
      name: 'Administrator BMS',
      role: 'ADMIN',
      branchId: mainBranch.id,
      isActive: true
    }
  });

  const managerUser = await prisma.user.create({
    data: {
      email: 'manager@bms.co.id',
      password: hashedPassword,
      name: 'Manajer Operasi',
      role: 'MANAGER',
      branchId: mainBranch.id,
      isActive: true
    }
  });

  const staffUsers = [];
  for (let i = 1; i <= 6; i++) {
    const staff = await prisma.user.create({
      data: {
        email: `staff${i}@bms.co.id`,
        password: hashedPassword,
        name: `Karyawan ${i}`,
        role: 'STAFF',
        branchId: branches[Math.floor(Math.random() * branches.length)].id,
        isActive: true
      }
    });
    staffUsers.push(staff);
  }

  const users = [adminUser, managerUser, ...staffUsers];

  // 3. Create Categories
  console.log('📂 Creating categories...');
  const categories = [
    // Main categories
    { name: 'Elektronik', code: 'ELC', description: 'Produk elektronik dan gadget' },
    { name: 'Fashion', code: 'FSH', description: 'Pakaian dan aksesoris fashion' },
    { name: 'Makanan & Minuman', code: 'FNB', description: 'Makanan dan minuman' },
    { name: 'Kesehatan & Kecantikan', code: 'HCB', description: 'Produk kesehatan dan kosmetik' },
    { name: 'Rumah Tangga', code: 'HOU', description: 'Peralatan dan kebutuhan rumah tangga' },
    { name: 'Olahraga & Rekreasi', code: 'SPO', description: 'Peralatan olahraga dan hobi' },
    { name: 'Buku & Alat Tulis', code: 'STA', description: 'Buku dan alat tulis kantor' },
    { name: 'Mainan & Edukasi', code: 'TOY', description: 'Mainan dan mainan edukatif' },
    { name: 'Kendaraan', code: 'VEH', description: 'Aksesori dan spare parts kendaraan' },
    { name: 'Lainnya', code: 'OTH', description: 'Produk kategori lainnya' }
  ];

  const createdCategories = [];
  for (const cat of categories) {
    const category = await prisma.category.create({
      data: {
        name: cat.name,
        code: cat.code,
        description: cat.description,
        isActive: true,
        branchId: mainBranch.id
      }
    });
    createdCategories.push(category);
  }

  // 4. Create Sub-categories
  console.log('📁 Creating sub-categories...');
  const subCategories = [
    { name: 'Smartphone', parentCode: 'ELC' },
    { name: 'Laptop', parentCode: 'ELC' },
    { name: 'Headphone', parentCode: 'ELC' },
    { name: 'Aksesoris HP', parentCode: 'ELC' },
    { name: 'Pakaian Pria', parentCode: 'FSH' },
    { name: 'Pakaian Wanita', parentCode: 'FSH' },
    { name: 'Sepatu', parentCode: 'FSH' },
    { name: 'Tas', parentCode: 'FSH' },
    { name: 'Snack', parentCode: 'FNB' },
    { name: 'Minuman', parentCode: 'FNB' },
    { name: 'Makanan Instan', parentCode: 'FNB' },
    { name: 'Vitamin & Suplemen', parentCode: 'HCB' },
    { name: 'Kosmetik', parentCode: 'HCB' },
    { name: 'Pembersih', parentCode: 'HOU' },
    { name: 'Dapur', parentCode: 'HOU' },
    { name: 'Olahraga', parentCode: 'SPO' },
    { name: 'Musik', parentCode: 'SPO' }
  ];

  for (const subCat of subCategories) {
    const parent = createdCategories.find(c => c.code === subCat.parentCode);
    if (parent) {
      await prisma.category.create({
        data: {
          name: subCat.name,
          code: `${subCat.parentCode}-${subCat.name.toUpperCase().replace(/\s+/g, '')}`,
          description: `Sub kategori ${subCat.name}`,
          parentId: parent.id,
          isActive: true,
          branchId: mainBranch.id
        }
      });
    }
  }

  // 5. Create Suppliers
  console.log('🏭 Creating suppliers...');
  const suppliers = [
    { code: 'SUP001', name: 'PT. Elektronik Sejahtera', contact: 'Budi Santoso', address: 'Jl. Industry No. 45, Jakarta', phone: '+62 21 3333 1111', email: 'budi@elektronik.co.id' },
    { code: 'SUP002', name: 'CV. Fashion Trend', contact: 'Sari Indrawati', address: 'Jl. Textile No. 78, Bandung', phone: '+62 22 2222 2222', email: 'sari@fashiontrend.com' },
    { code: 'SUP003', name: 'UD. Sumber Rejeki', contact: 'Ahmad Wijaya', address: 'Jl. Pasar No. 12, Surabaya', phone: '+62 31 1111 3333', email: 'ahmad@sumberrejeki.com' },
    { code: 'SUP004', name: 'PT. Healthy Life', contact: 'Dewi Kusuma', address: 'Jl. Health No. 34, Jakarta', phone: '+62 21 4444 4444', email: 'dewi@healthylife.co.id' },
    { code: 'SUP005', name: 'CV. Rumah Idaman', contact: 'Rudi Hartono', address: 'Jl. Home No. 56, Surabaya', phone: '+62 31 5555 5555', email: 'rudi@rumahidaman.com' },
    { code: 'SUP006', name: 'PT. Sport Action', contact: 'Linda Sari', address: 'Jl. Sport No. 89, Bandung', phone: '+62 22 6666 6666', email: 'linda@sportaction.co.id' },
    { code: 'SUP007', name: 'UD. Buku Prestasi', contact: 'Joko Susilo', address: 'Jl. Education No. 23, Jakarta', phone: '+62 21 7777 7777', email: 'joko@bokuprestasi.com' },
    { code: 'SUP008', name: 'CV. Mainan Ceria', contact: 'Maya Putri', address: 'Jl. Toy No. 67, Surabaya', phone: '+62 31 8888 8888', email: 'maya@mainanceria.com' }
  ];

  const createdSuppliers = [];
  for (const supplier of suppliers) {
    const createdSupplier = await prisma.supplier.create({
      data: {
        code: supplier.code,
        name: supplier.name,
        contact: supplier.contact,
        address: supplier.address,
        phone: supplier.phone,
        email: supplier.email,
        isActive: true,
        branchId: mainBranch.id
      }
    });
    createdSuppliers.push(createdSupplier);
  }

  // 6. Create Products
  console.log('📦 Creating products...');
  const productTemplates = [
    // Electronics
    { name: 'Samsung Galaxy A54 128GB', category: 'Smartphone', price: 4999000, cost: 4200000, stock: 25, minStock: 5 },
    { name: 'iPhone 13 128GB', category: 'Smartphone', price: 11999000, cost: 10200000, stock: 12, minStock: 3 },
    { name: 'Xiaomi Redmi Note 12', category: 'Smartphone', price: 2999000, cost: 2500000, stock: 35, minStock: 10 },
    { name: 'MacBook Air M1', category: 'Laptop', price: 15999000, cost: 13500000, stock: 8, minStock: 2 },
    { name: 'Asus VivoBook 14', category: 'Laptop', price: 8500000, cost: 7200000, stock: 15, minStock: 5 },
    { name: 'Sony WH-1000XM4', category: 'Headphone', price: 3999000, cost: 3200000, stock: 20, minStock: 5 },
    { name: 'AirPods Pro 2', category: 'Headphone', price: 3699000, cost: 3200000, stock: 18, minStock: 3 },
    { name: 'Power Bank 20000mAh', category: 'Aksesoris HP', price: 299000, cost: 180000, stock: 50, minStock: 15 },
    { name: 'Case HP Tempered Glass', category: 'Aksesoris HP', price: 85000, cost: 45000, stock: 100, minStock: 25 },
    
    // Fashion
    { name: 'Kemeja Oxford Putih L', category: 'Pakaian Pria', price: 189000, cost: 120000, stock: 40, minStock: 10 },
    { name: 'Kaos Polo Premium M', category: 'Pakaian Pria', price: 159000, cost: 95000, stock: 60, minStock: 15 },
    { name: 'Dress Wanita Casual XL', category: 'Pakaian Wanita', price: 279000, cost: 180000, stock: 35, minStock: 8 },
    { name: 'Blouse Kantor Wanita M', category: 'Pakaian Wanita', price: 199000, cost: 130000, stock: 30, minStock: 8 },
    { name: 'Sneakers Nike Air Force 1', category: 'Sepatu', price: 899000, cost: 650000, stock: 25, minStock: 5 },
    { name: 'Sepatu Boots Kulit Premium', category: 'Sepatu', price: 599000, cost: 400000, stock: 20, minStock: 5 },
    { name: 'Tas Ransel Anti Theft', category: 'Tas', price: 399000, cost: 250000, stock: 30, minStock: 8 },
    { name: 'Tas Tangan Wanita Kulit', category: 'Tas', price: 799000, cost: 500000, stock: 15, minStock: 3 },
    
    // Food & Beverage
    { name: 'Kopi Arabika Premium 250g', category: 'Minuman', price: 125000, cost: 80000, stock: 45, minStock: 10 },
    { name: 'Teh Tarik Instan 10 Sachet', category: 'Minuman', price: 35000, cost: 20000, stock: 80, minStock: 20 },
    { name: 'Coklat KitKat 50g', category: 'Snack', price: 12000, cost: 7000, stock: 200, minStock: 50 },
    { name: 'Keripik Singkong Original', category: 'Snack', price: 15000, cost: 8000, stock: 150, minStock: 30 },
    { name: 'Mie Instan Goreng 5pcs', category: 'Makanan Instan', price: 25000, cost: 15000, stock: 100, minStock: 25 },
    { name: 'Beras Premium 5kg', category: 'Makanan Instan', price: 85000, cost: 65000, stock: 60, minStock: 15 },
    
    // Health & Beauty
    { name: 'Vitamin C 1000mg 30tab', category: 'Vitamin & Suplemen', price: 85000, cost: 50000, stock: 75, minStock: 20 },
    { name: 'Obat Flu Sirup 60ml', category: 'Vitamin & Suplemen', price: 45000, cost: 28000, stock: 40, minStock: 10 },
    { name: 'Serum Wajah Vitamin C', category: 'Kosmetik', price: 189000, cost: 120000, stock: 35, minStock: 8 },
    { name: 'Sabun Cuci Piring 500ml', category: 'Pembersih', price: 18000, cost: 10000, stock: 90, minStock: 25 },
    { name: 'Deterjen Cair 1L', category: 'Pembersih', price: 28000, cost: 18000, stock: 70, minStock: 15 },
    { name: 'Panci Anti Lengket 24cm', category: 'Dapur', price: 189000, cost: 120000, stock: 25, minStock: 5 },
    { name: 'Set Panci Steel 3pcs', category: 'Dapur', price: 399000, cost: 280000, stock: 15, minStock: 3 },
    
    // Sports & Recreation
    { name: 'Matras Yoga 6mm', category: 'Olahraga', price: 199000, cost: 130000, stock: 30, minStock: 8 },
    { name: 'Dumbbell 5kg Pair', category: 'Olahraga', price: 299000, cost: 200000, stock: 20, minStock: 5 },
    { name: 'Gitar Akustik Starter', category: 'Musik', price: 599000, cost: 400000, stock: 12, minStock: 3 },
    { name: 'Keyboard Digital 61 Key', category: 'Musik', price: 899000, cost: 650000, stock: 8, minStock: 2 },
    
    // Books & Stationery
    { name: 'Buku Tulis A4 100 lembar', category: 'Buku & Alat Tulis', price: 12000, cost: 7000, stock: 200, minStock: 50 },
    { name: 'Pulpen Biru 12pcs', category: 'Buku & Alat Tulis', price: 25000, cost: 15000, stock: 100, minStock: 25 },
    { name: 'Kalkulator Scientific', category: 'Buku & Alat Tulis', price: 189000, cost: 120000, stock: 30, minStock: 8 },
    
    // Toys & Education
    { name: 'Lego Classic 450 pieces', category: 'Mainan & Edukasi', price: 399000, cost: 280000, stock: 25, minStock: 5 },
    { name: 'Boneka Lucu 30cm', category: 'Mainan & Edukasi', price: 159000, cost: 95000, stock: 35, minStock: 8 },
    { name: 'Puzzle Anak 100 pcs', category: 'Mainan & Edukasi', price: 89000, cost: 50000, stock: 40, minStock: 10 },
  ];

  // Product templates are already fixed above
  const fixedProductTemplates = productTemplates;

  const allProducts: any[] = [];
  
  for (const template of fixedProductTemplates) {
    const category = createdCategories.find(c => c.name === template.category);
    if (category) {
      // Create products for each branch
      for (const branch of branches) {
        const productData = {
          sku: `${template.category.slice(0, 3).toUpperCase()}-${String(allProducts.length + 1).padStart(3, '0')}-${branch.id.slice(0, 8)}`,
          barcode: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
          name: template.name,
          description: `Produk berkualitas: ${template.name}`,
          price: template.price,
          cost: template.cost,
          stock: template.stock,
          minStock: template.minStock,
          maxStock: template.stock * 2,
          unit: 'pcs',
          weight: Math.random() * 2 + 0.1, // 0.1-2.1 kg
          dimensions: '20x15x5 cm',
          isActive: true,
          categoryId: category.id,
          branchId: branch.id,
          createdBy: adminUser.id
        };
        const product = await prisma.product.create({ data: productData });
        allProducts.push(product);
      }
    }
  }

  console.log(`✅ Created ${allProducts.length} products across ${branches.length} branches`);

  // 7. Create Purchase Orders
  console.log('📋 Creating purchase orders...');
  const purchaseOrders = [];
  
  for (let i = 0; i < 20; i++) {
    const supplier = createdSuppliers[Math.floor(Math.random() * createdSuppliers.length)];
    const orderDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000); // Last 90 days
    
    // Create random products from this supplier's category
    const orderProducts = allProducts
      .filter((p: any) => p.branchId === mainBranch.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 5) + 1);
    
    let totalAmount = 0;
    const items = [];
    
    for (const product of orderProducts) {
      const quantity = Math.floor(Math.random() * 10) + 5;
      const unitPrice = product.cost;
      const discount = Math.random() * 0.1; // 0-10% discount
      const itemTotal = (unitPrice * quantity) * (1 - discount);
      
      totalAmount += itemTotal;
      
      items.push({
        quantity,
        unitPrice,
        discount: unitPrice * quantity * discount,
        total: itemTotal,
        receivedQuantity: quantity,
        status: 'RECEIVED',
        productId: product.id
      });
    }
    
    const tax = totalAmount * 0.1; // 10% tax
    const finalAmount = totalAmount + tax;
    
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        orderCode: `PO-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
        orderDate,
        totalAmount,
        discount: totalAmount * 0.05, // 5% order discount
        tax,
        finalAmount,
        status: 'COMPLETED',
        notes: `Purchase order for ${supplier.name}`,
        supplierId: supplier.id,
        branchId: mainBranch.id,
        items: {
          create: items
        }
      },
      include: {
        items: true
      }
    });
    
    purchaseOrders.push(purchaseOrder);
  }

  // 8. Create Transactions
  console.log('💰 Creating transactions...');
  const transactions = [];
  const paymentMethods = ['CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'QRIS'] as const;
  
  for (let i = 0; i < 60; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const transactionDate = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000); // Last 60 days
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    
    // Create random transaction items
    const transactionProducts = allProducts
      .filter((p: any) => p.branchId === user.branchId)
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 4) + 1);
    
    let totalAmount = 0;
    const items = [];
    
    for (const product of transactionProducts) {
      const quantity = Math.floor(Math.random() * 3) + 1;
      const unitPrice = product.price;
      const discount = Math.random() * 0.05; // 0-5% discount
      const itemTotal = (unitPrice * quantity) * (1 - discount);
      
      totalAmount += itemTotal;
      
      items.push({
        quantity,
        unitPrice,
        discount: unitPrice * quantity * discount,
        total: itemTotal,
        productId: product.id
      });
    }
    
    const tax = totalAmount * 0.1; // 10% tax
    const finalAmount = totalAmount + tax;
    const amountPaid = finalAmount;
    const change = Math.random() > 0.8 ? Math.floor(Math.random() * 50000) : 0; // 20% chance of change
    
    const transaction = await prisma.transaction.create({
      data: {
        transactionCode: `TXN-${new Date().getFullYear()}-${String(i + 1).padStart(6, '0')}`,
        totalAmount,
        discount: totalAmount * 0.02, // 2% transaction discount
        tax,
        finalAmount,
        paymentMethod,
        amountPaid,
        change,
        status: 'COMPLETED',
        notes: `Transaction for ${user.name}`,
        createdAt: transactionDate,
        userId: user.id,
        branchId: user.branchId!,
        items: {
          create: items
        }
      },
      include: {
        items: true
      }
    });
    
    // Update product stock
    for (const item of transaction.items) {
      const product = allProducts.find((p: any) => p.id === item.productId);
      if (product) {
        await prisma.product.update({
          where: { id: product.id },
          data: { stock: product.stock - item.quantity }
        });
        
        // Create inventory log
        await prisma.inventoryLog.create({
          data: {
            type: 'OUT',
            quantity: item.quantity,
            reference: transaction.id,
            notes: `Sale transaction ${transaction.transactionCode}`,
            productId: product.id
          }
        });
      }
    }
    
    transactions.push(transaction);
  }

  // 9. Create Chart of Accounts
  console.log('📊 Creating chart of accounts...');
  const chartOfAccounts = [
    // Assets
    { code: '1000', name: 'Aset Lancar', type: 'ASSET' },
    { code: '1100', name: 'Kas dan Bank', type: 'ASSET' },
    { code: '1200', name: 'Piutang Dagang', type: 'ASSET' },
    { code: '1300', name: 'Persediaan', type: 'ASSET' },
    { code: '1400', name: 'Aset Tetap', type: 'ASSET' },
    
    // Liabilities
    { code: '2000', name: 'Kewajiban Lancar', type: 'LIABILITY' },
    { code: '2100', name: 'Utang Dagang', type: 'LIABILITY' },
    { code: '2200', name: 'Utang Pajak', type: 'LIABILITY' },
    { code: '2300', name: 'Kewajiban Jangka Panjang', type: 'LIABILITY' },
    
    // Equity
    { code: '3000', name: 'Modal', type: 'EQUITY' },
    { code: '3100', name: 'Laba Ditahan', type: 'EQUITY' },
    
    // Revenue
    { code: '4000', name: 'Pendapatan', type: 'REVENUE' },
    { code: '4100', name: 'Pendapatan Penjualan', type: 'REVENUE' },
    { code: '4200', name: 'Pendapatan Lainnya', type: 'REVENUE' },
    
    // Expenses
    { code: '5000', name: 'Beban Operasional', type: 'EXPENSE' },
    { code: '5100', name: 'Harga Pokok Penjualan', type: 'EXPENSE' },
    { code: '5200', name: 'Beban Gaji', type: 'EXPENSE' },
    { code: '5300', name: 'Beban Operasional Lainnya', type: 'EXPENSE' }
  ];

  const createdAccounts = [];
  for (const account of chartOfAccounts) {
    const createdAccount = await prisma.chartOfAccount.create({
      data: {
        code: account.code,
        name: account.name,
        type: account.type,
        isActive: true,
        branchId: mainBranch.id
      }
    });
    createdAccounts.push(createdAccount);
  }

  // 10. Create Journal Entries for Transactions
  console.log('📝 Creating journal entries...');
  for (const transaction of transactions.slice(0, 20)) { // Create journal entries for first 20 transactions
    const cashAccount = createdAccounts.find(a => a.code === '1100'); // Cash
    const salesAccount = createdAccounts.find(a => a.code === '4100'); // Sales Revenue
    const taxAccount = createdAccounts.find(a => a.code === '2200'); // Tax Payable
    
    if (cashAccount && salesAccount && taxAccount) {
      await prisma.journalEntry.create({
        data: {
          entryCode: `JE-${transaction.transactionCode}`,
          date: transaction.createdAt,
          description: `Journal entry for transaction ${transaction.transactionCode}`,
          reference: transaction.id,
          total: transaction.finalAmount,
          status: 'POSTED',
          branchId: transaction.branchId,
          journalEntries: {
            create: [
              {
                description: `Cash from transaction ${transaction.transactionCode}`,
                debit: transaction.finalAmount,
                credit: 0,
                accountId: cashAccount.id
              },
              {
                description: `Sales revenue from ${transaction.transactionCode}`,
                debit: 0,
                credit: transaction.totalAmount,
                accountId: salesAccount.id
              },
              {
                description: `Tax payable from ${transaction.transactionCode}`,
                debit: 0,
                credit: transaction.tax,
                accountId: taxAccount.id
              }
            ]
          }
        }
      });
    }
  }

  // 11. Create Attendance Records
  console.log('🕐 Creating attendance records...');
  for (const user of staffUsers) {
    for (let i = 0; i < 30; i++) { // 30 days of attendance
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const random = Math.random();
      let status = 'PRESENT';
      let checkIn = new Date(date);
      let checkOut = new Date(date);
      
      if (random < 0.1) { // 10% absent
        status = 'ABSENT';
        checkIn = new Date(0); // Use epoch date for null
        checkOut = new Date(0);
      } else if (random < 0.15) { // 5% late
        checkIn = new Date(date);
        checkIn.setHours(9, Math.floor(Math.random() * 30) + 15, 0, 0); // 9:15-9:45
        checkOut = new Date(date);
        checkOut.setHours(18, 0, 0, 0);
      } else { // On time
        checkIn = new Date(date);
        checkIn.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0); // 8:00-10:00
        checkOut = new Date(date);
        checkOut.setHours(17 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0); // 17:00-19:00
      }
      
      await prisma.attendance.create({
        data: {
          date,
          checkIn,
          checkOut,
          status,
          notes: status === 'ABSENT' ? 'Tidak hadir tanpa keterangan' : null,
          userId: user.id,
          branchId: user.branchId!
        }
      });
    }
  }

  // 12. Create Cash Drawer Sessions
  console.log('💵 Creating cash drawer sessions...');
  for (let i = 0; i < 15; i++) {
    const startTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Last 7 days
    const endTime = new Date(startTime.getTime() + 8 * 60 * 60 * 1000); // 8 hours later
    const initialCash = 500000; // Rp 500,000
    const finalCash = initialCash + (Math.random() * 1000000); // Random sales
    
    const cashier = staffUsers[Math.floor(Math.random() * staffUsers.length)];
    
    await prisma.cashDrawerSession.create({
      data: {
        sessionCode: `CDS-${String(i + 1).padStart(4, '0')}`,
        startTime,
        endTime,
        initialCash,
        finalCash,
        status: 'CLOSED',
        notes: 'Daily sales session',
        branchId: cashier.branchId!,
        cashierId: cashier.id,
        cashActivities: {
          create: [
            {
              type: 'INITIAL_CASH',
              amount: initialCash,
              description: 'Initial cash for day'
            },
            {
              type: 'CASH_IN',
              amount: Math.random() * 500000,
              description: 'Sales cash in'
            },
            {
              type: 'CASH_OUT',
              amount: Math.random() * 100000,
              description: 'Change given'
            }
          ]
        }
      }
    });
  }

  // 13. Create System Settings
  console.log('⚙️ Creating system settings...');
  const systemSettings = [
    { key: 'COMPANY_NAME', value: 'PT. BMS Sejahtera', description: 'Nama perusahaan' },
    { key: 'COMPANY_ADDRESS', value: 'Jl. Sudirman No. 123, Jakarta Pusat', description: 'Alamat perusahaan' },
    { key: 'DEFAULT_CURRENCY', value: 'IDR', description: 'Mata uang default' },
    { key: 'TAX_RATE', value: '10', description: 'Tarif pajak default (%)' },
    { key: 'LOW_STOCK_THRESHOLD', value: '10', description: 'Ambang batas stock rendah (%)' },
    { key: 'BUSINESS_HOURS_START', value: '08:00', description: 'Jam mulai operasional' },
    { key: 'BUSINESS_HOURS_END', value: '20:00', description: 'Jam selesai operasional' },
    { key: 'MAX_DISCOUNT_PERCENTAGE', value: '15', description: 'Maksimal persentase diskon (%)' }
  ];

  for (const setting of systemSettings) {
    await prisma.systemSettings.create({
      data: {
        key: setting.key,
        value: setting.value,
        description: setting.description
      }
    });
  }

  // 14. Create Messages
  console.log('📨 Creating messages...');
  for (let i = 0; i < 25; i++) {
    const sender = users[Math.floor(Math.random() * users.length)];
    const receiver = users[Math.floor(Math.random() * users.length)];
    
    if (sender.id !== receiver.id) {
      await prisma.message.create({
        data: {
          content: `Pesan penting ${i + 1}: Mohon review stock produk sebelum akhir hari.`,
          isRead: Math.random() > 0.3, // 70% read
          senderId: sender.id,
          receiverId: receiver.id
        }
      });
    }
  }

  console.log('🎉 BMS database seeding completed successfully!');
  console.log(`
📊 Seed Data Summary:
- Branches: ${branches.length}
- Users: ${users.length}
- Categories: ${createdCategories.length}
- Suppliers: ${createdSuppliers.length}
- Products: ${allProducts.length}
- Purchase Orders: ${purchaseOrders.length}
- Transactions: ${transactions.length}
- Chart of Accounts: ${createdAccounts.length}
- Attendance Records: 30 per user
- Cash Drawer Sessions: 15
- System Settings: ${systemSettings.length}
- Messages: 25

🔑 Test Credentials:
- Admin: admin@bms.co.id / password123
- Manager: manager@bms.co.id / password123
- Staff: staff1@bms.co.id / password123

🌐 Application URLs:
- Backend API: http://localhost:3001
- Frontend Web: http://localhost:3000
- POS System: http://localhost:3002
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });