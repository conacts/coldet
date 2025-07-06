'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowLeft, Download, Phone, Mail } from 'lucide-react';

interface SuccessPageProps {
  params: Promise<{ token: string }>;
}

export default function SuccessPage(props: SuccessPageProps) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  // Handle async params in Next.js 15
  useEffect(() => {
    const getToken = async () => {
      const resolvedParams = await props.params;
      setToken(resolvedParams.token);
      
      // Track successful payment page visit
      trackPaymentSuccess(resolvedParams.token);
    };
    
    getToken();
  }, [props.params]);

  const trackPaymentSuccess = async (token: string) => {
    try {
      await fetch('/api/track/page-visit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          event: 'payment_success_page_visit',
          timestamp: Date.now(),
        }),
      });
    } catch (error) {
      console.error('Failed to track payment success:', error);
    }
  };

  const handleGoBack = () => {
    router.push('/');
  };

  const handleDownloadReceipt = () => {
    // Track receipt download
    if (token) {
      fetch('/api/track/page-visit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          event: 'receipt_download',
          timestamp: Date.now(),
        }),
      });
    }
    
    // This would typically download a PDF receipt
    // For now, we'll just show an alert
    alert('Receipt will be emailed to you within 5 minutes');
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-600 dark:text-green-400">
            Payment Successful!
          </CardTitle>
          <CardDescription>
            Your account has been resolved. Thank you for your payment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Account:</span>
              <span className="font-medium">{token}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment Status:</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                Completed
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount Paid:</span>
              <span className="font-medium">$20.00</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Transaction Date:</span>
              <span className="font-medium">{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
            <p className="text-sm text-green-700 dark:text-green-300">
              Your payment has been processed successfully. You will receive an email confirmation shortly with your receipt.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleDownloadReceipt}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Receipt
            </Button>

            <div className="text-sm text-muted-foreground">
              Need help or have questions?
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Phone className="mr-2 h-4 w-4" />
                Call Support
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Mail className="mr-2 h-4 w-4" />
                Email Support
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button onClick={handleGoBack} variant="ghost" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}