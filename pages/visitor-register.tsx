import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import QRGenerator from '@/components/QRGenerator';
import PhotoCapture from '@/components/PhotoCapture';

interface ApprovedEvent {
  id: string;
  event_name: string;
  department: string;
  date_from: string;
  date_to: string;
  description: string;
  available_slots: number;
  max_capacity: number;
}

export default function VisitorRegister() {
  const router = useRouter();
  const [approvedEvents, setApprovedEvents] = useState<ApprovedEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    register_number: '',
    event_id: '',
    visitor_category: 'student',
    purpose: '',
  });
  const [capturedPhoto, setCapturedPhoto] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredVisitor, setRegisteredVisitor] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApprovedEvents();
  }, []);

  const fetchApprovedEvents = async () => {
    try {
      const response = await fetch('/api/approved-events');
      const data = await response.json();
      setApprovedEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching approved events:', error);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!formData.event_id) {
      setError('Please select an event');
      setIsSubmitting(false);
      return;
    }

    if (!capturedPhoto) {
      setError('Please capture your photo before registering');
      setIsSubmitting(false);
      return;
    }

    const selectedEvent = approvedEvents.find(e => e.id === formData.event_id);
    if (!selectedEvent) {
      setError('Selected event is no longer available');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/registerVisitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          photo_data: capturedPhoto,
          event_name: selectedEvent.event_name,
          date_of_visit_from: selectedEvent.date_from,
          date_of_visit_to: selectedEvent.date_to,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setRegisteredVisitor(data.visitor);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (registeredVisitor) {
    return (
      <div className="min-h-screen bg-gray-50 py-6 sm:py-8 md:py-12 px-3 sm:px-4">
        <div className="container mx-auto max-w-2xl">
          <QRGenerator
            visitorId={registeredVisitor.id}
            visitorName={registeredVisitor.name}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-3 sm:py-4 md:py-6 px-3 sm:px-4">
      <div className="container mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-3 sm:p-4 md:p-6"
        >
          <div className="text-center mb-3 sm:mb-4">
            <h1 className="text-xl sm:text-2xl font-bold text-maroon-600 mb-1">
              Visitor Registration
            </h1>
            <p className="text-gray-600 text-xs sm:text-sm">
              Fill form to request entry
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg mb-4 sm:mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className="label text-xs sm:text-sm">Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="input-field text-xs sm:text-sm py-2"
                placeholder="Enter your full name"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-2 sm:gap-3">
              <div>
                <label className="label text-xs sm:text-sm">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="input-field text-xs sm:text-sm py-2"
                  placeholder="+91 XXXXXXXXXX"
                />
              </div>

              <div>
                <label className="label text-xs sm:text-sm">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field text-xs sm:text-sm py-2"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="label text-xs sm:text-sm">College Register Number</label>
                <input
                  type="text"
                  name="register_number"
                  value={formData.register_number}
                  onChange={handleChange}
                  className="input-field text-xs sm:text-sm py-2"
                  placeholder="e.g., 2021BCSXXX"
                />
              </div>
            </div>

            <div>
              <label className="label text-xs sm:text-sm">Select Event *</label>
              {isLoadingEvents ? (
                <div className="input-field flex items-center space-x-2 text-sm sm:text-base">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                  <span className="text-gray-500">Loading events...</span>
                </div>
              ) : approvedEvents.length === 0 ? (
                <div className="input-field text-gray-500 text-sm sm:text-base">
                  No events available for registration at this time
                </div>
              ) : (
                <select
                  name="event_id"
                  value={formData.event_id}
                  onChange={handleChange}
                  required
                  className="input-field text-sm sm:text-base"
                >
                  <option value="">Select an event</option>
                  {approvedEvents.map(event => (
                    <option key={event.id} value={event.id}>
                      {event.event_name} - {new Date(event.date_from).toLocaleDateString()} to {new Date(event.date_to).toLocaleDateString()} ({event.available_slots} slots available)
                    </option>
                  ))}
                </select>
              )}
              {formData.event_id && (() => {
                const selectedEvent = approvedEvents.find(e => e.id === formData.event_id);
                return selectedEvent ? (
                  <div className="mt-2 p-3 sm:p-4 bg-blue-50 rounded-lg text-xs sm:text-sm">
                    <p className="text-blue-800 font-semibold text-base sm:text-lg">{selectedEvent.event_name}</p>
                    <p className="text-blue-600">{selectedEvent.department}</p>
                    {selectedEvent.description && (
                      <p className="text-blue-700 mt-1">{selectedEvent.description}</p>
                    )}
                    <p className="text-blue-600 mt-2">
                      📅 {new Date(selectedEvent.date_from).toLocaleDateString()} - {new Date(selectedEvent.date_to).toLocaleDateString()}
                    </p>
                    <div className="mt-3 p-3 bg-green-100 border-2 border-green-400 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-green-700 font-medium">Available Slots:</span>
                        <span className="text-2xl sm:text-3xl font-bold text-green-700">
                          {selectedEvent.available_slots}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-green-600 mt-1">
                        out of {selectedEvent.max_capacity} total capacity
                      </p>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Hidden field - Public registration is always for students (Blue QR) */}
            <input type="hidden" name="visitor_category" value="student" />
            
            <div className="p-3 sm:p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
              <div className="flex items-start sm:items-center space-x-2 sm:space-x-3">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0 mt-0.5 sm:mt-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-blue-800">Student Registration</p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Public registration is for students only. You will receive a Blue QR Code.
                    For speaker/VIP registration, contact the event organizer.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="label text-xs sm:text-sm">Purpose</label>
              <textarea
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                rows={2}
                className="input-field text-xs sm:text-sm py-2"
                placeholder="Brief description"
              />
            </div>

            {/* Photo Capture */}
            <PhotoCapture 
              onPhotoCapture={setCapturedPhoto}
              capturedPhoto={capturedPhoto}
            />

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex-1 text-xs sm:text-sm py-2.5"
              >
                {isSubmitting ? 'Registering...' : 'Register & Get QR'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="px-3 sm:px-4 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition text-xs sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>

          <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-gray-700">
            <strong>Note:</strong> Save your QR code and present it at the gate.
          </div>
        </motion.div>
      </div>
    </div>
  );
}
