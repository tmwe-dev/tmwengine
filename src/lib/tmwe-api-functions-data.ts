export interface ApiFunction {
  name: string;
  description: string;
  endpoint: string;
  method?: string;
  exampleCode: string;
  exampleResponse: string;
}

// Define the structure for the API handlers
