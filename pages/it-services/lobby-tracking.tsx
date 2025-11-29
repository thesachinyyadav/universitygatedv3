import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Users, Clock, Send, UserPlus, Trash2, ChevronDown, ChevronUp, Sparkles, TrendingUp, AlertCircle, Pencil, Check, X } from 'lucide-react';
import { useLobbyStatus } from '@/lib/hooks/useSWRCache';
import { useToast } from '@/components/ui/Toast';

interface LobbyData {
  lobby_name: string;
  current_count: number;
  total_checked_in: number;
  total_sent_out: number;
  last_updated: string;
}

interface Volunteer {
  name: string;
  register_number: string;
}

interface BatchHistory {
  id: string;
  batch_number: number;
  lobby_name: string;
  people_count: number;
  volunteers: Volunteer[];
  notes: string;
  created_at: string;
  created_by_username: string;
}

export default function RoomTracking() {
  const router = useRouter();
  const { showToast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [selectedLobby, setSelectedLobby] = useState<string>('Lobby 1');
  const [loading, setLoading] = useState(true);
  
  // Batch exit form state
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [batchForm, setBatchForm] = useState({
    people_count: 1,
    notes: '',
  });
  const [volunteers, setVolunteers] = useState<Volunteer[]>([{ name: '', register_number: '' }]);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);
  
  // Edit lobby count state
  const [editingLobby, setEditingLobby] = useState<string | null>(null);
  const [editCount, setEditCount] = useState<number>(0);
  const [isUpdatingCount, setIsUpdatingCount] = useState(false);
  
  // Batch history pagination state
  const [historyPage, setHistoryPage] = useState(1);
  const [historyData, setHistoryData] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Use SWR for data fetching with caching
  const { data: lobbyData, error: lobbyError, mutate: refreshLobbies } = useLobbyStatus(5000);
  
  const lobbies: LobbyData[] = lobbyData?.lobbies || [];
  const batchHistory: BatchHistory[] = historyData?.batches || [];
  const totalPages = historyData?.pagination?.totalPages || 1;
  const totalBatches = historyData?.pagination?.total || 0;

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchBatchHistory(historyPage);
    }
  }, [selectedLobby, historyPage, selectedDate, user]);

  const checkUser = () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (!currentUser.id || currentUser.role !== 'it_services') {
        router.push('/login');
        return;
      }
      setUser(currentUser);
    } catch (error) {
      console.error('Error checking user:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchHistory = async (page: number) => {
    setLoadingHistory(true);
    try {
      const response = await fetch(
        `/api/lobby/batch-history?lobby_name=${selectedLobby}&page=${page}&limit=10&date=${selectedDate}`
      );
      const data = await response.json();
      if (data.success) {
        setHistoryData(data);
      }
    } catch (error) {
      console.error('Error fetching batch history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const addVolunteer = () => {
    setVolunteers([...volunteers, { name: '', register_number: '' }]);
  };

  const removeVolunteer = (index: number) => {
    if (volunteers.length > 1) {
      setVolunteers(volunteers.filter((_, i) => i !== index));
    }
  };

  const updateVolunteer = (index: number, field: keyof Volunteer, value: string) => {
    const updated = [...volunteers];
    updated[index][field] = value;
    setVolunteers(updated);
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate volunteers
    const validVolunteers = volunteers.filter(v => v.name.trim() && v.register_number.trim());
    if (validVolunteers.length === 0) {
      showToast('Please add at least one volunteer with name and register number', 'error');
      return;
    }

    setIsCreatingBatch(true);
    try {
      const response = await fetch('/api/lobby/create-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobby_name: selectedLobby,
          people_count: batchForm.people_count,
          volunteers: validVolunteers,
          notes: batchForm.notes,
          user_id: user.id,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create batch');
      }

      // Reset form
      setBatchForm({ people_count: 1, notes: '' });
      setVolunteers([{ name: '', register_number: '' }]);
      setShowBatchForm(false);
      
      // Refresh data
      await refreshLobbies();
      setHistoryPage(1);
      await fetchBatchHistory(1);
      
      showToast(`Batch #${data.batch.batch_number} created successfully!`, 'success');
    } catch (error: any) {
      console.error('Error creating batch:', error);
      showToast(error.message || 'Failed to create batch', 'error');
    } finally {
      setIsCreatingBatch(false);
    }
  };

  const resetLobby = async (lobbyName: string) => {
    if (!confirm(`Reset ${lobbyName}? This will clear all counts.`)) return;
    
    try {
      const response = await fetch('/api/lobby/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobby_name: lobbyName,
          user_id: user.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to reset lobby');
      
      await refreshLobbies();
      showToast(`${lobbyName} reset successfully`, 'success');
    } catch (error) {
      console.error('Error resetting lobby:', error);
      showToast('Failed to reset lobby', 'error');
    }
  };

  const getTotalInLobbies = () => {
    return lobbies.reduce((sum, lobby) => sum + lobby.current_count, 0);
  };

  const startEditingLobby = (lobbyName: string, currentCount: number) => {
    setEditingLobby(lobbyName);
    setEditCount(currentCount);
  };

  const cancelEditingLobby = () => {
    setEditingLobby(null);
    setEditCount(0);
  };

  const saveEditedCount = async (lobbyName: string) => {
    if (editCount < 0) {
      showToast('Count cannot be negative', 'error');
      return;
    }
    
    setIsUpdatingCount(true);
    try {
      const response = await fetch('/api/lobby/update-count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobby_name: lobbyName,
          new_count: editCount,
          user_id: user?.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to update count');
      
      await refreshLobbies();
      showToast(`${lobbyName} count updated successfully`, 'success');
      setEditingLobby(null);
    } catch (error) {
      console.error('Error updating lobby count:', error);
      showToast('Failed to update count', 'error');
    } finally {
      setIsUpdatingCount(false);
    }
  };

  const getCurrentLobby = () => {
    return lobbies.find(l => l.lobby_name === selectedLobby);
  };

  const getTimeSinceUpdate = (timestamp: string) => {
    const minutes = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min ago';
    if (minutes < 60) return `${minutes} mins ago`;
    const hours = Math.floor(minutes / 60);
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div 
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.05, 1]
            }}
            transition={{ 
              rotate: { duration: 2, repeat: Infinity, ease: "linear" },
              scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
            }}
            className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl mb-6"
          >
            <Users className="h-10 w-10 text-white" />
          </motion.div>
          <motion.p 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-gray-600 font-semibold text-lg"
          >
            Loading lobby management...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  const currentLobby = getCurrentLobby();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <motion.button
            whileHover={{ x: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/it-services')}
            className="flex items-center text-indigo-600 hover:text-indigo-800 mb-4 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to IT Services
          </motion.button>
          
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Lobby Management</h1>
              <p className="text-gray-600 mt-1">Track visitors and manage batch exits</p>
            </div>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02, y: -4 }}
            className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 rounded-xl shadow-lg p-6 border border-slate-600 cursor-default"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300 font-medium flex items-center">
                  <Sparkles className="w-4 h-4 mr-1" />
                  Total in Lobbies
                </p>
                <motion.p 
                  key={getTotalInLobbies()}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-4xl font-bold text-white mt-2"
                >
                  {getTotalInLobbies()}
                </motion.p>
              </div>
              <div className="p-3 bg-slate-600 rounded-xl shadow-sm">
                <Users className="w-8 h-8 text-slate-200" />
              </div>
            </div>
          </motion.div>

          {lobbies.map((lobby, index) => (
            <motion.div
              key={lobby.lobby_name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: editingLobby === lobby.lobby_name ? 1 : 1.02, y: editingLobby === lobby.lobby_name ? 0 : -4 }}
              whileTap={{ scale: editingLobby === lobby.lobby_name ? 1 : 0.98 }}
              className={`rounded-xl shadow-lg p-6 border-2 transition-all ${
                selectedLobby === lobby.lobby_name 
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-400 shadow-green-200/50' 
                  : 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-xl'
              } ${editingLobby === lobby.lobby_name ? '' : 'cursor-pointer'}`}
              onClick={() => {
                if (editingLobby !== lobby.lobby_name) {
                  setSelectedLobby(lobby.lobby_name);
                }
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold flex items-center ${
                  selectedLobby === lobby.lobby_name ? 'text-green-700' : 'text-gray-600'
                }">
                  {selectedLobby === lobby.lobby_name && <TrendingUp className="w-4 h-4 mr-1" />}
                  {lobby.lobby_name}
                </p>
                <div className="flex items-center space-x-1">
                  {editingLobby === lobby.lobby_name ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveEditedCount(lobby.lobby_name);
                        }}
                        disabled={isUpdatingCount}
                        className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          cancelEditingLobby();
                        }}
                        className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditingLobby(lobby.lobby_name, lobby.current_count);
                        }}
                        className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Edit count"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <Clock className={`w-4 h-4 ${
                        selectedLobby === lobby.lobby_name ? 'text-green-500' : 'text-gray-400'
                      }`} />
                    </>
                  )}
                </div>
              </div>
              
              {editingLobby === lobby.lobby_name ? (
                <input
                  type="number"
                  min="0"
                  value={editCount}
                  onChange={(e) => setEditCount(parseInt(e.target.value) || 0)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full text-4xl font-bold bg-white border-2 border-indigo-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoFocus
                />
              ) : (
                <motion.p 
                  key={lobby.current_count}
                  initial={{ scale: 1.2, color: selectedLobby === lobby.lobby_name ? '#059669' : '#6366f1' }}
                  animate={{ scale: 1, color: '#111827' }}
                  className="text-4xl font-bold"
                >
                  {lobby.current_count}
                </motion.p>
              )}
              
              <p className="text-xs text-gray-500 mt-1">Currently inside</p>
              <p className="text-xs font-medium mt-1 ${
                selectedLobby === lobby.lobby_name ? 'text-green-600' : 'text-gray-600'
              }">
                {getTimeSinceUpdate(lobby.last_updated)}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Batch Exit Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-xl p-8 mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Send Batch Out - {selectedLobby}</h2>
              <p className="text-gray-600 mt-1">
                Current count: <span className="font-semibold text-indigo-600">{currentLobby?.current_count || 0}</span> people inside
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={selectedLobby}
                onChange={(e) => setSelectedLobby(e.target.value)}
                className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {lobbies.map(lobby => (
                  <option key={lobby.lobby_name} value={lobby.lobby_name}>{lobby.lobby_name}</option>
                ))}
              </select>
              <button
                onClick={() => resetLobby(selectedLobby)}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </button>
            </div>
          </div>

          {!showBatchForm ? (
            <motion.button
              whileHover={{ scale: currentLobby && currentLobby.current_count > 0 ? 1.02 : 1 }}
              whileTap={{ scale: currentLobby && currentLobby.current_count > 0 ? 0.98 : 1 }}
              onClick={() => setShowBatchForm(true)}
              disabled={!currentLobby || currentLobby.current_count === 0}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center disabled:grayscale"
            >
              <Send className="w-6 h-6 mr-2" />
              {!currentLobby || currentLobby.current_count === 0 ? (
                <span className="flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  No people in lobby
                </span>
              ) : (
                'Create New Batch Exit'
              )}
            </motion.button>
          ) : (
            <form onSubmit={handleCreateBatch} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Number of People *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={currentLobby?.current_count || 1}
                    value={batchForm.people_count}
                    onChange={(e) => setBatchForm({ ...batchForm, people_count: parseInt(e.target.value) || 1 })}
                    required
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-semibold text-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max: {currentLobby?.current_count || 0} people</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={batchForm.notes}
                    onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
                    placeholder="e.g., Going to Main Hall"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-700">
                    Volunteers * (at least one required)
                  </label>
                  <button
                    type="button"
                    onClick={addVolunteer}
                    className="flex items-center px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm font-medium"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Add Volunteer
                  </button>
                </div>

                <div className="space-y-3">
                  {volunteers.map((volunteer, index) => (
                    <div key={index} className="flex items-center space-x-3 bg-gray-50 p-4 rounded-lg">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={volunteer.name}
                          onChange={(e) => updateVolunteer(index, 'name', e.target.value)}
                          placeholder="Volunteer Name *"
                          required
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={volunteer.register_number}
                          onChange={(e) => updateVolunteer(index, 'register_number', e.target.value)}
                          placeholder="Register Number *"
                          required
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      {volunteers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVolunteer(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    setShowBatchForm(false);
                    setBatchForm({ people_count: 1, notes: '' });
                    setVolunteers([{ name: '', register_number: '' }]);
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isCreatingBatch}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium disabled:opacity-50 shadow-sm hover:shadow-md flex items-center"
                >
                  {isCreatingBatch ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="mr-2"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </motion.div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Send Batch Out
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          )}
        </motion.div>

        {/* Lobby Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-xl p-8 mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{selectedLobby} Statistics</h2>
          
          {currentLobby && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-700 font-medium">Current Count</p>
                <p className="text-3xl font-bold text-blue-900 mt-1">{currentLobby.current_count}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-green-700 font-medium">Total Checked In</p>
                <p className="text-3xl font-bold text-green-900 mt-1">{currentLobby.total_checked_in}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <p className="text-sm text-orange-700 font-medium">Total Sent Out</p>
                <p className="text-3xl font-bold text-orange-900 mt-1">{currentLobby.total_sent_out}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <p className="text-sm text-purple-700 font-medium">% Sent Out</p>
                <p className="text-3xl font-bold text-purple-900 mt-1">
                  {currentLobby.total_checked_in > 0 
                    ? Math.round((currentLobby.total_sent_out / currentLobby.total_checked_in) * 100) 
                    : 0}%
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Batch History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-8 py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Batch History</h2>
                  <p className="text-slate-200 text-sm">{selectedLobby} • {selectedDate === new Date().toISOString().split('T')[0] ? "Today's" : new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} Batches</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <label className="text-white text-sm font-medium">Date:</label>
                  <input
                    type="date"
                    value={selectedDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setHistoryPage(1);
                    }}
                    className="px-3 py-2 bg-white/10 backdrop-blur border border-white/30 rounded-lg text-white text-sm focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all"
                  />
                  {selectedDate !== new Date().toISOString().split('T')[0] && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedDate(new Date().toISOString().split('T')[0]);
                        setHistoryPage(1);
                      }}
                      className="px-3 py-2 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-sm rounded-lg transition-colors font-medium"
                    >
                      Today
                    </motion.button>
                  )}
                </div>
                
                {totalBatches > 0 && (
                  <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-lg">
                    <p className="text-white font-bold text-lg">{totalBatches}</p>
                    <p className="text-slate-200 text-xs">Total Batches</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-8">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-4 border-slate-200 border-t-slate-600 rounded-full"
                />
                <p className="ml-3 text-gray-600">Loading batches...</p>
              </div>
            ) : batchHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">No batches sent out yet</p>
                <p className="text-gray-400 text-sm mt-1">Create your first batch above</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Batch #</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Time</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">People</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Volunteers</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Notes</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Created By</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-700 text-sm">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batchHistory.map((batch, index) => (
                        <React.Fragment key={batch.id}>
                          <motion.tr
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                              expandedBatch === batch.id ? 'bg-blue-50' : ''
                            }`}
                          >
                            <td className="py-4 px-4">
                              <div className="flex items-center space-x-2">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                  #{batch.batch_number}
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="text-sm font-medium text-gray-900">
                                {new Date(batch.created_at).toLocaleTimeString('en-US', { 
                                  hour: '2-digit', 
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(batch.created_at).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center space-x-2">
                                <Users className="w-4 h-4 text-blue-600" />
                                <span className="font-semibold text-gray-900">{batch.people_count}</span>
                                <span className="text-gray-500 text-sm">
                                  {batch.people_count === 1 ? 'person' : 'people'}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="inline-flex items-center space-x-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>{batch.volunteers.length}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <p className="text-sm text-gray-700 max-w-xs truncate">
                                {batch.notes || <span className="text-gray-400 italic">No notes</span>}
                              </p>
                            </td>
                            <td className="py-4 px-4">
                              <p className="text-sm text-gray-600">
                                {batch.created_by_username || 'Unknown'}
                              </p>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setExpandedBatch(expandedBatch === batch.id ? null : batch.id)}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                              >
                                {expandedBatch === batch.id ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </motion.button>
                            </td>
                          </motion.tr>
                          <AnimatePresence>
                            {expandedBatch === batch.id && (
                              <motion.tr
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                              >
                                <td colSpan={7} className="bg-blue-50/50 px-4 py-0">
                                  <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: 'auto' }}
                                    exit={{ height: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="py-4 px-4">
                                      <div className="flex items-center space-x-2 mb-3">
                                        <UserPlus className="w-4 h-4 text-blue-600" />
                                        <p className="text-sm font-semibold text-gray-800">Volunteer Details:</p>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {batch.volunteers.map((vol, idx) => (
                                          <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="flex items-center justify-between bg-white border border-blue-200 p-3 rounded-lg shadow-sm"
                                          >
                                            <div className="flex items-center space-x-3">
                                              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                {vol.name.charAt(0).toUpperCase()}
                                              </div>
                                              <span className="font-medium text-gray-900">{vol.name}</span>
                                            </div>
                                            <span className="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full font-medium">
                                              {vol.register_number}
                                            </span>
                                          </motion.div>
                                        ))}
                                      </div>
                                    </div>
                                  </motion.div>
                                </td>
                              </motion.tr>
                            )}
                          </AnimatePresence>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {batchHistory.map((batch, index) => (
                    <motion.div
                      key={batch.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white border-2 border-gray-100 rounded-xl p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center text-white font-bold shadow-sm">
                            #{batch.batch_number}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {new Date(batch.created_at).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                hour12: true
                              })}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(batch.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-500">People:</span>
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-blue-600" />
                            <span className="font-semibold text-gray-900">{batch.people_count}</span>
                            <span className="text-gray-500 text-xs">
                              {batch.people_count === 1 ? 'person' : 'people'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-500">Volunteers:</span>
                          <span className="inline-flex items-center space-x-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>{batch.volunteers.length}</span>
                          </span>
                        </div>

                        {batch.notes && (
                          <div className="flex items-start py-2 border-b border-gray-100">
                            <span className="text-gray-500 w-24 flex-shrink-0">Notes:</span>
                            <p className="text-gray-700 flex-1 break-words">{batch.notes}</p>
                          </div>
                        )}

                        <div className="flex items-center justify-between py-2">
                          <span className="text-gray-500">Created By:</span>
                          <span className="text-gray-800 font-medium">{batch.created_by_username || 'Unknown'}</span>
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setExpandedBatch(expandedBatch === batch.id ? null : batch.id)}
                        className="w-full min-h-[44px] flex items-center justify-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-3 rounded-lg font-medium transition-colors touch-manipulation"
                      >
                        {expandedBatch === batch.id ? (
                          <>
                            <ChevronUp className="w-5 h-5" />
                            <span>Hide Volunteer Details</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-5 h-5" />
                            <span>Show Volunteer Details</span>
                          </>
                        )}
                      </motion.button>

                      <AnimatePresence>
                        {expandedBatch === batch.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <p className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                                <UserPlus className="w-4 h-4 text-blue-600 mr-2" />
                                Volunteer Details:
                              </p>
                              <div className="space-y-2">
                                {batch.volunteers.map((vol, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between bg-blue-50 border border-blue-200 p-3 rounded-lg"
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                        {vol.name.charAt(0).toUpperCase()}
                                      </div>
                                      <span className="font-medium text-gray-900 text-sm">{vol.name}</span>
                                    </div>
                                    <span className="text-xs text-blue-600 bg-blue-100 px-3 py-1 rounded-full font-medium">
                                      {vol.register_number}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 pt-6">
                    <p className="text-sm text-gray-600 text-center sm:text-left">
                      Page <span className="font-semibold">{historyPage}</span> of{' '}
                      <span className="font-semibold">{totalPages}</span>
                      <span className="text-gray-400 ml-2 hidden sm:inline">({totalBatches} total batches)</span>
                    </p>
                    <div className="flex items-center space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setHistoryPage(historyPage - 1)}
                        disabled={historyPage === 1 || loadingHistory}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </motion.button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (historyPage <= 3) {
                            pageNum = i + 1;
                          } else if (historyPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = historyPage - 2 + i;
                          }
                          
                          return (
                            <motion.button
                              key={pageNum}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setHistoryPage(pageNum)}
                              disabled={loadingHistory}
                              className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                                historyPage === pageNum
                                  ? 'bg-blue-600 text-white shadow-md'
                                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {pageNum}
                            </motion.button>
                          );
                        })}
                      </div>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setHistoryPage(historyPage + 1)}
                        disabled={historyPage === totalPages || loadingHistory}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </motion.button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Powered by Socio */}
      <div className="mt-8 flex justify-center pb-4">
        <img
          src="/socio.png"
          alt="Powered by Socio"
          className="h-8 opacity-50 hover:opacity-100 transition-opacity"
        />
      </div>
    </div>
  );
}
