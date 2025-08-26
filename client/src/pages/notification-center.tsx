import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Webhook, 
  Clock, 
  Settings,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Activity,
  Send,
  Globe
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface NotificationPreference {
  id: string;
  category: string;
  channels: {
    email: boolean;
    sms: boolean;
    push: boolean;
    webhook: boolean;
    in_app: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  frequency: string;
  isEnabled: boolean;
}

interface NotificationConfig {
  sms: any[];
  push: any[];
  webhook: any[];
}

export default function NotificationCenter() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [webhookForm, setWebhookForm] = useState({
    name: "",
    url: "",
    events: [] as string[],
    secret: "",
    timeout: 30
  });

  // Get user notification preferences
  const { data: preferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ["/api/v2/user/notification-preferences"],
    queryFn: async () => {
      const token = localStorage.getItem('tenant_token');
      const response = await fetch("/api/v2/user/notification-preferences", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch notification preferences");
      }
      
      return response.json() as Promise<NotificationPreference[]>;
    },
  });

  // Get notification configurations (admin only)
  const { data: configs, isLoading: configsLoading } = useQuery({
    queryKey: ["/api/v2/admin/notification-configs"],
    queryFn: async () => {
      const token = localStorage.getItem('tenant_token');
      const response = await fetch("/api/v2/admin/notification-configs", {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          return null; // Not admin
        }
        throw new Error("Failed to fetch notification configs");
      }
      
      return response.json() as Promise<NotificationConfig>;
    },
    retry: false,
  });

  // Update preference mutation
  const updatePreference = useMutation({
    mutationFn: async (data: {
      category: string;
      channels?: any;
      quietHours?: any;
      frequency?: string;
      isEnabled?: boolean;
    }) => {
      const token = localStorage.getItem('tenant_token');
      const response = await fetch("/api/v2/user/notification-preferences", {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update preferences");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/user/notification-preferences"] });
      toast({
        title: "Preferences Updated",
        description: "Your notification preferences have been saved",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Configure webhook mutation
  const configureWebhook = useMutation({
    mutationFn: async (data: typeof webhookForm) => {
      const token = localStorage.getItem('tenant_token');
      const response = await fetch("/api/v2/admin/notification-configs/webhook", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error("Failed to configure webhook");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/v2/admin/notification-configs"] });
      setShowAddWebhook(false);
      setWebhookForm({ name: "", url: "", events: [], secret: "", timeout: 30 });
      toast({
        title: "Webhook Configured",
        description: "Webhook endpoint has been added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Configuration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test notification mutation
  const testNotification = useMutation({
    mutationFn: async (channels: string[]) => {
      const token = localStorage.getItem('tenant_token');
      const response = await fetch("/api/v2/notifications", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'test_notification',
          title: 'Test Notification',
          message: 'This is a test notification to verify your settings.',
          options: {
            channels,
            priority: 'medium',
            category: 'general'
          }
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to send test notification");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test Sent",
        description: "Test notification has been sent successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const categories = [
    { id: "general", name: "General", description: "General system notifications" },
    { id: "security", name: "Security", description: "Security alerts and authentication events" },
    { id: "billing", name: "Billing", description: "Payment and subscription notifications" },
    { id: "maintenance", name: "Maintenance", description: "System maintenance and updates" },
    { id: "feature", name: "Features", description: "New features and product updates" }
  ];

  const eventTypes = [
    "module_enabled", "module_disabled", "status_changed", "config_updated",
    "security_alert", "system_maintenance", "user_created", "role_assigned"
  ];

  const getCurrentPreference = (category: string) => {
    return preferences?.find(p => p.category === category) || {
      category,
      channels: { email: true, sms: false, push: false, webhook: false, in_app: true },
      quietHours: { enabled: false, start: "22:00", end: "08:00", timezone: "UTC" },
      frequency: "immediate",
      isEnabled: true
    };
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'push':
        return <Smartphone className="h-4 w-4" />;
      case 'webhook':
        return <Webhook className="h-4 w-4" />;
      case 'in_app':
        return <Bell className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const handleChannelToggle = (category: string, channel: string, enabled: boolean) => {
    const current = getCurrentPreference(category);
    updatePreference.mutate({
      category,
      channels: {
        ...current.channels,
        [channel]: enabled
      }
    });
  };

  const handleQuietHoursUpdate = (category: string, quietHours: any) => {
    updatePreference.mutate({
      category,
      quietHours
    });
  };

  const handleAddWebhook = () => {
    if (!webhookForm.name || !webhookForm.url || webhookForm.events.length === 0) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    configureWebhook.mutate(webhookForm);
  };

  if (preferencesLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Notification Center</h1>
          <p className="text-slate-600 mt-1">Loading notification settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Notification Center</h1>
        <p className="text-slate-600 mt-1">
          Manage your notification preferences and delivery channels
        </p>
      </div>

      <Tabs defaultValue="preferences" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preferences" data-testid="tab-preferences">
            <Bell className="h-4 w-4 mr-2" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="channels" data-testid="tab-channels">
            <Settings className="h-4 w-4 mr-2" />
            Channels
          </TabsTrigger>
          {configs && (
            <TabsTrigger value="admin" data-testid="tab-admin">
              <Activity className="h-4 w-4 mr-2" />
              Admin
            </TabsTrigger>
          )}
        </TabsList>

        {/* User Preferences */}
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Categories</CardTitle>
              <CardDescription>
                Configure how you want to receive different types of notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {categories.map((category) => {
                  const preference = getCurrentPreference(category.id);
                  return (
                    <div key={category.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{category.name}</h3>
                          <p className="text-sm text-muted-foreground">{category.description}</p>
                        </div>
                        <Switch
                          checked={preference.isEnabled}
                          onCheckedChange={(enabled) => 
                            updatePreference.mutate({ 
                              category: category.id, 
                              isEnabled: enabled 
                            })
                          }
                        />
                      </div>

                      {preference.isEnabled && (
                        <div className="ml-4 space-y-4 border-l-2 border-slate-200 pl-4">
                          {/* Channel Selection */}
                          <div>
                            <Label className="text-sm font-medium">Delivery Channels</Label>
                            <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-3">
                              {Object.entries(preference.channels).map(([channel, enabled]) => (
                                <div key={channel} className="flex items-center space-x-2">
                                  <Switch
                                    checked={enabled}
                                    onCheckedChange={(checked) => 
                                      handleChannelToggle(category.id, channel, checked)
                                    }
                                    disabled={updatePreference.isPending}
                                  />
                                  <div className="flex items-center space-x-1">
                                    {getChannelIcon(channel)}
                                    <span className="text-sm capitalize">{channel}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Frequency */}
                          <div>
                            <Label className="text-sm font-medium">Frequency</Label>
                            <Select
                              value={preference.frequency}
                              onValueChange={(frequency) => 
                                updatePreference.mutate({ 
                                  category: category.id, 
                                  frequency 
                                })
                              }
                            >
                              <SelectTrigger className="w-48 mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="immediate">Immediate</SelectItem>
                                <SelectItem value="hourly">Hourly Digest</SelectItem>
                                <SelectItem value="daily">Daily Digest</SelectItem>
                                <SelectItem value="weekly">Weekly Digest</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Quiet Hours */}
                          <div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={preference.quietHours.enabled}
                                onCheckedChange={(enabled) => 
                                  handleQuietHoursUpdate(category.id, {
                                    ...preference.quietHours,
                                    enabled
                                  })
                                }
                              />
                              <Label className="text-sm font-medium">
                                <Clock className="h-4 w-4 inline mr-1" />
                                Quiet Hours
                              </Label>
                            </div>

                            {preference.quietHours.enabled && (
                              <div className="mt-2 flex items-center space-x-2">
                                <Input
                                  type="time"
                                  value={preference.quietHours.start}
                                  onChange={(e) => 
                                    handleQuietHoursUpdate(category.id, {
                                      ...preference.quietHours,
                                      start: e.target.value
                                    })
                                  }
                                  className="w-32"
                                />
                                <span className="text-sm text-muted-foreground">to</span>
                                <Input
                                  type="time"
                                  value={preference.quietHours.end}
                                  onChange={(e) => 
                                    handleQuietHoursUpdate(category.id, {
                                      ...preference.quietHours,
                                      end: e.target.value
                                    })
                                  }
                                  className="w-32"
                                />
                                <Select
                                  value={preference.quietHours.timezone}
                                  onValueChange={(timezone) => 
                                    handleQuietHoursUpdate(category.id, {
                                      ...preference.quietHours,
                                      timezone
                                    })
                                  }
                                >
                                  <SelectTrigger className="w-40">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="UTC">UTC</SelectItem>
                                    <SelectItem value="America/New_York">Eastern</SelectItem>
                                    <SelectItem value="America/Chicago">Central</SelectItem>
                                    <SelectItem value="America/Denver">Mountain</SelectItem>
                                    <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                                    <SelectItem value="Europe/London">London</SelectItem>
                                    <SelectItem value="Europe/Paris">Paris</SelectItem>
                                    <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <Separator />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Channel Testing */}
        <TabsContent value="channels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Notification Channels</CardTitle>
              <CardDescription>
                Send test notifications to verify your delivery channels are working
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Button
                  onClick={() => testNotification.mutate(['email'])}
                  disabled={testNotification.isPending}
                  variant="outline"
                  className="flex flex-col items-center p-6 h-auto"
                >
                  <Mail className="h-8 w-8 mb-2" />
                  <span>Test Email</span>
                </Button>

                <Button
                  onClick={() => testNotification.mutate(['sms'])}
                  disabled={testNotification.isPending}
                  variant="outline"
                  className="flex flex-col items-center p-6 h-auto"
                >
                  <MessageSquare className="h-8 w-8 mb-2" />
                  <span>Test SMS</span>
                </Button>

                <Button
                  onClick={() => testNotification.mutate(['push'])}
                  disabled={testNotification.isPending}
                  variant="outline"
                  className="flex flex-col items-center p-6 h-auto"
                >
                  <Smartphone className="h-8 w-8 mb-2" />
                  <span>Test Push</span>
                </Button>

                <Button
                  onClick={() => testNotification.mutate(['webhook'])}
                  disabled={testNotification.isPending}
                  variant="outline"
                  className="flex flex-col items-center p-6 h-auto"
                >
                  <Webhook className="h-8 w-8 mb-2" />
                  <span>Test Webhook</span>
                </Button>

                <Button
                  onClick={() => testNotification.mutate(['email', 'sms', 'push', 'webhook'])}
                  disabled={testNotification.isPending}
                  className="flex flex-col items-center p-6 h-auto"
                >
                  <Send className="h-8 w-8 mb-2" />
                  <span>Test All</span>
                </Button>
              </div>

              <Alert>
                <Bell className="h-4 w-4" />
                <AlertDescription>
                  Test notifications help you verify that your delivery channels are properly configured.
                  Make sure you have set up the appropriate credentials for each channel.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Configuration */}
        {configs && (
          <TabsContent value="admin" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Configuration</CardTitle>
                <CardDescription>
                  Configure notification delivery channels for your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* SMS Configuration */}
                <div>
                  <h3 className="font-medium mb-3 flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    SMS Configuration
                  </h3>
                  {configs.sms.length > 0 ? (
                    <div className="space-y-2">
                      {configs.sms.map((config, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <span className="font-medium capitalize">{config.provider}</span>
                            <Badge variant={config.isActive ? "default" : "secondary"} className="ml-2">
                              {config.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <Button size="sm" variant="outline">
                            Configure
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No SMS provider configured</p>
                      <Button className="mt-2" variant="outline">
                        Add SMS Provider
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Push Configuration */}
                <div>
                  <h3 className="font-medium mb-3 flex items-center">
                    <Smartphone className="h-4 w-4 mr-2" />
                    Push Notification Configuration
                  </h3>
                  {configs.push.length > 0 ? (
                    <div className="space-y-2">
                      {configs.push.map((config, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <span className="font-medium capitalize">{config.provider}</span>
                            <Badge variant="secondary" className="ml-2">{config.platform}</Badge>
                            <Badge variant={config.isActive ? "default" : "secondary"} className="ml-2">
                              {config.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <Button size="sm" variant="outline">
                            Configure
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No push notification provider configured</p>
                      <Button className="mt-2" variant="outline">
                        Add Push Provider
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Webhook Configuration */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium flex items-center">
                      <Webhook className="h-4 w-4 mr-2" />
                      Webhook Configuration
                    </h3>
                    <Button 
                      onClick={() => setShowAddWebhook(true)}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Webhook
                    </Button>
                  </div>

                  {configs.webhook.length > 0 ? (
                    <div className="space-y-2">
                      {configs.webhook.map((webhook, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <span className="font-medium">{webhook.name}</span>
                            <p className="text-sm text-muted-foreground">{webhook.url}</p>
                            <div className="flex gap-1 mt-1">
                              {webhook.events.slice(0, 3).map((event: string) => (
                                <Badge key={event} variant="outline" className="text-xs">
                                  {event}
                                </Badge>
                              ))}
                              {webhook.events.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{webhook.events.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={webhook.isActive ? "default" : "secondary"}>
                              {webhook.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <Button size="sm" variant="outline">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No webhooks configured</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Add Webhook Dialog */}
      <Dialog open={showAddWebhook} onOpenChange={setShowAddWebhook}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Webhook</DialogTitle>
            <DialogDescription>
              Configure a webhook endpoint to receive notifications
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="webhook-name">Name</Label>
              <Input
                id="webhook-name"
                placeholder="Webhook name"
                value={webhookForm.name}
                onChange={(e) => setWebhookForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="webhook-url">URL</Label>
              <Input
                id="webhook-url"
                placeholder="https://your-app.com/webhooks/notifications"
                value={webhookForm.url}
                onChange={(e) => setWebhookForm(prev => ({ ...prev, url: e.target.value }))}
              />
            </div>

            <div>
              <Label>Events</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {eventTypes.map((event) => (
                  <div key={event} className="flex items-center space-x-2">
                    <Switch
                      checked={webhookForm.events.includes(event)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setWebhookForm(prev => ({ 
                            ...prev, 
                            events: [...prev.events, event] 
                          }));
                        } else {
                          setWebhookForm(prev => ({ 
                            ...prev, 
                            events: prev.events.filter(e => e !== event) 
                          }));
                        }
                      }}
                    />
                    <span className="text-sm">{event}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="webhook-secret">Secret (Optional)</Label>
              <Input
                id="webhook-secret"
                placeholder="HMAC secret for verification"
                value={webhookForm.secret}
                onChange={(e) => setWebhookForm(prev => ({ ...prev, secret: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setShowAddWebhook(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddWebhook}
                disabled={configureWebhook.isPending}
                className="flex-1"
              >
                {configureWebhook.isPending ? "Adding..." : "Add Webhook"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
