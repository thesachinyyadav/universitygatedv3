import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import Navbar from '../components/Navbar';
import { motion } from 'framer-motion';
import { Search, UserCheck, Users, TrendingUp, Clock, CheckCircle, XCircle, Edit2, Save, X, Target, BarChart3, Undo, RefreshCw } from 'lucide-react';
import Link from 'next/link';

// Helper function to highlight search terms
const highlightText = (text: string, search: string) => {
  if (!search.trim()) return text;
  
  const parts = text.split(new RegExp(`(${search})`, 'gi'));
  return (
    <>
      {parts.map((part, index) => 
        part.toLowerCase() === search.toLowerCase() ? (
          <mark key={index} className="bg-yellow-200 font-semibold px-1 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

interface Visitor {
  id: string;
  name: string;
  phone: string;
  email: string;
  event_name: string;
  visitor_category: string;
  accompanying_count: number;
  has_arrived: boolean;
  arrived_at: string | null;
  created_at: string;
  area_of_interest: string | null;
}

interface Stats {
  totalRegistered: number;
  totalArrived: number;
  companionsRegistered: number;
  companionsArrived: number;
  arrivalRate: number;
}

interface AreaOfInterestStats {
  area: string;
  total: number;
  arrived: number;
}

export default function ITServicesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [filteredVisitors, setFilteredVisitors] = useState<Visitor[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [areaStats, setAreaStats] = useState<AreaOfInterestStats[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCompanions, setEditCompanions] = useState<number>(0);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchVisitors();
      fetchStats();
      fetchAreaStats();
    }
  }, [user]);

  // Auto-refresh visitor list every 10 minutes
  useEffect(() => {
    if (!user) return;

    const intervalId = setInterval(() => {
      console.log('[AUTO-REFRESH] Refreshing visitor list...');
      fetchVisitors();
    }, 10 * 60 * 1000); // 10 minutes in milliseconds

    return () => clearInterval(intervalId);
  }, [user]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredVisitors(visitors);
    } else {
      const filtered = visitors.filter(
        (v) =>
          v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          v.phone.includes(searchTerm) ||
          v.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredVisitors(filtered);
    }
  }, [searchTerm, visitors]);

  const checkUser = async () => {
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

  const fetchVisitors = async () => {
    try {
      setIsRefreshing(true);
      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .order('has_arrived', { ascending: false })
        .order('arrived_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVisitors(data || []);
      setFilteredVisitors(data || []);
    } catch (error) {
      console.error('Error fetching visitors:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    await fetchVisitors();
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_visitor_analytics', {
        start_date: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setStats({
          totalRegistered: data[0].total_registered,
          totalArrived: data[0].total_arrived,
          companionsRegistered: data[0].total_companions_reg,
          companionsArrived: data[0].total_companions_arr,
          arrivalRate: data[0].arrival_rate,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchAreaStats = async () => {
    try {
      const { data, error } = await supabase
        .from('visitors')
        .select('area_of_interest, has_arrived');

      if (error) throw error;

      // Group by area of interest
      const areaMap = new Map<string, { total: number; arrived: number }>();
      
      data?.forEach((visitor) => {
        const area = visitor.area_of_interest || 'Not Specified';
        if (!areaMap.has(area)) {
          areaMap.set(area, { total: 0, arrived: 0 });
        }
        const stats = areaMap.get(area)!;
        stats.total += 1;
        if (visitor.has_arrived) {
          stats.arrived += 1;
        }
      });

      // Convert to array and sort by total
      const areaStatsArray = Array.from(areaMap.entries())
        .map(([area, stats]) => ({
          area,
          total: stats.total,
          arrived: stats.arrived,
        }))
        .sort((a, b) => b.total - a.total);

      setAreaStats(areaStatsArray);
    } catch (error) {
      console.error('Error fetching area stats:', error);
    }
  };

  const handleCheckIn = async (visitor: Visitor) => {
    if (processingId) return;

    try {
      setProcessingId(visitor.id);

      const { error } = await supabase
        .from('visitors')
        .update({
          has_arrived: true,
          arrived_at: new Date().toISOString(),
          checked_in_by: user.id,
        })
        .eq('id', visitor.id);

      if (error) throw error;

      // Refresh data
      await fetchVisitors();
      await fetchStats();
      await fetchAreaStats();

      // Clear search field for next visitor
      setSearchTerm('');
    } catch (error) {
      console.error('Error checking in visitor:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleUndoCheckIn = async (visitor: Visitor) => {
    if (processingId) return;
    if (!confirm(`Undo check-in for ${visitor.name}?`)) return;

    try {
      setProcessingId(visitor.id);

      const { error } = await supabase
        .from('visitors')
        .update({
          has_arrived: false,
          arrived_at: null,
          checked_in_by: null,
        })
        .eq('id', visitor.id);

      if (error) throw error;

      // Refresh data
      await fetchVisitors();
      await fetchStats();
      await fetchAreaStats();

      // Clear search field for next visitor
      setSearchTerm('');
    } catch (error) {
      console.error('Error undoing check-in:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const startEdit = (visitor: Visitor) =>{
    setEditingId(visitor.id);
    setEditCompanions(visitor.accompanying_count);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCompanions(0);
  };

  const saveCompanions = async (visitorId: string, visitorName: string) => {
    if (processingId) return;

    try {
      setProcessingId(visitorId);

      const { error } = await supabase
        .from('visitors')
        .update({
          accompanying_count: editCompanions,
        })
        .eq('id', visitorId);

      if (error) throw error;

      // Refresh data
      await fetchVisitors();
      await fetchStats();
      await fetchAreaStats();
      setEditingId(null);
    } catch (error) {
      console.error('Error updating companions:', error);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
          </div>
          <p className="text-gray-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header with Analytics Button */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">IT Services</h1>
                <p className="text-gray-500 text-sm sm:text-base">Manage visitor check-ins</p>
              </div>
            </div>
            <Link href="/it-services/analytics">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-5 py-2.5 rounded-xl font-medium shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                <BarChart3 className="h-5 w-5" />
                <span>View Analytics</span>
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 mb-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Search className="h-4 w-4 text-indigo-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Search Visitors</h2>
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all text-sm ${
                isRefreshing
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, phone, or email..."
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white text-base transition-all"
            />
          </div>
          {searchTerm && (
            <div className="mt-3 flex items-center space-x-2">
              <span className="inline-flex items-center px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium">
                {filteredVisitors.length} result{filteredVisitors.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setSearchTerm('')}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                Clear search
              </button>
            </div>
          )}
        </motion.div>

        {/* Quick Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
        >
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Total</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{visitors.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Checked In</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{visitors.filter(v => v.has_arrived).length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Pending</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{visitors.filter(v => !v.has_arrived).length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Arrival Rate</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">
              {visitors.length > 0 ? Math.round((visitors.filter(v => v.has_arrived).length / visitors.length) * 100) : 0}%
            </p>
          </div>
        </motion.div>

        {/* Visitors Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/80 border-b border-gray-200">
                <tr>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Visitor
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                    Phone
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                    Event
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                    Companions
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                    Total
                  </th>
                  <th className="px-4 sm:px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredVisitors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                          <Users className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">
                          {searchTerm ? 'No visitors found matching your search' : 'No visitors registered yet'}
                        </p>
                        {searchTerm && (
                          <button
                            onClick={() => setSearchTerm('')}
                            className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                          >
                            Clear search
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredVisitors.map((visitor) => (
                    <tr key={visitor.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm ${
                            visitor.has_arrived ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gradient-to-br from-gray-300 to-gray-400'
                          }`}>
                            {visitor.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {highlightText(visitor.name, searchTerm)}
                            </div>
                            <div className="text-xs text-gray-500 sm:hidden">
                              {highlightText(visitor.phone, searchTerm)}
                            </div>
                            <div className="text-xs text-gray-400 hidden sm:block">
                              {visitor.email ? highlightText(visitor.email, searchTerm) : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600 hidden sm:table-cell">
                        {highlightText(visitor.phone, searchTerm)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium">
                          {visitor.event_name}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        {visitor.has_arrived ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-semibold w-fit">
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Arrived
                            </span>
                            <span className="text-xs text-gray-400 mt-1">
                              {new Date(visitor.arrived_at!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-semibold">
                            <Clock className="h-3.5 w-3.5 mr-1" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                        {editingId === visitor.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="0"
                              value={editCompanions}
                              onChange={(e) => setEditCompanions(parseInt(e.target.value) || 0)}
                              className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-center text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                              disabled={processingId === visitor.id}
                            />
                            <button
                              onClick={() => saveCompanions(visitor.id, visitor.name)}
                              disabled={processingId === visitor.id}
                              className="w-7 h-7 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 flex items-center justify-center disabled:opacity-50 transition-colors"
                              title="Save"
                            >
                              <Save className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={processingId === visitor.id}
                              className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center disabled:opacity-50 transition-colors"
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="text-center min-w-[32px] font-medium">{visitor.accompanying_count}</span>
                            <button
                              onClick={() => startEdit(visitor)}
                              className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 hover:bg-indigo-100 hover:text-indigo-600 flex items-center justify-center transition-colors"
                              title="Edit companion count"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-sm">
                          {visitor.accompanying_count + 1}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                        {!visitor.has_arrived ? (
                          <button
                            onClick={() => handleCheckIn(visitor)}
                            disabled={processingId === visitor.id}
                            className="inline-flex items-center justify-center bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md space-x-1.5"
                          >
                            <UserCheck className="h-4 w-4" />
                            <span>Check In</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUndoCheckIn(visitor)}
                            disabled={processingId === visitor.id}
                            className="inline-flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs space-x-1"
                          >
                            <Undo className="h-3 w-3" />
                            <span>Undo</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Table Footer */}
          {filteredVisitors.length > 0 && (
            <div className="px-4 sm:px-6 py-4 bg-gray-50/50 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Showing {filteredVisitors.length} of {visitors.length} visitors
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
