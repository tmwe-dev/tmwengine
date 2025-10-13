import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MarkdownViewerProps {
  content: string;
  title?: string;
}

export function MarkdownViewer({ content, title }: MarkdownViewerProps) {
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
            {content}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
