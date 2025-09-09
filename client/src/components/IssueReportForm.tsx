import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Camera, MapPin, Plus, X } from "lucide-react";
import type { IssueFormData, GeolocationData, UploadedImage } from "@/types";
import { ISSUE_CATEGORIES } from "@/types";

const issueFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(60, "Title must be less than 60 characters"),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description must be less than 500 characters"),
  category: z.string().min(1, "Category is required"),
  location: z.string().min(1, "Location is required"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

type IssueFormValues = z.infer<typeof issueFormSchema>;

interface IssueReportFormProps {
  onSuccess?: () => void;
  className?: string;
}

export function IssueReportForm({ onSuccess, className }: IssueReportFormProps) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<IssueFormValues>({
    resolver: zodResolver(issueFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      location: "",
    },
  });

  const createIssueMutation = useMutation({
    mutationFn: async (data: IssueFormValues & { images: File[] }) => {
      const formData = new FormData();
      
      // Add form fields
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'images' && value !== undefined) {
          formData.append(key, value.toString());
        }
      });

      // Add images
      data.images.forEach(file => {
        formData.append('images', file);
      });

      return apiRequest('POST', '/api/issues', formData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Issue reported successfully!",
      });
      // Invalidate all issue-related queries to refresh both citizen and admin panels
      queryClient.invalidateQueries({ queryKey: ['/api/issues'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/me/issues'] });
      queryClient.invalidateQueries({ queryKey: ['/api/issues/nearby'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/stats'] });
      form.reset();
      setImages([]);
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to report issue",
        variant: "destructive",
      });
    },
  });

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by this browser",
        variant: "destructive",
      });
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        form.setValue('latitude', latitude);
        form.setValue('longitude', longitude);
        
        // Reverse geocoding would happen here in a real app
        form.setValue('location', `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        
        setIsGettingLocation(false);
        toast({
          title: "Location Found",
          description: "Current location has been set",
        });
      },
      (error) => {
        setIsGettingLocation(false);
        toast({
          title: "Location Error",
          description: "Unable to get your location. Please enter it manually.",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newImage: UploadedImage = {
            file,
            preview: e.target?.result as string,
            fileName: file.name,
          };
          setImages(prev => [...prev, newImage]);
        };
        reader.readAsDataURL(file);
      }
    });
    
    // Reset input
    event.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data: IssueFormValues) => {
    createIssueMutation.mutate({
      ...data,
      images: images.map(img => img.file),
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Plus className="w-5 h-5 mr-2 text-primary" />
          Report New Issue
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ISSUE_CATEGORIES.map(category => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issue Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Brief description of the issue..." 
                      {...field}
                      data-testid="input-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the issue in detail..."
                      className="h-24"
                      {...field}
                      data-testid="textarea-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <FormControl>
                      <Input
                        placeholder="Enter address or use GPS"
                        {...field}
                        data-testid="input-location"
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={getCurrentLocation}
                      disabled={isGettingLocation}
                      data-testid="button-get-location"
                    >
                      <MapPin className="w-4 h-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">Photo Evidence</label>
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
                  <div className="font-semibold mb-1">Important instruction</div>
                  <div>
                    <img
                      src="/gps-map-camera-logo.png"
                      alt="GPS Map Camera"
                      className="inline-block w-5 h-5 mr-2 align-[-2px]"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                    For precise location detection from photo, ensure Location is enabled in your camera settings before taking the photo.
                    Alternatively, capture using the Google Maps camera. If you don't have it, download it from the
                    {' '}<a
                      href="https://play.google.com/store/apps/details?id=com.gpsmapcamera.geotagginglocationonphoto"
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-semibold"
                    >
                      Play Store
                    </a>.
                  </div>
                </div>
                {/* Upload Button */}
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    data-testid="input-image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Tap to take photo or upload image</p>
                    <p className="text-xs text-muted-foreground mt-1">Supports JPG, PNG up to 5MB</p>
                  </label>
                </div>

                {/* Image Previews */}
                {images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={image.preview}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-24 object-cover rounded-md"
                          data-testid={`img-preview-${index}`}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={() => removeImage(index)}
                          data-testid={`button-remove-image-${index}`}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Guidance when images are present but GPS may be missing */}
                {images.length > 0 && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
                    <div className="font-semibold mb-1">No GPS data found in the uploaded photo</div>
                    <div>
                      <img
                        src="/gps-map-camera-logo.png"
                        alt="GPS Map Camera"
                        className="inline-block w-5 h-5 mr-2 align-[-2px]"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                      For precise location detection from photo, ensure Location is enabled in your camera settings before taking the photo.
                      Alternatively, capture using the Google Maps camera. If you don't have it, download it from the
                      {' '}<a
                        href="https://play.google.com/store/apps/details?id=com.gpsmapcamera.geotagginglocationonphoto"
                        target="_blank"
                        rel="noreferrer"
                        className="underline font-semibold"
                      >
                        Play Store
                      </a>.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={createIssueMutation.isPending}
              data-testid="button-submit-report"
            >
              {createIssueMutation.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
