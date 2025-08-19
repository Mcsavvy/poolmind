import { useState, useCallback, useEffect, useRef } from 'react';
import { useClient } from './api';

// Types based on the OpenAPI spec
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationFilters {
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  types?: string[];
  unreadOnly?: boolean;
  offset?: number;
  limit?: number;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  offset: number;
  limit: number;
}

export interface UnreadCountResponse {
  count: number;
}

export interface BulkActionRequest {
  action: 'markRead' | 'delete';
  notificationIds: string[];
}

// Hook for fetching notifications
export function useNotifications(filters: NotificationFilters = {}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const client = useClient();
  const clientRef = useRef(client);

  // Update ref when client changes
  useEffect(() => {
    clientRef.current = client;
  }, [client]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.types) filters.types.forEach(type => params.append('types', type));
      if (filters.unreadOnly !== undefined) params.append('unreadOnly', filters.unreadOnly.toString());
      if (filters.offset !== undefined) params.append('offset', filters.offset.toString());
      if (filters.limit !== undefined) params.append('limit', filters.limit.toString());

      const response = await clientRef.current.get<NotificationsResponse>(`/notifications/in-app?${params.toString()}`);
      
      setNotifications(response.data.notifications);
      setTotal(response.data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [filters]); // Remove client dependency to prevent infinite loops

  return {
    notifications,
    loading,
    error,
    total,
    fetchNotifications,
    refetch: fetchNotifications
  };
}

// Hook for getting unread count
export function useUnreadCount(types?: string[]) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = useClient();

  const fetchUnreadCount = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (types) types.forEach(type => params.append('types', type));

      const response = await client.get<UnreadCountResponse>(`/notifications/in-app/unread-count?${params.toString()}`);
      setCount(response.data.count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch unread count');
    } finally {
      setLoading(false);
    }
  }, [types]); // Remove client dependency

  return {
    count,
    loading,
    error,
    fetchUnreadCount,
    refetch: fetchUnreadCount
  };
}

// Hook for marking notification as read
export function useMarkAsRead() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = useClient();
  const clientRef = useRef(client);

  // Update ref when client changes
  useEffect(() => {
    clientRef.current = client;
  }, [client]);

  const markAsRead = useCallback(async (notificationId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await clientRef.current.put(`/notifications/in-app/${notificationId}/read`);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
      return false;
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed

  return {
    markAsRead,
    loading,
    error
  };
}

// Hook for deleting notification
export function useDeleteNotification() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = useClient();
  const clientRef = useRef(client);

  // Update ref when client changes
  useEffect(() => {
    clientRef.current = client;
  }, [client]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await clientRef.current.delete(`/notifications/in-app/${notificationId}`);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete notification');
      return false;
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed

  return {
    deleteNotification,
    loading,
    error
  };
}

// Hook for bulk actions
export function useBulkActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = useClient();
  const clientRef = useRef(client);

  // Update ref when client changes
  useEffect(() => {
    clientRef.current = client;
  }, [client]);

  const performBulkAction = useCallback(async (action: 'markRead' | 'delete', notificationIds: string[]) => {
    setLoading(true);
    setError(null);
    
    try {
      const payload: BulkActionRequest = {
        action,
        notificationIds
      };
      
      await clientRef.current.put('/notifications/in-app/bulk-action', payload);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to perform bulk action');
      return false;
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed

  return {
    performBulkAction,
    loading,
    error
  };
}

// Hook for creating notifications (Admin/Moderator only)
export function useCreateNotification() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const client = useClient();
  const clientRef = useRef(client);

  // Update ref when client changes
  useEffect(() => {
    clientRef.current = client;
  }, [client]);

  const createNotification = useCallback(async (notificationData: Partial<Notification>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await clientRef.current.post('/notifications/in-app', notificationData);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create notification');
      return null;
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies needed

  return {
    createNotification,
    loading,
    error
  };
}

// Combined hook for common notification operations
export function useNotificationManager() {
  const { notifications, loading: fetchLoading, error: fetchError, fetchNotifications, refetch } = useNotifications();
  const { count: unreadCount, loading: countLoading, fetchUnreadCount } = useUnreadCount();
  const { markAsRead, loading: markLoading, error: markError } = useMarkAsRead();
  const { deleteNotification, loading: deleteLoading, error: deleteError } = useDeleteNotification();
  const { performBulkAction, loading: bulkLoading, error: bulkError } = useBulkActions();

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    const success = await markAsRead(notificationId);
    if (success) {
      // Refresh notifications and unread count
      await Promise.all([refetch(), fetchUnreadCount()]);
    }
    return success;
  }, [markAsRead, refetch, fetchUnreadCount]);

  const handleDelete = useCallback(async (notificationId: string) => {
    const success = await deleteNotification(notificationId);
    if (success) {
      // Refresh notifications and unread count
      await Promise.all([refetch(), fetchUnreadCount()]);
    }
    return success;
  }, [deleteNotification, refetch, fetchUnreadCount]);

  const handleBulkAction = useCallback(async (action: 'markRead' | 'delete', notificationIds: string[]) => {
    const success = await performBulkAction(action, notificationIds);
    if (success) {
      // Refresh notifications and unread count
      await Promise.all([refetch(), fetchUnreadCount()]);
    }
    return success;
  }, [performBulkAction, refetch, fetchUnreadCount]);

  return {
    // Data
    notifications,
    unreadCount,
    
    // Loading states
    loading: fetchLoading || countLoading || markLoading || deleteLoading || bulkLoading,
    
    // Errors
    error: fetchError || countLoading || markError || deleteError || bulkError,
    
    // Actions
    fetchNotifications,
    handleMarkAsRead,
    handleDelete,
    handleBulkAction,
    refetch,
    fetchUnreadCount
  };
} 
