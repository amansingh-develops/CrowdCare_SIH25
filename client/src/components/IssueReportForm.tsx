import { useState, useEffect } from "react";
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
import { motion, AnimatePresence } from "framer-motion";
import { Camera, MapPin, Plus, X, Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
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
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 30 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    },
    hover: {
      scale: 1.02,
      y: -5,
      transition: {
        duration: 0.2,
        ease: "easeInOut"
      }
    }
  };

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
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
    >
      <motion.div
        variants={cardVariants}
        whileHover="hover"
      >
        <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <CardTitle className="flex items-center text-gray-800">
                <motion.div
                  whileHover={{ rotate: 90, scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Plus className="w-6 h-6 mr-3 text-blue-600" />
                </motion.div>
                <span className="text-2xl font-bold">Report New Issue</span>
              </CardTitle>
            </motion.div>
          </CardHeader>
          <CardContent className="p-6">
            <Form {...form}>
              <motion.form 
                onSubmit={form.handleSubmit(onSubmit)} 
                className="space-y-6"
                variants={containerVariants}
              >
                <motion.div variants={itemVariants}>
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-800 font-semibold">Issue Category</FormLabel>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger 
                                data-testid="select-category"
                                className="bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500"
                              >
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
                        </motion.div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div variants={itemVariants}>
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-800 font-semibold">Issue Title</FormLabel>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FormControl>
                            <Input 
                              placeholder="Brief description of the issue..." 
                              {...field}
                              data-testid="input-title"
                              className="bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500"
                            />
                          </FormControl>
                        </motion.div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div variants={itemVariants}>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-800 font-semibold">Description</FormLabel>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FormControl>
                            <Textarea
                              placeholder="Describe the issue in detail..."
                              className="h-24 bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500"
                              {...field}
                              data-testid="textarea-description"
                            />
                          </FormControl>
                        </motion.div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div variants={itemVariants}>
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-800 font-semibold">Location</FormLabel>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <motion.div
                            className="flex-1"
                            whileHover={{ scale: 1.02 }}
                            transition={{ duration: 0.2 }}
                          >
                            <FormControl>
                              <Input
                                placeholder="Enter address or use GPS"
                                {...field}
                                data-testid="input-location"
                                className="bg-white border-gray-200 hover:border-blue-300 focus:border-blue-500"
                              />
                            </FormControl>
                          </motion.div>
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              type="button"
                              variant="outline"
                              onClick={getCurrentLocation}
                              disabled={isGettingLocation}
                              data-testid="button-get-location"
                              className="bg-white hover:bg-blue-50 border-gray-200 hover:border-blue-300 text-blue-600"
                            >
                              {isGettingLocation ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <MapPin className="w-4 h-4" />
                              )}
                            </Button>
                          </motion.div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                {/* Photo Upload */}
                <motion.div variants={itemVariants}>
                  <label className="block text-sm font-semibold text-gray-800 mb-3">Photo Evidence</label>
                  <div className="space-y-4">
                    <motion.div 
                      className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="font-semibold mb-2 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Important instruction
                      </div>
                      <div>
                        <img
                          src="/gps-map-camera-logo.svg"
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
                          className="underline font-semibold hover:text-red-900"
                        >
                          Play Store
                        </a>.
                      </div>
                    </motion.div>
                    
                    {/* Upload Button */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50 hover:bg-gray-100 hover:border-blue-300 transition-all"
                    >
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
                        <motion.div
                          whileHover={{ rotate: 5, scale: 1.1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Camera className="w-8 h-8 text-gray-500 mb-2" />
                        </motion.div>
                        <p className="text-gray-600 font-medium">Tap to take photo or upload image</p>
                        <p className="text-xs text-gray-500 mt-1">Supports JPG, PNG up to 5MB</p>
                      </label>
                    </motion.div>

                    {/* Image Previews */}
                    <AnimatePresence>
                      {images.length > 0 && (
                        <motion.div 
                          className="grid grid-cols-2 md:grid-cols-3 gap-4"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          {images.map((image, index) => (
                            <motion.div 
                              key={index} 
                              className="relative group"
                              initial={{ opacity: 0, scale: 0.8, y: 20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.8, y: -20 }}
                              transition={{ duration: 0.3, delay: index * 0.1 }}
                              whileHover={{ scale: 1.05 }}
                            >
                              <img
                                src={image.preview}
                                alt={`Upload ${index + 1}`}
                                className="w-full h-24 object-cover rounded-md shadow-sm group-hover:shadow-md transition-shadow"
                                data-testid={`img-preview-${index}`}
                              />
                              <motion.div
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 shadow-lg"
                                  onClick={() => removeImage(index)}
                                  data-testid={`button-remove-image-${index}`}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </motion.div>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Guidance when images are present but GPS may be missing */}
                    <AnimatePresence>
                      {images.length > 0 && (
                        <motion.div 
                          className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="font-semibold mb-2 flex items-center">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            No GPS data found in the uploaded photo
                          </div>
                          <div>
                            <img
                              src="/gps-map-camera-logo.svg"
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
                              className="underline font-semibold hover:text-red-900"
                            >
                              Play Store
                            </a>.
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all"
                      disabled={createIssueMutation.isPending}
                      data-testid="button-submit-report"
                    >
                      {createIssueMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Submit Report
                        </>
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
