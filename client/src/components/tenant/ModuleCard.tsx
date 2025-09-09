import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Power, PowerOff, Cog, ExternalLink, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Module {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  category: 'core' | 'identity' | 'monitoring' | 'integration';
  required: boolean;
  status: 'enabled' | 'disabled' | 'configuring' | 'error';
  config?: any;
  lastUpdated?: string;
  version?: string;
}

interface ModuleCardProps {
  module: Module;
  isEnabled: boolean;
  isLoading?: boolean;
  onToggle: (moduleId: string, enabled: boolean) => Promise<void>;
  onConfigure: (moduleId: string) => void;
  onViewDocs?: (moduleId: string) => void;
}

export function ModuleCard({ 
  module, 
  isEnabled, 
  isLoading = false,
  onToggle, 
  onConfigure,
  onViewDocs 
}: ModuleCardProps) {
  const { toast } = useToast();
  const Icon = module.icon;

  const handleToggle = async () => {
    try {
      await onToggle(module.id, !isEnabled);
      toast({
        title: isEnabled ? "Module Disabled" : "Module Enabled",
        description: `${module.name} has been ${isEnabled ? 'disabled' : 'enabled'} successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Operation Failed",
        description: error.message || `Failed to ${isEnabled ? 'disable' : 'enable'} ${module.name}`,
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = () => {
    switch (module.status) {
      case 'enabled':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'configuring':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-slate-400" />;
    }
  };

  const getStatusText = () => {
    switch (module.status) {
      case 'enabled':
        return 'Active';
      case 'configuring':
        return 'Configuring';
      case 'error':
        return 'Error';
      default:
        return 'Disabled';
    }
  };

  const getCardStyles = () => {
    if (module.status === 'error') {
      return 'border-red-300 shadow-red-100 bg-gradient-to-br from-red-50/50 to-white';
    }
    if (isEnabled) {
      return 'border-green-300 shadow-green-100 bg-gradient-to-br from-green-50/50 to-white';
    }
    return 'border-slate-200/50 shadow-sm hover:border-slate-300 hover:shadow-md';
  };

  const getIconStyles = () => {
    if (module.status === 'error') {
      return 'bg-gradient-to-br from-red-500 to-red-600 text-white';
    }
    if (isEnabled) {
      return 'bg-gradient-to-br from-green-500 to-green-600 text-white';
    }
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <Card className={`bg-white/80 backdrop-blur-sm border transition-all duration-300 ${getCardStyles()}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getIconStyles()}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base font-semibold">{module.name}</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                {module.required && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    Required
                  </Badge>
                )}
                {module.version && (
                  <Badge variant="secondary" className="text-xs">
                    v{module.version}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <div className="text-right">
              <div className={`text-xs font-medium ${
                module.status === 'enabled' ? 'text-green-600' : 
                module.status === 'error' ? 'text-red-600' :
                module.status === 'configuring' ? 'text-yellow-600' :
                'text-slate-600'
              }`}>
                {getStatusText()}
              </div>
              {module.lastUpdated && (
                <div className="text-xs text-slate-500">
                  {new Date(module.lastUpdated).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600 leading-relaxed">{module.description}</p>
        
        {/* Configuration Status */}
        {isEnabled && module.config && (
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">Configuration</span>
              <Badge variant="outline" className="text-xs">
                {Object.keys(module.config).length} settings
              </Badge>
            </div>
          </div>
        )}

        {/* Error Message */}
        {module.status === 'error' && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-xs text-red-700">
              Module configuration error. Please check settings and try again.
            </p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center space-x-3">
            {!module.required && (
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => handleToggle()}
                  disabled={isLoading || module.status === 'configuring'}
                />
                <span className="text-sm text-slate-600">
                  {isEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            )}
            
            {module.required && (
              <Badge variant="outline" className="px-3 py-1">
                Always Enabled
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {onViewDocs && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDocs(module.id)}
                className="text-slate-600 hover:text-slate-800"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            )}
            
            {(isEnabled || module.required) && (
              <Button
                size="sm"
                onClick={() => onConfigure(module.id)}
                disabled={isLoading || module.status === 'configuring'}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                <Cog className="w-4 h-4 mr-1" />
                Configure
              </Button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
            <span className="ml-2 text-sm text-slate-600">Processing...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ModuleCard;
