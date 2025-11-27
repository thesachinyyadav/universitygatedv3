import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import Image from 'next/image';
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
    area_of_interest: [] as string[],
    accompanying_count: '0',
  });
  const [capturedPhoto, setCapturedPhoto] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredVisitor, setRegisteredVisitor] = useState<any>(null);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [otherInterest, setOtherInterest] = useState('');
  const [showOtherInput, setShowOtherInput] = useState(false);

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

  const handleCheckboxChange = (value: string) => {
    // Don't add "Other" directly - it's handled separately via the text input
    if (value === 'Other') {
      return;
    }
    
    setFormData((prev) => {
      const currentInterests = prev.area_of_interest;
      if (currentInterests.includes(value)) {
        // Remove if already selected
        return {
          ...prev,
          area_of_interest: currentInterests.filter((item) => item !== value),
        };
      } else {
        // Add if not selected
        return {
          ...prev,
          area_of_interest: [...currentInterests, value],
        };
      }
    });
  };

  const handleAccompanyingCountBlur = () => {
    const accompanyingCount = parseInt(formData.accompanying_count);
    // Show confirmation for any count >= 1
    if (accompanyingCount >= 1) {
      setShowConfirmation(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Proceed with submission
    setIsSubmitting(true);
    setError('');
    setShowConfirmation(false);

    if (!formData.event_id) {
      setError('Please select an event');
      setIsSubmitting(false);
      return;
    }

    if (formData.area_of_interest.length === 0) {
      setError('Please select at least one area of interest');
      setIsSubmitting(false);
      return;
    }

    // Photo capture temporarily disabled
    // if (!capturedPhoto) {
    //   setError('Please capture your photo before registering');
    //   setIsSubmitting(false);
    //   return;
    // }

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

  const handleConfirmSubmit = () => {
    setPendingSubmit(true);
    setShowConfirmation(false);
    // Scroll to the submit button
    setTimeout(() => {
      const submitButton = document.querySelector('button[type="submit"]');
      if (submitButton) {
        submitButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a visual highlight effect
        submitButton.classList.add('ring-4', 'ring-primary-300', 'ring-offset-2');
        setTimeout(() => {
          submitButton.classList.remove('ring-4', 'ring-primary-300', 'ring-offset-2');
        }, 2000);
      }
    }, 300);
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
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
                <label className="label text-xs sm:text-sm">Valid ID Card Number</label>
                <input
                  type="text"
                  name="register_number"
                  value={formData.register_number}
                  onChange={handleChange}
                  className="input-field text-xs sm:text-sm py-2"
                  placeholder="e.g., ID12345678"
                />
              </div>
            </div>

            {/* Data Privacy Disclaimer */}
            <div className="p-3 sm:p-4 bg-gray-50 border border-gray-300 rounded-lg">
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div className="text-xs text-gray-600">
                  <p>
                    <strong className="text-gray-800">Privacy Notice:</strong> Your information is collected solely for verification and security purposes. We do not share your data with third parties.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="label text-xs sm:text-sm">Select Event / Date *</label>
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
                  <option value="">Select an event / date</option>
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
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Area of Interest */}
            <div>
              <label className="label text-xs sm:text-sm mb-3">Area of Interest * <span className="text-gray-500 font-normal">(Select one or more)</span></label>
              <div className="border border-gray-300 rounded-lg p-3 max-h-60 overflow-y-auto bg-white">
                <div className="grid grid-cols-1 gap-2">
                  {[
                    'English and Cultural Studies',
                    'Media Studies',
                    'Performing Arts, Theatre Studies and Music',
                    'Business and Management',
                    'Hotel Management',
                    'Commerce',
                    'Professional Studies',
                    'Education',
                    'Law',
                    'Chemistry',
                    'Computer Science',
                    'Life Sciences',
                    'Mathematics',
                    'Physics and Electronics',
                    'Statistics and Data Science',
                    'Economics',
                    'International Studies, Political Science, and History',
                    'Psychology',
                    'Sociology and Social Work',
                    'Languages',
                    'Other',
                  ].map((interest) => (
                    <label
                      key={interest}
                      className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={interest === 'Other' ? showOtherInput : formData.area_of_interest.includes(interest)}
                        onChange={() => {
                          if (interest === 'Other') {
                            // Toggle the Other input visibility
                            if (showOtherInput) {
                              // Unchecking - remove the custom entry and hide input
                              setFormData(prev => ({
                                ...prev,
                                area_of_interest: prev.area_of_interest.filter(i => i !== otherInterest.trim())
                              }));
                              setOtherInterest('');
                              setShowOtherInput(false);
                            } else {
                              // Checking - show the input
                              setShowOtherInput(true);
                            }
                          } else {
                            handleCheckboxChange(interest);
                          }
                        }}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700">{interest}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Other Interest Text Input - Shows when Other checkbox is checked */}
              {showOtherInput && (
                <div className="mt-3">
                  <label className="label text-xs sm:text-sm">Please specify your area of interest</label>
                  <input
                    type="text"
                    value={otherInterest}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      const oldValue = otherInterest.trim();
                      setOtherInterest(newValue);
                      
                      // Update area_of_interest - remove old custom value, add new one
                      setFormData(prev => {
                        // Remove the old custom entry only
                        let filtered = prev.area_of_interest.filter(i => i !== oldValue);
                        // Add the new custom entry directly if there's text
                        if (newValue.trim()) {
                          return { ...prev, area_of_interest: [...filtered, newValue.trim()] };
                        }
                        return { ...prev, area_of_interest: filtered };
                      });
                    }}
                    placeholder="e.g., Architecture, Fine Arts, Sports"
                    className="input-field text-xs sm:text-sm py-2"
                    autoComplete="off"
                    autoCapitalize="words"
                  />
                </div>
              )}
              
              {formData.area_of_interest.length > 0 && (
                <p className="mt-2 text-xs text-indigo-600 font-medium">
                  Selected ({formData.area_of_interest.length}): {formData.area_of_interest.join(', ')}
                </p>
              )}
            </div>

            {/* Number of Accompanying People */}
            <div>
              <label className="label text-xs sm:text-sm">Number of People Accompanying with You</label>
              <input
                type="number"
                name="accompanying_count"
                value={formData.accompanying_count}
                onChange={handleChange}
                onBlur={handleAccompanyingCountBlur}
                min="0"
                max="500"
                className="input-field text-xs sm:text-sm py-2"
                placeholder="Enter number (e.g., 0, 5, 100)"
              />
            </div>

            {/* Important Message for Accompanying Count */}
            <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-xs text-red-700">
                  <p className="font-semibold">
                    <strong>Important:</strong> Only the registered number of people (you + companions) will be granted entry at the gate.
                  </p>
                </div>
              </div>
            </div>

            {/* Hidden field - Public registration is always for students (Blue QR) */}
            <input type="hidden" name="visitor_category" value="student" />

            <div>
              <label className="label text-xs sm:text-sm">Purpose <span className="text-gray-400 text-xs font-normal">(Optional)</span></label>
              <textarea
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                rows={2}
                className="input-field text-xs sm:text-sm py-2"
                placeholder="(Optional - leave blank if not applicable)"
              />
            </div>

            {/* Photo Capture - Temporarily hidden but functionality preserved */}
            {/* <PhotoCapture 
              onPhotoCapture={setCapturedPhoto}
              capturedPhoto={capturedPhoto}
            /> */}

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

        {/* Confirmation Modal */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-start space-x-4 mb-4">
                <div className="flex-shrink-0">
                  <svg className="w-12 h-12 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800 mb-2">
                    Confirm Accompanying Count
                  </h3>
                  <p className="text-gray-700 text-sm mb-3">
                    You have entered <span className="font-bold text-amber-600">{formData.accompanying_count} people</span> accompanying with you.
                  </p>
                  <p className="text-gray-600 text-sm">
                    This means a total of <span className="font-bold text-primary-600">{parseInt(formData.accompanying_count) + 1} people</span> (including you) will need entry.
                  </p>
                  <div className="mt-3 p-3 bg-amber-50 border-l-4 border-amber-400 rounded">
                    <p className="text-xs text-amber-800">
                      <strong>⚠️ Important:</strong> Entry will be granted only for this registered count. Please confirm this is correct.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  onClick={handleCancelConfirmation}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition text-sm font-semibold text-gray-700"
                >
                  No, Let Me Change
                </button>
                <button
                  onClick={handleConfirmSubmit}
                  className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition text-sm font-semibold shadow-md"
                >
                  Yes, Confirm & Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Footer with Socio Branding */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 pb-6 flex flex-col items-center justify-center"
        >
          <p className="text-[10px] text-gray-400 mb-1">Powered by</p>
          <Image
            src="/socio.png"
            alt="Socio"
            width={70}
            height={26}
            className="object-contain opacity-50 hover:opacity-80 transition-opacity"
          />
        </motion.div>
      </div>
    </div>
  );
}
