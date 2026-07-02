import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Settings,
  Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default function GoogleCalendarStatus({ 
  connection, 
  onConnect, 
  onSync, 
  isSyncing,
  isConnecting 
}) {
  if (!connection) {
    return (
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
            <img 
              src="https://www.google.com/favicon.ico" 
              alt="Google" 
              className="w-6 h-6"
            />
          </div>
          <span className="text-sm font-medium text-slate-700">Google Calendar לא מחובר</span>
        </div>
        <Button 
          size="sm" 
          onClick={onConnect}
          disabled={isConnecting}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-200"
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 ml-1 animate-spin" />
              מתחבר...
            </>
          ) : (
            'חבר עכשיו'
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-sm">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-green-800 truncate">
              {connection.connected_email}
            </span>
            <Badge variant="outline" className="bg-white text-xs">
              מחובר
            </Badge>
          </div>
          {connection.last_sync_at && (
            <p className="text-xs text-green-600 mt-0.5">
              סונכרן לאחרונה: {format(new Date(connection.last_sync_at), 'HH:mm dd/MM', { locale: he })}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8"
          onClick={onSync}
          disabled={isSyncing}
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
        </Button>
        <Link to={createPageUrl("Settings")}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}