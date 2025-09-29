import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Image, Scissors, Download, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBackgroundRemoval } from '@/hooks/useBackgroundRemoval';

interface ProcessedImage {
  id: string;
  originalFile: File;
  originalUrl: string;
  processedUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

export const BackgroundRemovalProcessor: React.FC = () => {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { removeBackground, isLoading } = useBackgroundRemoval();

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    const newImages: ProcessedImage[] = imageFiles.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      originalFile: file,
      originalUrl: URL.createObjectURL(file),
      status: 'pending'
    }));

    setImages(prev => [...prev, ...newImages]);
  }, []);

  const processImage = useCallback(async (image: ProcessedImage) => {
    try {
      setImages(prev => prev.map(img => 
        img.id === image.id ? { ...img, status: 'processing' } : img
      ));

      const processedBlob = await removeBackground(image.originalFile);
      const processedUrl = URL.createObjectURL(processedBlob);

      setImages(prev => prev.map(img => 
        img.id === image.id 
          ? { ...img, status: 'completed', processedUrl } 
          : img
      ));
    } catch (error) {
      console.error('Error processing image:', error);
      setImages(prev => prev.map(img => 
        img.id === image.id 
          ? { ...img, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' } 
          : img
      ));
    }
  }, [removeBackground]);

  const processAllImages = useCallback(async () => {
    setIsProcessing(true);
    const pendingImages = images.filter(img => img.status === 'pending');
    
    for (const image of pendingImages) {
      await processImage(image);
      // Small delay between processing
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsProcessing(false);
  }, [images, processImage]);

  const downloadProcessedImage = useCallback((image: ProcessedImage) => {
    if (!image.processedUrl) return;
    
    const link = document.createElement('a');
    link.href = image.processedUrl;
    link.download = `processed-${image.originalFile.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const clearAll = useCallback(() => {
    // Cleanup URLs
    images.forEach(img => {
      URL.revokeObjectURL(img.originalUrl);
      if (img.processedUrl) {
        URL.revokeObjectURL(img.processedUrl);
      }
    });
    setImages([]);
  }, [images]);

  const pendingCount = images.filter(img => img.status === 'pending').length;
  const processingCount = images.filter(img => img.status === 'processing').length;
  const completedCount = images.filter(img => img.status === 'completed').length;
  const errorCount = images.filter(img => img.status === 'error').length;
  const totalCount = images.length;
  const progressPercentage = totalCount > 0 ? Math.round(((completedCount + errorCount) / totalCount) * 100) : 0;

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scissors className="h-5 w-5" />
          Background Removal Processor
          {isProcessing && (
            <Badge variant="secondary" className="animate-pulse">
              <Scissors className="h-3 w-3 mr-1" />
              Processing...
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">Select Images to Process</p>
          <p className="text-muted-foreground mb-4">Choose one or more images to remove their backgrounds</p>
          <input
            type="file"
            id="image-upload"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button asChild>
            <label htmlFor="image-upload" className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Select Images
            </label>
          </Button>
        </div>

        {/* Stats */}
        {totalCount > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{processingCount}</div>
              <div className="text-sm text-muted-foreground">Processing</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{errorCount}</div>
              <div className="text-sm text-muted-foreground">Errors</div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {totalCount > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>
        )}

        {/* Control Buttons */}
        {totalCount > 0 && (
          <div className="flex gap-4 justify-center">
            <Button 
              onClick={processAllImages} 
              disabled={isProcessing || pendingCount === 0}
              className="flex items-center gap-2"
            >
              <Scissors className="h-4 w-4" />
              Process All ({pendingCount})
            </Button>
            <Button variant="outline" onClick={clearAll} className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Clear All
            </Button>
          </div>
        )}

        {/* Image Grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((image) => (
              <Card key={image.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {/* Status Badge */}
                    <div className="flex justify-between items-center">
                      <Badge 
                        variant={
                          image.status === 'completed' ? 'default' :
                          image.status === 'error' ? 'destructive' :
                          image.status === 'processing' ? 'secondary' : 'outline'
                        }
                        className={cn(
                          image.status === 'processing' && 'animate-pulse'
                        )}
                      >
                        {image.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {image.status === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
                        {image.status === 'processing' && <Scissors className="h-3 w-3 mr-1" />}
                        {image.status.charAt(0).toUpperCase() + image.status.slice(1)}
                      </Badge>
                      
                      {image.status === 'pending' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => processImage(image)}
                          disabled={isLoading}
                        >
                          Process
                        </Button>
                      )}
                    </div>

                    {/* Original Image */}
                    <div>
                      <p className="text-sm font-medium mb-2">Original</p>
                      <img 
                        src={image.originalUrl} 
                        alt="Original" 
                        className="w-full h-32 object-cover rounded border"
                      />
                    </div>

                    {/* Processed Image */}
                    {image.processedUrl && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-medium">Processed</p>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => downloadProcessedImage(image)}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        </div>
                        <img 
                          src={image.processedUrl} 
                          alt="Processed" 
                          className="w-full h-32 object-cover rounded border bg-checkered"
                        />
                      </div>
                    )}

                    {/* Error Message */}
                    {image.status === 'error' && image.error && (
                      <div className="text-sm text-destructive p-2 bg-destructive-muted rounded">
                        {image.error}
                      </div>
                    )}

                    {/* File Info */}
                    <div className="text-xs text-muted-foreground">
                      {image.originalFile.name} ({Math.round(image.originalFile.size / 1024)}KB)
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Completion Message */}
        {totalCount > 0 && completedCount === totalCount && (
          <div className="flex items-center justify-center gap-2 p-4 bg-success-muted rounded-lg">
            <CheckCircle className="h-5 w-5 text-success" />
            <span className="text-success font-medium">
              All images processed successfully! {completedCount} images completed.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};