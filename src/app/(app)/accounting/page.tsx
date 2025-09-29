import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PlusCircle, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const journalEntries = [
  {
    date: '2023-10-01',
    account: 'Cash',
    debit: 5000.0,
    credit: 0,
    description: 'Initial capital investment',
  },
  {
    date: '2023-10-01',
    account: 'Owner\'s Equity',
    debit: 0,
    credit: 5000.0,
    description: 'Initial capital investment',
  },
  {
    date: '2023-10-02',
    account: 'Inventory',
    debit: 1500.0,
    credit: 0,
    description: 'Purchase of goods',
  },
  {
    date: '2023-10-02',
    account: 'Accounts Payable',
    debit: 0,
    credit: 1500.0,
    description: 'Purchase of goods',
  },
  {
    date: '2023-10-05',
    account: 'Accounts Receivable',
    debit: 500.0,
    credit: 0,
    description: 'Sale on credit',
  },
  {
    date: '2023-10-05',
    account: 'Sales Revenue',
    debit: 0,
    credit: 500.0,
    description: 'Sale on credit',
  },
];

const financialReports = [
  'Profit & Loss',
  'Balance Sheet',
  'General Ledger',
  'Cash Flow',
  'Changes in Equity',
];

export default function AccountingPage() {
  return (
    <div className="flex flex-1 flex-col p-4 md:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Accounting
        </h1>
        <p className="text-muted-foreground">
          Track finances and generate reports.
        </p>
      </header>

      <Tabs defaultValue="journal">
        <TabsList className="mb-4">
          <TabsTrigger value="journal">Journal Entries</TabsTrigger>
          <TabsTrigger value="reports">Financial Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="journal">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>General Journal</CardTitle>
                <CardDescription>
                  Record of all financial transactions.
                </CardDescription>
              </div>
              <Button className="bg-accent hover:bg-accent/90">
                <PlusCircle />
                Add Entry
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journalEntries.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell className="font-medium">
                        {entry.account}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.description}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.debit > 0 ? `$${entry.debit.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.credit > 0 ? `$${entry.credit.toFixed(2)}` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Financial Reports</CardTitle>
              <CardDescription>
                Generate and view key financial statements.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {financialReports.map((report) => (
                <Card
                  key={report}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="text-primary" />
                    <span className="font-medium">{report}</span>
                  </div>
                  <Button variant="outline">View</Button>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
