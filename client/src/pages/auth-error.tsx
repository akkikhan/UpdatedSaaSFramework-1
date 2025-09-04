import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function AuthErrorPage() {
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [details, setDetails] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setError(urlParams.get("error"));
    setCode(urlParams.get("code"));
    setDetails(urlParams.get("details"));
  }, []);

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "callback_failed":
        return "The authentication callback failed. Please check your configuration and try again.";
      case "invalid_config":
        return "Invalid configuration. Please verify your credentials and settings.";
      case "access_denied":
        return "Access was denied. Please check your permissions and try again.";
      default:
        return "An unknown error occurred during authentication.";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 p-6 flex items-center justify-center">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-800">Authentication Failed</CardTitle>
            <CardDescription className="text-lg">
              There was a problem with the authentication process
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2">Error Details</h4>
              <div className="text-sm text-red-700 space-y-1">
                <p>{getErrorMessage(error)}</p>
                {code && (
                  <p>
                    <strong>Code:</strong> {code}
                  </p>
                )}
                {details && (
                  <details className="mt-1">
                    <summary className="cursor-pointer">Show technical details</summary>
                    <pre className="mt-2 whitespace-pre-wrap break-words text-xs max-h-64 overflow-auto">
                      {details}
                    </pre>
                  </details>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Troubleshooting Tips</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Verify your Azure AD tenant ID, client ID, and client secret</li>
                <li>• Check that the redirect URI is correctly configured</li>
                <li>• Ensure the application has the necessary permissions</li>
                <li>• Try the authentication flow again</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => setLocation("/test-azure")}
                className="flex-1 flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => setLocation("/admin")} className="flex-1">
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
