import React from 'react';
import ReportForm from '@/components/ReportForm';
import { Toaster } from '@/components/ui/toaster';

export default function ReportPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <ReportForm />
      <Toaster />
    </div>
  );
}
