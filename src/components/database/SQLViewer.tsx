import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SQLViewerProps {
  content: string;
  title?: string;
}

export function SQLViewer({ content, title }: SQLViewerProps) {
  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ScrollArea className="h-[600px] w-full">
          <pre className="text-sm whitespace-pre-wrap font-mono p-4 bg-muted rounded-lg">
            <code className="language-sql">{content}</code>
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
