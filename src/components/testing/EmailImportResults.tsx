import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle } from "lucide-react";

interface EmailResult {
  uid: string;
  subject: string;
  from: string;
  date: string;
  downloadTime: number;
  batchSize: number;
  success: boolean;
  error?: string;
}

interface EmailImportResultsProps {
  results: EmailResult[];
}

export function EmailImportResults({ results }: EmailImportResultsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>📋 Risultati Dettagliati</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-[400px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Status</TableHead>
                <TableHead className="w-24">UID</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>From</TableHead>
                <TableHead className="w-32">Date</TableHead>
                <TableHead className="w-24 text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div title={result.error}>
                      {result.success ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{result.uid}</TableCell>
                  <TableCell className="max-w-[300px] truncate" title={result.subject}>
                    {result.subject}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={result.from}>
                    {result.from}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(result.date).toLocaleDateString('it-IT')}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {result.downloadTime.toFixed(0)}ms
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
