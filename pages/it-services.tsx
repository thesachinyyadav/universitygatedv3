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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header with Analytics Button */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex justify-between items-center"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">IT Services Dashboard</h1>
            <p className="text-gray-600">Search and manage visitor check-ins</p>
          </div>
          <Link href="/it-services/analytics">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-colors flex items-center space-x-2"
            >
              <BarChart3 className="h-5 w-5" />
              <span>View Analytics</span>
            </motion.button>
          </Link>
        </motion.div>

        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-md p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Search className="h-6 w-6 text-indigo-600 mr-2" />
              <h2 className="text-xl font-bold text-gray-800">Search Visitors</h2>
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isRefreshing
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, phone, or email..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
            />
          </div>
          {searchTerm && (
            <p className="mt-3 text-sm text-gray-600">
              Found <span className="font-bold text-indigo-600">{filteredVisitors.length}</span> matching result{filteredVisitors.length !== 1 ? 's' : ''}
            </p>
          )}
        </motion.div>

        {/* Stats moved to separate analytics page */}

        {/* Visitors Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-md overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Check-in Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Companions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total People
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVisitors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      {searchTerm ? 'No visitors found matching your search.' : 'No visitors registered yet.'}
                    </td>
                  </tr>
                ) : (
                  filteredVisitors.map((visitor) => (
                    <tr key={visitor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {highlightText(visitor.name, searchTerm)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {visitor.email ? highlightText(visitor.email, searchTerm) : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {highlightText(visitor.phone, searchTerm)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {visitor.event_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {visitor.has_arrived ? (
                          <div className="flex flex-col">
                            <span className="flex items-center text-green-600 text-sm font-semibold mb-1">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Checked In
                            </span>
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                              {new Date(visitor.arrived_at!).toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span className="flex items-center text-red-600 text-sm font-semibold">
                            <Clock className="h-4 w-4 mr-1" />
                            Not Checked In
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {editingId === visitor.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="0"
                              value={editCompanions}
                              onChange={(e) => setEditCompanions(parseInt(e.target.value) || 0)}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                              disabled={processingId === visitor.id}
                            />
                            <button
                              onClick={() => saveCompanions(visitor.id, visitor.name)}
                              disabled={processingId === visitor.id}
                              className="text-green-600 hover:text-green-800 disabled:opacity-50"
                              title="Save"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={processingId === visitor.id}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="text-center min-w-[40px]">{visitor.accompanying_count}</span>
                            <button
                              onClick={() => startEdit(visitor)}
                              className="text-indigo-600 hover:text-indigo-800"
                              title="Edit companion count"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-indigo-600 text-center">
                        {visitor.accompanying_count + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {!visitor.has_arrived ? (
                          <button
                            onClick={() => handleCheckIn(visitor)}
                            disabled={processingId === visitor.id}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                          >
                            <UserCheck className="h-4 w-4" />
                            <span>Check In</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUndoCheckIn(visitor)}
                            disabled={processingId === visitor.id}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm"
                          >
                            <Undo className="h-3 w-3" />
                            <span>Undo Check-in</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
