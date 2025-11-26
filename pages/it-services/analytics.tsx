import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { motion } from 'framer-motion';
import { Users, TrendingUp, CheckCircle, UserCheck, Target, ArrowLeft } from 'lucide-react';

interface Stats {
  totalRegistered: number;
  totalArrived: number;
  totalFootfallRegistered: number;
  totalFootfallArrived: number;
  arrivalRate: number;
}

interface AreaOfInterestStats {
  area: string;
  total: number;
  arrived: number;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [areaStats, setAreaStats] = useState<AreaOfInterestStats[]>([]);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchAreaStats();
    }
  }, [user]);

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

  const fetchStats = async () => {
    try {
      const { data: visitors, error } = await supabase
        .from('visitors')
        .select('has_arrived, accompanying_count');

      if (error) throw error;
      
      if (visitors) {
        const arrived = visitors.filter(v => v.has_arrived);
        const totalRegistered = visitors.length;
        const totalArrived = arrived.length;
        
        // Calculate total footfall (visitors + companions)
        const totalFootfallRegistered = visitors.reduce((sum, v) => 
          sum + 1 + (v.accompanying_count || 0), 0
        );
        const totalFootfallArrived = arrived.reduce((sum, v) => 
          sum + 1 + (v.accompanying_count || 0), 0
        );
        
        setStats({
          totalRegistered,
          totalArrived,
          totalFootfallRegistered,
          totalFootfallArrived,
          arrivalRate: totalRegistered > 0 ? Math.round((totalArrived / totalRegistered) * 100) : 0,
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

      // Group by area of interest (handling multiple interests per visitor)
      const areaMap = new Map<string, { total: number; arrived: number }>();
      
      data?.forEach((visitor) => {
        let interests: string[] = [];
        
        // Parse area_of_interest - could be string, array, or JSON string
        try {
          if (typeof visitor.area_of_interest === 'string') {
            // Try to parse as JSON array first
            const parsed = JSON.parse(visitor.area_of_interest);
            interests = Array.isArray(parsed) ? parsed : [visitor.area_of_interest];
          } else if (Array.isArray(visitor.area_of_interest)) {
            interests = visitor.area_of_interest;
          } else {
            interests = ['Not Specified'];
          }
        } catch {
          // If JSON parse fails, treat as single string
          interests = visitor.area_of_interest ? [visitor.area_of_interest] : ['Not Specified'];
        }

        // Count this visitor for each of their selected interests
        interests.forEach((area) => {
          if (!areaMap.has(area)) {
            areaMap.set(area, { total: 0, arrived: 0 });
          }
          const stats = areaMap.get(area)!;
          stats.total += 1;
          if (visitor.has_arrived) {
            stats.arrived += 1;
          }
        });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
          </div>
          <p className="text-gray-500 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header with Back Button */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <Link href="/it-services">
            <motion.button
              whileHover={{ x: -4 }}
              whileTap={{ scale: 0.98 }}
              className="mb-4 flex items-center text-gray-500 hover:text-indigo-600 font-medium text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Dashboard
            </motion.button>
          </Link>
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Analytics</h1>
              <p className="text-gray-500 text-sm sm:text-base">Visitor statistics & insights</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Registered</p>
                  <p className="text-3xl font-bold text-indigo-600 mt-1">{stats.totalRegistered}</p>
                  <p className="text-xs text-gray-400 mt-1">visitors</p>
                </div>
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Arrived</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{stats.totalArrived}</p>
                  <p className="text-xs text-gray-400 mt-1">checked in</p>
                </div>
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Footfall (Reg)</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{stats.totalFootfallRegistered}</p>
                  <p className="text-xs text-gray-400 mt-1">incl. companions</p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Inside Now</p>
                  <p className="text-3xl font-bold text-purple-600 mt-1">{stats.totalFootfallArrived}</p>
                  <p className="text-xs text-gray-400 mt-1">incl. companions</p>
                </div>
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Area of Interest Breakdown */}
        {areaStats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-6"
          >
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Area of Interest</h2>
                <p className="text-xs text-gray-500">Visitor distribution by interest</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {areaStats.map((areaStat, index) => {
                const arrivalRate = areaStat.total > 0 ? Math.round((areaStat.arrived / areaStat.total) * 100) : 0;
                return (
                  <motion.div
                    key={areaStat.area}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className="bg-gray-50 border border-gray-100 rounded-xl p-4 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
                  >
                    <h3 className="font-semibold text-gray-800 text-sm mb-3 truncate" title={areaStat.area}>
                      {areaStat.area}
                    </h3>
                    <div className="flex items-end justify-between mb-3">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider">Registered</p>
                        <p className="text-2xl font-bold text-indigo-600">{areaStat.total}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400 uppercase tracking-wider">Arrived</p>
                        <p className="text-2xl font-bold text-green-600">{areaStat.arrived}</p>
                      </div>
                    </div>
                    <div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-out"
                          style={{ 
                            width: `${arrivalRate}%`,
                            background: `linear-gradient(90deg, #6366f1 0%, #22c55e 100%)`
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1.5 text-center">
                        {arrivalRate}% arrival rate
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {areaStats.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center"
          >
            <div className="w-20 h-20 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
              <Target className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No Data Yet</h3>
            <p className="text-gray-500 text-sm">Analytics will appear once visitors start registering.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
