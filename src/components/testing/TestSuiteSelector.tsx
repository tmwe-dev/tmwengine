import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { TestSuite } from '@/lib/testing/test-types';

interface TestSuiteSelectorProps {
  suites: TestSuite[];
  selectedSuite: string;
  onSuiteChange: (suite: string) => void;
}

export const TestSuiteSelector = ({ suites, selectedSuite, onSuiteChange }: TestSuiteSelectorProps) => {
  const selectedSuiteData = suites.find(s => s.name === selectedSuite);
  
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Test Suite</label>
      <Select value={selectedSuite} onValueChange={onSuiteChange}>
        <SelectTrigger>
          <SelectValue placeholder="Seleziona una suite di test" />
        </SelectTrigger>
        <SelectContent>
          {suites.map((suite) => (
            <SelectItem key={suite.name} value={suite.name}>
              <div className="flex items-center justify-between gap-2 w-full">
                <span>{suite.name}</span>
                <Badge variant="outline" className="ml-2">
                  {suite.tests.length} test{suite.tests.length > 1 ? 's' : ''}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {selectedSuiteData && (
        <p className="text-sm text-muted-foreground">
          {selectedSuiteData.description}
        </p>
      )}
    </div>
  );
};
