import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import type { Visitor } from '@/types/database';

interface EventRequest {
  id: string;
  organiser_id: string;
  department: string;
  event_name: string;
  event_description: string;
  date_from: string;
  date_to: string;
  expected_students: number;
  max_capacity: number;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_id?: string;
}

export default function CSODashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isApprovingEvent, setIsApprovingEvent] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectionReason, setRejectionReason] = useState<{ [key: string]: string }>({});
  const [activeTab, setActiveTab] = useState<'events' | 'visitors'>('events');
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login?role=cso');
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'cso') {
      router.push('/');
      return;
    }
    setUser(parsedUser);
    fetchVisitors();
    fetchEventRequests();
    fetchNotifications(parsedUser.id);
  }, [router]);

  const fetchEventRequests = async () => {
    try {
      // CSO needs to fetch ALL event requests, not filtered by organiser
      const { data: requests, error } = await supabase
        .from('event_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[CSO] Error fetching event requests:', error);
      } else {
        setEventRequests(requests || []);
        console.log('[CSO] Fetched event requests:', requests?.length || 0);
      }
    } catch (error) {
      console.error('[CSO] Error fetching event requests:', error);
    }
  };

  const fetchNotifications = async (userId: string) => {
    try {
      const response = await fetch(`/api/cso/notifications?user_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchVisitors = async () => {
    try {
      const response = await fetch('/api/visitors');
      const data = await response.json();
      setVisitors(data.visitors || []);
    } catch (error) {
      console.error('Error fetching visitors:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (visitorId: string, status: 'approved' | 'revoked') => {
    try {
      const response = await fetch('/api/updateStatus', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          visitor_id: visitorId,
          status,
        }),
      });

      if (response.ok) {
        fetchVisitors();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleApproveEvent = async (requestId: string, approve: boolean) => {
    setIsApprovingEvent(requestId);
    try {
      const response = await fetch('/api/cso/approve-event', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request_id: requestId,
          status: approve ? 'approved' : 'rejected',
          rejection_reason: approve ? null : rejectionReason[requestId],
          approved_by: user.id,
        }),
      });

      if (response.ok) {
        // Mark related notification as read
        await markNotificationAsRead(requestId);
        
        fetchEventRequests();
        fetchNotifications(user.id);
        setRejectionReason(prev => {
          const newState = { ...prev };
          delete newState[requestId];
          return newState;
        });
      }
    } catch (error) {
      console.error('Error approving/rejecting event:', error);
    } finally {
      setIsApprovingEvent(null);
    }
  };

  const markNotificationAsRead = async (relatedId: string) => {
    try {
      // Find notification related to this event request
      const notification = notifications.find(n => n.related_id === relatedId);
      if (notification) {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notification.id);
        
        if (error) {
          console.error('[CSO] Error marking notification as read:', error);
        }
      }
    } catch (error) {
      console.error('[CSO] Error marking notification as read:', error);
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Event', 'Date', 'Status', 'Created'];
    const rows = visitors.map(v => [
      v.name,
      v.email || '',
      v.phone || '',
      v.event_name || '',
      (v.date_of_visit && v.date_of_visit !== '') 
        ? new Date(v.date_of_visit).toLocaleDateString() 
        : (v.date_of_visit_from && v.date_of_visit_to) 
          ? `${new Date(v.date_of_visit_from).toLocaleDateString()} - ${new Date(v.date_of_visit_to).toLocaleDateString()}` 
          : 'N/A',
      v.status,
      new Date(v.created_at).toLocaleString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visitors-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (!user) {
    return null;
  }

  const stats = {
    total: visitors.length,
    pending: visitors.filter(v => v.status === 'pending').length,
    approved: visitors.filter(v => v.status === 'approved').length,
    revoked: visitors.filter(v => v.status === 'revoked').length,
  };

  const eventRequestStats = {
    pending: eventRequests.filter(r => r.status === 'pending').length,
    approved: eventRequests.filter(r => r.status === 'approved').length,
    rejected: eventRequests.filter(r => r.status === 'rejected').length,
  };

  // Count actual pending requests, not unread notifications
  const pendingRequestsCount = eventRequestStats.pending;

  // Event analytics
  const eventStats = visitors.reduce((acc, v) => {
    if (v.event_name) {
      acc[v.event_name] = (acc[v.event_name] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const topEvents = Object.entries(eventStats)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const filteredVisitors = visitors.filter(v => {
    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.event_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEvent = !selectedEventFilter || v.event_name === selectedEventFilter;
    
    return matchesSearch && matchesEvent;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-3 sm:py-4 md:py-6 px-3 sm:px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-3 sm:mb-4">
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-primary-600 mb-1 flex items-center space-x-2">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="text-sm sm:text-base md:text-lg">CSO Dashboard</span>
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm">
            Welcome, <strong>{user.username}</strong> | Oversight & Analytics
            {pendingRequestsCount > 0 && (
              <span className="ml-2 sm:ml-3 inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold bg-red-100 text-red-700">
                {pendingRequestsCount} pending event request{pendingRequestsCount !== 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-4 sm:mb-6 overflow-x-auto">
          <div className="flex space-x-1 sm:space-x-2 border-b border-gray-200 min-w-max">
            <button
              onClick={() => setActiveTab('events')}
              className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 font-semibold transition relative text-sm sm:text-base whitespace-nowrap ${
                activeTab === 'events'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Event Approvals
              {pendingRequestsCount > 0 && (
                <span className="ml-1 sm:ml-2 inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-500 text-white text-xs font-bold">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('visitors')}
              className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 font-semibold transition text-sm sm:text-base whitespace-nowrap ${
                activeTab === 'visitors'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Visitor Management
            </button>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white p-2 sm:p-3"
          >
            <h3 className="text-xs opacity-90 mb-0.5">Total Visitors</h3>
            <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-2 sm:p-3"
          >
            <h3 className="text-xs opacity-90 mb-0.5">Pending</h3>
            <p className="text-xl sm:text-2xl font-bold">{stats.pending}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card bg-gradient-to-br from-green-500 to-green-600 text-white p-2 sm:p-3"
          >
            <h3 className="text-xs opacity-90 mb-0.5">Approved</h3>
            <p className="text-xl sm:text-2xl font-bold">{stats.approved}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card bg-gradient-to-br from-red-500 to-red-600 text-white p-2 sm:p-3"
          >
            <h3 className="text-xs opacity-90 mb-0.5">Revoked</h3>
            <p className="text-xl sm:text-2xl font-bold">{stats.revoked}</p>
          </motion.div>
        </div>

        {/* Event Approval Section */}
        {activeTab === 'events' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="card">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">Pending Event Requests</h3>
              
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading requests...</p>
                </div>
              ) : eventRequests.filter(r => r.status === 'pending').length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg">No pending event requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {eventRequests
                    .filter(r => r.status === 'pending')
                    .map((request) => (
                      <div
                        key={request.id}
                        className="border-2 border-yellow-200 bg-yellow-50 rounded-lg p-6"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="text-xl font-bold text-gray-800">{request.event_name}</h4>
                            <p className="text-sm text-gray-600">{request.department}</p>
                          </div>
                          <span className="px-4 py-2 rounded-full text-sm font-bold bg-yellow-600 text-white">
                            PENDING
                          </span>
                        </div>

                        {request.event_description && (
                          <p className="text-gray-700 mb-4">{request.event_description}</p>
                        )}

                        <div className="grid md:grid-cols-2 gap-4 text-sm mb-6">
                          <div className="flex items-center space-x-2">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-gray-700">
                              <strong>Dates:</strong> {new Date(request.date_from).toLocaleDateString()} - {new Date(request.date_to).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="text-gray-700">
                              <strong>Expected:</strong> {request.expected_students} students
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span className="text-gray-700">
                              <strong>Capacity:</strong> {request.max_capacity}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-gray-700">
                              <strong>Submitted:</strong> {new Date(request.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="border-t border-yellow-300 pt-4">
                          <div className="flex flex-col md:flex-row md:items-end gap-4">
                            <div className="flex-1">
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Rejection Reason (optional if rejecting)
                              </label>
                              <input
                                type="text"
                                value={rejectionReason[request.id] || ''}
                                onChange={(e) => setRejectionReason(prev => ({ ...prev, [request.id]: e.target.value }))}
                                placeholder="Enter reason for rejection..."
                                className="input-field"
                              />
                            </div>
                            <div className="flex space-x-3">
                              <button
                                onClick={() => handleApproveEvent(request.id, false)}
                                disabled={isApprovingEvent === request.id || !rejectionReason[request.id]}
                                className="btn-secondary bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isApprovingEvent === request.id ? 'Processing...' : 'Reject'}
                              </button>
                              <button
                                onClick={() => handleApproveEvent(request.id, true)}
                                disabled={isApprovingEvent === request.id}
                                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isApprovingEvent === request.id ? 'Processing...' : 'Approve Event'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Approved/Rejected History */}
            <div className="card">
              <h3 className="text-xl font-semibold text-gray-800 mb-6">Event Request History</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {eventRequests
                  .filter(r => r.status !== 'pending')
                  .map((request) => (
                    <div
                      key={request.id}
                      className={`border-2 rounded-lg p-4 ${
                        request.status === 'approved'
                          ? 'border-green-200 bg-green-50'
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-gray-800">{request.event_name}</h4>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            request.status === 'approved'
                              ? 'bg-green-600 text-white'
                              : 'bg-red-600 text-white'
                          }`}
                        >
                          {request.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{request.department}</p>
                      <p className="text-sm text-gray-700 mt-2">
                        {new Date(request.date_from).toLocaleDateString()} - {new Date(request.date_to).toLocaleDateString()}
                      </p>
                      {request.status === 'rejected' && request.rejection_reason && (
                        <p className="text-sm text-red-600 mt-2">
                          <strong>Reason:</strong> {request.rejection_reason}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Visitor Management Section */}
        {activeTab === 'visitors' && (
          <>
            {/* Top Events */}
            <div className="card mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 flex items-center space-x-2">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Top Events by Visitor Count</span>
          </h3>
          {topEvents.length > 0 ? (
            <div className="space-y-2">
              {topEvents.map(([event, count], index) => (
                <button
                  key={event}
                  onClick={() => {
                    setSelectedEventFilter(event);
                    setActiveTab('visitors');
                  }}
                  className="w-full flex items-center justify-between py-1 hover:bg-gray-100 px-2 rounded transition cursor-pointer"
                >
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-maroon-600 text-white rounded-full flex items-center justify-center text-xs sm:text-sm font-bold">
                      {index + 1}
                    </div>
                    <span className="font-medium text-sm sm:text-base text-gray-800">{event}</span>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-600">{count} visitors</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No event data available</p>
          )}
        </div>

        {/* Search and Export */}
        <div className="card mb-4 sm:mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 gap-3">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search by name, email, or event..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
              />
            </div>
            {selectedEventFilter && (
              <div className="flex items-center space-x-2 bg-primary-100 text-primary-800 px-3 py-2 rounded-lg">
                <span className="text-sm font-medium">Filtered by: {selectedEventFilter}</span>
                <button
                  onClick={() => setSelectedEventFilter('')}
                  className="text-primary-600 hover:text-primary-800 font-bold"
                >
                  ✕
                </button>
              </div>
            )}
            <button
              onClick={() => {
                setIsLoading(true);
                fetchVisitors();
              }}
              className="btn-secondary whitespace-nowrap flex items-center space-x-2"
              title="Refresh visitor data"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
            <button
              onClick={exportToCSV}
              className="btn-secondary whitespace-nowrap flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export to CSV</span>
            </button>
          </div>
        </div>

        {/* All Visitors Table */}
        <div className="card overflow-x-auto">
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
            All Visitor Records ({filteredVisitors.length})
          </h3>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-maroon-600 mx-auto"></div>
            </div>
          ) : filteredVisitors.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No visitors found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Name</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Event</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Verified By</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Verified At</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Contact</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Visit Date</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Status</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVisitors.map((visitor) => (
                    <tr key={visitor.id} className="border-t hover:bg-gray-50">
                      <td className="px-2 py-2">
                        <div className="font-medium text-gray-800 text-sm">{visitor.name}</div>
                        {visitor.register_number && (
                          <div className="text-xs text-gray-500">ID: {visitor.register_number}</div>
                        )}
                      </td>
                      <td className="px-2 py-2 text-gray-700 text-sm max-w-[150px] truncate">{visitor.event_name || 'N/A'}</td>
                      <td className="px-2 py-2">
                        {visitor.verified_by ? (
                          <div className="flex items-center space-x-1">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium text-gray-700">{visitor.verified_by}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Not verified</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-xs text-gray-600 whitespace-nowrap">
                        {visitor.verified_at 
                          ? new Date(visitor.verified_at).toLocaleString('en-IN', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric',
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })
                          : '-'}
                      </td>
                      <td className="px-2 py-2">
                        <div className="text-xs text-gray-600">
                          {visitor.email && <div className="truncate max-w-[150px]">{visitor.email}</div>}
                          {visitor.phone && <div>{visitor.phone}</div>}
                          {!visitor.email && !visitor.phone && <span className="text-gray-400">N/A</span>}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-gray-700 text-xs whitespace-nowrap">
                        {(visitor.date_of_visit && visitor.date_of_visit !== '') 
                          ? new Date(visitor.date_of_visit).toLocaleDateString() 
                          : (visitor.date_of_visit_from && visitor.date_of_visit_to) 
                            ? `${new Date(visitor.date_of_visit_from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${new Date(visitor.date_of_visit_to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` 
                            : 'N/A'}
                      </td>
                      <td className="px-2 py-2">
                        <span className={`badge-${visitor.status} text-xs px-2 py-1`}>
                          {visitor.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex space-x-1">
                          {visitor.status !== 'approved' && (
                            <button
                              onClick={() => updateStatus(visitor.id, 'approved')}
                              className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                              title="Approve"
                            >
                              ✓
                            </button>
                          )}
                          {visitor.status !== 'revoked' && (
                            <button
                              onClick={() => updateStatus(visitor.id, 'revoked')}
                              className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                              title="Revoke"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
