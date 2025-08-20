import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Copy, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

export default function AuthSuccessPage() {
  const [, setLocation] = useLocation();
  const [params, setParams] = useState<any>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setParams({
      code: urlParams.get('code'),
      provider: urlParams.get('provider')
    });
  }, []);

  const copyCode = () => {
    if (params?.code) {
      navigator.clipboard.writeText(params.code);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-6 flex items-center justify-center">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800">Authentication Successful!</CardTitle>
            <CardDescription className="text-lg">
              {params?.provider === 'azure-ad' ? 'Azure AD' : 'OAuth'} authentication completed successfully
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {params?.code && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-gray-800">Authorization Code</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyCode}
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </Button>
                </div>
                <code className="block text-xs bg-white p-3 rounded border break-all">
                  {params.code}
                </code>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">What happens next?</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Your authorization code can be exchanged for an access token</li>
                <li>• Use this token to authenticate users in your application</li>
                <li>• The token provides access to user profile information</li>
                <li>• Integration test completed successfully!</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => setLocation("/test-azure")}
                className="flex-1"
              >
                Test Again
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation("/admin")}
                className="flex-1"
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}