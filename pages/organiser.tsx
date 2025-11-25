import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import QRGenerator from '@/components/QRGenerator';

interface EventRequest {
  id: string;
  department: string;
  event_name: string;
  event_description: string;
  date_from: string;
  date_to: string;
  expected_students: number;
  max_capacity: number;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  approved_at?: string;
  created_at: string;
}

export default function OrganiserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [eventRequests, setEventRequests] = useState<EventRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'events' | 'bulk-qr'>('events');
  const [generatedVisitors, setGeneratedVisitors] = useState<any[]>([]);
  const [currentVisitorIndex, setCurrentVisitorIndex] = useState(0);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  // Form state for event request
  const [formData, setFormData] = useState({
    department: '',
    event_name: '',
    event_description: '',
    date_from: '',
    date_to: '',
    expected_students: '',
    max_capacity: '',
  });

  // Bulk QR form state
  const [bulkFormData, setBulkFormData] = useState({
    event_id: '',
    visitors: [{ name: '', email: '', phone: '', category: 'speaker' as 'speaker' | 'vip' }],
  });

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login?role=organiser');
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'organiser') {
      router.push('/');
      return;
    }
    setUser(parsedUser);
    fetchEventRequests(parsedUser.id);
  }, [router]);

  const fetchEventRequests = async (organiserId: string) => {
    try {
      const response = await fetch(`/api/event-requests?organiser_id=${organiserId}`);
      const data = await response.json();
      setEventRequests(data.requests || []);
    } catch (error) {
      console.error('Error fetching event requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/event-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organiser_id: user.id,
          ...formData,
          expected_students: parseInt(formData.expected_students),
          max_capacity: parseInt(formData.max_capacity),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Event request submitted successfully! CSO will review it.');
        setShowForm(false);
        setFormData({
          department: '',
          event_name: '',
          event_description: '',
          date_from: '',
          date_to: '',
          expected_students: '',
          max_capacity: '',
        });
        fetchEventRequests(user.id);
      } else {
        setErrorMessage(data.error || 'Failed to submit event request');
      }
    } catch (error) {
      setErrorMessage('An error occurred. Please try again.');
      console.error('Error submitting event request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addVisitorRow = () => {
    setBulkFormData(prev => ({
      ...prev,
      visitors: [...prev.visitors, { name: '', email: '', phone: '', category: 'speaker' }]
    }));
  };

  const removeVisitorRow = (index: number) => {
    setBulkFormData(prev => ({
      ...prev,
      visitors: prev.visitors.filter((_, i) => i !== index)
    }));
  };

  const handleBulkVisitorChange = (index: number, field: string, value: string) => {
    setBulkFormData(prev => ({
      ...prev,
      visitors: prev.visitors.map((v, i) => 
        i === index ? { ...v, [field]: value } : v
      )
    }));
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    setGeneratedVisitors([]);

    const selectedEvent = eventRequests.find(e => e.id === bulkFormData.event_id);
    if (!selectedEvent) {
      console.error('[BULK QR] Selected event ID:', bulkFormData.event_id);
      console.error('[BULK QR] Available events:', eventRequests.map(e => ({ id: e.id, name: e.event_name })));
      setErrorMessage('Please select a valid approved event');
      setIsSubmitting(false);
      return;
    }

    console.log('[BULK QR] Selected event:', {
      id: selectedEvent.id,
      name: selectedEvent.event_name,
      date_from: selectedEvent.date_from,
      date_to: selectedEvent.date_to
    });

    // Validate at least one visitor with name
    const validVisitors = bulkFormData.visitors.filter(v => v.name.trim());
    if (validVisitors.length === 0) {
      setErrorMessage('Please add at least one visitor with a name');
      setIsSubmitting(false);
      return;
    }

    try {
      const results = [];
      const errors = [];

      console.log(`[BULK QR] Starting bulk registration for ${validVisitors.length} visitors...`);
      setBulkProgress({ current: 0, total: validVisitors.length });

      for (let i = 0; i < validVisitors.length; i++) {
        const visitor = validVisitors[i];
        setBulkProgress({ current: i + 1, total: validVisitors.length });
        console.log(`[BULK QR] Registering visitor ${i + 1}/${validVisitors.length}:`, visitor.name);

        try {
          const payload = {
            name: visitor.name,
            email: visitor.email || '',
            phone: visitor.phone || '',
            event_id: bulkFormData.event_id,
            event_name: selectedEvent.event_name,
            date_of_visit_from: selectedEvent.date_from,
            date_of_visit_to: selectedEvent.date_to,
            visitor_category: visitor.category,
            purpose: `${visitor.category === 'speaker' ? 'Speaker' : 'VIP Guest'} for ${selectedEvent.event_name}`,
          };
          
          console.log(`[BULK QR] Payload for ${visitor.name}:`, payload);
          
          const response = await fetch('/api/registerVisitor', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          const data = await response.json();
          
          if (response.ok && data.visitor) {
            console.log(`[BULK QR] ✓ Registered:`, data.visitor.id);
            results.push(data.visitor);
          } else {
            console.error(`[BULK QR] ✗ Failed:`, data.error);
            errors.push(`${visitor.name}: ${data.error || 'Registration failed'}`);
          }
        } catch (fetchError) {
          console.error(`[BULK QR] ✗ Network error for ${visitor.name}:`, fetchError);
          errors.push(`${visitor.name}: Network error`);
        }
      }

      console.log(`[BULK QR] Complete. Success: ${results.length}, Failed: ${errors.length}`);

      if (results.length > 0) {
        setGeneratedVisitors(results);
        setCurrentVisitorIndex(0);
        setSuccessMessage(`Successfully generated ${results.length} QR code(s)!${errors.length > 0 ? ` (${errors.length} failed)` : ''}`);
        
        // Reset form only on success
        setBulkFormData({
          event_id: bulkFormData.event_id, // Keep event selected
          visitors: [{ name: '', email: '', phone: '', category: 'speaker' }]
        });
      } else {
        setErrorMessage(`Failed to register any visitors. ${errors.length > 0 ? errors.join(', ') : 'Please try again.'}`);
      }

      if (errors.length > 0 && results.length > 0) {
        console.warn('[BULK QR] Partial failures:', errors);
      }
    } catch (error) {
      console.error('[BULK QR] Unexpected error:', error);
      setErrorMessage(`An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
      setBulkProgress({ current: 0, total: 0 });
    }
  };

  if (!user) {
    return null;
  }

  const stats = {
    total: eventRequests.length,
    pending: eventRequests.filter(r => r.status === 'pending').length,
    approved: eventRequests.filter(r => r.status === 'approved').length,
    rejected: eventRequests.filter(r => r.status === 'rejected').length,
  };

  const approvedEvents = eventRequests.filter(r => r.status === 'approved');

  // Show QR Generator if there are generated visitors
  if (generatedVisitors.length > 0 && currentVisitorIndex < generatedVisitors.length) {
    const currentVisitor = generatedVisitors[currentVisitorIndex];
    
    return (
      <div className="min-h-screen bg-gray-50 py-4 sm:py-6 md:py-8 px-3 sm:px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="mb-4 text-center">
            <p className="text-sm sm:text-base text-gray-600">
              QR Code {currentVisitorIndex + 1} of {generatedVisitors.length}
            </p>
            <div className="flex justify-center space-x-2 mt-2">
              {generatedVisitors.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 w-2 rounded-full ${
                    idx === currentVisitorIndex ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          
          <QRGenerator
            visitorId={currentVisitor.id}
            visitorName={currentVisitor.name}
          />
          
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setCurrentVisitorIndex(prev => prev - 1)}
              disabled={currentVisitorIndex === 0}
              className="flex-1 btn-secondary disabled:opacity-50"
            >
              ← Previous
            </button>
            <button
              onClick={() => {
                if (currentVisitorIndex < generatedVisitors.length - 1) {
                  setCurrentVisitorIndex(prev => prev + 1);
                } else {
                  setGeneratedVisitors([]);
                  setCurrentVisitorIndex(0);
                  setActiveTab('bulk-qr');
                }
              }}
              className="flex-1 btn-primary"
            >
              {currentVisitorIndex < generatedVisitors.length - 1 ? 'Next →' : 'Done ✓'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-4 sm:py-6 md:py-8 px-3 sm:px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header with Compact Stats */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-600 mb-1 flex items-center space-x-2 sm:space-x-3">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl">Event Organiser</span>
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-gray-600">
                Welcome, <strong>{user.full_name || user.username}</strong>
              </p>
            </div>
            
            {/* Compact Stats Row */}
            <div className="grid grid-cols-3 sm:flex gap-2 sm:gap-3">
              <div className="flex flex-col sm:flex-row items-center sm:space-x-1.5 bg-white px-2 sm:px-3 py-2 rounded-lg shadow-sm border border-gray-200">
                <svg className="w-4 h-4 text-blue-600 mb-1 sm:mb-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="text-center">
                  <p className="text-xs text-gray-500 font-medium">Total</p>
                  <p className="text-lg font-bold text-blue-600">{stats.total}</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center sm:space-x-1.5 bg-white px-2 sm:px-3 py-2 rounded-lg shadow-sm border border-yellow-200">
                <svg className="w-4 h-4 text-yellow-600 animate-pulse mb-1 sm:mb-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-center">
                  <p className="text-xs text-gray-500 font-medium">Pending</p>
                  <p className="text-lg font-bold text-yellow-600">{stats.pending}</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center sm:space-x-1.5 bg-white px-2 sm:px-3 py-2 rounded-lg shadow-sm border border-green-200">
                <svg className="w-4 h-4 text-green-600 mb-1 sm:mb-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-center">
                  <p className="text-xs text-gray-500 font-medium">Approved</p>
                  <p className="text-lg font-bold text-green-600">{stats.approved}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-2 sm:space-x-3 text-sm sm:text-base"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-700">{successMessage}</p>
            </motion.div>
          )}

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 sm:space-x-3 text-sm sm:text-base"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700">{errorMessage}</p>
            </motion.div>
          )}

          {/* Tabs */}
          <div className="overflow-x-auto">
            <div className="flex space-x-1 sm:space-x-2 border-b border-gray-200 min-w-max">
              <button
                onClick={() => setActiveTab('events')}
                className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 font-semibold transition text-sm sm:text-base whitespace-nowrap ${
                  activeTab === 'events'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                📋 Event Requests
              </button>
              <button
                onClick={() => setActiveTab('bulk-qr')}
                className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 font-semibold transition text-sm sm:text-base whitespace-nowrap ${
                  activeTab === 'bulk-qr'
                    ? 'text-primary-600 border-b-2 border-primary-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                🎫 Bulk QR Generator
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content - EVENTS */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            {/* New Event Request Button */}
            <div>
              <button
                onClick={() => setShowForm(!showForm)}
                className="btn-primary flex items-center space-x-2 text-sm sm:text-base"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>{showForm ? 'Cancel' : 'New Event Request'}</span>
              </button>
            </div>

            {/* Event Request Form */}
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="card p-4 sm:p-6"
              >
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-6">Submit New Event Request</h3>
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Department */}
                    <div>
                      <label className="label text-sm sm:text-base">
                        Department <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        required
                        className="input-field text-sm sm:text-base"
                      >
                        <option value="">Select Department</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="Commerce">Commerce</option>
                        <option value="Professional Studies">Professional Studies</option>
                        <option value="Arts and Humanities">Arts and Humanities</option>
                        <option value="Hotel Management">Hotel Management</option>
                        <option value="Business Management">Business Management</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Law">Law</option>
                        <option value="Sciences">Sciences</option>
                        <option value="Education">Education</option>
                        <option value="Social Work">Social Work</option>
                        <option value="Sports Department">Sports Department</option>
                        <option value="CAPS">CAPS (Centre for Academic and Professional Studies)</option>
                        <option value="NCC">NCC (National Cadet Corps)</option>
                        <option value="Dreams">Dreams</option>
                        <option value="Alumni">Alumni Relations</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>

                    {/* Event Name */}
                    <div>
                      <label className="label text-sm sm:text-base">
                        Event Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="event_name"
                        value={formData.event_name}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., Annual Sports Day 2025"
                        className="input-field text-sm sm:text-base"
                      />
                    </div>
                  </div>

                  {/* Event Description */}
                  <div>
                    <label className="label text-sm sm:text-base">
                      Event Description
                    </label>
                    <textarea
                      name="event_description"
                      value={formData.event_description}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder="Brief description of the event..."
                      className="input-field text-sm sm:text-base"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Date From */}
                    <div>
                      <label className="label text-sm sm:text-base">
                        Event Start Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="date_from"
                        value={formData.date_from}
                        onChange={handleInputChange}
                        required
                        min={new Date().toISOString().split('T')[0]}
                        className="input-field text-sm sm:text-base"
                      />
                    </div>

                    {/* Date To */}
                    <div>
                      <label className="label text-sm sm:text-base">
                        Event End Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="date_to"
                        value={formData.date_to}
                        onChange={handleInputChange}
                        required
                        min={formData.date_from || new Date().toISOString().split('T')[0]}
                        className="input-field text-sm sm:text-base"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Expected Students */}
                    <div>
                      <label className="label text-sm sm:text-base">
                        Expected Students <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="expected_students"
                        value={formData.expected_students}
                        onChange={handleInputChange}
                        required
                        min="1"
                        placeholder="e.g., 200"
                        className="input-field text-sm sm:text-base"
                      />
                    </div>

                    {/* Max Capacity */}
                    <div>
                      <label className="label text-sm sm:text-base">
                        Maximum Capacity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="max_capacity"
                        value={formData.max_capacity}
                        onChange={handleInputChange}
                        required
                        min={formData.expected_students || "1"}
                        placeholder="e.g., 250"
                        className="input-field text-sm sm:text-base"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Must be ≥ expected students
                      </p>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex flex-col sm:flex-row justify-end gap-3 sm:space-x-4">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="btn-secondary text-sm sm:text-base py-3"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary text-sm sm:text-base py-3"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <span className="flex items-center justify-center space-x-2">
                          <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Submitting...</span>
                        </span>
                      ) : (
                        'Submit Request'
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Event Requests List */}
            <div className="card p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-6">Your Event Requests</h3>

              {isLoading ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4 text-sm sm:text-base">Loading event requests...</p>
                </div>
              ) : eventRequests.length === 0 ? (
                <div className="text-center py-8 sm:py-12 text-gray-400">
                  <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-base sm:text-lg">No event requests yet</p>
                  <p className="text-xs sm:text-sm mt-2">Click "New Event Request" above</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {eventRequests.map((request) => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`border-2 rounded-lg p-4 sm:p-6 ${
                        request.status === 'approved'
                          ? 'border-green-200 bg-green-50'
                          : request.status === 'rejected'
                          ? 'border-red-200 bg-red-50'
                          : 'border-yellow-200 bg-yellow-50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                        <div className="flex-1">
                          <h4 className="text-lg sm:text-xl font-bold text-gray-800">{request.event_name}</h4>
                          <p className="text-xs sm:text-sm text-gray-600">{request.department}</p>
                        </div>
                        <span
                          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap self-start ${
                            request.status === 'approved'
                              ? 'bg-green-600 text-white'
                              : request.status === 'rejected'
                              ? 'bg-red-600 text-white'
                              : 'bg-yellow-600 text-white'
                          }`}
                        >
                          {request.status.toUpperCase()}
                        </span>
                      </div>

                      {request.event_description && (
                        <p className="text-gray-700 mb-4 text-sm sm:text-base">{request.event_description}</p>
                      )}

                      <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-gray-700">
                            <strong>Dates:</strong> {new Date(request.date_from).toLocaleDateString()} - {new Date(request.date_to).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className="text-gray-700">
                            <strong>Expected:</strong> {request.expected_students}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span className="text-gray-700">
                            <strong>Capacity:</strong> {request.max_capacity}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-gray-700">
                            <strong>Submitted:</strong> {new Date(request.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {request.status === 'approved' && request.approved_at && (
                        <div className="mt-4 p-3 bg-green-100 rounded-lg flex items-start space-x-2 text-xs sm:text-sm">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-green-700">
                            Approved on {new Date(request.approved_at).toLocaleDateString()} - Event is now live for visitor registration!
                          </p>
                        </div>
                      )}

                      {request.status === 'rejected' && request.rejection_reason && (
                        <div className="mt-4 p-3 bg-red-100 rounded-lg flex items-start space-x-2 text-xs sm:text-sm">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="font-semibold text-red-700">Rejection Reason:</p>
                            <p className="text-red-600">{request.rejection_reason}</p>
                          </div>
                        </div>
                      )}

                      {request.status === 'pending' && (
                        <div className="mt-4 p-3 bg-yellow-100 rounded-lg flex items-center space-x-2 text-xs sm:text-sm">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 animate-pulse flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-yellow-700">
                            Waiting for CSO approval...
                          </p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content - BULK QR GENERATOR */}
        {activeTab === 'bulk-qr' && (
          <div className="card p-4 sm:p-6">
            <div className="mb-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">🎫 Bulk QR Code Generator</h3>
              <p className="text-sm sm:text-base text-gray-600">
                Generate multiple QR codes for speakers and VIPs for your approved events.
              </p>
            </div>

            {approvedEvents.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-gray-400">
                <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-base sm:text-lg font-semibold">No Approved Events</p>
                <p className="text-xs sm:text-sm mt-2">You need an approved event before generating bulk QR codes.</p>
              </div>
            ) : (
              <form onSubmit={handleBulkSubmit} className="space-y-6">
                {/* Event Selection */}
                <div>
                  <label className="label text-sm sm:text-base">
                    Select Event <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={bulkFormData.event_id}
                    onChange={(e) => setBulkFormData(prev => ({ ...prev, event_id: e.target.value }))}
                    required
                    className="input-field text-sm sm:text-base"
                  >
                    <option value="">Choose an approved event</option>
                    {approvedEvents.map(event => (
                      <option key={event.id} value={event.id}>
                        {event.event_name} ({new Date(event.date_from).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Visitor List */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="label text-sm sm:text-base mb-0">Visitors List</label>
                    <button
                      type="button"
                      onClick={addVisitorRow}
                      className="text-primary-600 hover:text-primary-700 font-semibold flex items-center space-x-1 text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Add Row</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {bulkFormData.visitors.map((visitor, index) => (
                      <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 p-3 bg-gray-50 rounded-lg">
                        <input
                          type="text"
                          placeholder="Name *"
                          value={visitor.name}
                          onChange={(e) => handleBulkVisitorChange(index, 'name', e.target.value)}
                          required
                          className="input-field text-sm sm:col-span-3"
                        />
                        <input
                          type="email"
                          placeholder="Email"
                          value={visitor.email}
                          onChange={(e) => handleBulkVisitorChange(index, 'email', e.target.value)}
                          className="input-field text-sm sm:col-span-3"
                        />
                        <input
                          type="tel"
                          placeholder="Phone"
                          value={visitor.phone}
                          onChange={(e) => handleBulkVisitorChange(index, 'phone', e.target.value)}
                          className="input-field text-sm sm:col-span-3"
                        />
                        <select
                          value={visitor.category}
                          onChange={(e) => handleBulkVisitorChange(index, 'category', e.target.value)}
                          className="input-field text-sm sm:col-span-2"
                        >
                          <option value="speaker">🎤 Speaker</option>
                          <option value="vip">⭐ VIP</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeVisitorRow(index)}
                          disabled={bulkFormData.visitors.length === 1}
                          className="btn-secondary p-2 sm:col-span-1 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info Box */}
                <div className="p-3 sm:p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg text-xs sm:text-sm">
                  <div className="flex items-start space-x-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-blue-700">
                      <p className="font-semibold">About Bulk QR Generation:</p>
                      <ul className="mt-1 space-y-1 list-disc list-inside">
                        <li>Speakers get Amber/Orange QR codes</li>
                        <li>VIPs get Maroon/Red QR codes</li>
                        <li>You can download each QR individually</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !bulkFormData.event_id}
                  className="w-full btn-primary flex items-center justify-center space-x-2 text-sm sm:text-base py-3 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>
                        {bulkProgress.total > 0 
                          ? `Generating... ${bulkProgress.current}/${bulkProgress.total}`
                          : 'Generating QR Codes...'
                        }
                      </span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      <span>Generate QR Codes ({bulkFormData.visitors.filter(v => v.name).length})</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
